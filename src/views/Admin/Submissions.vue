<script setup>
import { ref, onMounted, computed } from 'vue';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { client } from '@composables/client';
import { useToast } from '@composables/toast';

const toaster = useToast();
const submissions = ref([]);
const quizzes = ref([]);
const batches = ref([]);
const users = ref([]);
const loading = ref(true);

const selectedBatch = ref('');
const selectedQuiz = ref('');

onMounted(async () => {
  try {
    // Fetch all data
    const [submissionsSnapshot, quizzesSnapshot, batchesSnapshot, usersSnapshot] = await Promise.all([
      getDocs(collection(client.firestore, 'quiz-submissions')),
      getDocs(collection(client.firestore, 'quizzes')),
      getDocs(collection(client.firestore, 'batches')),
      getDocs(collection(client.firestore, 'users'))
    ]);

    submissions.value = submissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    quizzes.value = quizzesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    batches.value = batchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    users.value = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    loading.value = false;
  } catch (error) {
    console.error('Error fetching data:', error);
    toaster.addToast('Failed to load submissions', 'error');
    loading.value = false;
  }
});

const filteredSubmissions = computed(() => {
  let filtered = submissions.value;

  if (selectedBatch.value) {
    filtered = filtered.filter(sub => sub.batchId === selectedBatch.value);
  }

  if (selectedQuiz.value) {
    filtered = filtered.filter(sub => sub.quizId === selectedQuiz.value);
  }

  return filtered.sort((a, b) => new Date(b.timestamp?.toDate?.() || b.timestamp) - new Date(a.timestamp?.toDate?.() || a.timestamp));
});

const getQuizName = (quizId) => {
  const quiz = quizzes.value.find(q => q.id === quizId);
  return quiz ? quiz.name : 'Unknown Quiz';
};

const getBatchName = (batchId) => {
  const batch = batches.value.find(b => b.id === batchId);
  return batch ? batch.name : 'Unknown Batch';
};

const getUserName = (userId) => {
  const user = users.value.find(u => u.id === userId);
  return user ? user.displayName || user.email : 'Unknown User';
};

const getQuizQuestions = (quizId) => {
  const quiz = quizzes.value.find(q => q.id === quizId);
  return quiz ? quiz.questions || [] : [];
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString();
};

const getAnswerText = (question, answer, language = 'english') => {
  if (question.type === 'multiple-choice' && question.options) {
    const optionIndex = parseInt(answer);
    const option = question.options[optionIndex];
    if (option) {
      return option[language] || option.english || option.hindi || answer;
    }
  }
  return answer;
};

const isCorrectAnswer = (question, answer) => {
  if (question.type === 'multiple-choice') {
    return parseInt(answer) === question.correctAnswer;
  }
  if (question.type === 'true-false') {
    return answer === question.correctAnswer;
  }
  // For other types, manual checking would be needed
  return null;
};
</script>

<template>
  <div class="submissions">
    <Head title="Quiz Submissions" />
    
    <h1>Quiz Submissions</h1>
    <p>View and analyze student quiz submissions</p>

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
              {{ batch.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label for="quiz-filter">Filter by Quiz:</label>
          <select id="quiz-filter" v-model="selectedQuiz">
            <option value="">All Quizzes</option>
            <option v-for="quiz in quizzes" :key="quiz.id" :value="quiz.id">
              {{ quiz.name }}
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
        <details v-for="submission in filteredSubmissions" :key="submission.id" name="submissions">
          <summary>
            <div class="submission-summary">
              <strong>{{ getUserName(submission.userId) }}</strong>
              <span class="quiz-name">{{ getQuizName(submission.quizId) }}</span>
              <span class="batch-name">{{ getBatchName(submission.batchId) }}</span>
              <span class="score">Score: {{ submission.score || 0 }}</span>
              <span class="timestamp">{{ formatTimestamp(submission.timestamp) }}</span>
            </div>
          </summary>

          <div class="submission-details">
            <div class="submission-info">
              <h3>Submission Details</h3>
              <p><strong>Student:</strong> {{ getUserName(submission.userId) }}</p>
              <p><strong>Quiz:</strong> {{ getQuizName(submission.quizId) }}</p>
              <p><strong>Batch:</strong> {{ getBatchName(submission.batchId) }}</p>
              <p><strong>Score:</strong> {{ submission.score || 0 }} points</p>
              <p><strong>Submitted:</strong> {{ formatTimestamp(submission.timestamp) }}</p>
            </div>

            <div class="answers-section">
              <h3>Answers</h3>
              <div v-if="submission.answers && submission.answers.length > 0" class="answers-list">
                <div v-for="(answer, index) in submission.answers" :key="index" class="answer-item">
                  <div class="question-info">
                    <h4>Question {{ index + 1 }}</h4>
                    <p class="question-text">
                      {{ getQuizQuestions(submission.quizId)[index]?.text?.english || 
                         getQuizQuestions(submission.quizId)[index]?.text?.hindi || 
                         'Question not found' }}
                    </p>
                  </div>
                  
                  <div class="answer-info">
                    <p><strong>Student Answer:</strong> 
                      {{ getAnswerText(getQuizQuestions(submission.quizId)[index], answer.studentAnswer, submission.language) }}
                    </p>
                    
                    <div v-if="getQuizQuestions(submission.quizId)[index]" class="correct-answer">
                      <p><strong>Correct Answer:</strong> 
                        <span v-if="getQuizQuestions(submission.quizId)[index].type === 'multiple-choice'">
                          {{ getAnswerText(getQuizQuestions(submission.quizId)[index], getQuizQuestions(submission.quizId)[index].correctAnswer, submission.language) }}
                        </span>
                        <span v-else>
                          {{ getQuizQuestions(submission.quizId)[index].correctAnswer }}
                        </span>
                      </p>
                      
                      <div class="answer-status">
                        <span v-if="isCorrectAnswer(getQuizQuestions(submission.quizId)[index], answer.studentAnswer)" class="correct">
                          ✓ Correct
                        </span>
                        <span v-else-if="isCorrectAnswer(getQuizQuestions(submission.quizId)[index], answer.studentAnswer) === false" class="incorrect">
                          ✗ Incorrect
                        </span>
                        <span v-else class="manual-check">
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
          </div>
        </details>
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
</style>