<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { doc, getDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { client } from '@composables/client';
import { useToast } from '@composables/toast';
import { useRouter, useRoute } from 'vue-router';
import jsPDF from 'jspdf';

const toaster = useToast();
const router = useRouter();
const route = useRoute();

const quiz = ref(null);
const currentQuestionIndex = ref(0);
const selectedLanguage = ref('english');
const answers = ref([]);
const timeRemaining = ref(0);
const timerInterval = ref(null);
const loading = ref(true);
const submitting = ref(false);
const showLanguageSelection = ref(true);
const quizStarted = ref(false);
const quizCompleted = ref(false);
const submissionResult = ref(null);

onMounted(async () => {
  try {
    // First check if user has already taken this quiz
    const existingSubmissionQuery = query(
      collection(client.firestore, 'quiz-submissions'),
      where('userId', '==', client.session.uid),
      where('quizId', '==', route.params.id)
    );
    const existingSubmissionSnapshot = await getDocs(existingSubmissionQuery);
    
    if (!existingSubmissionSnapshot.empty) {
      toaster.addToast('You have already taken this test', 'error');
      router.push('/student/dashboard');
      return;
    }

    const quizDoc = await getDoc(doc(client.firestore, 'quizzes', route.params.id));
    if (quizDoc.exists()) {
      quiz.value = { id: quizDoc.id, ...quizDoc.data() };
      
      // Check if user has access to this quiz
      const hasAccess = await checkQuizAccess();
      if (!hasAccess) {
        toaster.addToast('You do not have access to this test', 'error');
        router.push('/student/dashboard');
        return;
      }
      
      // Initialize answers array
      answers.value = new Array(quiz.value.questions?.length || 0).fill(null);
      timeRemaining.value = (quiz.value.timeLimit || 30) * 60; // Convert to seconds
      
      loading.value = false;
    } else {
      toaster.addToast('Quiz not found', 'error');
      router.push('/student/dashboard');
    }
  } catch (error) {
    console.error('Error fetching quiz:', error);
    toaster.addToast('Failed to load quiz', 'error');
    router.push('/student/dashboard');
  }
});

const checkQuizAccess = async () => {
  try {
    // Get all batches where user is included
    const batchesQuery = query(
      collection(client.firestore, 'batches'),
      where('users', 'array-contains', client.session.uid)
    );
    const batchesSnapshot = await getDocs(batchesQuery);
    const userBatches = batchesSnapshot.docs.map(doc => doc.id);
    
    // Check if quiz batch is in user's accessible batches
    return userBatches.includes(quiz.value.batchId);
  } catch (error) {
    console.error('Error checking quiz access:', error);
    return false;
  }
};

const startQuiz = () => {
  showLanguageSelection.value = false;
  quizStarted.value = true;
  toaster.addToast("Test started. it'll be automaticly submitted when the timer ends", "success");
  startTimer();
};

const startTimer = () => {
  timerInterval.value = setInterval(() => {
    timeRemaining.value--;
    if (timeRemaining.value <= 0) {
      autoSubmitQuiz();
    }
  }, 1000);
};

const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const currentQuestion = computed(() => {
  return quiz.value?.questions?.[currentQuestionIndex.value] || null;
});

const getQuestionText = (question) => {
  return question.text?.[selectedLanguage.value] || question.text?.english || question.text?.hindi || '';
};

const getOptionText = (option) => {
  return option?.[selectedLanguage.value] || option?.english || option?.hindi || '';
};

const nextQuestion = () => {
  if (currentQuestionIndex.value < (quiz.value?.questions?.length || 0) - 1) {
    currentQuestionIndex.value++;
    toaster.addToast(`Question: ${getQuestionText(currentQuestion.value)}`, 'success');
  }
};

const previousQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
    toaster.addToast(`Question: ${getQuestionText(currentQuestion.value)}`, 'success');
  }
};

const goToQuestion = (index) => {
  currentQuestionIndex.value = index;
    toaster.addToast(`Question: ${getQuestionText(currentQuestion.value)}`, 'success');
};

const updateAnswer = (value) => {
  answers.value[currentQuestionIndex.value] = value;
};

const questionsAttempted = computed(() => {
  return answers.value.filter(answer => answer !== null && answer !== '').length;
});

const questionsLeft = computed(() => {
  return (quiz.value?.questions?.length || 0) - questionsAttempted.value;
});

const calculateScore = () => {
  let score = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  
  quiz.value.questions.forEach((question, index) => {
    const userAnswer = answers.value[index];
    
    if (userAnswer !== null && userAnswer !== '') {
      if (question.type === 'multiple-choice') {
        if (parseInt(userAnswer) === question.correctAnswer) {
          score += question.points || 1;
          correctAnswers++;
        } else {
          incorrectAnswers++;
          if (quiz.value.hasNegativeMarking) {
            score -= question.negativeMarking || 0.25;
          }
        }
      } else if (question.type === 'true-false') {
        if (userAnswer === question.correctAnswer) {
          score += question.points || 1;
          correctAnswers++;
        } else {
          incorrectAnswers++;
          if (quiz.value.hasNegativeMarking) {
            score -= question.negativeMarking || 0.25;
          }
        }
      }
      // For short-answer and essay, manual grading needed
    }
  });
  
  return { score: Math.max(0, score), correctAnswers, incorrectAnswers };
};

const submitQuiz = async () => {
  if (submitting.value) return;
  
  submitting.value = true;
  toaster.addToast("Processing, please wait...", "success");
  try {
    const result = calculateScore();
    
    const submission = {
      userId: client.session.uid,
      quizId: quiz.value.id,
      batchId: quiz.value.batchId,
      answers: answers.value.map((answer, index) => ({
        questionIndex: index,
        studentAnswer: answer
      })),
      score: result.score,
      correctAnswers: result.correctAnswers,
      incorrectAnswers: result.incorrectAnswers,
      timeSpent: (quiz.value.timeLimit * 60) - timeRemaining.value,
      language: selectedLanguage.value,
      timestamp: new Date()
    };
    
    await addDoc(collection(client.firestore, 'quiz-submissions'), submission);
    
    submissionResult.value = {
      ...result,
      totalQuestions: quiz.value.questions.length,
      timeSpent: (quiz.value.timeLimit * 60) - timeRemaining.value
    };
    
    clearInterval(timerInterval.value);
    quizCompleted.value = true;
    
    toaster.addToast('Test submitted successfully!', 'success');
  } catch (error) {
    console.error('Error submitting quiz:', error);
    toaster.addToast('Failed to submit quiz', 'error');
  } finally {
    submitting.value = false;
  }
};

const autoSubmitQuiz = () => {
  toaster.addToast('Time is over! The test has been submitted automatically.', 'error');
  submitQuiz();
};

const generateResultPDF = () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = margin;
  
  // Title
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Test Result Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;
  
  // Quiz Info
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Test: ${quiz.value.name}`, margin, yPosition);
  yPosition += 10;
  doc.text(`Student: ${client.session.displayName}`, margin, yPosition);
  yPosition += 10;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += 10;
  doc.text(`Language: ${selectedLanguage.value.charAt(0).toUpperCase() + selectedLanguage.value.slice(1)}`, margin, yPosition);
  yPosition += 20;
  
  // Summary
  doc.setFont(undefined, 'bold');
  doc.text('Summary:', margin, yPosition);
  yPosition += 10;
  doc.setFont(undefined, 'normal');
  doc.text(`Total Questions: ${submissionResult.value.totalQuestions}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Correct Answers: ${submissionResult.value.correctAnswers}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Incorrect Answers: ${submissionResult.value.incorrectAnswers}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Score: ${submissionResult.value.score.toFixed(2)} points`, margin, yPosition);
  yPosition += 20;
  
  // Questions and Answers
  doc.setFont(undefined, 'bold');
  doc.text('Questions and Answers:', margin, yPosition);
  yPosition += 15;
  
  quiz.value.questions.forEach((question, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFont(undefined, 'bold');
    doc.text(`Q${index + 1}. ${getQuestionText(question)}`, margin, yPosition, {
      maxWidth: pageWidth - 2 * margin
    });
    yPosition += 15;
    
    if (question.type === 'multiple-choice') {
      doc.setFont(undefined, 'normal');
      question.options.forEach((option, optIndex) => {
        const optionText = `${String.fromCharCode(65 + optIndex)}. ${getOptionText(option)}`;
        const isUserAnswer = answers.value[index] === optIndex;
        const isCorrectAnswer = question.correctAnswer === optIndex;
        
        if (isUserAnswer && isCorrectAnswer) {
          doc.setTextColor(0, 128, 0); // Green for correct user answer
        } else if (isUserAnswer) {
          doc.setTextColor(255, 0, 0); // Red for incorrect user answer
        } else if (isCorrectAnswer) {
          doc.setTextColor(0, 0, 255); // Blue for correct answer
        } else {
          doc.setTextColor(0, 0, 0); // Black for other options
        }
        
        doc.text(optionText, margin + 10, yPosition, {
          maxWidth: pageWidth - 2 * margin - 10
        });
        yPosition += 8;
      });
      
      doc.setTextColor(0, 0, 0);
      const userAnswerText = answers.value[index] !== null ? 
        `Your Answer: ${String.fromCharCode(65 + answers.value[index])}` : 
        'Your Answer: Not attempted';
      doc.text(userAnswerText, margin, yPosition);
      yPosition += 8;
      
      const correctAnswerText = `Correct Answer: ${String.fromCharCode(65 + question.correctAnswer)}`;
      doc.text(correctAnswerText, margin, yPosition);
      yPosition += 15;
    } else {
      doc.setFont(undefined, 'normal');
      const userAnswerText = answers.value[index] || 'Not attempted';
      doc.text(`Your Answer: ${userAnswerText}`, margin, yPosition);
      yPosition += 15;
    }
  });
  
  // Save the PDF
  doc.save(`${quiz.value.name}_Result_${new Date().toISOString().split('T')[0]}.pdf`);
};

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
});

// Prevent page refresh during quiz
const handleBeforeUnload = (e) => {
  if (quizStarted.value && !quizCompleted.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};

watch(quizStarted, (started) => {
  if (started) {
    window.addEventListener('beforeunload', handleBeforeUnload);
  } else {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  }
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<template>
  <div class="quiz-take">
    <Head title="Take Test" />
    
    <div v-if="loading" class="loading">
      <p>Loading test...</p>
    </div>

    <!-- Language Selection -->
    <div v-else-if="showLanguageSelection" class="language-selection">
      <div class="selection-card">
        <h1>{{ quiz.name }}</h1>
        <p>{{ quiz.description }}</p>
        
        <div class="quiz-info">
          <div class="info-item">
            <strong>Time Limit:</strong> {{ quiz.timeLimit }} minutes
          </div>
          <div class="info-item">
            <strong>Total Questions:</strong> {{ quiz.questions?.length || 0 }}
          </div>
          <div class="info-item">
            <strong>Negative Marking:</strong> {{ quiz.hasNegativeMarking ? 'Yes' : 'No' }}
          </div>
        </div>

        <div class="language-options">
          <h3>Select Language / भाषा चुनें</h3>
          <div class="language-buttons">
            <button 
              @click="selectedLanguage = 'english'"
              :class="{ active: selectedLanguage === 'english' }"
              class="language-btn"
              :aria-current="selectedLanguage === 'english'"
            >
              English
            </button>
            <button 
              @click="selectedLanguage = 'hindi'"
              :class="{ active: selectedLanguage === 'hindi' }"
              class="language-btn"
              :aria-current="selectedLanguage === 'hindi'"
            >
              Hindi (हिंदी)
            </button>
          </div>
        </div>

        <div class="start-section">
          <div class="instructions">
            <h4>Instructions:</h4>
            <ul>
              <li>Read each question carefully</li>
              <li>You can navigate between questions using Previous/Next buttons</li>
              <li>The test will auto-submit when time runs out</li>
              <li>Make sure you have a stable internet connection</li>
            </ul>
          </div>
          
          <button @click="startQuiz" class="start-btn">
            Start Test
          </button>
        </div>
      </div>
    </div>

    <!-- Quiz Completed -->
    <div v-else-if="quizCompleted" class="quiz-completed">
      <div class="result-card">
        <h1>Test Completed!</h1>
        <div class="result-summary">
          <h3>Your Results</h3>
          <div class="result-stats">
            <div class="stat-item">
              <span class="stat-label">Total Questions:</span>
              <span class="stat-value">{{ submissionResult.totalQuestions }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Correct Answers:</span>
              <span class="stat-value correct">{{ submissionResult.correctAnswers }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Incorrect Answers:</span>
              <span class="stat-value incorrect">{{ submissionResult.incorrectAnswers }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Final Score:</span>
              <span class="stat-value score">{{ submissionResult.score.toFixed(2) }} points</span>
            </div>
          </div>
        </div>
        
        <div class="result-actions">
          <button @click="generateResultPDF" class="pdf-btn">
            Download Result PDF
          </button>
          <RouterLink to="/student/dashboard" class="back-btn">
            Back to Dashboard
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Quiz Interface -->
    <div v-else-if="quizStarted" class="quiz-interface">
      <!-- Timer -->
      <div class="timer-section">
        <div class="timer" :class="{ warning: timeRemaining < 300, critical: timeRemaining < 60 }" aria-atomic="true">
          <span class="timer-icon">⏱️</span>
          <span class="timer-text">{{ formatTime(timeRemaining) }}</span>
        </div>
      </div>

      <!-- Question -->
      <div class="question-section">
        <div class="question-header">
          <h2>Question {{ currentQuestionIndex + 1 }} of {{ quiz.questions?.length || 0 }}</h2>
          <div class="language-switch">
            <button 
              @click="selectedLanguage = selectedLanguage === 'english' ? 'hindi' : 'english'"
              class="switch-lang-btn"
            >
              Switch to {{ selectedLanguage === 'english' ? 'हिंदी' : 'English' }}
            </button>
          </div>
        </div>

        <div class="question-content">
          <div class="question-text">
            {{ getQuestionText(currentQuestion) }}
          </div>

          <!-- Multiple Choice -->
          <div v-if="currentQuestion?.type === 'multiple-choice'" class="answer-options">
            <label 
              v-for="(option, index) in currentQuestion.options" 
              :key="index"
              class="option-label"
            >
              <input 
                type="radio" 
                :name="`question-${currentQuestionIndex}`"
                :value="index"
                :checked="answers[currentQuestionIndex] === index"
                @change="updateAnswer(index)"
              />
              <span class="option-text">
                <span class="option-letter">{{ String.fromCharCode(65 + index) }}.</span>
                {{ getOptionText(option) }}
              </span>
            </label>
          </div>

          <!-- True/False -->
          <div v-else-if="currentQuestion?.type === 'true-false'" class="answer-options">
            <label class="option-label">
              <input 
                type="radio" 
                :name="`question-${currentQuestionIndex}`"
                value="true"
                :checked="answers[currentQuestionIndex] === 'true'"
                @change="updateAnswer('true')"
              />
              <span class="option-text">True</span>
            </label>
            <label class="option-label">
              <input 
                type="radio" 
                :name="`question-${currentQuestionIndex}`"
                value="false"
                :checked="answers[currentQuestionIndex] === 'false'"
                @change="updateAnswer('false')"
              />
              <span class="option-text">False</span>
            </label>
          </div>

          <!-- Short Answer -->
          <div v-else-if="currentQuestion?.type === 'short-answer'" class="answer-input">
            <input 
              type="text" 
              :value="answers[currentQuestionIndex] || ''"
              @input="updateAnswer($event.target.value)"
              placeholder="Enter your answer..."
              class="text-input"
            />
          </div>

          <!-- Essay -->
          <div v-else-if="currentQuestion?.type === 'essay'" class="answer-input">
            <textarea 
              :value="answers[currentQuestionIndex] || ''"
              @input="updateAnswer($event.target.value)"
              placeholder="Write your essay answer..."
              class="essay-input"
              rows="6"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="navigation-section">
        <div class="nav-buttons" role="nav" aria-label="change question">
          <button 
            @click="previousQuestion"
            :disabled="currentQuestionIndex === 0"
            class="nav-btn prev-btn"
            title="Go to the previous question"
            accesskey="p"
          >
            ← Previous
          </button>
          
          <button 
            @click="nextQuestion"
            :disabled="currentQuestionIndex === (quiz.questions?.length || 0) - 1"
            class="nav-btn next-btn"
            title="go to the next question"
            accesskey="n"
          >
            Next →
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div class="summary-section">
        <div class="summary-card">
          <h3>Test Summary</h3>
          <div class="summary-stats">
            <div class="summary-item">
              <span class="summary-label">Attempted:</span>
              <span class="summary-value attempted">{{ questionsAttempted }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Remaining:</span>
              <span class="summary-value remaining">{{ questionsLeft }}</span>
            </div>
          </div>
          
          <div class="question-grid" role="nav" aria-label="Questions list">
            <button
              v-for="(question, index) in quiz.questions"
              :key="index"
              @click="goToQuestion(index)"
              :class="{
                'current': index === currentQuestionIndex,
                'attempted': answers[index] !== null && answers[index] !== '',
                'unattempted': answers[index] === null || answers[index] === ''
              }"
              class="question-nav-btn"
              :aria-current="index === currentQuestionIndex"
              :disabled="index === currentQuestionIndex"
            >
              Go to Question {{ index + 1 }}
            </button>
          </div>
          
          <div class="submit-section">
            <button 
              @click="submitQuiz"
              :disabled="submitting"
              class="submit-btn"
            >
              {{ submitting ? 'Submitting...' : 'Submit Test' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-take {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

.loading {
  text-align: center;
  padding: 3rem;
}

/* Language Selection */
.language-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.selection-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
}

.selection-card h1 {
  text-align: center;
  margin-bottom: 1rem;
  color: #333;
}

.quiz-info {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin: 1.5rem 0;
}

.info-item {
  margin-bottom: 0.5rem;
}

.language-options {
  text-align: center;
  margin: 2rem 0;
}

.language-options h3 {
  margin-bottom: 1rem;
  color: #495057;
}

.language-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.language-btn {
  padding: 1rem 2rem;
  border: 2px solid #007bff;
  background: white;
  color: #007bff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.language-btn:hover {
  background: #f8f9fa;
}

.language-btn.active {
  background: #007bff;
  color: white;
}

.start-section {
  text-align: center;
  margin-top: 2rem;
}

.instructions {
  text-align: left;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #e9ecef;
  border-radius: 6px;
}

.instructions ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.instructions li {
  margin-bottom: 0.5rem;
}

.start-btn {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 25px;
  font-size: 1.2rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.start-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
}

/* Quiz Interface */
.quiz-interface {
  display: grid;
  gap: 1.5rem;
}

.timer-section {
  position: sticky;
  top: 1rem;
  z-index: 100;
  display: flex;
  justify-content: center;
}

.timer {
  background: #28a745;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.timer.warning {
  background: #ffc107;
  color: #212529;
}

.timer.critical {
  background: #dc3545;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.question-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.question-header h2 {
  margin: 0;
  color: #333;
}

.switch-lang-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.switch-lang-btn:hover {
  background: #545b62;
}

.question-text {
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  color: #333;
}

.answer-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.option-label {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-label:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.option-label:has(input:checked) {
  border-color: #007bff;
  background: #e7f3ff;
}

.option-label input[type="radio"] {
  margin: 0;
  transform: scale(1.2);
}

.option-text {
  flex: 1;
  font-size: 1.1rem;
  line-height: 1.5;
}

.option-letter {
  font-weight: bold;
  color: #007bff;
  margin-right: 0.5rem;
}

.answer-input {
  margin-top: 1rem;
}

.text-input, .essay-input {
  width: 100%;
  padding: 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1.1rem;
  font-family: inherit;
  resize: vertical;
}

.text-input:focus, .essay-input:focus {
  outline: none;
  border-color: #007bff;
}

.navigation-section {
  display: flex;
  justify-content: center;
}

.nav-buttons {
  display: flex;
  gap: 1rem;
}

.nav-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid #007bff;
  background: white;
  color: #007bff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-btn:hover:not(:disabled) {
  background: #007bff;
  color: white;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.summary-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.summary-card h3 {
  text-align: center;
  margin-bottom: 1rem;
  color: #333;
}

.summary-stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.summary-item {
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.summary-value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
}

.summary-value.attempted {
  color: #28a745;
}

.summary-value.remaining {
  color: #ffc107;
}

.question-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 0.5rem;
  margin: 1.5rem 0;
}

.question-nav-btn {
  width: 40px;
  height: 40px;
  border: 2px solid #e9ecef;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.question-nav-btn.current {
  border-color: #007bff;
  background: #007bff;
  color: white;
}

.question-nav-btn.attempted {
  border-color: #28a745;
  background: #d4edda;
  color: #155724;
}

.question-nav-btn.unattempted {
  border-color: #ffc107;
  background: #fff3cd;
  color: #856404;
}

.submit-section {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e9ecef;
}

.submit-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #c82333;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Quiz Completed */
.quiz-completed {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.result-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.result-card h1 {
  color: #28a745;
  margin-bottom: 2rem;
}

.result-summary h3 {
  margin-bottom: 1.5rem;
  color: #333;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-item {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
}

.stat-value.correct {
  color: #28a745;
}

.stat-value.incorrect {
  color: #dc3545;
}

.stat-value.score {
  color: #007bff;
}

.result-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.pdf-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
}

.pdf-btn:hover {
  background: #0056b3;
}

.back-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
}

.back-btn:hover {
  background: #545b62;
}

@media (max-width: 768px) {
  .quiz-take {
    padding: 0.5rem;
  }
  
  .question-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .summary-stats {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-buttons {
    flex-direction: column;
  }
  
  .result-actions {
    flex-direction: column;
  }
  
  .language-buttons {
    flex-direction: column;
  }
}
</style>