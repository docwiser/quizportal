<script setup>
import { ref, onMounted, computed } from 'vue';
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
  questions.value.push({
    id: Date.now().toString(),
    type: 'multiple-choice',
    text: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 1
  });
};

const removeQuestion = (index) => {
  if (questions.value.length > 1) {
    questions.value.splice(index, 1);
  }
};

const getQuestionSchema = (question, index) => {
  const baseSchema = [
    {
      name: 'text',
      type: 'textarea',
      label: 'Question Text',
      required: true,
      value: question.text,
      help: 'Enter the question that students will answer'
    },
    {
      name: 'type',
      type: 'select',
      label: 'Question Type',
      required: true,
      options: questionTypes,
      value: question.type,
      help: 'Select the type of question'
    },
    {
      name: 'points',
      type: 'number',
      label: 'Points',
      required: true,
      min: 1,
      max: 10,
      value: question.points,
      help: 'How many points this question is worth'
    }
  ];

  if (question.type === 'multiple-choice') {
    baseSchema.push(
      {
        name: 'option1',
        type: 'text',
        label: 'Option A',
        required: true,
        value: question.options?.[0] || '',
        help: 'First answer option'
      },
      {
        name: 'option2',
        type: 'text',
        label: 'Option B',
        required: true,
        value: question.options?.[1] || '',
        help: 'Second answer option'
      },
      {
        name: 'option3',
        type: 'text',
        label: 'Option C',
        required: true,
        value: question.options?.[2] || '',
        help: 'Third answer option'
      },
      {
        name: 'option4',
        type: 'text',
        label: 'Option D',
        required: true,
        value: question.options?.[3] || '',
        help: 'Fourth answer option'
      },
      {
        name: 'correctAnswer',
        type: 'select',
        label: 'Correct Answer',
        required: true,
        options: [
          { value: '0', label: 'Option A' },
          { value: '1', label: 'Option B' },
          { value: '2', label: 'Option C' },
          { value: '3', label: 'Option D' }
        ],
        value: question.correctAnswer,
        help: 'Select which option is correct'
      }
    );
  } else if (question.type === 'true-false') {
    baseSchema.push({
      name: 'correctAnswer',
      type: 'select',
      label: 'Correct Answer',
      required: true,
      options: [
        { value: 'true', label: 'True' },
        { value: 'false', label: 'False' }
      ],
      value: question.correctAnswer,
      help: 'Select the correct answer'
    });
  } else if (question.type === 'short-answer' || question.type === 'essay') {
    baseSchema.push({
      name: 'correctAnswer',
      type: 'textarea',
      label: 'Sample Answer / Keywords',
      value: question.correctAnswer,
      help: 'Provide a sample answer or keywords for manual grading'
    });
  }

  return baseSchema;
};

const handleQuestionChange = (questionIndex, formData) => {
  const question = questions.value[questionIndex];
  question.text = formData.text;
  question.type = formData.type;
  question.points = parseInt(formData.points);

  if (formData.type === 'multiple-choice') {
    question.options = [
      formData.option1,
      formData.option2,
      formData.option3,
      formData.option4
    ];
    question.correctAnswer = formData.correctAnswer;
  } else {
    question.correctAnswer = formData.correctAnswer;
    if (formData.type !== 'multiple-choice') {
      delete question.options;
    }
  }
};

const saveQuiz = async () => {
  try {
    // Validate questions
    const validQuestions = questions.value.filter(q => q.text.trim() !== '');
    if (validQuestions.length === 0) {
      toaster.addToast('Please add at least one question', 'error');
      return;
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
        <div v-for="(question, index) in questions" :key="question.id" class="question-editor">
          <details :name="`question-${index}`" open>
            <summary>
              <strong>Question {{ index + 1 }}</strong>
              <span v-if="question.text" class="question-preview">
                - {{ question.text.substring(0, 50) }}{{ question.text.length > 50 ? '...' : '' }}
              </span>
              <button 
                v-if="questions.length > 1"
                @click.stop="removeQuestion(index)"
                class="remove-btn"
                aria-label="Remove question"
              >
                ×
              </button>
            </summary>
            
            <div class="question-form">
              <Form 
                :schema="getQuestionSchema(question, index)"
                :formname="`question-${index}`"
                @submit="(data) => handleQuestionChange(index, data)"
                @change="(data) => handleQuestionChange(index, data)"
              />
            </div>
          </details>
        </div>
      </div>

      <div class="actions">
        <button @click="addQuestion" class="btn secondary">
          Add Another Question
        </button>
        <button @click="saveQuiz" class="btn primary">
          Save Quiz
        </button>
      </div>

      <div class="help-section">
        <details name="question-help">
          <summary>Question Types Help</summary>
          <div class="help-content">
            <h3>Question Types</h3>
            <ul>
              <li><strong>Multiple Choice:</strong> Students select one correct answer from 4 options</li>
              <li><strong>Short Answer:</strong> Students type a brief text response</li>
              <li><strong>True/False:</strong> Students choose between true or false</li>
              <li><strong>Essay:</strong> Students provide a longer written response</li>
            </ul>
            <p><strong>Points:</strong> Assign 1-10 points per question based on difficulty</p>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-add {
  max-width: 1000px;
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
  margin-bottom: 1.5rem;
}

.question-editor details {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.question-editor summary {
  background: #f8f9fa;
  padding: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
}

.question-editor summary:hover {
  background: #e9ecef;
}

.question-preview {
  color: #666;
  font-style: italic;
  flex: 1;
}

.remove-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  margin-left: auto;
}

.remove-btn:hover {
  background: #c82333;
}

.question-form {
  padding: 1.5rem;
  background: white;
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
</style>