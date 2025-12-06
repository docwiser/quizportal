<template>
<main>
<Head title="Apply for a course" />
<section class="apply-courses">
<h1>Apply for a Course</h1>
<div v-if="loading" role="status" aria-live="polite">Loading courses…</div>
<div v-if="error" role="alert" class="error">{{ error }}</div>
<div v-if="!selectedCourse" class="courses-list" role="list">
<div v-if="!loading && courses.length === 0" role="status" aria-live="polite">
No courses available.
</div>
<ul v-else style="list-style:none; padding-left:0;">
<li v-for="c in courses" :key="c.id" role="listitem" class="course-row">
<button
class="course-btn"
@click="openCourse(c)"
type="button"
>
<div class="course-name">{{ c.data?.name || "(Unnamed course)" }}</div>
<div class="course-summary">{{ c.data?.summary || "" }}</div>
</button>
</li>
</ul>
</div>
<div v-else class="course-details" role="region" :aria-label="`Details for ${selectedCourse.data?.name || selectedCourse.id}`">
<button class="back-btn" @click="closeDetails" aria-label="Back to courses">← Back</button>
<h2>{{ selectedCourse.data?.name || "(Unnamed course)" }}</h2>
<p v-if="selectedCourse.data?.summary"><strong>Summary:</strong> {{ selectedCourse.data.summary }}</p>
<p v-if="selectedCourse.data?.startDate"><strong>Start:</strong> {{ formatDate(selectedCourse.data.startDate) }}</p>
<p v-if="selectedCourse.data?.duration"><strong>Duration:</strong> {{ formatDate(selectedCourse.data.duration) }}</p>
<div v-if="selectedCourse.data?.description">
<strong>Description</strong>
<p>{{ selectedCourse.data.description }}</p>
</div>
<PreviewPlayer v-if="selectedCourse?.data?.demoLink" :src="selectedCourse?.data?.demoLink" label="Play demo lecture" />
<hr />
<div v-if="appLoading" role="status" aria-live="polite">Checking application status…</div>
<div v-if="!appLoading && application === null" class="apply-block" role="form" aria-live="polite">
<p>
<strong>Disclaimer:</strong>
By submitting an application you request evaluation by academy staff. If approved, an appropriate batch will be assigned and you will receive email notification with next steps. Your student ID card for the course will be generated and delivered by email upon enrollment.
</p>
<button @click="applyForCourse" :disabled="submitting">
{{ submitting ? "Applying…" : "Apply" }}
</button>
</div>
<div v-else-if="!appLoading && application?.status === 'pending'">
<h2>In review.</h2>
<p>you're request has been sent to the admin. you'll be added to a batch within 24 to 48 hours. if you were not added in this time, please contact <a role="button" href="ext:tel:9693939396">9693939396</a></p>
<p v-if="application?.created"><strong>Applied:</strong> {{ formatDateTime(application.created) }}</p>
</div>
<div v-else-if="!appLoading && application?.status === 'approved'">
<h2>Approved</h2>
<p>Your application has been approved by the academy. you may access the course from your <RouterLink role="button" to="/courses">Study room</RouterLink>for any issues, Please Contact <a role="button" href="ext:tel:9693939396">9693939396</a></p>
<p v-if="application?.created"><strong>Applied:</strong> {{ formatDateTime(application.created) }}</p>
<p v-if="application?.updated"><strong>Approved:</strong> {{ formatDateTime(application.updated) }}</p>
</div>
<div v-else-if="!appLoading && application?.status === 'rejected'">
<h2>Rejected</h2>
<p>your request to join this course has been rejected by an admin. if you think this was a mistake, Please contact <a role="button" href="ext:tel:9693939396">9693939396</a></p>
<p v-if="application?.reason"><strong>Rejected reason:</strong> {{application.reason}}</p>
<p v-if="application?.created"><strong>Applied:</strong> {{ formatDateTime(application.created) }}</p>
<p v-if="application?.updated"><strong>Rejected:</strong> {{ formatDateTime(application.updated) }}</p>
</div>
<div v-else-if="!appLoading && application">
<p><strong>Current status:</strong> {{ application.status }}</p>
<p v-if="application?.created"><strong>Applied:</strong> {{ formatDateTime(application.created) }}</p>
<p v-if="application?.updated"><strong>Updated:</strong> {{ formatDateTime(application.updated) }}</p>
</div>
</div>
</section>
</main>
</template>
<script setup>
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { client } from "@composables/client";
import { collection, getDocs, doc as firestoreDoc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import PreviewPlayer from "./previewPlayer.vue";
const loading = ref(true);
const error = ref(null);
const courses = ref([]);
const selectedCourse = ref(null);
const application = ref(null);
const appLoading = ref(false);
const submitting = ref(false);
function formatDate(value) {
if (!value) return "";
if (typeof value === "object" && typeof value.toDate === "function") {
const d = value.toDate();
return d.toLocaleDateString();
}
if (value?.seconds) {
return new Date(value.seconds * 1000).toLocaleDateString();
}
const dt = new Date(value);
if (!Number.isNaN(dt.getTime())) return dt.toLocaleDateString();
return String(value);
}
function formatDateTime(value) {
if (!value) return "";
if (typeof value === "object" && typeof value.toDate === "function") {
const d = value.toDate();
return d.toLocaleString();
}
if (value?.seconds) {
return new Date(value.seconds * 1000).toLocaleString();
}
const dt = new Date(value);
if (!Number.isNaN(dt.getTime())) return dt.toLocaleString();
return String(value);
}
async function loadCourses() {
loading.value = true;
error.value = null;
courses.value = [];
try {
const db = client.firestore;
if (!db) throw new Error("Firestore instance not available on client.firestore");
const col = collection(db, "courses");
const snap = await getDocs(col);
if (snap.empty) {
courses.value = [];
} else {
const list = [];
snap.forEach((s) => {
list.push({ id: s.id, data: s.data() });
});
courses.value = list;
}
} catch (err) {
console.error("Failed to load courses", err);
error.value = "Failed to load courses: " + (err?.message || String(err));
} finally {
loading.value = false;
}
}
function openCourse(course) {
selectedCourse.value = course;
loadApplicationForCourse(course.id);
}
function closeDetails() {
selectedCourse.value = null;
application.value = null;
appLoading.value = false;
}
function applicationDocIdFor(uid, courseId) {
return `${uid}_${courseId}`;
}
async function loadApplicationForCourse(courseId) {
appLoading.value = true;
application.value = null;
error.value = null;
try {
const user = client?.auth?.currentUser;
if (!user || !user.uid) {
throw new Error("No signed-in user found.");
}
const db = client.firestore;
const docId = applicationDocIdFor(user.uid, courseId);
const docRef = firestoreDoc(db, "apply-course", docId);
const snap = await getDoc(docRef);
if (!snap.exists()) {
application.value = null;
} else {
application.value = snap.data();
}
} catch (err) {
console.error("Failed to load application", err);
error.value = "Failed to load application status: " + (err?.message || String(err));
} finally {
appLoading.value = false;
}
}
async function applyForCourse() {
if (!selectedCourse.value) return;
submitting.value = true;
error.value = null;
try {
const user = client?.auth?.currentUser;
if (!user || !user.uid) throw new Error("No signed-in user.");
const db = client.firestore;
const courseId = selectedCourse.value.id;
const docId = applicationDocIdFor(user.uid, courseId);
const payload = {
name: user.displayName || "",
email: user.email || "",
uid: user.uid,
course: courseId,
created: serverTimestamp(),
updated: serverTimestamp(),
status: "pending"
};
const docRef = firestoreDoc(db, "apply-course", docId);
await setDoc(docRef, payload, { merge: true });
await loadApplicationForCourse(courseId);
} catch (err) {
console.error("Failed to apply", err);
error.value = "Failed to apply: " + (err?.message || String(err));
} finally {
submitting.value = false;
}
}
onMounted(() => {
loadCourses();
});
</script>
<style scoped>
.apply-courses {
max-width: 900px;
margin: 0 auto;
padding: 1rem;
}
.course-row {
margin-bottom: 0.5rem;
}
.course-btn {
display: block;
width: 100%;
text-align: left;
padding: 0.6rem;
border-radius: 6px;
border: 1px solid #ddd;
background: #fff;
cursor: pointer;
}
.course-btn:hover {
box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.course-name {
font-weight: 600;
}
.course-summary {
font-size: 0.95rem;
color: #555;
}
.course-details {
border: 1px solid #ddd;
padding: 1rem;
border-radius: 6px;
}
.back-btn {
background: none;
border: none;
color: #007bff;
margin-bottom: 0.5rem;
cursor: pointer;
}
.apply-block button {
padding: 0.5rem 0.9rem;
border-radius: 4px;
cursor: pointer;
}
.error {
color: #8b0000;
}
</style>
