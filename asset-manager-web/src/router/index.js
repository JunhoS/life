import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import AssetsView from '@/views/AssetsView.vue'
import PortfolioView from '@/views/PortfolioView.vue'

const routes = [
  { path: '/', name: 'Dashboard', component: DashboardView },
  { path: '/assets', name: 'Assets', component: AssetsView },
  { path: '/portfolio', name: 'Portfolio', component: PortfolioView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
