<script setup>
import {ref, computed, onMounted} from "vue";
import {RouterLink, RouterView} from "vue-router";
import Modal from "./components/modal.vue";
import {client} from "@composables/client";
import {getRedirectResult, GoogleAuthProvider, signInWithCredential, signOut} from "firebase/auth";
import ProfileIcon from "@/assets/profile.svg";
import NotificationsIcon from "@/assets/notifications.svg";
const modalRef = ref(null);
const signInRef = ref(null);
const buttonLabel = computed(() => {
if (client.session) {
const name = client?.session?.displayName || "User";
const email = client?.session?.email || "No email";
return `Signed in as ${name} (${email}). Open Account menu`;
} else {
return "More options";
}
});
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
<div v-if="client.loading">
<p>Loading...</p>
</div>
<div v-else>
<header>
<RouterLink role="button" to="/notifications" aria-label="Notifications"><img :src="NotificationsIcon" width="64px" height="64px"/></RouterLink>
<div v-if="client.session">
<button @click="modalRef.openModal" :aria-label="buttonLabel"><img :src="ProfileIcon" width="64px" height="64px" /></button>
<Modal :showButton="false" :title="buttonLabel" ref="modalRef">
<img v-if="client.session?.photoURL" :src="client.session.photoURL" alt="Profile photo" />
<nav aria-label="Primary navigation container">
<ul style="list-style-type:none;">
<li><RouterLink role="button" to="/" @click="modalRef.closeModal()">Home</RouterLink></li>
<li v-if="client.session && client.session.role_num > 5"><a role="button" href="https://adminconsole.saintjosephsacademyfoundation.org">Admin Dashboard</a></li>
<li v-if="client.session && client.session.role_num > 5"><RouterLink role="button" to="/admin/dashboard" @click="modalRef.closeModal()">Test management Dashboard</RouterLink></li>
<li v-if="client.session && client.session.role_num > 5"><RouterLink role="button" to="/admin/test/create" @click="modalRef.closeModal()">Create test</RouterLink></li>
<li v-if="client.session && client.session.role_num > 5"><RouterLink role="button" to="/admin/submissions" @click="modalRef.closeModal()">View Submissions</RouterLink></li>
<!--
<li><RouterLink to="/stats">Global statistics board</RouterLink></li>
<li><RouterLink to="/batchstats">Batch-wise stats report</RouterLink></li>
-->
<li><RouterLink role="button" to="/edit" @click="modalRef.closeModal()">Edit profile</RouterLink></li>
<li>
<Modal :showButton="true" buttonLabel="Sign out" title="Sign out?" ref="signInRef">
<p>Are you sure you want to sign out of your account?</p>
<button @click="signInRef.closeModal">Cancel</button>
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
<footer>

</footer>
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
