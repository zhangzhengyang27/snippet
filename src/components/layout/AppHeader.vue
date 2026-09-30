<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/composables/useTheme'
import { toast } from '@/composables/useToast'
import { getExamples } from '@/api'
import { isTypingTarget } from '@/utils/keyboard'
import { useCopy } from '@/composables/useCopy'
import { useResourceFetch } from '@/composables/useResourceFetch'
import AppIcon from '@/components/common/AppIcon.vue'
import type { CodeExample } from '@/types'

type SearchResult = Omit<CodeExample, 'html' | 'css' | 'js'>

function toSearchResult(e: CodeExample): SearchResult {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    category: e.category,
    categorySlug: e.categorySlug,
    topicSlug: e.topicSlug,
    tags: e.tags,
    language: e.language,
    sourceFile: e.sourceFile,
    sourceLine: e.sourceLine,
    difficulty: e.difficulty,
    isInteractive: e.isInteractive,
    snippets: e.snippets,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

interface NavChild {
  label: string
  href?: string
  active?: boolean
  isGroupTitle?: boolean
}

interface NavLink {
  label: string
  href?: string
  active?: boolean
  children?: NavChild[]
}

defineProps<{
  links?: NavLink[]
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { theme, toggleTheme } = useTheme()
const { copy } = useCopy()

const isLoggedIn = computed(() => authStore.isLoggedIn)
const currentUser = computed(() => authStore.user)

const searchOpen = ref(false)
const searchQuery = ref('')

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

const activeIndex = ref(-1)

/**
 * 顶栏搜索结果。走 useResourceFetch 以获得竞态保护与卸载中止：
 * 搜索是典型的「连续输入触发多个并发请求」场景，慢响应若覆盖新结果，
 * 用户会看到与当前关键词不匹配的列表。
 */
const {
  data: searchResultsRaw,
  loading: searchLoading,
  execute: executeSearch,
} = useResourceFetch<SearchResult[]>(
  async (signal) => {
    const q = searchQuery.value.trim()
    if (!q) return []
    try {
      const response = await getExamples({ search: q, page: 1, limit: 8 }, { signal })
      return response.data.map(toSearchResult)
    } catch {
      // 搜索失败展示空结果（与改动前一致；本组件没有错误展示位）。
      // 取消产生的 AbortError 也走这里，但 useResourceFetch 会因 requestId 过期
      // 而丢弃这次返回值，不会覆盖更新的结果。
      return []
    }
  },
  { immediate: false, initial: [] }
)

const searchResults = computed(() => searchResultsRaw.value ?? [])

const limitedResults = computed(() => searchResults.value.slice(0, 8))

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (value) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  if (!value.trim()) {
    activeIndex.value = -1
    // fetcher 对空关键词直接返回 []，无需手动清空结果
    void executeSearch()
    return
  }
  searchDebounceTimer = setTimeout(() => {
    void executeSearch()
  }, 300)
})

function openSearch() {
  searchOpen.value = true
}

function closeSearch() {
  searchOpen.value = false
  // 置空关键词会触发上面的 watch，进而把结果清掉（fetcher 对空关键词返回 []）
  searchQuery.value = ''
  activeIndex.value = -1
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
}

function handleCommandSelect(exampleId: string) {
  closeSearch()
  router.push({ name: 'example-detail', params: { id: exampleId } })
}

function handleKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    openSearch()
    return
  }
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
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('keydown', handleKeyDown)
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
    label: '示例库',
    href: '/example',
    active: route.path === '/example' || route.path.startsWith('/example/'),
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
const activeDropdown = ref<string | null>(null)
let dropdownCloseTimer: ReturnType<typeof setTimeout> | null = null
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

function openDropdown(label: string) {
  activeDropdown.value = label
  if (dropdownCloseTimer) {
    clearTimeout(dropdownCloseTimer)
    dropdownCloseTimer = null
  }
}

function _scheduleCloseDropdown() {
  if (dropdownCloseTimer) {
    clearTimeout(dropdownCloseTimer)
  }
  dropdownCloseTimer = setTimeout(() => {
    activeDropdown.value = null
  }, 150)
}

/** 立即关闭（不防抖）。用于点击切换与 Esc。 */
function closeDropdownNow() {
  if (dropdownCloseTimer) {
    clearTimeout(dropdownCloseTimer)
    dropdownCloseTimer = null
  }
  activeDropdown.value = null
}

/**
 * 点击/键盘切换下拉。
 *
 * 此前下拉只有 `@mouseenter` 一条路径，**键盘用户根本无法打开**——这是真实缺陷，
 * 不是 lint 洁癖。补上标准的 disclosure 模式：点击切换 + Esc 关闭 + aria-expanded。
 * 悬停仍然保留，作为鼠标用户的渐进增强。
 */
function toggleDropdown(label: string) {
  if (activeDropdown.value === label) closeDropdownNow()
  else openDropdown(label)
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
          <template v-for="link in links ?? defaultLinks" :key="link.label">
            <!-- 下拉菜单：用原生按钮 + 弹出层实现 -->
            <div v-if="link.children && link.children.length" style="display: contents">
              <button
                type="button"
                class="app-header__nav-link app-header__nav-link--dropdown"
                :class="{ 'app-header__nav-link--active': link.active }"
                aria-haspopup="true"
                :aria-expanded="activeDropdown === link.label"
                @click="toggleDropdown(link.label)"
                @keydown.escape="closeDropdownNow()"
                @mouseenter="openDropdown(link.label)"
                @mouseleave="_scheduleCloseDropdown()"
              >
                {{ link.label }}
                <AppIcon
                  icon="lucide:chevron-down"
                  :size="14"
                  class="app-header__nav-dropdown-icon"
                  :class="{
                    'app-header__nav-dropdown-icon--open': activeDropdown === link.label,
                  }"
                />
              </button>
              <div
                v-if="activeDropdown === link.label"
                class="app-header__dropdown-menu-content"
                @mouseenter="openDropdown(link.label)"
                @mouseleave="_scheduleCloseDropdown()"
                @focusin="openDropdown(link.label)"
                @focusout="_scheduleCloseDropdown()"
              >
                <template v-for="child in link.children" :key="child.label">
                  <div
                    v-if="child.isGroupTitle"
                    class="app-header__dropdown-group-title"
                  >
                    {{ child.label }}
                  </div>
                  <router-link
                    v-else
                    :to="child.href!"
                    class="app-header__dropdown-item"
                    :class="{ 'app-header__dropdown-item--active': child.active }"
                  >
                    {{ child.label }}
                  </router-link>
                </template>
              </div>
            </div>
            <router-link
              v-else
              :to="link.href!"
              active-class=""
              exact-active-class=""
              class="app-header__nav-link"
              :class="{ 'app-header__nav-link--active': link.active }"
            >
              {{ link.label }}
            </router-link>
          </template>
        </nav>

        <div class="app-header__actions">
          <el-tooltip content="搜索 (⌘K)" placement="bottom">
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
            <div style="display: contents">
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

    <!-- 搜索对话框：使用原生实现 -->
    <div v-if="searchOpen" class="app-header__search-overlay" @click.self="closeSearch">
      <div class="app-header__search-dialog">
        <div class="app-header__search-title">搜索示例</div>
        <!-- autofocus：这是用户主动点击「搜索」才打开的对话框，聚焦输入框是正确 UX；
             该规则针对的是页面加载即抢焦点的情况，不适用于此处。
             用区块禁用而非 next-line —— 违规报告在 autofocus 属性那一行，而 HTML 注释无法插入标签内部。 -->
        <!-- eslint-disable vuejs-accessibility/no-autofocus -->
        <input
          v-model="searchQuery"
          class="app-header__search-input"
          placeholder="搜索示例、标签、教程…"
          aria-label="搜索示例、标签、教程"
          autofocus
          @keydown.escape="closeSearch"
        />
        <!-- eslint-enable vuejs-accessibility/no-autofocus -->
        <div class="app-header__search-results">
          <div v-if="searchLoading">搜索中…</div>
          <div v-else-if="limitedResults.length === 0 && searchQuery.trim()">未找到匹配的示例</div>
          <div
            v-for="example in limitedResults"
            :key="example.id"
            class="app-header__search-item"
            @click="handleCommandSelect(example.id)"
          >
            <div class="search-result__content">
              <span class="search-result__title">{{ example.title }}</span>
              <span class="search-result__desc">{{ example.description }}</span>
              <span class="search-result__category">{{ example.category }}</span>
            </div>
            <AppIcon icon="lucide:arrow-right" :size="14" class="ml-auto opacity-50" />
          </div>
        </div>
      </div>
    </div>
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
  font-size: 0.875rem;
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
  font-size: 0.875rem;
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
.app-header__nav-link--dropdown {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  font: inherit;
  cursor: pointer;
}
.app-header__nav-dropdown-icon { transition: transform 0.2s ease; }
.app-header__nav-dropdown-icon--open { transform: rotate(180deg); }
.app-header__dropdown-menu-content {
  position: absolute;
  min-width: 180px;
  padding: 8px;
  border-radius: var(--radius-md);
  background: rgb(var(--color-surface-rgb));
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  box-shadow: 0 16px 40px rgb(var(--color-shadow-rgb) / 0.2);
  z-index: 110;
}
.app-header__dropdown-item {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--color-text-secondary-rgb));
  text-decoration: none;
  padding: 8px 12px;
  border-radius: var(--radius);
  transition: color 0.2s ease, background 0.2s ease;
  white-space: nowrap;
}
.app-header__dropdown-item:hover {
  color: rgb(var(--color-text-rgb));
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
}
.app-header__dropdown-item--active {
  color: rgb(var(--color-primary-rgb)) !important;
  background: rgb(var(--color-primary-rgb) / 0.1) !important;
}
.app-header__dropdown-group-title {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgb(var(--color-text-secondary-rgb) / 0.45);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 10px 12px 4px;
  margin-top: 6px;
  border-top: 1px solid rgb(var(--color-border-glass-rgb) / 0.06);
}
.app-header__dropdown-group-title:first-child { margin-top: 0; border-top: none; }
.app-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.app-header__icon-btn {
  border-radius: 10px !important;
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
  border-radius: 10px;
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
  font-size: 0.8125rem;
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
  border-radius: 18px !important;
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
  gap: 10px;
  padding: 22px 14px 18px;
  border-radius: 14px;
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
  border-radius: 20px;
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
  border-radius: 20px;
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
  border-radius: 10px;
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
  border-radius: 10px;
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  color: rgb(var(--color-accent-rose-rgb));
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  width: 100%;
}
.user-panel__logout:hover {
  background: rgb(var(--color-accent-rose-rgb) / 0.08);
  border-color: rgb(var(--color-accent-rose-rgb) / 0.2);
}
</style>
