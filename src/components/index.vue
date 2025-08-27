<template>
<div class="home">
  <Head title="Quiz Contests" />
  
  <div class="hero-section">
    <h1>Saint Joseph's Academy</h1>
    <h2>Quiz Contest Platform</h2>
    <p>Test your knowledge and compete with your classmates</p>
  </div>

  <div v-if="!client.session" class="auth-prompt">
    <div class="auth-card">
      <h3>Get Started</h3>
      <p>Sign in to access quiz contests and track your progress</p>
      <RouterLink to="/login" class="auth-btn">Sign In</RouterLink>
    </div>
  </div>

  <div v-else class="dashboard-redirect">
    <div class="redirect-card">
      <h3>Welcome back, {{ client.session.displayName }}!</h3>
      <p>Ready to take on some quiz challenges?</p>
      
      <div class="action-buttons">
        <RouterLink 
          v-if="client.session.role_num > 5" 
          to="/admin/dashboard" 
          class="action-btn admin"
        >
          Admin Dashboard
        </RouterLink>
        <RouterLink 
          v-else 
          to="/student/dashboard" 
          class="action-btn student"
        >
          View Quiz Contests
        </RouterLink>
      </div>
    </div>
  </div>

  <div class="features-section" v-if="!client.session">
    <h3>Platform Features</h3>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">📝</div>
        <h4>Interactive Quizzes</h4>
        <p>Multiple choice, short answer, and essay questions</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">⏱️</div>
        <h4>Timed Contests</h4>
        <p>Challenge yourself with time-limited quiz sessions</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h4>Progress Tracking</h4>
        <p>Monitor your performance and improvement over time</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🏆</div>
        <h4>Batch Competition</h4>
        <p>Compete with classmates in your batch</p>
      </div>
    </div>
  </div>

  <!-- Admin Features -->
  <div v-else-if="client.session.role_num > 5" class="features-section">
    <h3>Admin Features</h3>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🎯</div>
        <h4>Quiz Management</h4>
        <p>Create, edit, and manage quiz contests for different batches</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h4>Submission Analytics</h4>
        <p>View detailed student submissions and performance analytics</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">👥</div>
        <h4>Batch Management</h4>
        <p>Organize students into batches and assign quiz access</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📈</div>
        <h4>Progress Reports</h4>
        <p>Generate comprehensive reports on student performance</p>
      </div>
    </div>
  </div>

  <!-- Student Features -->
  <div v-else class="features-section">
    <h3>Student Features</h3>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🌐</div>
        <h4>Bilingual Support</h4>
        <p>Take quizzes in English or Hindi as per your preference</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📱</div>
        <h4>Mobile Friendly</h4>
        <p>Responsive design works perfectly on all devices</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">⏰</div>
        <h4>Real-time Timer</h4>
        <p>Live countdown timer with auto-submit functionality</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📄</div>
        <h4>Result PDF</h4>
        <p>Download detailed result reports in PDF format</p>
      </div>
    </div>
  </div>
</div>
</template>
<script setup>
import { client } from '@composables/client';
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.hero-section {
  text-align: center;
  padding: 3rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  margin-bottom: 3rem;
}

.hero-section h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.hero-section h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  opacity: 0.9;
}

.hero-section p {
  font-size: 1.1rem;
  opacity: 0.8;
}

.auth-prompt, .dashboard-redirect {
  display: flex;
  justify-content: center;
  margin: 2rem 0;
}

.auth-card, .redirect-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.auth-card h3, .redirect-card h3 {
  margin-bottom: 1rem;
  color: #333;
}

.auth-card p, .redirect-card p {
  color: #666;
  margin-bottom: 1.5rem;
}

.auth-btn {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 25px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.auth-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.action-btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-btn.admin {
  background: #dc3545;
  color: white;
}

.action-btn.admin:hover {
  background: #c82333;
}

.action-btn.student {
  background: #28a745;
  color: white;
}

.action-btn.student:hover {
  background: #1e7e34;
}

.features-section {
  margin: 3rem 0;
}

.features-section h3 {
  text-align: center;
  margin-bottom: 2rem;
  color: #333;
  font-size: 1.8rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.feature-card h4 {
  margin-bottom: 1rem;
  color: #333;
}

.feature-card p {
  color: #666;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .hero-section h1 {
    font-size: 2rem;
  }
  
  .hero-section h2 {
    font-size: 1.3rem;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>