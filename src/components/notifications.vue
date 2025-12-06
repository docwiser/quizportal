<template>
<main class="notifications-page">
<Head title="Notifications" />
<section class="notifications">
<h1>Notifications</h1>
<p>Review important updates and announcements from the academy.</p>
<div v-if="loading" class="loading">
Loading notifications…
</div>
<div v-if="error" role="alert" class="error">
{{ error }}
</div>
<div v-if="!loading && !error">
<div v-if="!selectedNotification">
<div v-if="notifications.length === 0" class="empty-state">
No notifications available at this time.
</div>
<ul
v-else
class="notifications-list"
>
<li
v-for="notification in notifications"
:key="notification.id"
class="notification-item"
>
<button
type="button"
class="notification-button"
@click="openNotification(notification)"
>
<h2 class="notification-title">
{{ notification.data?.title || "Untitled notification" }}
</h2>
<p class="notification-excerpt">
{{ notification.data?.excerpt || "" }}
</p>
<p class="notification-date">
{{ formatDateTime(notification.data?.updated || notification.data?.created) }}
</p>
</button>
</li>
</ul>
</div>
<div v-else class="notification-details" role="region" :aria-label="`Notification details: ${selectedNotification.data?.title || selectedNotification.id}`">
<button type="button" class="back-btn" @click="closeDetails" aria-label="Back">
← Back to notifications
</button>
<h2 class="notification-title">
{{ selectedNotification.data?.title || "Untitled notification" }}
</h2>
<p class="notification-date">
{{ formatDateTime(selectedNotification.data?.updated || selectedNotification.data?.created) }}
</p>
<div v-if="selectedNotification.data?.body" class="notification-body">
<p>{{ selectedNotification.data.body }}</p>
</div>
<ul
v-if="Array.isArray(selectedNotification.data?.actions) && selectedNotification.data.actions.length > 0"
class="notification-actions"
>
<li
v-for="(action, index) in selectedNotification.data.actions"
:key="index"
>
<a
v-if="action?.link"
:href="action.link"
target="_blank"
rel="noopener noreferrer"
role="button"
class="action-link"
>
{{ action.text || "Open link" }}
</a>
</li>
</ul>
</div>
</div>
</section>
</main>
</template>
<script setup>
import { ref, onMounted } from "vue";
import { collection, getDocs } from "firebase/firestore";
import { client } from "@composables/client";
const loading = ref(true);
const error = ref(null);
const notifications = ref([]);
const selectedNotification = ref(null);
function formatDateTime(value) {
if (!value) return "Unknown";
let date;
if (typeof value === "object" && typeof value.toDate === "function") {
date = value.toDate();
} else if (value?.seconds) {
date = new Date(value.seconds * 1000);
} else {
date = new Date(value);
}
if (!date || Number.isNaN(date.getTime())) return "Unknown";
return date.toLocaleString();
}
function openNotification(notification) {
selectedNotification.value = notification;
}
function closeDetails() {
selectedNotification.value = null;
}
async function loadNotifications() {
loading.value = true;
error.value = null;
notifications.value = [];
try {
const db = client.firestore;
if (!db) throw new Error("Firestore instance is not available.");
const col = collection(db, "notifications");
const snap = await getDocs(col);
const list = [];
snap.forEach((doc) => {
list.push({ id: doc.id, data: doc.data() });
});
notifications.value = list.sort((a, b) => {
const aTime = a.data?.updated || a.data?.created;
const bTime = b.data?.updated || b.data?.created;
const aDate = aTime?.toDate?.() || (aTime ? new Date(aTime) : new Date(0));
const bDate = bTime?.toDate?.() || (bTime ? new Date(bTime) : new Date(0));
return bDate - aDate;
});
} catch (err) {
console.error("Failed to load notifications", err);
error.value = "Failed to load notifications. " + (err?.message || String(err));
} finally {
loading.value = false;
}
}
onMounted(() => {
loadNotifications();
});
</script>
<style scoped>
.notifications-page {
display: flex;
justify-content: center;
padding: 2rem 1rem;
}

.notifications {
max-width: 900px;
width: 100%;
}

h1 {
margin-bottom: 0.25rem;
}

.notifications > p {
margin-bottom: 1.5rem;
color: #555;
}

.loading {
padding: 1rem 0;
}

.error {
color: #8b0000;
margin-bottom: 1rem;
}

.empty-state {
padding: 2rem 0;
text-align: center;
color: #666;
}

.notifications-list {
list-style: none;
padding-left: 0;
margin: 0;
}

.notification-item {
margin-bottom: 0.75rem;
}

.notification-button {
width: 100%;
text-align: left;
background: #ffffff;
border: 1px solid #ddd;
border-radius: 6px;
padding: 0.75rem 1rem;
cursor: pointer;
}

.notification-button:hover {
background: #f8f9fa;
}

.notification-title {
margin: 0 0 0.25rem 0;
font-size: 1.1rem;
}

.notification-excerpt {
margin: 0 0 0.25rem 0;
color: #555;
}

.notification-date {
margin: 0;
font-size: 0.9rem;
color: #777;
}

.notification-details {
border: 1px solid #ddd;
border-radius: 6px;
padding: 1.25rem 1rem 1rem 1rem;
background: #ffffff;
}

.back-btn {
background: none;
border: none;
color: #007bff;
cursor: pointer;
margin-bottom: 0.75rem;
padding: 0;
}

.back-btn:hover {
text-decoration: underline;
}

.notification-body {
margin-top: 0.5rem;
margin-bottom: 1rem;
}

.notification-actions {
list-style-type: none;
padding-left: 0;
margin: 0.5rem 0 0 0;
}

.notification-actions li {
margin-bottom: 0.5rem;
}

.action-link {
display: inline-block;
padding: 0.4rem 0.8rem;
border-radius: 4px;
border: 1px solid #007bff;
color: #007bff;
text-decoration: none;
font-size: 0.95rem;
}

.action-link:hover {
background: #007bff;
color: #ffffff;
}
</style>
