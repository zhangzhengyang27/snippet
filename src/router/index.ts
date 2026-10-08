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
    // 个人工作区：只展示当前用户自己的代码块。未登录 / 还没有代码块时走空态引导。
    // scope=mine 由页面读取并透传给列表、集合树接口。
    path: '/snippets',
    name: 'snippets',
    component: () => import('@/views/knowledge/KnowledgeSnippetsPage.vue'),
    meta: { title: '代码块', scope: 'mine' },
  },
  {
    // 公共代码块库：只读浏览 + 「复制到我的代码块」。
    // 与 /snippets 复用同一页面组件，靠 meta.scope 切到只读语义（scope=public）。
    path: '/library',
    name: 'library',
    component: () => import('@/views/knowledge/KnowledgeSnippetsPage.vue'),
    meta: { title: '公共代码块库', scope: 'public' },
  },
  {
    path: '/snippets/:id',
    name: 'snippet-detail',
    component: () => import('@/views/SnippetDetailPage.vue'),
    // 站点导航用的是「代码块」，详情页标题统一到同一叫法（此前是「片段详情」）
    meta: { title: '代码块详情' },
  },
  {
    // 公共库里的详情留在 /library 前缀下，URL 与导航高亮才不会跳回个人工作区
    path: '/library/:id',
    name: 'library-detail',
    component: () => import('@/views/SnippetDetailPage.vue'),
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
    // 内容审核台（公共代码块库的发布审核）。入口只对管理员显示，
    // 页面内另做角色校验、后端 RolesGuard 兜底 —— 这里不挂路由守卫，
    // 与项目既有约定一致（认证态由 API 的 401 处理器驱动）。
    path: '/admin/review',
    name: 'admin-review',
    component: () => import('@/views/AdminReviewPage.vue'),
    meta: { title: '内容审核' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterPage.vue'),
    meta: { title: '注册' },
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
