<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { RouterLink, RouterView } from "vue-router";
import Modal from "./components/modal.vue";
import { client } from "@composables/client";
import {
getRedirectResult,
GoogleAuthProvider,
signInWithCredential,
signOut,
} from "firebase/auth";
import { getToken, onMessage } from "firebase/messaging";
import { getDoc, collection, setDoc, doc } from "firebase/firestore";
import ProfileIcon from "@/assets/profile.svg";
import NotificationsIcon from "@/assets/notifications.svg";
import { useToast } from "@composables/toast";
const toaster = useToast();
const modalRef = ref(null);
const allowNotificationsRef = ref(null);
const signInRef = ref(null);
const messageModalRef = ref(null);
const deviceModalRef = ref(null);
const deactivatorDevice = ref(null);
const remoteMissing = ref(false);
const notificationContent = ref({
title: "Turn on notifications",
body:
"We'd like to show you notifications about new courses, test openings, and important updates. If you'd like to receive these updates, please allow notifications below.",
actions: [
{
label: "Allow notifications",
click: () => {
allowPermission();
},
},
],
});
const messageContent = ref({ title: "", body: "" });
const buttonLabel = computed(() => {
if (client.session) {
const name = client?.session?.displayName || "User";
const email = client?.session?.email || "No email";
return `Signed in as ${name} (${email}). Open Account menu`;
} else {
return "More options";
}
});
const VAPID_KEY = client?.vapidKey;
async function writeToken(token) {
try {
if (!token) return;
localStorage.setItem("fcmtoken", token);
if (client?.session?.uid && client?.firestore && !client.session.notificationToken) {
const uid = client.session.uid;
const userRef = doc(client.firestore, "users", uid);
await setDoc(userRef, { notificationToken: token }, { merge: true });
try {
client.session.notificationToken = token;
} catch (e) {}
}
} catch (e) {
console.error("writeToken error:", e);
}
}
async function allowPermission() {
try {
if (!("Notification" in window)) return;
const permission = await Notification.requestPermission();
if (permission !== "granted") return;
const messaging = client?.messaging;
if (!messaging) return;
const fcmtoken = await getToken(messaging, { vapidKey: VAPID_KEY || undefined });
if (!fcmtoken) return;
await writeToken(fcmtoken);
toaster.addToast("Notifications enabled.", "success");
} catch (err) {
console.error("allowPermission error:", err);
toaster.addToast("Failed to enable notifications.", "error");
} finally {
try {
allowNotificationsRef.value?.closeModal?.();
} catch (e) {}
}
}
const getNotifier = async () => {
try {
const status = Notification.permission;
switch (status) {
case "granted":
await ensureTokenAndSave();
break;
case "denied":
// user denied; don't prompt
break;
default:
allowNotificationsRef.value?.openModal?.();
break;
}
} catch (error) {
console.error(error);
}
};
async function ensureTokenAndSave() {
try {
const existing = localStorage.getItem("fcmtoken");
const messaging = client?.messaging;
let token = existing;
if (!token && Notification.permission === "granted" && messaging) {
try {
token = await getToken(messaging, { vapidKey: VAPID_KEY || undefined });
if (token) localStorage.setItem("fcmtoken", token);
} catch (e) {
console.warn("Could not silently refresh/get token:", e);
}
}
if (token && client?.session && client?.firestore) {
if (!client.session.notificationToken) {
await writeToken(token);
}
}
} catch (e) {
console.error("ensureTokenAndSave error:", e);
}
}
const LOCAL_DEVICE_KEY = "clientdevice";
function getLocalClientDevice() {
try {
const raw = localStorage.getItem(LOCAL_DEVICE_KEY);
if (!raw) return null;
return JSON.parse(raw);
} catch (e) {
return null;
}
}
function compareDevices(local, remote) {
if (!local || !remote) return false;
try {
if (local.ua && remote.ua && local.ua === remote.ua) return true;
const lv = local.device?.vendor || "";
const lm = local.device?.model || "";
const rv = remote.device?.vendor || "";
const rm = remote.device?.model || "";
if (lv && lm && rv && rm && lv === rv && lm === rm) return true;
const lBrowser = `${local.browser?.name || ""}:${local.browser?.version || ""}`;
const rBrowser = `${remote.browser?.name || ""}:${remote.browser?.version || ""}`;
const lOS = `${local.os?.name || ""}:${local.os?.version || ""}`;
const rOS = `${remote.os?.name || ""}:${remote.os?.version || ""}`;
if (lBrowser === rBrowser && lOS === rOS) return true;
return false;
} catch (e) {
return false;
}
}
onMounted(async () => {
/*
try {
const result = await getRedirectResult(client.auth);
if (result?.user) {
const idToken = await result.user.getIdToken();
const credential = GoogleAuthProvider.credential(idToken);
signInWithCredential(client.auth, credential);
}
} catch (error) {
console.error(error);
}
*/
setTimeout(async () => {
try {
const localToken = localStorage.getItem("fcmtoken");
if (!localToken) {
await getNotifier();
} else {
await ensureTokenAndSave();
}
} catch (e) {
console.warn("Notifier init failed:", e);
}
}, 5000);
try {
const messaging = client?.messaging;
if (messaging) {
onMessage(messaging, (payload) => {
messageContent.value.title =
payload?.notification?.title || payload?.data?.title || "Notification";
messageContent.value.body =
payload?.notification?.body || payload?.data?.body || JSON.stringify(payload);
messageModalRef.value?.openModal?.();
});
}
} catch (e) {
console.warn("onMessage setup failed:", e);
}
});
watch(
() => client.session,
async (newSession) => {
try {
if (!newSession) return;
const sessionDevice = newSession?.device ?? null;
const localDevice = getLocalClientDevice();
if (!sessionDevice) {
remoteMissing.value = true;
deactivatorDevice.value = null;
try {
if (client?.auth) {
await signOut(client.auth);
} else {
console.warn("client.auth not available for signOut");
}
} catch (e) {
console.warn("Failed to sign out locally:", e);
}
deviceModalRef.value?.openModal?.();
return;
}
if (!localDevice) {
return;
}
const isMatch = compareDevices(localDevice, sessionDevice);
if (!isMatch) {
deactivatorDevice.value = sessionDevice;
remoteMissing.value = false;
try {
if (client?.auth) {
await signOut(client.auth);
} else {
console.warn("client.auth not available for signOut");
}
} catch (e) {
console.warn("Failed to sign out locally:", e);
}
deviceModalRef.value?.openModal?.();
}
} catch (e) {
console.warn("Device check flow error:", e);
}
},
{ immediate: true }
);
const signout = async () => {
try {
try {
const uid = client?.session?.uid;
if (uid && client?.firestore) {
const userRef = doc(client.firestore, "users", uid);
await setDoc(userRef, { device: null }, { merge: true });
}
} catch (e) {
console.warn("Failed to clear device on signout:", e);
}
if (client?.auth) {
await signOut(client.auth);
}
toaster.addToast("Signed out successfully.", "success");
} catch (error) {
console.error("Error during sign out:", error);
toaster.addToast("Failed to sign out.", "error");
} finally {
try {
signInRef.value?.closeModal?.();
modalRef.value?.closeModal?.();
} catch (e) {}
}
};
</script>
<template>
<div v-if="client.loading">
<p>Loading...</p>
</div>
<div v-else>
<header>
<RouterLink role="button" to="/notifications" aria-label="Notifications">
<img :src="NotificationsIcon" width="64px" height="64px" />
</RouterLink>
<div v-if="client.session">
<button @click="modalRef?.openModal?.()" :aria-label="buttonLabel">
<img :src="ProfileIcon" width="64px" height="64px" />
</button>
<Modal :showButton="false" :title="buttonLabel" ref="modalRef">
<img v-if="client.session?.photoURL" :src="client.session.photoURL" alt="Profile photo" />
<nav aria-label="Primary navigation container">
<ul style="list-style-type:none;">
<li>
<RouterLink role="button" to="/" @click="modalRef?.closeModal?.()">Home</RouterLink>
</li>
<li v-if="client.session && client.session.role_num > 5">
<a role="button" href="https://adminconsole.saintjosephsacademyfoundation.org">Admin Dashboard</a>
</li>
<li v-if="client.session && client.session.role_num > 5">
<RouterLink role="button" to="/admin/dashboard" @click="modalRef?.closeModal?.()">Test management Dashboard</RouterLink>
</li>
<li v-if="client.session && client.session.role_num > 5">
<RouterLink role="button" to="/admin/test/create" @click="modalRef?.closeModal?.()">Create test</RouterLink>
</li>
<li v-if="client.session && client.session.role_num > 5">
<RouterLink role="button" to="/admin/submissions" @click="modalRef?.closeModal?.()">View Submissions</RouterLink>
</li>
<li>
<RouterLink role="button" to="/edit" @click="modalRef?.closeModal?.()">Edit profile</RouterLink>
</li>
<li>
<Modal :showButton="true" buttonLabel="Sign out" title="Sign out?" ref="signInRef">
<p>Are you sure you want to sign out of your account?</p>
<button @click="signInRef?.closeModal?.()">Cancel</button>
<button @click="signout">Sign out</button>
</Modal>
</li>
</ul>
</nav>
</Modal>
</div>

<div v-else>
<RouterLink role="button" to="/login">Sign in</RouterLink>
</div>
</header>
<RouterView />
<footer></footer>
<Modal :title="notificationContent.title" :showButton="false" ref="allowNotificationsRef">
<p>{{ notificationContent.body }}</p>
<div style="margin-top:1rem;" v-for="(item, index) in notificationContent.actions" :key="index">
<button @click="item.click">{{ item.label }}</button>
</div>
</Modal>
<Modal :title="messageContent.title" :showButton="false" ref="messageModalRef">
<p style="white-space: pre-wrap;">{{ messageContent.body }}</p>
<div style="margin-top:1rem;">
<button @click="messageModalRef?.closeModal?.()">Close</button>
</div>
</Modal>
<Modal :title="'Device deactivated'" :showButton="false" ref="deviceModalRef">
<div>
<p>
Your device has been deactivated from this account.
This may be because someone else signed in to your account.
</p>
<div v-if="remoteMissing" style="margin-top:1rem;">
<p>The account's registered device is missing on the server. You can sign back in to continue using Saint Josephs Academy.</p>
</div>
<div v-else-if="deactivatorDevice" style="white-space:pre-wrap; margin-top:1rem;">
<h3>This is the device which deactivated your device on your account:</h3>
<p v-if="deactivatorDevice.device"><strong>Device:</strong> {{ deactivatorDevice.device.vendor || "-" }} {{ deactivatorDevice.device.model || "-" }}</p>
<p v-if="deactivatorDevice.os"><strong>OS:</strong> {{ deactivatorDevice.os.name || "-" }} {{ deactivatorDevice.os.version || "" }}</p>
</div>
<div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem;">
<button @click="deviceModalRef?.closeModal?.()">Close</button>
<RouterLink role="button" to="/login" @click="deviceModalRef?.closeModal?.()">Sign in again</RouterLink>
</div>
</div>
</Modal>
<Toaster />
</div>
</template>
<style scoped>
.admin-badge {
background: #4CAF50;
color: white;
padding: 0.2rem 0.5rem;
border-radius: 4px;
font-size: 0.8rem;
margin-left: 0.5rem;
}
</style>
