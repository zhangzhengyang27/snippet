<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/composables/useTheme'
import { toast } from '@/composables/useToast'
import { isTypingTarget } from '@/utils/keyboard'
import { useCopy } from '@/composables/useCopy'
import HeaderSearchDialog from './HeaderSearchDialog.vue'
import AppIcon from '@/components/common/AppIcon.vue'

interface NavLink {
  label: string
  href: string
  active?: boolean
}

defineProps<{
  links?: NavLink[]
}>()

/** 用户菜单触发按钮 + 面板的公共根节点（display:contents 容器），用于点击外部关闭判定 */
const userMenuRoot = ref<HTMLElement | null>(null)

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { theme, toggleTheme } = useTheme()
const { copy } = useCopy()

const isLoggedIn = computed(() => authStore.isLoggedIn)
const currentUser = computed(() => authStore.user)

const searchOpen = ref(false)

const userMenuOpen = ref(false)

const userInitials = computed(() => {
  const name = currentUser.value?.username ?? ''
  return name.slice(0, 2).toUpperCase()
})

const userRoleLabel = computed(() => {
  const role = currentUser.value?.role ?? ''
  if (role === 'admin') return '管理员'
  return '普通用户'
})

/** 管理员才显示内容审核入口（后端另有 RolesGuard 兜底，这里只控入口可见性） */
const isAdmin = computed(() => currentUser.value?.role === 'admin')

function openSearch() {
  searchOpen.value = true
}

function closeSearch() {
  searchOpen.value = false
}

/** 子组件选中某条搜索结果 → 跳转到该代码块（关闭由子组件的 close 事件负责） */
function handleSearchSelect(snippetId: string) {
  // 与全局命令面板保持一致：回到列表并聚焦该条，而非直接跳详情页
  router.push({ path: '/snippets', query: { focus: snippetId } })
}

function handleKeyDown(e: KeyboardEvent) {
  // 注意：**不处理 ⌘K**。全局命令面板（CommandPalette）已经监听 ⌘K，
  // 此前这里也监听，导致一次 ⌘K 会同时打开两个搜索框（实测确认），
  // 用户看到的是命令面板，而顶栏搜索框被压在下面（它当时还没样式，见 style 区注释）。
  // 顶栏搜索框的快捷键保留为 `/`。
  if (e.key === '/' && !isTypingTarget(e) && !searchOpen.value) {
    e.preventDefault()
    openSearch()
    return
  }
  if (e.key === 'Escape') {
    if (searchOpen.value) {
      e.preventDefault()
      closeSearch()
      return
    }
    if (userMenuOpen.value) {
      userMenuOpen.value = false
    }
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('keydown', handleKeyDown)
  document.addEventListener('pointerdown', handleDocPointerDown)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('pointerdown', handleDocPointerDown)
})

watch(
  () => route.path,
  () => {
    userMenuOpen.value = false
  }
)

const defaultLinks = computed<NavLink[]>(() => [
  { label: '概览', href: '/', active: route.name === 'dashboard' },
  {
    label: '代码块',
    href: '/snippets',
    active: route.path.startsWith('/snippets'),
  },
  {
    // 公共代码块库：与「代码块」（个人工作区）并列的一级入口。
    // 用 path 前缀判 active，/library/:id 详情页也保持高亮。
    label: '公共库',
    href: '/library',
    active: route.path.startsWith('/library'),
  },
  {
    label: '收藏夹',
    href: '/favorites',
    active: route.name === 'favorites',
  },
  {
    label: '最近',
    href: '/recent',
    active: route.name === 'recent',
  },
  {
    label: '关于',
    href: '/about',
    active: route.name === 'about',
  },
])

const scrolled = ref(false)

function goToLogin() {
  router.push({ name: 'login' })
}

function handleLogout() {
  authStore.logout()
  userMenuOpen.value = false
  toast.success('已退出登录')
}

async function copyUserId() {
  if (!currentUser.value?.id) return
  // 原实现未 await 就提示成功，复制失败时也会显示「已复制」。改为按结果反馈。
  const ok = await copy(currentUser.value.id, { silent: true })
  if (ok) toast.success('用户 ID 已复制')
  else toast.error('复制失败')
}

function handleToggleTheme() {
  toggleTheme()
  toast.success(theme.value === 'dark' ? '已切换至深色模式' : '已切换至浅色模式')
}

/**
 * 点击用户菜单外部关闭。
 *
 * 此前菜单只靠路由变化关闭（watch route.path）——打开后点页面空白处、
 * 再点搜索按钮等任何操作都不会收起，菜单像「粘」在页面上。
 * display:contents 的容器不生成盒子，但 DOM contains 判定不受影响，可放心用。
 */
function handleDocPointerDown(e: MouseEvent) {
  if (!userMenuOpen.value) return
  const target = e.target as Node | null
  if (target && userMenuRoot.value?.contains(target)) return
  userMenuOpen.value = false
}

function handleScroll() {
  scrolled.value = window.scrollY > 0
}
</script>

<template>
  <div>
    <header class="app-header" :class="{ 'app-header--scrolled': scrolled }">
      <a href="#main-content" class="skip-to-content">跳转到主要内容</a>
      <div class="app-header__inner">
        <router-link to="/" class="app-header__brand">
          <span class="app-header__logo-mark">&#9670;</span>
          <span class="app-header__brand-text">Snippet</span>
        </router-link>

        <nav class="app-header__nav" aria-label="主导航">
          <router-link
            v-for="link in links ?? defaultLinks"
            :key="link.label"
            :to="link.href"
            active-class=""
            exact-active-class=""
            class="app-header__nav-link"
            :class="{ 'app-header__nav-link--active': link.active }"
          >
            {{ link.label }}
          </router-link>
        </nav>

        <div class="app-header__actions">
          <el-tooltip content="搜索 (/)" placement="bottom">
            <el-button
              size="small"
              class="app-header__icon-btn"
              aria-label="搜索"
              @click="openSearch"
            >
              <AppIcon icon="lucide:search" :size="18" />
            </el-button>
          </el-tooltip>

          <el-tooltip content="切换主题" placement="bottom">
            <el-button
              size="small"
              class="app-header__icon-btn"
              aria-label="切换主题"
              @click="handleToggleTheme"
            >
              <AppIcon v-if="theme === 'dark'" icon="lucide:sun" :size="18" />
              <AppIcon v-else icon="lucide:moon" :size="18" />
            </el-button>
          </el-tooltip>

          <template v-if="isLoggedIn && currentUser">
            <!-- 用户菜单：原生实现 -->
            <div ref="userMenuRoot" style="display: contents">
              <button
                type="button"
                class="app-header__user-trigger"
                :class="{ 'app-header__user-trigger--open': userMenuOpen }"
                :aria-expanded="userMenuOpen"
                aria-haspopup="menu"
                aria-label="用户菜单"
                @click="userMenuOpen = !userMenuOpen"
              >
                <span class="app-header__user-avatar">{{ userInitials }}</span>
                <span class="app-header__user-name">{{ currentUser.username }}</span>
                <AppIcon
                  icon="lucide:chevron-down"
                  :size="14"
                  class="app-header__user-chevron"
                  :class="{ 'app-header__user-chevron--open': userMenuOpen }"
                />
              </button>
              <div v-if="userMenuOpen" class="user-panel-content">
                <div class="user-panel">
                  <div class="user-panel__hero">
                    <div class="user-panel__hero-glow" aria-hidden="true" />
                    <div class="user-panel__avatar-wrap">
                      <span class="user-panel__avatar">{{ userInitials }}</span>
                      <span class="user-panel__status" aria-hidden="true" />
                    </div>
                    <div class="user-panel__identity">
                      <span class="user-panel__name">{{ currentUser.username }}</span>
                      <span class="user-panel__role">{{ userRoleLabel }}</span>
                    </div>
                    <button
                      type="button"
                      class="user-panel__copy-id"
                      title="复制用户 ID"
                      @click="copyUserId"
                    >
                      <span class="user-panel__id">ID: {{ currentUser.id }}</span>
                      <AppIcon icon="lucide:copy" :size="12" />
                    </button>
                  </div>

                  <div class="user-panel__grid">
                    <router-link
                      v-if="isAdmin"
                      to="/admin/review"
                      class="user-panel__action"
                      @click="userMenuOpen = false"
                    >
                      <span class="user-panel__action-icon user-panel__action-icon--review">
                        <AppIcon icon="lucide:shield-check" :size="18" />
                      </span>
                      <span class="user-panel__action-text">内容审核</span>
                    </router-link>
                    <router-link
                      to="/profile"
                      class="user-panel__action"
                      @click="userMenuOpen = false"
                    >
                      <span class="user-panel__action-icon user-panel__action-icon--profile">
                        <AppIcon icon="lucide:user" :size="18" />
                      </span>
                      <span class="user-panel__action-text">个人中心</span>
                    </router-link>
                    <router-link
                      to="/favorites"
                      class="user-panel__action"
                      @click="userMenuOpen = false"
                    >
                      <span class="user-panel__action-icon user-panel__action-icon--favorites">
                        <AppIcon icon="lucide:heart" :size="18" />
                      </span>
                      <span class="user-panel__action-text">我的收藏</span>
                    </router-link>
                    <router-link
                      to="/recent"
                      class="user-panel__action"
                      @click="userMenuOpen = false"
                    >
                      <span class="user-panel__action-icon user-panel__action-icon--recent">
                        <AppIcon icon="lucide:clock" :size="18" />
                      </span>
                      <span class="user-panel__action-text">最近浏览</span>
                    </router-link>
                    <button type="button" class="user-panel__action" @click="handleToggleTheme">
                      <span class="user-panel__action-icon user-panel__action-icon--theme">
                        <AppIcon v-if="theme === 'dark'" icon="lucide:sun" :size="18" />
                        <AppIcon v-else icon="lucide:moon" :size="18" />
                      </span>
                      <span class="user-panel__action-text">
                        {{ theme === 'dark' ? '深色模式' : '浅色模式' }}
                      </span>
                    </button>
                  </div>

                  <hr class="app-header__divider" />

                  <button
                    type="button"
                    class="user-panel__logout"
                    @click="handleLogout"
                  >
                    <AppIcon icon="lucide:log-out" :size="16" />
                    退出登录
                  </button>
                </div>
              </div>
            </div>
          </template>
          <el-button v-else text size="small" @click="goToLogin"> 登录 </el-button>


        </div>
      </div>
    </header>

    <!-- 搜索对话框：拆为独立子组件（自带状态、竞态保护与样式） -->
    <HeaderSearchDialog :open="searchOpen" @close="closeSearch" @select="handleSearchSelect" />
  </div>
</template>

<style scoped>
/* 保留原有所有样式不变 */
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 64px;
  background: rgb(var(--color-background-rgb) / 0.72);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border-bottom: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}
.app-header--scrolled {
  background: rgb(var(--color-background-rgb) / 0.88);
  border-bottom-color: rgb(var(--color-border-glass-rgb) / 0.2);
  box-shadow: 0 1px 8px rgb(var(--color-shadow-rgb) / 0.06);
}
.skip-to-content {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  padding: 8px 16px;
  border-radius: 0 0 10px 10px;
  background: rgb(var(--color-primary-rgb));
  color: rgb(var(--color-background-rgb));
  font-size: var(--text-sm);
  font-weight: 600;
  text-decoration: none;
  transition: top 0.2s ease;
}
.skip-to-content:focus { top: 0; }
.app-header__inner {
  display: flex;
  align-items: center;
  height: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px;
  gap: 32px;
}
.app-header__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  flex-shrink: 0;
}
.app-header__logo-mark {
  font-size: 18px;
  color: rgb(var(--color-primary-rgb));
  line-height: 1;
  filter: drop-shadow(0 0 6px rgb(var(--color-primary-rgb) / 0.5));
}
.app-header__brand-text {
  font-size: 1.2rem;
  font-weight: 700;
  color: rgb(var(--color-primary-rgb));
  letter-spacing: -0.02em;
  transition: color 0.2s;
}
.app-header__brand:hover .app-header__brand-text { color: rgb(var(--color-primary-rgb) / 0.9); }
.app-header__nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
}
.app-header__nav-link {
  font-size: var(--text-sm);
  font-weight: 500;
  color: rgb(var(--color-text-secondary-rgb) / 0.7);
  text-decoration: none;
  padding: 6px 14px;
  border-radius: var(--radius);
  transition: color 0.2s ease, background 0.2s ease;
  letter-spacing: 0.01em;
}
.app-header__nav-link:hover {
  color: rgb(var(--color-text-rgb));
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
}
.app-header__nav-link--active {
  color: rgb(var(--color-primary-rgb));
  background: rgb(var(--color-primary-rgb) / 0.1);
}
.app-header__nav-link--active:hover {
  color: rgb(var(--color-primary-rgb));
  background: rgb(var(--color-primary-rgb) / 0.14);
}
.app-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.app-header__icon-btn {
  border-radius: 8px !important;
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1)) !important;
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1)) !important;
  color: rgb(var(--color-text-secondary-rgb) / 0.8) !important;
}
.app-header__icon-btn:hover {
  background: rgb(var(--color-primary-rgb) / 0.08) !important;
  color: rgb(var(--color-primary-rgb)) !important;
  border-color: rgb(var(--color-primary-rgb) / 0.2) !important;
}
.app-header__user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px 5px 5px;
  border-radius: 8px;
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.app-header__user-trigger:hover,
.app-header__user-trigger--open {
  background: rgb(var(--color-primary-rgb) / 0.08);
  border-color: rgb(var(--color-primary-rgb) / 0.25);
  color: rgb(var(--color-text-rgb));
}
.app-header__user-avatar {
  width: 26px !important;
  height: 26px !important;
  border-radius: var(--radius) !important;
  background: linear-gradient(135deg, rgb(var(--color-primary-rgb)) 0%, rgb(var(--color-secondary-rgb)) 100%);
  color: rgb(var(--color-background-rgb));
  font-size: 0.6875rem;
  font-weight: 700;
}
.app-header__user-name {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-xs);
  font-weight: 500;
  color: rgb(var(--color-text-secondary-rgb));
}
.app-header__user-chevron { transition: transform 0.2s ease; }
.app-header__user-chevron--open { transform: rotate(180deg); }
.user-panel-content {
  position: absolute;
  top: 100%;
  right: 0;
  width: 280px;
  padding: 0 !important;
  border-radius: 12px !important;
  background: rgb(var(--color-surface-rgb)) !important;
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1)) !important;
  box-shadow: 0 24px 60px rgb(var(--color-shadow-rgb) / 0.28), 0 0 0 1px rgb(var(--color-text-rgb) / 0.03) inset !important;
  overflow: hidden;
  z-index: 110;
}
.user-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  position: relative;
}
.user-panel__hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 22px 14px 18px;
  border-radius: 12px;
  background: linear-gradient(145deg, rgb(var(--color-surface-bright-rgb) / 0.6), rgb(var(--color-surface-rgb)));
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  text-align: center;
  overflow: hidden;
}
.user-panel__hero-glow {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgb(var(--color-primary-rgb) / 0.18);
  filter: blur(36px);
  pointer-events: none;
}
.user-panel__avatar-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-panel__avatar {
  width: 56px !important;
  height: 56px !important;
  border-radius: var(--radius-lg) !important;
  background: linear-gradient(135deg, rgb(var(--color-primary-rgb)) 0%, rgb(var(--color-secondary-rgb)) 100%) !important;
  color: rgb(var(--color-background-rgb)) !important;
  font-size: 1.125rem !important;
  font-weight: 800 !important;
  box-shadow: 0 8px 24px rgb(var(--color-primary-rgb) / 0.25), 0 0 0 3px rgb(var(--color-surface-rgb));
}
.user-panel__status {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgb(var(--color-success-rgb));
  border: 3px solid rgb(var(--color-surface-rgb));
  box-shadow: 0 0 8px rgb(var(--color-success-rgb));
}
.user-panel__identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.user-panel__name {
  font-size: 1.0625rem;
  font-weight: 700;
  color: rgb(var(--color-text-rgb));
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-panel__role {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgb(var(--color-primary-rgb) / 0.1);
  color: rgb(var(--color-primary-rgb));
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.user-panel__copy-id {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  color: rgb(var(--color-text-secondary-rgb) / 0.85);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.user-panel__copy-id:hover {
  color: rgb(var(--color-text-rgb));
  border-color: rgb(var(--color-primary-rgb) / 0.3);
  background: rgb(var(--color-primary-rgb) / 0.08);
}
.user-panel__id {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.user-panel__action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 8px;
  border-radius: var(--radius-md);
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  color: rgb(var(--color-text-secondary-rgb));
  text-decoration: none;
  cursor: pointer;
  width: 100%;
  transition: transform 0.2s, background 0.2s, border-color 0.2s, color 0.2s;
}
.user-panel__action:hover {
  transform: translateY(-2px);
  color: rgb(var(--color-text-rgb));
  background: rgb(var(--color-surface-bright-rgb) / 0.5);
  border-color: rgb(var(--color-primary-rgb) / 0.2);
}
.user-panel__action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  color: rgb(var(--color-background-rgb));
  flex-shrink: 0;
}
.user-panel__action-icon--profile {
  background: linear-gradient(135deg, rgb(var(--color-secondary-rgb)) 0%, rgb(var(--color-primary-rgb)) 100%);
  box-shadow: 0 4px 14px rgb(var(--color-primary-rgb) / 0.3);
}
.user-panel__action-icon--favorites {
  background: linear-gradient(135deg, rgb(var(--color-accent-pink-rgb)) 0%, rgb(var(--color-accent-rose-rgb)) 100%);
  box-shadow: 0 4px 14px rgb(var(--color-accent-rose-rgb) / 0.3);
}
.user-panel__action-icon--recent {
  background: linear-gradient(135deg, rgb(var(--color-accent-sky-rgb)) 0%, rgb(var(--color-accent-cyan-rgb)) 100%);
  box-shadow: 0 4px 14px rgb(var(--color-accent-cyan-rgb) / 0.3);
}
.user-panel__action-icon--theme {
  background: linear-gradient(135deg, rgb(var(--color-warning-rgb)) 0%, rgb(var(--color-accent-amber-rgb)) 100%);
  box-shadow: 0 4px 14px rgb(var(--color-warning-rgb) / 0.3);
}
.user-panel__action-icon--review {
  background: linear-gradient(135deg, rgb(var(--color-error-rgb)) 0%, rgb(var(--color-accent-rose-rgb)) 100%);
  box-shadow: 0 4px 14px rgb(var(--color-error-rgb) / 0.3);
}
.user-panel__action-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(var(--color-text-secondary-rgb));
}
.user-panel__logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  color: rgb(var(--color-accent-rose-rgb));
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  width: 100%;
}
.user-panel__logout:hover {
  background: rgb(var(--color-accent-rose-rgb) / 0.08);
  border-color: rgb(var(--color-accent-rose-rgb) / 0.2);
}

/* ─── 窄屏：压缩留白与间距，避免顶栏横向溢出 ────────────────────────────
   实测 560px 视口下内容宽 635px（溢出 75px）：inner 的 gap 32 + padding 24×2
   与 nav-link 的横向 padding 是主要来源；用户名 text 在最窄处也保不住。 */
@media (max-width: 640px) {
  .app-header__inner {
    padding: 0 12px;
    gap: 10px;
  }

  .app-header__nav {
    gap: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .app-header__nav::-webkit-scrollbar {
    display: none;
  }

  .app-header__nav-link {
    padding: 6px 8px;
    white-space: nowrap;
  }

  .app-header__user-name {
    display: none;
  }
}

/* 极窄屏：品牌文字也让位，只留 logo 与导航 */
@media (max-width: 480px) {
  .app-header__brand-text {
    display: none;
  }
}

</style>
