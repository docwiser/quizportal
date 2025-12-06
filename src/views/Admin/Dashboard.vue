<script setup>
import { ref, computed, onMounted } from "vue";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { client } from "@composables/client";
import { useToast } from "@composables/toast";

const toaster = useToast();
const quizzes = ref([]);
const batches = ref([]);
const loading = ref(true);
const selectedCategory = ref("all");

// per-quiz schedule editing state
const scheduleEdits = ref({}); // { [quizId]: { startDate, endDate, startTime, endTime, saving } }

onMounted(async () => {
try {
const batchesSnapshot = await getDocs(collection(client.firestore, "batches"));
batches.value =
batchesSnapshot.docs.map((d) => ({
id: d.id,
...d.data()
})) || [];

const quizzesSnapshot = await getDocs(collection(client.firestore, "quizzes"));
quizzes.value =
quizzesSnapshot.docs.map((d) => ({
id: d.id,
...d.data()
})) || [];

loading.value = false;
} catch (error) {
console.error("Error fetching data:", error);
toaster.addToast("Failed to load dashboard data", "error");
loading.value = false;
}
});

const getBatchNames = (quiz) => {
const ids = Array.isArray(quiz.batches)
? quiz.batches
: quiz.batchId
? [quiz.batchId]
: [];
if (!ids.length) return "No batches assigned";
const names = ids
.map((id) => batches.value.find((b) => b.id === id)?.name)
.filter(Boolean);
return names.length ? names.join(", ") : "Unknown Batch";
};

const filteredQuizzes = computed(() => {
if (selectedCategory.value === "all") {
return quizzes.value;
}
return quizzes.value.filter((quiz) => quiz.category === selectedCategory.value);
});

// lazy-init editing state for a quiz
const getScheduleEdit = (quiz) => {
if (!scheduleEdits.value[quiz.id]) {
scheduleEdits.value[quiz.id] = {
startDate: quiz.startDate || "",
endDate: quiz.endDate || "",
startTime: quiz.startTime || "",
endTime: quiz.endTime || "",
saving: false
};
}
return scheduleEdits.value[quiz.id];
};

const rescheduleQuiz = async (quiz) => {
const edit = getScheduleEdit(quiz);

if (!edit.startDate || !edit.endDate || !edit.startTime || !edit.endTime) {
toaster.addToast(
"Please fill in all schedule fields (start date, end date, start time, end time) before updating.",
"error"
);
return;
}

try {
edit.saving = true;
await updateDoc(doc(client.firestore, "quizzes", quiz.id), {
startDate: edit.startDate,
endDate: edit.endDate,
startTime: edit.startTime,
endTime: edit.endTime,
updatedAt: new Date()
});

const localQuiz = quizzes.value.find((q) => q.id === quiz.id);
if (localQuiz) {
localQuiz.startDate = edit.startDate;
localQuiz.endDate = edit.endDate;
localQuiz.startTime = edit.startTime;
localQuiz.endTime = edit.endTime;
}

toaster.addToast("Test schedule updated successfully.", "success");
} catch (error) {
console.error("Error updating schedule:", error);
toaster.addToast("Failed to update test schedule.", "error");
} finally {
edit.saving = false;
}
};

const deleteQuiz = async (quizId) => {
if (
confirm(
"Are you sure you want to delete this test? This action cannot be undone."
)
) {
try {
await deleteDoc(doc(client.firestore, "quizzes", quizId));
quizzes.value = quizzes.value.filter((quiz) => quiz.id !== quizId);
toaster.addToast("Test deleted successfully", "success");
} catch (error) {
console.error("Error deleting quiz:", error);
toaster.addToast("Failed to delete test", "error");
}
}
};
</script>

<template>
<div class="admin-dashboard">
<Head title="Admin Dashboard" />

<h1>Admin Dashboard</h1>
<p>Welcome to the Saint Joseph's Academy Test Administration Panel</p>

<div v-if="loading" class="loading">
<p>Loading dashboard...</p>
</div>

<div v-else class="dashboard-content">
<section class="quick-actions">
<h2>Quick Actions</h2>
<div class="action-buttons">
<RouterLink
role="button"
to="/admin/test/create"
class="action-btn primary"
>
Create New Test
</RouterLink>
<RouterLink
role="button"
to="/admin/submissions"
class="action-btn secondary"
>
View Submissions
</RouterLink>
</div>
</section>

<section class="stats-overview">
<h2>Overview</h2>
<div class="stats-grid">
<div class="stat-card">
<h3>Total Tests</h3>
<p class="stat-number">{{ quizzes.length }}</p>
</div>
<div class="stat-card">
<h3>Total Batches</h3>
<p class="stat-number">{{ batches.length }}</p>
</div>
</div>
</section>

<section class="recent-quizzes">
<h2>Recent Tests</h2>
<div class="quiz-categories">
<div class="category-tabs">
<button
v-for="category in ['all', 'mock-test', 'revision-test', 'practice-test']"
:key="category"
@click="selectedCategory = category"
:class="{ active: selectedCategory === category }"
class="category-tab"
role="tab"
:aria-selected="selectedCategory === category"
>
{{
category === "all"
? "All"
: category
.replace("-", " ")
.replace(/\b\w/g, (l) => l.toUpperCase())
}}
</button>
</div>
</div>

<div v-if="quizzes.length === 0" class="empty-state">
<p>
No tests created yet.
<RouterLink role="button" to="/admin/test/create">
Create your first test
</RouterLink>
</p>
</div>

<div v-else class="quiz-list">
<details
v-for="quiz in filteredQuizzes.slice(0, 5)"
:key="quiz.id"
name="recent-quizzes"
>
<summary>
<strong>{{ quiz.name }}</strong>
–
<span class="batch-names">
{{ getBatchNames(quiz) }}
</span>
<span class="quiz-category">
{{ quiz.category?.replace("-", " ") || "General" }}
</span>
</summary>

<div class="quiz-details">
<p>
<strong>Description:</strong>
{{ quiz.description }}
</p>
<p>
<strong>Category:</strong>
{{ quiz.category?.replace("-", " ") || "General" }}
</p>
<p>
<strong>Schedule:</strong>
From {{ quiz.startDate || "N/A" }} to
{{ quiz.endDate || "N/A" }}
({{ quiz.startTime || "N/A" }} – {{ quiz.endTime || "N/A" }}
– 24-hour format)
</p>
<p>
<strong>Questions:</strong>
{{ quiz.questions?.length || 0 }}
</p>
<p>
<strong>Negative Marking:</strong>
{{ quiz.hasNegativeMarking ? "Yes" : "No" }}
</p>

<div class="quiz-actions">
<RouterLink
role="button"
:to="`/admin/test/${quiz.id}/questions`"
class="btn-link"
>
Edit Questions
</RouterLink>
<button @click="deleteQuiz(quiz.id)" class="btn-delete">
Delete Test
</button>
</div>

<div class="reschedule">
<h3>Reschedule Test</h3>
<p class="reschedule-note">
Update the test date and time. Dates use the browser's date picker
format; time is in 24-hour format <code>hh:mm</code>.
</p>
<div class="reschedule-grid">
<label>
Start Date
<input
type="date"
v-model="getScheduleEdit(quiz).startDate"
/>
</label>
<label>
End Date
<input
type="date"
v-model="getScheduleEdit(quiz).endDate"
/>
</label>
<label>
Start Time (24-hour)
<input
type="time"
v-model="getScheduleEdit(quiz).startTime"
/>
</label>
<label>
End Time (24-hour)
<input
type="time"
v-model="getScheduleEdit(quiz).endTime"
/>
</label>
</div>

<button
type="button"
class="btn-reschedule"
@click="rescheduleQuiz(quiz)"
:disabled="getScheduleEdit(quiz).saving"
>
{{
getScheduleEdit(quiz).saving
? "Updating schedule..."
: "Update Schedule"
}}
</button>
</div>
</div>
</details>
</div>
</section>
</div>
</div>
</template>

<style scoped>
.admin-dashboard {
max-width: 1200px;
margin: 0 auto;
padding: 2rem;
}

.loading {
text-align: center;
padding: 2rem;
}

.dashboard-content {
display: grid;
gap: 2rem;
}

.quick-actions {
background: #f8f9fa;
padding: 1.5rem;
border-radius: 8px;
}

.action-buttons {
display: flex;
gap: 1rem;
flex-wrap: wrap;
}

.action-btn {
padding: 0.75rem 1.5rem;
border-radius: 6px;
text-decoration: none;
font-weight: 500;
transition: all 0.2s ease;
}

.action-btn.primary {
background: #007bff;
color: white;
}

.action-btn.primary:hover {
background: #0056b3;
}

.action-btn.secondary {
background: #6c757d;
color: white;
}

.action-btn.secondary:hover {
background: #545b62;
}

.stats-grid {
display: grid;
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
gap: 1rem;
margin-top: 1rem;
}

.stat-card {
background: white;
padding: 1.5rem;
border-radius: 8px;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
text-align: center;
}

.stat-number {
font-size: 2rem;
font-weight: bold;
color: #007bff;
margin: 0.5rem 0;
}

.quiz-list {
margin-top: 1rem;
}

.quiz-details {
padding: 1rem;
background: #f8f9fa;
margin-top: 0.5rem;
border-radius: 4px;
}

.quiz-actions {
margin-top: 1rem;
display: flex;
gap: 1rem;
flex-wrap: wrap;
}

.btn-link {
color: #007bff;
text-decoration: none;
font-weight: 500;
}

.btn-link:hover {
text-decoration: underline;
}

.btn-delete {
background: #dc3545;
color: white;
border: none;
padding: 0.25rem 0.5rem;
border-radius: 3px;
cursor: pointer;
font-size: 0.8rem;
}

.btn-delete:hover {
background: #c82333;
}

.quiz-categories {
margin-bottom: 1rem;
}

.category-tabs {
display: flex;
gap: 0.5rem;
flex-wrap: wrap;
}

.category-tab {
padding: 0.5rem 1rem;
border: 1px solid #ddd;
background: white;
border-radius: 4px;
cursor: pointer;
font-size: 0.9rem;
}

.category-tab:hover {
background: #f8f9fa;
}

.category-tab.active {
background: #007bff;
color: white;
border-color: #007bff;
}

.quiz-category {
background: #6c757d;
color: white;
padding: 0.2rem 0.5rem;
border-radius: 3px;
font-size: 0.8rem;
margin-left: 0.5rem;
}

.batch-names {
font-size: 0.9rem;
color: #555;
}

.empty-state {
text-align: center;
padding: 2rem;
color: #666;
}

details summary {
cursor: pointer;
padding: 0.75rem;
background: white;
border: 1px solid #ddd;
border-radius: 4px;
margin-bottom: 0.5rem;
}

details summary:hover {
background: #f8f9fa;
}

/* Reschedule UI */
.reschedule {
margin-top: 1.5rem;
padding-top: 1rem;
border-top: 1px dashed #ccc;
}

.reschedule h3 {
margin-bottom: 0.5rem;
font-size: 1rem;
}

.reschedule-note {
font-size: 0.9rem;
color: #666;
margin-bottom: 0.75rem;
}

.reschedule-note code {
font-family: monospace;
}

.reschedule-grid {
display: grid;
grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
gap: 0.75rem;
margin-bottom: 0.75rem;
}

.reschedule-grid label {
display: flex;
flex-direction: column;
gap: 0.25rem;
font-size: 0.9rem;
}

.reschedule-grid input[type="date"],
.reschedule-grid input[type="time"] {
padding: 0.35rem 0.5rem;
border-radius: 4px;
border: 1px solid #ccc;
font-size: 0.9rem;
}

.btn-reschedule {
background: #17a2b8;
color: white;
border: none;
padding: 0.5rem 1.25rem;
border-radius: 4px;
cursor: pointer;
font-size: 0.9rem;
font-weight: 500;
}

.btn-reschedule:hover:enabled {
background: #138496;
}

.btn-reschedule:disabled {
opacity: 0.7;
cursor: not-allowed;
}

@media (max-width: 768px) {
.admin-dashboard {
padding: 1rem;
}
}
</style>
