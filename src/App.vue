<script setup>
import {ref, computed, onMounted} from "vue";
import {RouterLink, RouterView} from "vue-router";
import Modal from "./components/modal.vue";
import {client} from "@composables/client";
import {getRedirectResult, GoogleAuthProvider, signInWithCredential, signOut} from "firebase/auth";
const modalRef = ref(null);
const signInRef = ref(null);
const buttonLabel = computed(() => {
if (client.session) {
const name = client?.session?.displayName || "User";
const email = client?.session?.email || "No email";
return `Signed in as ${name} (${email})`;
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
<header>
<RouterLink role="button" to="/notifications">Notifications</RouterLink>
<div v-if="client.session">
<Modal :showButton="true" :buttonLabel="buttonLabel" :title="buttonLabel" ref="modalRef">
<img v-if="client.session?.photoURL" :src="client.session.photoURL" alt="Profile photo" />
<nav aria-label="Primary navigation container">
<ul style="list-style-type:none;">
<li><RouterLink role="button" to="/" @click="modalRef.closeModal()">Home</RouterLink></li>
<li><RouterLink role="button" to="/courses" @click="modalRef.closeModal()">All Courses</RouterLink></li>
<li><RouterLink role="button" to="/apply-course" @click="modalRef.closeModal()">Apply for a new course</RouterLink></li>
<li><RouterLink role="button" to="/student/dashboard" @click="modalRef.closeModal()">View/attend Tests</RouterLink></li>
<li v-if="client.session && client.session.role_num > 5"><RouterLink role="button" to="/admin/dashboard" @click="modalRef.closeModal()">Admin Dashboard</RouterLink></li>
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
