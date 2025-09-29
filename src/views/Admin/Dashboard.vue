0<script setup>
import { ref, computed, onMounted } from 'vue';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { client } from '@composables/client';
import { useToast } from '@composables/toast';

const toaster = useToast();
const quizzes = ref([]);
const batches = ref([]);
const loading = ref(true);
const selectedCategory = ref('all');

onMounted(async () => {
  try {
    // Fetch batches
    const batchesSnapshot = await getDocs(collection(client.firestore, 'batches'));
    batches.value = batchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch quizzes
    const quizzesSnapshot = await getDocs(collection(client.firestore, 'quizzes'));
    quizzes.value = quizzesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    loading.value = false;
  } catch (error) {
    console.error('Error fetching data:', error);
    toaster.addToast('Failed to load dashboard data', 'error');
    loading.value = false;
  }
});

const getBatchName = (batchId) => {
  const batch = batches.value.find(b => b.id === batchId);
  return batch ? batch.name : 'Unknown Batch';
};

const filteredQuizzes = computed(() => {
  if (selectedCategory.value === 'all') {
    return quizzes.value;
  }
  return quizzes.value.filter(quiz => quiz.category === selectedCategory.value);
});

const deleteQuiz = async (quizId) => {
  if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
    try {
      await deleteDoc(doc(client.firestore, 'quizzes', quizId));
      quizzes.value = quizzes.value.filter(quiz => quiz.id !== quizId);
      toaster.addToast('Quiz deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toaster.addToast('Failed to delete quiz', 'error');
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
          <RouterLink role="button" to="/admin/test/create" class="action-btn primary">
            Create New Test
          </RouterLink>
          <RouterLink role="button" to="/admin/submissions" class="action-btn secondary">
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
              {{ category === 'all' ? 'All' : category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) }}
            </button>
          </div>
        </div>
        <div v-if="quizzes.length === 0" class="empty-state">
          <p>No tests created yet. <RouterLink role="button" to="/admin/test/create">Create your first test</RouterLink></p>
        </div>
        <div v-else class="quiz-list">
          <details v-for="quiz in filteredQuizzes.slice(0, 5)" :key="quiz.id" name="recent-quizzes">
            <summary>
              <strong>{{ quiz.name }}</strong> - {{ getBatchName(quiz.batchId) }} 
              <span class="quiz-category">{{ quiz.category?.replace('-', ' ') || 'General' }}</span>
            </summary>
            <div class="quiz-details">
              <p><strong>Description:</strong> {{ quiz.description }}</p>
             <p><strong>Category:</strong> {{ quiz.category?.replace('-', ' ') || 'General' }}</p>
              <p><strong>Time Limit:</strong> {{ quiz.timeLimit }} minutes</p>
              <p><strong>Questions:</strong> {{ quiz.questions?.length || 0 }}</p>
             <p><strong>Negative Marking:</strong> {{ quiz.hasNegativeMarking ? 'Yes' : 'No' }}</p>
              <div class="quiz-actions">
                <RouterLink role="button" :to="`/admin/test/${quiz.id}/questions`" class="btn-link">
                  Edit Questions
                </RouterLink>
                <button @click="deleteQuiz(quiz.id)" class="btn-delete">
                  Delete Test
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
</style>