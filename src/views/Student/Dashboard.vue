<script setup>
import { ref, computed, onMounted } from 'vue';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { client } from '@composables/client';
import { useToast } from '@composables/toast';

const toaster = useToast();
const quizzes = ref([]);
const submissions = ref([]);
const loading = ref(true);
const selectedCategory = ref('all');

onMounted(async () => {
  try {
    // Get all batches where user is included
    const batchesQuery = query(
      collection(client.firestore, 'batches'),
      where('users', 'array-contains', client.session.uid)
    );
    const batchesSnapshot = await getDocs(batchesQuery);
    const userBatches = batchesSnapshot.docs.map(doc => doc.id);
    
    if (userBatches.length === 0) {
      toaster.addToast('No batches assigned to your account. Please contact administrator.', 'error');
      loading.value = false;
      return;
    }

    // Fetch quizzes for user's batches
    const quizzesQuery = query(
      collection(client.firestore, 'quizzes'),
      where('batchId', 'in', userBatches),
      where('isActive', '==', true)
    );
    
    const quizzesSnapshot = await getDocs(quizzesQuery);
    quizzes.value = quizzesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch user's submissions to check which quizzes they've already taken
    const submissionsQuery = query(
      collection(client.firestore, 'quiz-submissions'),
      where('userId', '==', client.session.uid)
    );
    const submissionsSnapshot = await getDocs(submissionsQuery);
    submissions.value = submissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    loading.value = false;
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    toaster.addToast('Failed to load quizzes', 'error');
    loading.value = false;
  }
});

const hasUserTakenQuiz = (quizId) => {
  return submissions.value.some(submission => submission.quizId === quizId);
};

const getUserSubmission = (quizId) => {
  return submissions.value.find(submission => submission.quizId === quizId);
};

const formatTimeLimit = (minutes) => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
};

const filteredQuizzes = computed(() => {
  if (selectedCategory.value === 'all') {
    return quizzes.value;
  }
  return quizzes.value.filter(quiz => quiz.category === selectedCategory.value);
});
</script>

<template>
  <div class="student-dashboard">
    <Head title="Tests" />
    
    <h1>Available Tests</h1>
    <p v-if="client.session">Welcome, {{ client.session.displayName }}! Here are the Tests available for your batch.</p>

    <div v-if="loading" class="loading">
      <p>Loading Tests...</p>
    </div>

    <div v-else-if="quizzes.length === 0" class="no-quizzes">
      <h2>No Tests Available</h2>
      <p>There are currently no active tests for your batch. Check back later!</p>
    </div>

    <div v-else class="quizzes-container">
      <div class="quiz-categories">
        <h3>Test Categories</h3>
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
            {{ category === 'all' ? 'All Tests' : category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) }}
          </button>
        </div>
      </div>

      <div class="quizzes-grid">
        <details v-for="quiz in filteredQuizzes" :key="quiz.id" name="available-quizzes" class="quiz-card">
          <summary>
            <div class="quiz-header">
              <h3>{{ quiz.name }},</h3>
             <div class="quiz-category">{{ quiz.category?.replace('-', ' ') || 'General' }},</div>
              <div class="quiz-meta">
                <span class="time-limit">{{ formatTimeLimit(quiz.timeLimit) }},</span>
                <span class="question-count">{{ quiz.questions?.length || 0 }} questions,</span>
               <span class="negative-marking">{{ quiz.hasNegativeMarking ? 'Negative Marking' : ' No Negative Marking' }}</span>
              </div>
            </div>
          </summary>
          
          <div class="quiz-details">
            <div class="quiz-description">
              <h4>Description</h4>
              <p>{{ quiz.description }}</p>
            </div>

            <div class="quiz-info">
              <div class="info-item">
                <strong>Time Limit:</strong> {{ formatTimeLimit(quiz.timeLimit) }}
              </div>
              <div class="info-item">
                <strong>Total Questions:</strong> {{ quiz.questions?.length || 0 }}
              </div>
              <div class="info-item">
                <strong>Total Points:</strong> 
                {{ quiz.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0 }}
              </div>
             <div class="info-item">
               <strong>Category:</strong> {{ quiz.category?.replace('-', ' ') || 'General' }}
             </div>
             <div class="info-item">
               <strong>Negative Marking:</strong> {{ quiz.hasNegativeMarking ? 'Yes' : 'No' }}
             </div>
            </div>

            <div class="quiz-instructions">
              <h4>Instructions</h4>
              <ul>
                <li>Read each question carefully before answering</li>
                <li>You have {{ formatTimeLimit(quiz.timeLimit) }} to complete the test</li>
                <li>The test will auto-submit when time runs out</li>
                <li>Make sure you have a stable internet connection</li>
                <li>You can only take this test once</li>
              </ul>
            </div>

            <div class="quiz-actions">
              <RouterLink 
                :to="`/test/${quiz.id}/take`" 
                class="start-quiz-btn"
                role="button"
              >
                Start Test
              </RouterLink>
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<style scoped>
.student-dashboard {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.loading {
  text-align: center;
  padding: 2rem;
}

.no-quizzes {
  text-align: center;
  padding: 3rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 2rem 0;
}

.no-quizzes h2 {
  color: #495057;
  margin-bottom: 1rem;
}

.quizzes-container {
  margin-top: 2rem;
}

.quiz-categories {
  margin-bottom: 2rem;
}

.quiz-categories h3 {
  margin-bottom: 1rem;
  color: #495057;
}

.category-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.category-tab {
  padding: 0.75rem 1rem;
  border: 2px solid #e9ecef;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.category-tab:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.category-tab.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.quizzes-grid {
  display: grid;
  gap: 1.5rem;
}

.quiz-card {
  border: 1px solid #ddd;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.quiz-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.quiz-card summary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  cursor: pointer;
  list-style: none;
}

.quiz-card summary::-webkit-details-marker {
  display: none;
}

.quiz-card summary::marker {
  display: none;
}

.quiz-header h3 {
  margin: 0 0 1rem 0;
  font-size: 1.3rem;
}

.quiz-category {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  display: inline-block;
}

.quiz-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.9rem;
  opacity: 0.9;
  flex-wrap: wrap;
}

.negative-marking {
  color: #ffc107;
}

.quiz-details {
  padding: 1.5rem;
  background: white;
}

.quiz-description {
  margin-bottom: 1.5rem;
}

.quiz-description h4 {
  margin-bottom: 0.5rem;
  color: #495057;
}

.quiz-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.info-item {
  font-size: 0.9rem;
}

.quiz-instructions {
  margin: 1.5rem 0;
}

.quiz-instructions h4 {
  margin-bottom: 0.5rem;
  color: #495057;
}

.quiz-instructions ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.quiz-instructions li {
  margin-bottom: 0.3rem;
  font-size: 0.9rem;
  color: #666;
}

.quiz-actions {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e9ecef;
}

.start-quiz-btn {
  display: inline-block;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 25px;
  text-decoration: none;
  font-weight: 500;
  font-size: 1.1rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.2);
}

.start-quiz-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
}

.start-quiz-btn:focus {
  outline: 2px solid #28a745;
  outline-offset: 2px;
}

.quiz-completed {
  text-align: center;
}

.completed-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  color: #155724;
}

.completed-icon {
  font-size: 2rem;
  color: #28a745;
  flex-shrink: 0;
}

.completed-text {
  text-align: left;
}

.completed-text strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.completed-text p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: #0f5132;
}

.start-quiz-btn.disabled {
  background: #6c757d;
  color: #fff;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

.start-quiz-btn.disabled:hover {
  transform: none;
  box-shadow: none;
  background: #6c757d;
}

@media (max-width: 768px) {
  .quiz-meta {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .quiz-info {
    grid-template-columns: 1fr;
  }
  
  .completed-message {
    flex-direction: column;
    text-align: center;
  }
  
  .completed-text {
    text-align: center;
  }
}
</style>