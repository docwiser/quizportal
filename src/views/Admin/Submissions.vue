<script setup>
import { ref, onMounted, computed } from "vue";
import { collection, getDocs, deleteDoc, doc as firestoreDoc } from "firebase/firestore";
import { client } from "@composables/client";
import { useToast } from "@composables/toast";
const toaster = useToast();
const submissions = ref([]);
const quizzes = ref([]);
const batches = ref([]);
const users = ref([]);
const loading = ref(true);
const selectedBatch = ref("");
const selectedQuiz = ref("");

const showDeleteModal = ref(false);
const submissionToDelete = ref(null);
const deleting = ref(false);

onMounted(async () => {
try {
const [submissionsSnapshot, quizzesSnapshot, batchesSnapshot, usersSnapshot] = await Promise.all([
getDocs(collection(client.firestore, "quiz-submissions")),
getDocs(collection(client.firestore, "quizzes")),
getDocs(collection(client.firestore, "batches")),
getDocs(collection(client.firestore, "users"))
]);

submissions.value = submissionsSnapshot.docs.map((doc) => ({
id: doc.id,
...doc.data()
})) || [];

quizzes.value = quizzesSnapshot.docs.map((doc) => ({
id: doc.id,
...doc.data()
})) || [];

batches.value = batchesSnapshot.docs.map((doc) => ({
id: doc.id,
...doc.data()
})) || [];

users.value = usersSnapshot.docs.map((doc) => ({
id: doc.id,
...doc.data()
})) || [];

loading.value = false;
} catch (error) {
console.error("Error fetching data:", error);
toaster.addToast("Failed to load submissions", "error");
loading.value = false;
}
});

const filteredSubmissions = computed(() => {
let filtered = submissions.value || [];

if (selectedBatch.value) {
filtered = filtered.filter((sub) => sub?.batchId === selectedBatch.value);
}

if (selectedQuiz.value) {
filtered = filtered.filter((sub) => sub?.quizId === selectedQuiz.value);
}

return filtered.sort((a, b) => {
const aTime = a?.timestamp?.toDate?.() || a?.timestamp;
const bTime = b?.timestamp?.toDate?.() || b?.timestamp;
const aDate = aTime ? new Date(aTime) : new Date(0);
const bDate = bTime ? new Date(bTime) : new Date(0);
return bDate - aDate;
});
});

const getQuizName = (quizId) => {
if (!quizId || !Array.isArray(quizzes.value)) return "Unknown Test";
const quiz = quizzes.value.find((q) => q?.id === quizId);
return quiz?.name || "Unknown Test";
};

const getBatchName = (batchId) => {
if (!batchId || !Array.isArray(batches.value)) return "Unknown Batch";
const batch = batches.value.find((b) => b?.id === batchId);
return batch?.name || "Unknown Batch";
};

const getUserLabel = (userId) => {
if (!userId || !Array.isArray(users.value)) return "Unknown User";
const user = users.value.find((u) => u?.id === userId);
if (!user) return "Unknown User";
const name = user.displayName || user.email || "Unknown User";
const email = user.email || "";
if (email && email !== name) {
return `${name} (${email})`;
}
return name;
};

const getQuizQuestions = (quizId) => {
if (!quizId || !Array.isArray(quizzes.value)) return [];
const quiz = quizzes.value.find((q) => q?.id === quizId);
return quiz?.questions || [];
};

const formatTimestamp = (timestamp) => {
if (!timestamp) return "Unknown";
const value = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
if (Number.isNaN(value?.getTime?.())) return "Unknown";
return value.toLocaleString();
};

const getAnswerText = (question, answer, language = "english") => {
if (!question || answer == null) return "";
if (question.type === "multiple-choice" && Array.isArray(question.options)) {
const optionIndex = parseInt(answer);
const option = question.options?.[optionIndex];
if (option) {
return option?.[language] || option?.english || option?.hindi || String(answer);
}
}
return String(answer);
};

const isCorrectAnswer = (question, answer) => {
if (!question) return null;
if (question.type === "multiple-choice") {
return parseInt(answer) === question.correctAnswer;
}
if (question.type === "true-false") {
return answer === question.correctAnswer;
}
return null;
};

function openDeleteModal(submission) {
submissionToDelete.value = submission;
showDeleteModal.value = true;
}

function closeDeleteModal() {
submissionToDelete.value = null;
showDeleteModal.value = false;
}

async function confirmDelete() {
if (!submissionToDelete.value) return;
deleting.value = true;
try {
const id = submissionToDelete.value.id;
await deleteDoc(firestoreDoc(client.firestore, "quiz-submissions", id));
submissions.value = (submissions.value || []).filter((s) => s.id !== id);
toaster.addToast("Submission deleted successfully.", "success");
closeDeleteModal();
} catch (error) {
console.error("Error deleting submission:", error);
toaster.addToast("Failed to delete submission.", "error");
} finally {
deleting.value = false;
}
}
</script>

<template>
<div class="submissions">
<Head title="Test Submissions" />

<h1>Test Submissions</h1>
<p>View and analyze student test submissions</p>

<div v-if="loading" class="loading">
<p>Loading submissions...</p>
</div>

<div v-else>
<div class="filters">
<div class="filter-group">
<label for="batch-filter">Filter by Batch:</label>
<select id="batch-filter" v-model="selectedBatch">
<option value="">All Batches</option>
<option v-for="batch in batches" :key="batch.id" :value="batch.id">
{{ batch.name || "Unknown Batch" }}
</option>
</select>
</div>

<div class="filter-group">
<label for="quiz-filter">Filter by Test:</label>
<select id="quiz-filter" v-model="selectedQuiz">
<option value="">All Tests</option>
<option v-for="quiz in quizzes" :key="quiz.id" :value="quiz.id">
{{ quiz.name || "Unknown Test" }}
</option>
</select>
</div>
</div>

<div class="submissions-summary">
<p><strong>{{ filteredSubmissions.length }}</strong> submissions found</p>
</div>

<div v-if="filteredSubmissions.length === 0" class="empty-state">
<p>No submissions found with the current filters.</p>
</div>

<div v-else class="submissions-list">
<details
v-for="submission in filteredSubmissions"
:key="submission.id"
name="submissions"
>
<summary>
<div class="submission-summary">
<strong>{{ getUserLabel(submission?.userId) }}</strong>
<span class="quiz-name">{{ getQuizName(submission?.quizId) }}</span>
<span class="batch-name">{{ getBatchName(submission?.batchId) }}</span>
<span class="score">Score: {{ submission?.score ?? 0 }}</span>
<span class="timestamp">{{ formatTimestamp(submission?.timestamp) }}</span>
</div>
</summary>

<div class="submission-details">
<div class="submission-info">
<h3>Submission Details</h3>
<p><strong>Student:</strong> {{ getUserLabel(submission?.userId) }}</p>
<p><strong>Test:</strong> {{ getQuizName(submission?.quizId) }}</p>
<p><strong>Batch:</strong> {{ getBatchName(submission?.batchId) }}</p>
<p><strong>Score:</strong> {{ submission?.score ?? 0 }} points</p>
<p><strong>Submitted:</strong> {{ formatTimestamp(submission?.timestamp) }}</p>
</div>

<div class="answers-section">
<h3>Answers</h3>
<div
v-if="submission?.answers && submission.answers.length > 0"
class="answers-list"
role="region"
aria-label="Answers list"
>
<div
v-for="(answer, index) in submission.answers"
:key="index"
class="answer-item"
role="group"
:aria-label="'Answer ' + (index + 1) + ' of ' + submission.answers.length"
>
<div class="question-info">
<h4>Question {{ index + 1 }}</h4>
<p class="question-text">
{{
getQuizQuestions(submission?.quizId)[index]?.text?.english ||
getQuizQuestions(submission?.quizId)[index]?.text?.hindi ||
"Question not found"
}}
</p>
</div>

<div class="answer-info">
<p>
<strong>Student Answer:</strong>
{{
getAnswerText(
getQuizQuestions(submission?.quizId)[index],
answer?.studentAnswer,
submission?.language
)
}}
</p>

<div
v-if="getQuizQuestions(submission?.quizId)[index]"
class="correct-answer"
>
<p>
<strong>Correct Answer:</strong>
<span
v-if="getQuizQuestions(submission?.quizId)[index]?.type === 'multiple-choice'"
>
{{
getAnswerText(
getQuizQuestions(submission?.quizId)[index],
getQuizQuestions(submission?.quizId)[index]?.correctAnswer,
submission?.language
)
}}
</span>
<span v-else>
{{ getQuizQuestions(submission?.quizId)[index]?.correctAnswer }}
</span>
</p>

<div class="answer-status">
<span
v-if="
isCorrectAnswer(
getQuizQuestions(submission?.quizId)[index],
answer?.studentAnswer
) === true
"
class="correct"
>
✓ Correct
</span>
<span
v-else-if="
isCorrectAnswer(
getQuizQuestions(submission?.quizId)[index],
answer?.studentAnswer
) === false
"
class="incorrect"
>
✗ Incorrect
</span>
<span
v-else
class="manual-check"
>
Manual review needed
</span>
</div>
</div>
</div>
</div>
</div>

<div v-else class="no-answers">
<p>No answers recorded for this submission.</p>
</div>
</div>

<div class="submission-actions">
<button type="button" class="delete-btn" @click="openDeleteModal(submission)">
Delete this submission
</button>
</div>
</div>
</details>
</div>
</div>

<div
v-if="showDeleteModal"
class="modal-backdrop"
role="dialog"
aria-modal="true"
aria-labelledby="delete-title"
>
<div class="modal">
<h2 id="delete-title">Delete submission</h2>
<p>
Are you sure you want to permanently delete this submission for
<strong>{{ submissionToDelete ? getUserLabel(submissionToDelete.userId) : "" }}</strong>?
This action cannot be undone.
</p>
<div class="modal-actions">
<button type="button" @click="closeDeleteModal" :disabled="deleting">
Cancel
</button>
<button type="button" class="danger" @click="confirmDelete" :disabled="deleting">
{{ deleting ? "Deleting…" : "Yes, delete" }}
</button>
</div>
</div>
</div>
</div>
</template>

<style scoped>
.submissions {
max-width: 1200px;
margin: 0 auto;
padding: 2rem;
}

.loading {
text-align: center;
padding: 2rem;
}

.filters {
display: flex;
gap: 2rem;
margin: 2rem 0;
flex-wrap: wrap;
}

.filter-group {
display: flex;
flex-direction: column;
gap: 0.5rem;
}

.filter-group label {
font-weight: 500;
}

.filter-group select {
padding: 0.5rem;
border: 1px solid #ddd;
border-radius: 4px;
min-width: 200px;
}

.submissions-summary {
margin: 1rem 0;
padding: 1rem;
background: #f8f9fa;
border-radius: 4px;
}

.empty-state {
text-align: center;
padding: 2rem;
color: #666;
}

.submissions-list {
margin-top: 2rem;
}

.submissions-list details {
margin-bottom: 1rem;
border: 1px solid #ddd;
border-radius: 8px;
overflow: hidden;
}

.submissions-list summary {
background: #f8f9fa;
padding: 1rem;
cursor: pointer;
}

.submissions-list summary:hover {
background: #e9ecef;
}

.submission-summary {
display: flex;
align-items: center;
gap: 1rem;
flex-wrap: wrap;
}

.quiz-name {
color: #007bff;
font-weight: 500;
}

.batch-name {
color: #6c757d;
font-size: 0.9rem;
}

.score {
background: #28a745;
color: white;
padding: 0.2rem 0.5rem;
border-radius: 4px;
font-size: 0.9rem;
}

.timestamp {
color: #6c757d;
font-size: 0.9rem;
margin-left: auto;
}

.submission-details {
padding: 1.5rem;
background: white;
}

.submission-info {
margin-bottom: 2rem;
padding: 1rem;
background: #f8f9fa;
border-radius: 4px;
}

.answers-section h3 {
margin-bottom: 1rem;
}

.answer-item {
margin-bottom: 1.5rem;
padding: 1rem;
border: 1px solid #e9ecef;
border-radius: 4px;
}

.question-info h4 {
margin-bottom: 0.5rem;
color: #495057;
}

.question-text {
font-style: italic;
color: #6c757d;
margin-bottom: 1rem;
}

.answer-info {
margin-top: 1rem;
}

.correct-answer {
margin-top: 0.5rem;
padding-top: 0.5rem;
border-top: 1px solid #e9ecef;
}

.answer-status {
margin-top: 0.5rem;
}

.correct {
color: #28a745;
font-weight: 500;
}

.incorrect {
color: #dc3545;
font-weight: 500;
}

.manual-check {
color: #ffc107;
font-weight: 500;
}

.no-answers {
text-align: center;
padding: 2rem;
color: #666;
}

.submission-actions {
margin-top: 1.5rem;
text-align: right;
}

.delete-btn {
padding: 0.4rem 0.8rem;
border-radius: 4px;
border: 1px solid #dc3545;
background: #fff;
color: #dc3545;
cursor: pointer;
font-size: 0.95rem;
}

.delete-btn:hover {
background: #dc3545;
color: #fff;
}

.modal-backdrop {
position: fixed;
inset: 0;
background: rgba(0, 0, 0, 0.45);
display: flex;
align-items: center;
justify-content: center;
z-index: 40;
}

.modal {
background: #fff;
max-width: 420px;
width: 100%;
padding: 1.5rem;
border-radius: 8px;
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
}

.modal h2 {
margin-top: 0;
margin-bottom: 0.75rem;
}

.modal-actions {
display: flex;
justify-content: flex-end;
gap: 0.75rem;
margin-top: 1.25rem;
}

.modal-actions button {
padding: 0.45rem 0.9rem;
border-radius: 4px;
border: 1px solid #ccc;
background: #f8f9fa;
cursor: pointer;
}

.modal-actions button.danger {
border-color: #dc3545;
background: #dc3545;
color: #fff;
}

.modal-actions button:disabled {
opacity: 0.7;
cursor: default;
}
</style>
