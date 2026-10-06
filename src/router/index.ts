import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useTheme } from '@/composables/useTheme'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardPage.vue'),
    meta: { title: '概览' },
  },
  {
    path: '/snippets',
    name: 'snippets',
    component: () => import('@/views/knowledge/KnowledgeSnippetsPage.vue'),
    meta: { title: '代码块' },
  },
  {
    path: '/snippets/:id',
    name: 'snippet-detail',
    component: () => import('@/views/SnippetDetailPage.vue'),
    // 站点导航用的是「代码块」，详情页标题统一到同一叫法（此前是「片段详情」）
    meta: { title: '代码块详情' },
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/views/FavoritesPage.vue'),
    meta: { title: '收藏夹' },
  },
  {
    path: '/recent',
    name: 'recent',
    component: () => import('@/views/RecentPage.vue'),
    meta: { title: '最近使用' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutPage.vue'),
    meta: { title: '关于与帮助' },
  },
  {
    // 用户菜单「个人中心」的目标路由。此前菜单指向 /profile 但路由表缺失，
    // 点击会被下方 catch-all 重定向回首页（已修复的断链入口）。
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfilePage.vue'),
    meta: { title: '个人中心' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

const baseTitle = '代码块 · Snippet'

router.afterEach((to) => {
  const pageTitle = to.meta.title as string | undefined
  document.title = pageTitle ? `${pageTitle} - ${baseTitle}` : baseTitle
})

// 触发主题初始化（注册 watch 并立即应用）
useTheme()

export default router
