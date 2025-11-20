<script setup>
import {ref} from "vue";
import {RouterLink} from "vue-router";
import {signInWithEmailAndPassword, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";
import { client } from "@composables/client";
import { useToast } from "@composables/toast";
const toaster = useToast();
const email = ref("");
const password = ref("");
const signInWithGoogle = async () => {
try {
const provider = new GoogleAuthProvider();
await signInWithRedirect(client.auth, provider);
} catch (error) {
console.error("Sign-in error:", error);
toaster.addToast("Failed to sign in. Please try again.", "error");
}
};
const signin = async() => {
try {
await signInWithEmailAndPassword(client.auth, email.value, password.value);
} catch(error) {
console.error(error);
toaster.addToast(error.message, "error");
};
};
</script>
<template>
<main>
<Head title="Sign in" />
<div class="login-container">
<div v-if="client.session">
<h1>Welcome back</h1>
<p>currently signed in as {{client.session.displayName}} ({{client.session.email}})</p>
<RouterLink role="button" to="/">Go to dashboard</RouterLink>
</div>
<div class="login-card" v-else>
<h1>Sign in</h1>
<div class="login-content">
<p>Sign in with your Student account to access all the courses</p>
<form @submit.prevent="signin">
<label for="email">Email Address:</label>
<input type="email" id="email" v-model="email" required="" placeholder="E.G. john@student.org" />
<label for="password">Password:</label>
<input type="password" id="password" v-model="password" required="" placeholder="Type your account password" />
<input type="submit" value="Sign in" />
</form>
<a class="google-signin-btn" role="button" href="https://saintjosephsacademyfoundation.org/enrollment">Enroll as a new student</a>
<!--
<button 
@click="signInWithGoogle"
class="google-signin-btn"
aria-label="Sign in with Google"
>
<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
</svg>
Sign in with Google
</button>
!-->
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
</style>