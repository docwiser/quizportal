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

<div v-if="!loading && batches.length > 0" role="list" class="batches-list">
<details v-for="batch in batches" :key="batch.id" class="batch-details">
<summary class="batch-summary">
<strong>{{ batch.data.name || "Unnamed batch" }}</strong>
<small v-if="batch.data.timing"> — {{ batch.data.timing }}</small>
</summary>

<div class="batch-body" role="region" :aria-label="`Batch ${batch.data.name || batch.id}`">
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

<div v-else-if="Array.isArray(batch.courses) && batch.courses.length === 0" role="status">
No courses in this batch.
</div>

<ul v-else class="courses-list" role="list" aria-label="Courses" style="list-style-type:none;padding-left:0;">
<li v-for="course in batch.courses" :key="course.id" role="listitem" class="course-item">
<div class="course-content">
<div class="course-title">
<strong>{{ course.data?.name || course.id }}</strong>
</div>
<div v-if="course.data?.summary" class="course-desc">
{{ course.data.summary }}
</div>
<div class="course-actions">
<button v-if="course.data?.link" @click="openLink(course.data.link)" type="button">
Open
</button>
</div>
</div>
</li>
</ul>

<div class="batch-actions">
<button v-if="batch.data.recordedLecturesLink" @click="openLink(batch.data.recordedLecturesLink)" type="button">
Watch recorded lectures
</button>

<button v-if="batch.data.studyMaterialsLink" @click="openLink(batch.data.studyMaterialsLink)" type="button">
Study materials
</button>

<button v-if="batch.data.link" @click="handleJoinClick(batch)" type="button" :disabled="!isJoinAllowed(batch)">
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
import { collection, query, where, getDocs, doc as firestoreDoc, getDoc as getDocFromRef } from "firebase/firestore";

const loading = ref(true);
const error = ref(null);
const batches = ref([]);

const now = ref(new Date());
const offsetMs = ref(0);
let timerId = null;

const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

function getCurrentDayName() {
return DAY_NAMES[now.value.getDay()];
}

function daysUntilNextAllowedDay(allowedDays) {
if (!Array.isArray(allowedDays) || !allowedDays.length) return null;
const todayIndex = now.value.getDay();
const allowedIndexes = allowedDays.map(d => DAY_NAMES.indexOf(d.toLowerCase())).filter(i => i >= 0).sort((a,b)=>a-b);
for (const idx of allowedIndexes) {
if (idx > todayIndex) return idx - todayIndex;
}
return (7 - todayIndex) + allowedIndexes[0];
}

function openLink(url) {
if (!url) return;
window.open(url, "_blank", "noopener,noreferrer");
}

async function syncServerTime() {
try {
const res = await fetch("https://worldtimeapi.org/api/ip");
const data = await res.json();
const serverDate = new Date(data.utc_datetime || data.datetime);
offsetMs.value = serverDate.getTime() - Date.now();
now.value = new Date(Date.now() + offsetMs.value);
} catch {
offsetMs.value = 0;
now.value = new Date();
}
}

function parseTimeStringToToday(timeStr, baseDate) {
if (!timeStr) return null;
const [hh, mm] = timeStr.split(":").map(Number);
if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
const d = new Date(baseDate);
d.setHours(hh, mm, 0, 0);
return d;
}

function getJoinWindow(batch) {
const startStr = batch?.data?.startTime;
const endStr = batch?.data?.endTime;
if (!startStr || !endStr) return null;
const base = now.value;
const start = parseTimeStringToToday(startStr, base);
const end = parseTimeStringToToday(endStr, base);
if (!start || !end) return null;
return {
openAt: new Date(start.getTime() - 15 * 60000),
closeAt: new Date(end.getTime() + 15 * 60000)
};
}

function isJoinAllowed(batch) {
const allowedDays = batch?.data?.allowedDays;
if (Array.isArray(allowedDays) && allowedDays.length) {
const today = getCurrentDayName();
if (!allowedDays.map(d => d.toLowerCase()).includes(today)) return false;
}
const window = getJoinWindow(batch);
if (!window) return true;
return now.value >= window.openAt && now.value <= window.closeAt;
}

function formatDuration(ms) {
if (!ms || ms <= 0) return "";
let s = Math.floor(ms / 1000);
const h = Math.floor(s / 3600); s -= h * 3600;
const m = Math.floor(s / 60); s -= m * 60;
const parts = [];
if (h) parts.push(`${h} hour${h !== 1 ? "s" : ""}`);
if (m) parts.push(`${m} minute${m !== 1 ? "s" : ""}`);
if (s) parts.push(`${s} second${s !== 1 ? "s" : ""}`);
return parts.join(" ");
}

function timeRestrictedText(batch) {
const allowedDays = batch?.data?.allowedDays;
if (Array.isArray(allowedDays) && allowedDays.length) {
const today = getCurrentDayName();
const normalized = allowedDays.map(d => d.toLowerCase());
if (!normalized.includes(today)) {
const days = daysUntilNextAllowedDay(normalized);
return days != null
? `This batch isn’t for today. You can join after ${days} day${days !== 1 ? "s" : ""}.`
: "This batch isn’t for today.";
}
}
const window = getJoinWindow(batch);
if (!window) return "Join Classroom";
if (now.value < window.openAt) {
const diff = window.openAt.getTime() - now.value.getTime();
const counter = formatDuration(diff);
return counter ? `This class has not started yet. You can join in ${counter}.` : "This class has not started yet.";
}
if (now.value > window.closeAt) return "This class has ended.";
return "Join Classroom";
}

function handleJoinClick(batch) {
if (!isJoinAllowed(batch)) return;
if (batch?.data?.link) openLink(batch.data.link);
}

async function fetchCourseById(db, courseId) {
try {
const snap = await getDocFromRef(firestoreDoc(db, "courses", courseId));
return snap.exists() ? { id: courseId, data: snap.data() } : { id: courseId, data: null };
} catch (e) {
return { id: courseId, data: { _fetchError: String(e) } };
}
}

async function loadCoursesForBatch(db, batch) {
batch.courses = null;
const ids = Array.isArray(batch.data?.courses) ? batch.data.courses : [];
if (!ids.length) {
batch.courses = [];
return;
}
batch.courses = await Promise.all(ids.map(cid => fetchCourseById(db, cid)));
}

async function loadBatchesAndCourses() {
loading.value = true;
error.value = null;
batches.value = [];
try {
const uid = client?.auth?.currentUser?.uid;
if (!uid) {
error.value = "No signed-in user found.";
loading.value = false;
return;
}
const q = query(collection(client.firestore, "batches"), where("users", "array-contains", uid));
const snap = await getDocs(q);
const list = [];
snap.forEach(s => list.push({ id: s.id, data: s.data(), courses: [] }));
batches.value = list;
await Promise.all(list.map(b => loadCoursesForBatch(client.firestore, b)));
} catch (e) {
error.value = "Failed to load batches. " + String(e?.message || e);
} finally {
loading.value = false;
}
}

onMounted(async () => {
await syncServerTime();
await loadBatchesAndCourses();
timerId = setInterval(() => {
now.value = new Date(Date.now() + offsetMs.value);
}, 1000);
});

onUnmounted(() => {
if (timerId) clearInterval(timerId);
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
padding: 0.5rem 1rem 1rem;
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
