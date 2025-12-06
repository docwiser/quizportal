<template>
<main class="forgot-password-page">
<Head title="Forgot Password" />
<section class="forgot-password">
<h1>Forgot Password</h1>
<p>
Enter the email address associated with your account. We will send you a link to reset your password if an account exists for that email.
</p>
<form @submit.prevent="onSubmit" novalidate class="forgot-form">
<fieldset :disabled="loading">
<div class="form-row">
<label for="email">Email address</label>
<input
id="email"
type="email"
v-model.trim="email"
required
autocomplete="email"
inputmode="email"
:aria-invalid="Boolean(errorMessage)"
aria-describedby="email-help email-error"
/>
<p id="email-help" class="field-help">
Use the same email you used when creating your account.
</p>
</div>
<div
v-if="errorMessage"
id="email-error"
class="alert alert-error"
role="alert"
>
{{ errorMessage }}
</div>
<div
v-if="successMessage"
class="alert alert-success"
role="status"
>
{{ successMessage }}
</div>
<button type="submit" class="submit-btn">
<span v-if="loading">Sending reset link…</span>
<span v-else>Send reset link</span>
</button>
</fieldset>
</form>
</section>
</main>
</template>
<script setup>
import { ref } from "vue";
import { sendPasswordResetEmail } from "firebase/auth";
import { client } from "@composables/client";
import { useToast } from "@composables/toast";
const email = ref("");
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const toaster = useToast();
function normalizeErrorMessage(error) {
const code = error?.code || "";
if (code === "auth/user-not-found") {
return "no account linked with the provided email. Please update the email and try again";
}
if (code === "auth/invalid-email") {
return "Please enter a valid email address.";
}
if (code === "auth/too-many-requests") {
return "Too many attempts. Please wait a few minutes and try again.";
}
return "Unable to send reset link. Please check your email and try again.";
}
async function onSubmit() {
errorMessage.value = "";
successMessage.value = "";
const value = email.value.trim();
if (!value) {
errorMessage.value = "Please enter your email address.";
return;
}
loading.value = true;
try {
await sendPasswordResetEmail(client.auth, value);
successMessage.value =
"If an account exists for this email address, a password reset link has been sent. Please check your inbox and spam folder.";
toaster.addToast("Password reset email sent (if the account exists).", "success");
email.value = "";
} catch (error) {
const msg = normalizeErrorMessage(error);
errorMessage.value = msg;
toaster.addToast(msg, "error");
} finally {
loading.value = false;
}
}
</script>
<style scoped>
.forgot-password-page {
display: flex;
justify-content: center;
padding: 2rem 1rem;
}

.forgot-password {
max-width: 480px;
width: 100%;
}

h1 {
margin-bottom: 0.5rem;
}

.forgot-password > p {
margin-bottom: 1.5rem;
color: #555;
}

.forgot-form {
margin-top: 1rem;
}

fieldset {
border: none;
padding: 0;
margin: 0;
}

.form-row {
display: flex;
flex-direction: column;
gap: 0.35rem;
margin-bottom: 1rem;
}

label {
font-weight: 600;
}

input[type="email"] {
padding: 0.6rem 0.75rem;
border-radius: 4px;
border: 1px solid #ccc;
font-size: 1rem;
}

input[type="email"][aria-invalid="true"] {
border-color: #c0392b;
}

.field-help {
font-size: 0.875rem;
color: #666;
}

.alert {
padding: 0.75rem 0.9rem;
border-radius: 4px;
margin-bottom: 0.75rem;
font-size: 0.95rem;
}

.alert-error {
background: #fdecea;
color: #c0392b;
border: 1px solid #f5c6cb;
}

.alert-success {
background: #e6f4ea;
color: #1e7e34;
border: 1px solid #c3e6cb;
}

.submit-btn {
margin-top: 0.5rem;
padding: 0.6rem 1.2rem;
border-radius: 4px;
border: none;
cursor: pointer;
background: #007bff;
color: white;
font-size: 1rem;
font-weight: 600;
}

.submit-btn:disabled {
opacity: 0.7;
cursor: default;
}

.visually-hidden {
position: absolute;
width: 1px;
height: 1px;
padding: 0;
margin: -1px;
overflow: hidden;
clip: rect(0 0 0 0);
white-space: nowrap;
border: 0;
}
</style>
