<script setup>
import {ref, onMounted} from "vue";
import {RouterLink, RouterView} from "vue-router";
import {client} from "@composables/client";
import {getRedirectResult, GoogleAuthProvider, signInWithCredential, signOut} from "firebase/auth";
onMounted(async() => {
try {
const result = await getRedirectResult(client.auth);
if (result.user) {
const idToken = await result.user.getIdToken();
const credential = GoogleAuthProvider.credential(idToken);
signInWithCredential(client.auth, credential);
}
} catch(error) {
console.error(error);
};
});
const signout = async() => {
try {
signOut(client.auth);
} catch(error) {
console.error(error);

};
};
</script>
<template>
<header>
<RouterLink to="/">Quiz contests</RouterLink>
<details name="mainnavigation">
<summary role="button">toggle navigation</summary>
<nav aria-label="Primary navigation container">
<ul style="list-style-type:none;">
<li><RouterLink to="/">Current quiz contests</RouterLink></li>
<li><RouterLink to="/stats">Global statistics board</RouterLink></li>
<li><RouterLink to="/batchstats">Batch-wise stats report</RouterLink></li>
</ul>
</nav>
</details>
<div v-if="client.session">
<img v-if="client.session?.photoURL" :src="client.session.photoURL" alt="Profile photo" />
<p>{{client.session.displayName}} ({{client.session.email}})</p>
<button @click="signout">Sign out</button>
</div>
<div v-else>
<RouterLink to="/login">Sign in</RouterLink>
</div>
</header>
<RouterView />
<footer>

</footer>
<Toaster />
<RouteAnnouncer />
</template>
<style scoped></style>
