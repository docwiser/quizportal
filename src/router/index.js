import { createRouter, createWebHistory } from 'vue-router';
import generateRoutes from './generateRoutes';
import { client } from '@composables/client';
const routes = generateRoutes('components');
const router = createRouter({
history: createWebHistory(import.meta.env.BASE_URL),
routes: routes.concat([
{
path: '/admin/dashboard',
name: 'AdminDashboard',
component: () => import('../views/Admin/Dashboard.vue'),
meta: { requiresAdmin: true }
},
{
path: '/admin/test/create',
name: 'QuizCreate',
component: () => import('../views/Admin/QuizCreate.vue'),
meta: { requiresAdmin: true }
},
{
path: '/admin/test/:id/questions',
name: 'QuestionAdd',
component: () => import('../views/Admin/QuestionAdd.vue'),
meta: { requiresAdmin: true }
},
{
path: '/admin/submissions',
name: 'Submissions',
component: () => import('../views/Admin/Submissions.vue'),
meta: { requiresAdmin: true }
},
{
path: '/student/dashboard',
name: 'StudentDashboard',
component: () => import('../views/Student/Dashboard.vue'),
meta: { requiresAuth: true }
},
{
path: '/test/:id/take',
name: 'QuizTake',
component: () => import('../views/Student/QuizTake.vue'),
meta: { requiresAuth: true }
},
{
path: "/:pathMatch(.*)*",
name: "Page Not found",
component: () => import("../components/notfound.vue")
}
])
});
export default router;

// Navigation guards
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAdmin) {
    if (!client.session || client.session.role_num <= 5) {
      next('/login');
      return;
    }
  }
  
  if (to.meta.requiresAuth) {
    if (!client.session) {
      next('/login');
      return;
    }
  }
  
  next();
});