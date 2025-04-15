import { createRouter, createWebHistory } from 'vue-router';
import GameHome from '../views/GameHome.vue'; // 引入 GameHome 组件

const routes = [
  {
    path: '/',
    name: 'GameHome',
    component: GameHome, // 将 GameHome 作为默认路由
  },
  // 其他路由...
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router; 