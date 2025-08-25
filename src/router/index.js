import { createRouter, createWebHistory } from 'vue-router';
import generateRoutes from './generateRoutes';
const routes = generateRoutes('components');
const router = createRouter({
history: createWebHistory(import.meta.env.BASE_URL),
routes: routes.concat([
{
path: "/:pathMatch(.*)*",
name: "Page Not found",
component: () => import("../components/notfound.vue")
}
])
});
export default router;
