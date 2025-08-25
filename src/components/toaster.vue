<template>
<div class="notification-container" role="region" aria-label="Notifications(f8)" v-if="toaster.toast.length>0">
<h2>Notifications</h2>
<div class="notifications">
<div v-for="(notification, index) in toaster.toast" :key="index" :class="notification.type">
<div role="alert">
<div role="group" :aria-label="'Notification ' + (index+1) + 'of ' + toaster.toast.length">
<p>{{ notification.message }}</p>
<button aria-label="Dismiss" @click="() => toaster.removeToast(index)">✖</button>
</div>
</div>
</div>
</div>
</div>
</template>
<script setup>
import {useToast} from "@composables/toast";
const toaster = useToast();
</script>
<style scoped>
.notification-container {
position: fixed;
top: 20px;
right: 20px;
z-index: 1000;
}
.notification {
background: white;
padding: 10px;
margin-bottom: 5px;
border-left: 4px solid;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.notification.info { border-color: blue; }
.notification.success { border-color: green; }
.notification.error { border-color: red; }
.notification button {
margin-left: 10px;
background: transparent;
border: none;
cursor: pointer;
}
</style>
