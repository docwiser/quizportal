<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { client } from '@composables/client';
import { useToast } from '@composables/toast';
import { useRouter, useRoute } from 'vue-router';

const toaster = useToast();
const router = useRouter();
const route = useRoute();

const quiz = ref(null);
const questions = ref([]);
const loading = ref(true);

const questionTypes = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'short-answer', label: 'Short Answer' },
  { value: 'true-false', label: 'True/False' },
  { value: 'essay', label: 'Essay' }
];

const languages = ['english', 'hindi'];

onMounted(async () => {
  try {
    const quizDoc = await getDoc(doc(client.firestore, 'quizzes', route.params.id));
    if (quizDoc.exists()) {
      quiz.value = { id: quizDoc.id, ...quizDoc.data() };
      questions.value = quiz.value.questions || [];
      if (questions.value.length === 0) {
        addQuestion();
      }
    } else {
      toaster.addToast('Quiz not found', 'error');
      router.push('/admin/dashboard');
    }
    loading.value = false;
  } catch (error) {
    console.error('Error fetching quiz:', error);
    toaster.addToast('Failed to load quiz', 'error');
    loading.value = false;
  }
});

const addQuestion = () => {
  const newQuestion = {
    id: Date.now().toString(),
    type: 'multiple-choice',
    text: { english: '', hindi: '' },
    options: [
      { english: '', hindi: '' },
      { english: '', hindi: '' }
    ],
    correctAnswer: 0,
    points: 1,
    negativeMarking: 0.25
  };
  questions.value.push(newQuestion);
};

const removeQuestion = (index) => {
  if (questions.value.length > 1) {
    questions.value.splice(index, 1);
  }
};

const addOption = (questionIndex) => {
  questions.value[questionIndex].options.push({ english: '', hindi: '' });
};

const removeOption = (questionIndex, optionIndex) => {
  if (questions.value[questionIndex].options.length > 2) {
    questions.value[questionIndex].options.splice(optionIndex, 1);
    // Adjust correct answer if needed
    if (questions.value[questionIndex].correctAnswer >= questions.value[questionIndex].options.length) {
      questions.value[questionIndex].correctAnswer = 0;
    }
  }
};

const saveQuiz = async () => {
  try {
    // Validate questions
    const validQuestions = questions.value.filter(q => 
      q.text.english.trim() !== '' || q.text.hindi.trim() !== ''
    );
    
    if (validQuestions.length === 0) {
      toaster.addToast('Please add at least one question', 'error');
      return;
    }

    // Validate each question
    for (let i = 0; i < validQuestions.length; i++) {
      const question = validQuestions[i];
      if (!question.text.english.trim() && !question.text.hindi.trim()) {
        toaster.addToast(`Question ${i + 1} must have text in at least one language`, 'error');
        return;
      }
      
      if (question.type === 'multiple-choice') {
        const hasValidOptions = question.options.some(opt => opt.english.trim() || opt.hindi.trim());
        if (!hasValidOptions) {
          toaster.addToast(`Question ${i + 1} must have at least one option with text`, 'error');
          return;
        }
      }
    }

    await updateDoc(doc(client.firestore, 'quizzes', route.params.id), {
      questions: validQuestions,
      updatedAt: new Date()
    });

    toaster.addToast('Quiz saved successfully!', 'success');
    router.push('/admin/dashboard');
  } catch (error) {
    console.error('Error saving quiz:', error);
    toaster.addToast('Failed to save quiz', 'error');
  }
};
</script>

<template>
  <div class="question-add">
    <Head title="Add Questions" />
    
    <div v-if="loading" class="loading">
      <p>Loading quiz...</p>
    </div>

    <div v-else>
      <h1>Add Questions to "{{ quiz?.name }}"</h1>
      <p>Create questions for your quiz. Students will see these in the order you create them.</p>

      <div class="questions-container">
        <div v-for="(question, questionIndex) in questions" :key="question.id" class="question-editor">
          <div class="question-header">
            <h3>Question {{ questionIndex + 1 }}</h3>
            <button 
              v-if="questions.length > 1"
              @click="removeQuestion(questionIndex)"
              class="remove-btn"
              type="button"
            >
              Remove Question
            </button>
          </div>

          <div class="question-form">
            <!-- Question Type -->
            <div class="form-group">
              <label>Question Type</label>
              <select v-model="question.type" class="form-control">
                <option v-for="type in questionTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>

            <!-- Question Text -->
            <div class="form-group">
              <label>Question Text</label>
              <div class="language-inputs">
                <div class="language-input">
                  <label>English</label>
                  <textarea 
                    v-model="question.text.english" 
                    class="form-control"
                    placeholder="Enter question in English"
                    rows="3"
                  ></textarea>
                </div>
                <div class="language-input">
                  <label>Hindi</label>
                  <textarea 
                    v-model="question.text.hindi" 
                    class="form-control"
                    placeholder="Enter question in Hindi"
                    rows="3"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Points and Negative Marking -->
            <div class="form-row">
              <div class="form-group">
                <label>Points</label>
                <input 
                  type="number" 
                  v-model.number="question.points" 
                  class="form-control"
                  min="1" 
                  max="10"
                >
              </div>
              <div class="form-group">
                <label>Negative Marking</label>
                <input 
                  type="number" 
                  v-model.number="question.negativeMarking" 
                  class="form-control"
                  min="0" 
                  max="1" 
                  step="0.25"
                >
              </div>
            </div>

            <!-- Multiple Choice Options -->
            <div v-if="question.type === 'multiple-choice'" class="options-section">
              <div class="options-header">
                <h4>Answer Options</h4>
                <button @click="addOption(questionIndex)" type="button" class="add-option-btn">
                  Add Option
                </button>
              </div>

              <div v-for="(option, optionIndex) in question.options" :key="optionIndex" class="option-group">
                <div class="option-header">
                  <span class="option-label">Option {{ String.fromCharCode(65 + optionIndex) }}</span>
                  <button 
                    v-if="question.options.length > 2"
                    @click="removeOption(questionIndex, optionIndex)"
                    type="button"
                    class="remove-option-btn"
                  >
                    Remove
                  </button>
                </div>
                
                <div class="language-inputs">
                  <div class="language-input">
                    <label>English</label>
                    <input 
                      type="text" 
                      v-model="option.english" 
                      class="form-control"
                      :placeholder="`Option ${String.fromCharCode(65 + optionIndex)} in English`"
                    >
                  </div>
                  <div class="language-input">
                    <label>Hindi</label>
                    <input 
                      type="text" 
                      v-model="option.hindi" 
                      class="form-control"
                      :placeholder="`Option ${String.fromCharCode(65 + optionIndex)} in Hindi`"
                    >
                  </div>
                </div>
              </div>

              <!-- Correct Answer Selection -->
              <div class="form-group">
                <label>Correct Answer</label>
                <select v-model.number="question.correctAnswer" class="form-control">
                  <option v-for="(option, index) in question.options" :key="index" :value="index">
                    Option {{ String.fromCharCode(65 + index) }} - {{ option.english || option.hindi || 'Empty' }}
                  </option>
                </select>
              </div>
            </div>

            <!-- True/False Options -->
            <div v-else-if="question.type === 'true-false'" class="form-group">
              <label>Correct Answer</label>
              <select v-model="question.correctAnswer" class="form-control">
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>

            <!-- Short Answer / Essay Sample Answer -->
            <div v-else-if="question.type === 'short-answer' || question.type === 'essay'" class="form-group">
              <label>Sample Answer / Keywords (for manual grading)</label>
              <div class="language-inputs">
                <div class="language-input">
                  <label>English</label>
                  <textarea 
                    v-model="question.correctAnswer.english" 
                    class="form-control"
                    placeholder="Sample answer in English"
                    rows="3"
                  ></textarea>
                </div>
                <div class="language-input">
                  <label>Hindi</label>
                  <textarea 
                    v-model="question.correctAnswer.hindi" 
                    class="form-control"
                    placeholder="Sample answer in Hindi"
                    rows="3"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="actions">
        <button @click="addQuestion" type="button" class="btn secondary">
          Add Another Question
        </button>
        <button @click="saveQuiz" type="button" class="btn primary">
          Save Quiz
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-add {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading {
  text-align: center;
  padding: 2rem;
}

.questions-container {
  margin: 2rem 0;
}

.question-editor {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 2rem;
  overflow: hidden;
}

.question-header {
  background: #f8f9fa;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ddd;
}

.question-header h3 {
  margin: 0;
  color: #495057;
}

.remove-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.remove-btn:hover {
  background: #c82333;
}

.question-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #495057;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
}

.form-control:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.language-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.language-input label {
  font-size: 0.9rem;
  color: #6c757d;
}

.options-section {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 1rem;
  background: #f8f9fa;
}

.options-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.options-header h4 {
  margin: 0;
  color: #495057;
}

.add-option-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.add-option-btn:hover {
  background: #218838;
}

.option-group {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.option-label {
  font-weight: 500;
  color: #495057;
}

.remove-option-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8rem;
}

.remove-option-btn:hover {
  background: #c82333;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 2rem 0;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn.primary {
  background: #007bff;
  color: white;
}

.btn.primary:hover {
  background: #0056b3;
}

.btn.secondary {
  background: #6c757d;
  color: white;
}

.btn.secondary:hover {
  background: #545b62;
}

@media (max-width: 768px) {
  .language-inputs {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .question-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}
</style>