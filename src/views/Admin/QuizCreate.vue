<script setup>
import { ref, onMounted } from 'vue';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { client } from '@composables/client';
import { useToast } from '@composables/toast';
import { useRouter } from 'vue-router';

const toaster = useToast();
const router = useRouter();
const batches = ref([]);
const loading = ref(true);

const quizSchema = ref([
  {
    name: 'name',
    type: 'text',
    label: 'Quiz Name',
    required: true,
    help: 'Enter a descriptive name for the quiz'
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Quiz Description',
    required: true,
    help: 'Provide details about the quiz content and objectives'
  },
  {
    name: 'batchId',
    type: 'select',
    label: 'Target Batch',
    required: true,
    options: [],
    help: 'Select which batch this quiz is for'
  },
  {
    name: 'timeLimit',
    type: 'number',
    label: 'Time Limit (minutes)',
    required: true,
    min: 1,
    max: 180,
    value: 30,
    help: 'Quiz will auto-submit after this time'
  },
  {
    name: 'submit',
    type: 'submit',
    value: 'Create Quiz & Add Questions'
  }
]);

onMounted(async () => {
  try {
    const batchesSnapshot = await getDocs(collection(client.firestore, 'batches'));
    batches.value = batchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Update schema with batch options
    const batchField = quizSchema.value.find(field => field.name === 'batchId');
    batchField.options = batches.value.map(batch => ({
      value: batch.id,
      label: batch.name
    }));

    loading.value = false;
  } catch (error) {
    console.error('Error fetching batches:', error);
    toaster.addToast('Failed to load batches', 'error');
    loading.value = false;
  }
});

const handleSubmit = async (formData) => {
  try {
    const quizData = {
      name: formData.name,
      description: formData.description,
      batchId: formData.batchId,
      timeLimit: parseInt(formData.timeLimit),
      questions: [],
      createdBy: client.session.uid,
      createdAt: new Date(),
      isActive: true
    };

    const docRef = await addDoc(collection(client.firestore, 'quizzes'), quizData);
    
    toaster.addToast('Quiz created successfully! Now add questions.', 'success');
    router.push(`/admin/quiz/${docRef.id}/questions`);
  } catch (error) {
    console.error('Error creating quiz:', error);
    toaster.addToast('Failed to create quiz. Please try again.', 'error');
  }
};
</script>

<template>
  <div class="quiz-create">
    <Head title="Create Quiz" />
    
    <h1>Create New Quiz</h1>
    <p>Set up a new quiz for students. After creating the quiz, you'll be able to add questions.</p>

    <div v-if="loading" class="loading">
      <p>Loading batches...</p>
    </div>

    <div v-else class="form-container">
      <Form 
        :schema="quizSchema" 
        formname="quiz-create"
        @submit="handleSubmit"
      />
    </div>

    <div class="help-section">
      <details name="quiz-help">
        <summary>Need Help?</summary>
        <div class="help-content">
          <h3>Creating a Quiz</h3>
          <ul>
            <li><strong>Quiz Name:</strong> Choose a clear, descriptive name that students will recognize</li>
            <li><strong>Description:</strong> Explain what topics the quiz covers and any special instructions</li>
            <li><strong>Target Batch:</strong> Select which batch of students can take this quiz</li>
            <li><strong>Time Limit:</strong> Set how long students have to complete the quiz (1-180 minutes)</li>
          </ul>
          <p>After creating the quiz, you'll be redirected to add questions. You can add multiple choice, short answer, and other question types.</p>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.quiz-create {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.loading {
  text-align: center;
  padding: 2rem;
}

.form-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin: 2rem 0;
}

.help-section {
  margin-top: 2rem;
}

.help-content {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
  margin-top: 0.5rem;
}

.help-content ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.help-content li {
  margin-bottom: 0.5rem;
}

details summary {
  cursor: pointer;
  padding: 0.75rem;
  background: #e9ecef;
  border-radius: 4px;
  font-weight: 500;
}

details summary:hover {
  background: #dee2e6;
}
</style>