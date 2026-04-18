<script setup>
import { ref, reactive } from "vue";
import { RouterLink } from "vue-router";
import {
signInWithEmailAndPassword,
signInWithRedirect,
GoogleAuthProvider,
} from "firebase/auth";
import {
collection,
query,
where,
getDocs,
doc,
setDoc,
updateDoc,
} from "firebase/firestore";
import { UAParser } from "ua-parser-js";
import { client } from "@composables/client";
import { useToast } from "@composables/toast";
const toaster = useToast();
const email = ref("");
const password = ref("");
const checkingDevice = ref(false);
const showDeviceDialog = ref(false);
const existingDevice = reactive({}); // device info from Firestore (if any)
const db = client.firestore;
const localDeviceKey = "clientdevice";
function removeUndefined(obj) {
if (obj === undefined) return null;
if (obj === null) return null;
if (typeof obj == "function") return null;
if (typeof obj !== "object") return obj;
if (Array.isArray(obj)) {
return obj.map(item => removeUndefined(item));
}
const cleaned = {};
for (const key in obj) {
const value = obj[key];
cleaned[key] = value === undefined ? null : removeUndefined(value);
}
return cleaned;
}
const getLocalDevice = () => {
const parser = new UAParser();
return removeUndefined(parser.getResult());
};
const signInWithGoogle = async () => {
try {
const provider = new GoogleAuthProvider();
await signInWithRedirect(client.auth, provider);
} catch (error) {
console.error("Sign-in error:", error);
toaster.addToast("Failed to sign in. Please try again.", "error");
}
};
const performSignInAndStoreDevice = async (override = false) => {
try {
const cred = await signInWithEmailAndPassword(
client.auth,
email.value,
password.value
);
const uid = cred.user.uid;
const device = getLocalDevice();
console.log(device);
const userDocRef = doc(db, "users", uid);
await setDoc(userDocRef, { device }, { merge: true });
localStorage.setItem(localDeviceKey, JSON.stringify(device));
toaster.addToast("Signed in successfully.", "success");
} catch (err) {
console.error("Sign-in failure:", err);
toaster.addToast(err.message || "Sign-in failed", "error");
}
};
const signin = async () => {
try {
toaster.addToast("Verifying your credential,please wait...", "info");
checkingDevice.value = true;
const usersCol = collection(db, "users");
const q = query(usersCol, where("email", "==", email.value));
const snaps = await getDocs(q);
if (!snaps.empty) {
const userDoc = snaps.docs[0];
const data = userDoc.data();
if (data && data.device) {
Object.assign(existingDevice, data.device);
showDeviceDialog.value = true;
checkingDevice.value = false;
return;
}
}
await performSignInAndStoreDevice(false);
} catch (error) {
console.error("Error checking user/device:", error);
toaster.addToast(
"Failed to check existing device. Please try again.",
"error"
);
} finally {
checkingDevice.value = false;
}
};
const confirmOverrideAndSignin = async () => {
showDeviceDialog.value = false;
await performSignInAndStoreDevice(true);
};
const cancelOverride = () => {
showDeviceDialog.value = false;
};
</script>
<template>
<main>
<Head title="Sign in" />
<div class="login-container">
<div v-if="client.session">
<h1>Welcome back</h1>
<p>
currently signed in as {{ client.session.displayName }}
({{ client.session.email }})
</p>
<RouterLink role="button" to="/">Go to dashboard</RouterLink>
</div>
<div class="login-card" v-else>
<div v-if="showDeviceDialog" class="device-dialog-backdrop">
<div class="device-dialog">
<h2>Device already registered</h2>
<p>
This account appears to be signed in on another device. Device
information:
</p>
<ul>
<li v-if="existingDevice.device && existingDevice.device.vendor">
<strong>Vendor / Model:</strong>
{{ existingDevice.device.vendor || "-" }} /
{{ existingDevice.device.model || "-" }}
</li>
<li v-if="existingDevice.os">
<strong>OS:</strong> {{ existingDevice.os.name || "-" }}
{{ existingDevice.os.version || "" }}
</li>
</ul>
<p>Do you want to sign in here and replace the other device?</p>
<div class="device-dialog-actions">
<button @click="cancelOverride" class="btn-cancel">No — go back</button>
<button @click="confirmOverrideAndSignin" class="btn-accept">Yes — sign in here</button>
</div>
</div>
</div>
<div v-else>
<h1>Sign in</h1>
<div class="login-content">
<p>Sign in with your Student account to access all the courses</p>
<form @submit.prevent="signin" aria-busy="checkingDevice">
<label for="email">Email Address:</label>
<input
type="email"
id="email"
v-model="email"
required
placeholder="E.G. john@student.org"
/>
<label for="password">Password:</label>
<input
type="password"
id="password"
v-model="password"
required
placeholder="Type your account password"
/>
<input type="submit" value="Sign in" :disabled="checkingDevice" />
</form>
<RouterLink role="button" to="/forgot-password">Forgot password?</RouterLink>
<p>
If you do not have an account, please submit the enrollment form first.
After your enrollment is reviewed and approved, your login ID and password
will be sent to your registered email address.
</p>
<a
class="google-signin-btn"
role="button"
href="ext:https://saintjosephsacademyfoundation.org/enrollment">Enroll as a new student</a>
<p>
For any assistance or support, please contact us.
</p>

<p>
<a href="https://www.saintjosephsacademyfoundation.org/contact/" role="button">
Contact Us
</a>
</p>

<hr>

<p>
By signing in or enrolling, you agree to the following policies:
</p>

<p>
<a href="https://www.saintjosephsacademyfoundation.org/app-terms-and-conditions/" role="button">
Terms &amp; Conditions
</a>
</p>

<p>
<a href="https://www.saintjosephsacademyfoundation.org/app-privacy-policy/" role="button">
Privacy Policy
</a>
</p>

<p>
<a href="https://www.saintjosephsacademyfoundation.org/enrollment-policy/" role="button">
Enrollment Policy
</a>
</p>

<p>
<a href="https://www.saintjosephsacademyfoundation.org/app-refund-and-cancellation-policy/" role="button">
Refund and Cancellation Policy
</a>
</p>

<p>
<a href="https://www.saintjosephsacademyfoundation.org/account-and-data-deletion-policy/" role="button">
Account &amp; Data Deletion Policy
</a>
</p>

<p>
<a href="https://www.saintjosephsacademyfoundation.org/content-and-test-disclaimer/" role="button">
Content and Test Disclaimer
</a>
</p>

<p>
<a href="https://www.saintjosephsacademyfoundation.org/government-exam-disclaimer/" role="button">
Government Exam Disclaimer
</a>
</p>

<p>
Enrollment is subject to eligibility criteria and academy policies.
</p>
<!-- Google sign-in button (if you want to enable later)
<button @click="signInWithGoogle" class="google-signin-btn" aria-label="Sign in with Google">... </button>
-->
</div>
</div>
</div>
</div>
</main>
</template>
<style scoped>
.login-container {
min-height: 100vh;
display: flex;
align-items: center;
justify-content: center;
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
padding: 1rem;
}

.login-card {
background: white;
border-radius: 12px;
padding: 2rem;
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
max-width: 400px;
width: 100%;
text-align: center;
}

.login-card h1 {
color: #333;
margin-bottom: 0.5rem;
font-size: 1.5rem;
}

.login-card > p {
color: #666;
margin-bottom: 2rem;
font-size: 1.1rem;
}

.login-content p {
color: #555;
margin-bottom: 1.5rem;
}

.google-signin-btn {
display: flex;
align-items: center;
justify-content: center;
gap: 0.75rem;
width: 100%;
padding: 0.75rem 1rem;
border: 2px solid #ddd;
border-radius: 8px;
background: white;
color: #333;
font-size: 1rem;
font-weight: 500;
cursor: pointer;
transition: all 0.2s ease;
}

.google-signin-btn:hover {
border-color: #4285F4;
box-shadow: 0 2px 8px rgba(66, 133, 244, 0.2);
}

.google-signin-btn:focus {
outline: 2px solid #4285F4;
outline-offset: 2px;
}

/* Device dialog */
.device-dialog-backdrop {
position: fixed;
inset: 0;
display: flex;
align-items: center;
justify-content: center;
background: rgba(0, 0, 0, 0.45);
z-index: 1200;
}

.device-dialog {
background: #fff;
padding: 1.25rem;
border-radius: 8px;
width: 90%;
max-width: 520px;
box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}

.device-dialog h2 {
margin: 0 0 0.5rem 0;
}

.device-dialog-actions {
display: flex;
gap: 0.5rem;
justify-content: flex-end;
margin-top: 1rem;
}

.btn-cancel {
background: transparent;
border: 1px solid #ccc;
padding: 0.5rem 0.75rem;
border-radius: 6px;
cursor: pointer;
}

.btn-accept {
background: #2b6cb0;
color: white;
border: none;
padding: 0.5rem 0.75rem;
border-radius: 6px;
cursor: pointer;
}
</style>
