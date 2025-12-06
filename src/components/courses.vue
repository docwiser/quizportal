<template>
<main>
<Head title="Study room" />
<section>
<h1>Study room</h1>

<div v-if="loading">
Loading your batches…
</div>

<div v-if="error" role="alert" class="error">
{{ error }}
</div>

<div v-if="!loading && batches.length === 0">
You do not currently have access to any batches. If you have already applied for a course, please wait for an administrator to assign a batch for you in that course. If you have not yet applied, you can visit the “Apply for a new course” page to submit your request.
</div>

<div
v-if="!loading && batches.length > 0"
role="list"
class="batches-list"
>
<details
v-for="batch in batches"
:key="batch.id"
class="batch-details"
>
<summary class="batch-summary">
<strong>{{ batch.data.name || "Unnamed batch" }}</strong>
<small v-if="batch.data.timing"> — {{ batch.data.timing }}</small>
</summary>

<div
class="batch-body"
role="region"
:aria-label="`Batch ${batch.data.name || batch.id}`"
>
<p v-if="batch.data.description">
<strong>Description:</strong> {{ batch.data.description }}
</p>
<p v-if="batch.data.additional_info">
{{ batch.data.additional_info }}
</p>

<h3>Courses</h3>

<div v-if="batch.courses === null" role="status">
Loading courses…
</div>

<div
v-else-if="Array.isArray(batch.courses) && batch.courses.length === 0"
role="status"
>
No courses in this batch.
</div>

<ul
v-else
class="courses-list"
role="list"
aria-label="Courses"
style="list-style-type: none; padding-left: 0;"
>
<li
v-for="course in batch.courses"
:key="course.id"
role="listitem"
class="course-item"
>
<div class="course-content">
<div class="course-title">
<strong>{{ course.data?.name || course.id }}</strong>
</div>
<div
v-if="course.data?.description"
class="course-desc"
>
{{ course.data.description }}
</div>
<div class="course-actions">
<button
v-if="course.data?.link"
@click="openLink(course.data.link)"
type="button"
>
Open
</button>
</div>
</div>
</li>
</ul>

<div class="batch-actions">
<button
v-if="batch.data.recordedLecturesLink"
@click="openLink(batch.data.recordedLecturesLink)"
type="button"
>
Watch recorded lectures
</button>

<button
v-if="batch.data.studyMaterialsLink"
@click="openLink(batch.data.studyMaterialsLink)"
type="button"
>
Study materials
</button>

<button
v-if="batch.data.link"
@click="handleJoinClick(batch)"
type="button"
:disabled="!isJoinAllowed(batch)"
>
{{ timeRestrictedText(batch) }}
</button>
</div>
</div>
</details>
</div>
</section>
</main>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { client } from "@composables/client";
import {
collection,
query,
where,
getDocs,
doc as firestoreDoc,
getDoc as getDocFromRef
} from "firebase/firestore";
import PreviewPlayer from "./previewPlayer.vue";

const loading = ref(true);
const error = ref(null);
const batches = ref([]);

// Server-based time
const now = ref(new Date());
const offsetMs = ref(0); // serverTime - clientTime
let timerId = null;

function openLink(url) {
if (!url) return;
window.open(url, "_blank", "noopener,noreferrer");
}

// Fetch current time from a time API and compute offset
async function syncServerTime() {
try {
const response = await fetch("https://worldtimeapi.org/api/ip");
if (!response.ok) {
throw new Error("Failed to fetch server time");
}
const data = await response.json();
const serverDate = new Date(data.utc_datetime || data.datetime);
const clientNow = Date.now();
offsetMs.value = serverDate.getTime() - clientNow;
now.value = new Date(clientNow + offsetMs.value);
} catch (e) {
console.error("Error syncing server time:", e);
// Fallback: use local time if API fails
offsetMs.value = 0;
now.value = new Date();
}
}

// startTime / endTime are "HH:MM" strings from <input type="time" />
function parseTimeStringToToday(timeStr, baseDate) {
if (!timeStr || typeof timeStr !== "string") return null;
const parts = timeStr.split(":");
if (parts.length < 2) return null;
const hours = Number(parts[0]);
const minutes = Number(parts[1]);
if (
Number.isNaN(hours) ||
Number.isNaN(minutes) ||
hours < 0 ||
hours > 23 ||
minutes < 0 ||
minutes > 59
) {
return null;
}
const d = new Date(baseDate);
d.setHours(hours, minutes, 0, 0);
return d;
}

function getJoinWindow(batch) {
const startStr = batch?.data?.startTime;
const endStr = batch?.data?.endTime;
if (!startStr || !endStr) return null;

const base = now.value || new Date();
const start = parseTimeStringToToday(startStr, base);
const end = parseTimeStringToToday(endStr, base);
if (!start || !end) return null;

const openAt = new Date(start.getTime() - 15 * 60 * 1000);
const closeAt = new Date(end.getTime() + 15 * 60 * 1000);
return { openAt, closeAt };
}

function isJoinAllowed(batch) {
const window = getJoinWindow(batch);
if (!window) return true;
const current = now.value;
return current >= window.openAt && current <= window.closeAt;
}

function formatDuration(ms) {
if (!ms || ms <= 0) return "";
let totalSeconds = Math.floor(ms / 1000);
const hours = Math.floor(totalSeconds / 3600);
totalSeconds -= hours * 3600;
const minutes = Math.floor(totalSeconds / 60);
const seconds = totalSeconds - minutes * 60;

const parts = [];
if (hours > 0) {
parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
}
if (minutes > 0) {
parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
}
if (seconds > 0) {
parts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`);
}
return parts.join(" ");
}

function timeRestrictedText(batch) {
const window = getJoinWindow(batch);
if (!window) {
return "Join Classroom";
}
const current = now.value;

if (current < window.openAt) {
const diff = window.openAt.getTime() - current.getTime();
const counter = formatDuration(diff);
if (counter) {
return `This class has not started yet. You can join in ${counter}.`;
}
return "This class has not started yet.";
}

if (current > window.closeAt) {
return "This class has ended.";
}

return "Join Classroom";
}

function handleJoinClick(batch) {
if (!isJoinAllowed(batch)) {
return;
}
if (batch?.data?.link) {
openLink(batch.data.link);
}
}

async function fetchCourseById(db, courseId) {
try {
const courseRef = firestoreDoc(db, "courses", courseId);
const snap = await getDocFromRef(courseRef);
if (!snap.exists()) {
return { id: courseId, data: null };
}
return { id: courseId, data: snap.data() };
} catch (err) {
return { id: courseId, data: { _fetchError: String(err) } };
}
}

async function loadCoursesForBatch(db, batch) {
batch.courses = null;
const ids = Array.isArray(batch.data?.courses) ? batch.data.courses : [];
if (ids.length === 0) {
batch.courses = [];
return;
}
const coursePromises = ids.map((cid) => fetchCourseById(db, cid));
const results = await Promise.all(coursePromises);
batch.courses = results;
}

async function loadBatchesAndCourses() {
loading.value = true;
error.value = null;
batches.value = [];
try {
const db = client.firestore;
const user = client?.auth?.currentUser;
if (!user || !user.uid) {
error.value = "No signed-in user found.";
loading.value = false;
return;
}
const uid = user.uid;
const batchesCol = collection(db, "batches");
const q = query(batchesCol, where("users", "array-contains", uid));
const snapshot = await getDocs(q);
if (snapshot.empty) {
batches.value = [];
loading.value = false;
return;
}
const batchDocs = [];
snapshot.forEach((s) => {
batchDocs.push({ id: s.id, data: s.data(), courses: [] });
});
batches.value = batchDocs;
await Promise.all(batchDocs.map((b) => loadCoursesForBatch(db, b)));
} catch (err) {
console.error("Error loading batches/courses", err);
error.value = "Failed to load batches. " + (err?.message || String(err));
} finally {
loading.value = false;
}
}

onMounted(() => {
loadBatchesAndCourses();
syncServerTime();
now.value = new Date(Date.now() + offsetMs.value);
timerId = setInterval(() => {
now.value = new Date(Date.now() + offsetMs.value);
}, 1000);
});

onUnmounted(() => {
if (timerId) {
clearInterval(timerId);
}
});
</script>

<style scoped>
section {
max-width: 900px;
margin: 0 auto;
padding: 1rem;
}

.batch-details {
border: 1px solid #ddd;
border-radius: 6px;
margin-bottom: 0.75rem;
padding: 0.25rem 0.5rem;
}

.batch-summary {
cursor: pointer;
display: flex;
justify-content: space-between;
align-items: center;
gap: 1rem;
padding: 0.5rem;
}

.batch-body {
padding: 0.5rem 1rem 1rem 1rem;
}

.courses-list .course-item {
padding: 0.5rem 0;
border-bottom: 1px dashed #eee;
}

.course-actions button,
.batch-actions button {
margin-top: 0.5rem;
padding: 0.35rem 0.6rem;
border-radius: 4px;
cursor: pointer;
}

.batch-actions {
display: flex;
flex-wrap: wrap;
gap: 0.5rem;
margin-top: 0.75rem;
}

.error {
color: #8b0000;
}
</style>
