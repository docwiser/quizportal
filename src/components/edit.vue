<template>
<main class="edit-profile" aria-labelledby="editProfileHeading">
<Head title="Edit profile" />
<h1 id="editProfileHeading">Edit Profile</h1>
<form @submit.prevent="onSave" novalidate>
<fieldset>
<legend>Account details</legend>
<div class="form-row">
<label for="displayName">Full name</label>
<input
id="displayName"
type="text"
v-model="form.displayName"
required
minlength="2"
maxlength="100"
aria-describedby="displayNameHint"
autocomplete="name"
/>
<div id="displayNameHint" class="hint" aria-hidden="true">
Use the full name you want shown publicly.
</div>
</div>
<div class="form-row">
<label for="email">Email</label>
<input
id="email"
type="email"
v-model="form.email"
required
aria-describedby="emailHint"
autocomplete="email"
/>
<div id="emailHint" class="hint" aria-hidden="true">
Changing email may require you to re-enter your credentials.
</div>
</div>
</fieldset>
<fieldset>
<legend>Change password</legend>
<div class="form-row">
<label for="currentPassword">Current password</label>
<input
:type="passwordType"
id="currentPassword"
v-model="form.currentPassword"
:required="willChangePassword"
autocomplete="current-password"
aria-describedby="passHint"
minlength="6"
/>
</div>
<div class="form-row">
<label for="newPassword">New password</label>
<input
:type="passwordType"
id="newPassword"
v-model="form.newPassword"
:required="willChangePassword"
autocomplete="new-password"
minlength="6"
aria-describedby="passStrength"
/>
<div id="passStrength" class="hint" aria-hidden="true">
Minimum 6 characters.
</div>
</div>
<div class="form-row">
<label for="confirmPassword">Confirm new password</label>
<input
:type="passwordType"
id="confirmPassword"
v-model="form.confirmPassword"
:required="willChangePassword"
autocomplete="new-password"
minlength="6"
/>
</div>
<div class="form-row checkbox-row">
<input id="changePasswordToggle" type="checkbox" v-model="willChangePassword" />
<label for="changePasswordToggle">I want to change my password</label>
</div>
<div class="form-row checkbox-row">
<input id="showPasswords" type="checkbox" v-model="showPasswords" />
<label for="showPasswords">Show passwords</label>
</div>
</fieldset>
<div class="actions">
<button
type="submit"
:disabled="busy"
>
Save changes
</button>
<button type="button" @click="onReload" :disabled="busy">Reset</button>
</div>
<div
role="status"
class="status"
v-if="statusMessage"
:class="{ error: statusError }"
>
{{ statusMessage }}
</div>
<div v-if="fieldErrors.length" role="alert" class="field-errors">
<ul>
<li v-for="(err, i) in fieldErrors" :key="i">{{ err }}</li>
</ul>
</div>
</form>
</main>
</template>
<script setup>
import { ref, reactive, onMounted, computed } from "vue";
import {
updateProfile as fbUpdateProfile,
updateEmail as fbUpdateEmail,
updatePassword as fbUpdatePassword,
reauthenticateWithCredential,
EmailAuthProvider,
} from "firebase/auth";
import {
doc,
getDoc,
setDoc,
updateDoc,
serverTimestamp,
} from "firebase/firestore";
import { client } from "@composables/client";
const auth = client.auth;
const firestore = client.firestore;
const busy = ref(false);
const statusMessage = ref("");
const statusError = ref(false);
const fieldErrors = ref([]);
const willChangePassword = ref(false);
const showPasswords = ref(false);
const form = reactive({
displayName: "",
email: "",
currentPassword: "",
newPassword: "",
confirmPassword: "",
});
const passwordType = computed(() => (showPasswords.value ? "text" : "password"));
async function loadProfile() {
const user = auth.currentUser;
if (!user) {
statusError.value = true;
statusMessage.value = "No signed-in user found.";
return;
}
form.displayName = user.displayName || "";
form.email = user.email || "";
try {
const uDocRef = doc(firestore, "users", user.uid);
const snap = await getDoc(uDocRef);
if (snap.exists()) {
const data = snap.data() || {};
if (data.displayName && !form.displayName) form.displayName = data.displayName;
if (data.email && !form.email) form.email = data.email;
}
} catch (err) {
statusMessage.value = "Loaded basic profile, failed to load extended data.";
statusError.value = false;
}
}
onMounted(() => {
loadProfile();
});
function onReload() {
fieldErrors.value = [];
statusMessage.value = "";
statusError.value = false;
willChangePassword.value = false;
showPasswords.value = false;
form.currentPassword = "";
form.newPassword = "";
form.confirmPassword = "";
loadProfile();
}
function validateForm() {
const errors = [];
if (!form.displayName || form.displayName.trim().length < 2) {
errors.push("Display name must be at least 2 characters.");
}
if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
errors.push("Please provide a valid email address.");
}
if (willChangePassword.value) {
if (!form.currentPassword) {
errors.push("Current password is required to change password.");
}
if (!form.newPassword || form.newPassword.length < 6) {
errors.push("New password must be at least 6 characters.");
}
if (form.newPassword !== form.confirmPassword) {
errors.push("New password and confirmation do not match.");
}
}
return errors;
}
async function reauthenticate(currentPassword) {
const user = auth.currentUser;
if (!user || !user.email) throw new Error("User not authenticated.");
const cred = EmailAuthProvider.credential(user.email, currentPassword);
await reauthenticateWithCredential(user, cred);
}
async function onSave() {
fieldErrors.value = [];
statusMessage.value = "";
statusError.value = false;
const errors = validateForm();
if (errors.length) {
fieldErrors.value = errors;
return;
}
busy.value = true;
try {
const user = auth.currentUser;
if (!user) throw new Error("No authenticated user found.");
if (form.displayName && form.displayName !== user.displayName) {
await fbUpdateProfile(user, { displayName: form.displayName });
}
if (form.email && form.email !== user.email) {
try {
await fbUpdateEmail(user, form.email);
} catch (err) {
if (err && err.code === "auth/requires-recent-login") {
if (!form.currentPassword) {
throw new Error(
"Changing email requires recent sign-in. Please enter your current password to reauthenticate."
);
}
await reauthenticate(form.currentPassword);
await fbUpdateEmail(user, form.email);
} else {
throw err;
}
}
}
if (willChangePassword.value) {
try {
await reauthenticate(form.currentPassword);
await fbUpdatePassword(user, form.newPassword);
} catch (err) {
throw new Error("Failed to change password: " + (err.message || err));
}
}
const uDocRef = doc(firestore, "users", user.uid);
const patch = {
displayName: form.displayName,
email: form.email,
updatedAt: serverTimestamp(),
};
await updateDoc(uDocRef, patch).catch(async (err) => {
if (err && (err.code === "not-found" || (err.message && err.message.includes("no document to update")))) {
await setDoc(uDocRef, patch, { merge: true });
} else {
throw err;
}
});
client?.auth?.currentUser.reload();
statusMessage.value = "Profile updated successfully.";
statusError.value = false;
form.currentPassword = "";
form.newPassword = "";
form.confirmPassword = "";
willChangePassword.value = false;
showPasswords.value = false;
} catch (err) {
statusError.value = true;
if (err && err.code) {
statusMessage.value = `Error: ${err.code} - ${err.message || err.toString()}`;
} else {
statusMessage.value = err.message || String(err);
}
} finally {
busy.value = false;
}
}
</script>
<style scoped>
.edit-profile {
max-width: 720px;
margin: 0 auto;
padding: 1rem;
font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
}

form fieldset {
border: 1px solid #ddd;
padding: 1rem;
margin-bottom: 1rem;
}

legend {
font-weight: 600;
padding: 0 0.5rem;
}

.form-row {
display: flex;
flex-direction: column;
margin-bottom: 0.75rem;
}

.form-row label {
margin-bottom: 0.25rem;
font-size: 0.95rem;
}

.form-row input[type="text"],
.form-row input[type="email"],
.form-row input[type="tel"],
.form-row input[type="password"],
.form-row input[type="file"],
.form-row input[type="text"] {
padding: 0.5rem;
font-size: 1rem;
border: 1px solid #bbb;
border-radius: 4px;
}

.checkbox-row {
align-items: center;
display: flex;
gap: 0.5rem;
}

.actions {
display: flex;
gap: 0.5rem;
margin-top: 1rem;
align-items: center;
}

button {
padding: 0.6rem 1rem;
border-radius: 6px;
border: 1px solid #888;
background: #f5f5f5;
cursor: pointer;
}

button[disabled],
button[aria-disabled="true"] {
opacity: 0.6;
cursor: not-allowed;
}

.status {
margin-top: 1rem;
padding: 0.6rem;
border-radius: 4px;
background: #eef6ee;
color: #065b06;
}

.status.error {
background: #fdecea;
color: #8b0000;
}

.field-errors {
margin-top: 1rem;
padding: 0.6rem;
border-radius: 4px;
background: #fff4e5;
color: #7a4b00;
}

.hint {
font-size: 0.85rem;
color: #666;
margin-top: 0.25rem;
}
</style>
