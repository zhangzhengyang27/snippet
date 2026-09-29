<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/composables/useTheme'
import { toast } from '@/composables/useToast'
import { getExamples } from '@/api'
import { isTypingTarget } from '@/utils/keyboard'
import { useClipboard } from '@vueuse/core'
import AppIcon from '@/components/common/AppIcon.vue'
import Button from 'xiaoye-ui/button'
import Avatar from 'xiaoye-ui/avatar'
import Divider from 'xiaoye-ui/divider'
import Tooltip from 'xiaoye-ui/tooltip'
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
const { copy } = useClipboard()

const isLoggedIn = computed(() => authStore.isLoggedIn)
const currentUser = computed(() => authStore.user)

const searchOpen = ref(false)
const searchQuery = ref('')
const searchLoading = ref(false)

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

const searchResults = ref<SearchResult[]>([])

const activeIndex = ref(-1)

const limitedResults = computed(() => searchResults.value.slice(0, 8))

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

async function executeSearch(query: string) {
  if (!query.trim()) {
    searchResults.value = []
    return
  }
  searchLoading.value = true
  try {
    const response = await getExamples({
      search: query.trim(),
      page: 1,
      limit: 8,
    })
    searchResults.value = response.data.map(toSearchResult)
  } catch {
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

watch(searchQuery, (value) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  if (!value.trim()) {
    searchResults.value = []
    activeIndex.value = -1
    return
  }
  searchDebounceTimer = setTimeout(() => {
    executeSearch(value)
  }, 300)
})

function openSearch() {
  searchOpen.value = true
}

function closeSearch() {
  searchOpen.value = false
  searchQuery.value = ''
  searchResults.value = []
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
    if (mobileMenuOpen.value) {
      e.preventDefault()
      mobileMenuOpen.value = false
      return
    }
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

const mobileMenuOpen = ref(false)
const scrolled = ref(false)
const activeDropdown = ref<string | null>(null)
let dropdownCloseTimer: ReturnType<typeof setTimeout> | null = null
const mobileExpandedDropdowns = ref<Record<string, boolean>>({})

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

function goToLogin() {
  router.push({ name: 'Login' })
}

function handleLogout() {
  authStore.logout()
  userMenuOpen.value = false
  toast.success('已退出登录')
}

function copyUserId() {
  if (!currentUser.value?.id) return
  copy(currentUser.value.id)
  toast.success('用户 ID 已复制')
}

function handleToggleTheme() {
  toggleTheme()
  toast.success(theme.value === 'dark' ? '已切换至深色模式' : '已切换至浅色模式')
}

function toggleMobileDropdown(label: string) {
  mobileExpandedDropdowns.value[label] = !mobileExpandedDropdowns.value[label]
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
          <Tooltip value="搜索 (⌘K)">
            <Button
              severity="secondary" outlined
              size="small"
              class="app-header__icon-btn"
              aria-label="搜索"
              @click="openSearch"
            >
              <AppIcon icon="lucide:search" :size="18" />
            </Button>
          </Tooltip>

          <Tooltip value="切换主题">
            <Button
              severity="secondary" outlined
              size="small"
              class="app-header__icon-btn"
              aria-label="切换主题"
              @click="handleToggleTheme"
            >
              <AppIcon v-if="theme === 'dark'" icon="lucide:sun" :size="18" />
              <AppIcon v-else icon="lucide:moon" :size="18" />
            </Button>
          </Tooltip>

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
                <Avatar class="app-header__user-avatar">
                  <template #default>
                    <span>{{ userInitials }}</span>
                  </template>
                </Avatar>
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
                      <Avatar class="user-panel__avatar">
                        <template #default>
                          <span>{{ userInitials }}</span>
                        </template>
                      </Avatar>
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

                  <Divider />

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
          <Button v-else severity="secondary" text size="small" @click="goToLogin"> 登录 </Button>


          <!-- 移动端：汉堡菜单 + 全屏导航面板 -->
          <Button
            severity="secondary" text
            size="small"
            class="app-header__hamburger"
            :aria-expanded="mobileMenuOpen"
            aria-label="切换导航菜单"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <span class="app-header__hamburger-line" :class="{ 'app-header__hamburger-line--open': mobileMenuOpen }" />
            <span class="app-header__hamburger-line" :class="{ 'app-header__hamburger-line--open': mobileMenuOpen }" />
            <span class="app-header__hamburger-line" :class="{ 'app-header__hamburger-line--open': mobileMenuOpen }" />
          </Button>

          <div v-if="mobileMenuOpen" class="app-header__sheet-content">
            <div class="sr-only">导航菜单</div>
            <nav class="app-header__drawer-nav" aria-label="Mobile navigation">
              <template v-for="link in links ?? defaultLinks" :key="link.label">
                <button
                  v-if="link.children && link.children.length"
                  type="button"
                  class="app-header__drawer-link app-header__drawer-link--parent"
                  :class="{
                    'app-header__drawer-link--active': link.active,
                    'app-header__drawer-link--expanded': mobileExpandedDropdowns[link.label],
                  }"
                  @click="toggleMobileDropdown(link.label)"
                >
                  {{ link.label }}
                  <AppIcon icon="lucide:chevron-down" :size="16" class="app-header__drawer-link-icon" />
                </button>
                <div
                  v-if="link.children && link.children.length"
                  v-show="mobileExpandedDropdowns[link.label]"
                  class="app-header__drawer-children"
                >
                  <template v-for="child in link.children" :key="child.label">
                    <Divider v-if="child.isGroupTitle" class="app-header__drawer-group-separator" />
                    <div v-if="child.isGroupTitle" class="app-header__drawer-group-title">
                      {{ child.label }}
                    </div>
                    <router-link
                      v-else
                      :to="child.href!"
                      active-class=""
                      exact-active-class=""
                      class="app-header__drawer-link app-header__drawer-link--child"
                      :class="{ 'app-header__drawer-link--active': child.active }"
                      @click="closeMobileMenu"
                    >
                      {{ child.label }}
                    </router-link>
                  </template>
                </div>
                <router-link
                  v-else
                  :to="link.href!"
                  active-class=""
                  exact-active-class=""
                  class="app-header__drawer-link"
                  :class="{ 'app-header__drawer-link--active': link.active }"
                  @click="closeMobileMenu"
                >
                  {{ link.label }}
                </router-link>
              </template>
            </nav>
            <Divider />
            <div class="app-header__drawer-actions">
              <template v-if="isLoggedIn && currentUser">
                <router-link to="/profile" class="app-header__drawer-user" @click="closeMobileMenu">
                  <Avatar class="app-header__drawer-user-avatar">
                    <template #default>
                      <span>{{ userInitials }}</span>
                    </template>
                  </Avatar>
                  <div class="app-header__drawer-user-text">
                    <span class="app-header__drawer-user-name">{{ currentUser.username }}</span>
                    <span class="app-header__drawer-user-role">{{ userRoleLabel }}</span>
                  </div>
                </router-link>
                <Button severity="secondary" text size="small" as-child class="w-full">
                  <router-link to="/profile" @click="closeMobileMenu"> 个人中心 </router-link>
                </Button>
                <Button severity="secondary" text size="small" as-child class="w-full">
                  <router-link to="/favorites" @click="closeMobileMenu"> 我的收藏 </router-link>
                </Button>
                <Button severity="secondary" text size="small" as-child class="w-full">
                  <router-link to="/recent" @click="closeMobileMenu"> 最近浏览 </router-link>
                </Button>
                <Button severity="secondary" text size="small" class="w-full" @click="handleLogout">
                  退出登录
                </Button>
              </template>
              <Button v-else severity="secondary" text size="small" class="w-full" @click="goToLogin"> 登录 </Button>

            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 搜索对话框：使用原生实现 -->
    <div v-if="searchOpen" class="app-header__search-overlay" @click.self="closeSearch">
      <div class="app-header__search-dialog">
        <div class="app-header__search-title">搜索示例</div>
        <input
          v-model="searchQuery"
          class="app-header__search-input"
          placeholder="搜索示例、标签、教程…"
          autofocus
          @keydown.escape="closeSearch"
        />
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
/* Mobile hamburger */
.app-header__hamburger {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 9px 8px !important;
  border-radius: 10px !important;
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1)) !important;
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1)) !important;
  cursor: pointer;
}
@media (max-width: 1024px) {
  .app-header__hamburger { display: flex; }
  .app-header__nav { display: none; }
}
.app-header__hamburger-line {
  display: block;
  width: 18px;
  height: 2px;
  background: rgb(var(--color-text-secondary-rgb));
  border-radius: 1px;
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.app-header__sheet-content {
  position: fixed;
  inset: 0;
  top: 64px;
  z-index: 99;
  background: rgb(var(--color-background-rgb) / 0.96);
  backdrop-filter: blur(16px);
  overflow-y: auto;
  padding: 16px 24px;
  border-top: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
}
.app-header__drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.app-header__drawer-link {
  font-size: 0.9375rem;
  font-weight: 500;
  color: rgb(var(--color-text-secondary-rgb));
  text-decoration: none;
  padding: 10px 14px;
  border-radius: var(--radius);
  transition: color 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
}
.app-header__drawer-link:hover {
  color: rgb(var(--color-text-rgb));
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
}
.app-header__drawer-link--active {
  color: rgb(var(--color-primary-rgb));
  background: rgb(var(--color-primary-rgb) / 0.08);
}
.app-header__drawer-link--parent {
  font-weight: 600;
}
.app-header__drawer-link-icon {
  margin-left: auto;
  transition: transform 0.2s ease;
}
.app-header__drawer-link--expanded .app-header__drawer-link-icon {
  transform: rotate(180deg);
}
.app-header__drawer-children {
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.app-header__drawer-link--child {
  font-size: 0.875rem;
}
.app-header__drawer-group-title {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgb(var(--color-text-secondary-rgb) / 0.45);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 14px 4px;
}
.app-header__drawer-group-separator {
  margin: 4px 0;
}
.app-header__drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}
.app-header__drawer-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: var(--radius-md);
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  text-decoration: none;
  color: inherit;
}
.app-header__drawer-user-avatar {
  width: 36px !important;
  height: 36px !important;
  border-radius: var(--radius) !important;
  background: linear-gradient(135deg, rgb(var(--color-primary-rgb)) 0%, rgb(var(--color-secondary-rgb)) 100%);
  color: rgb(var(--color-background-rgb));
  font-size: 0.75rem;
  font-weight: 800;
}
.app-header__drawer-user-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.app-header__drawer-user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}
.app-header__drawer-user-role {
  font-size: 0.6875rem;
  color: rgb(var(--color-text-secondary-rgb));
  font-weight: 500;
}
/* Search overlay */
.app-header__search-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgb(var(--color-background-rgb) / 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
}
.app-header__search-dialog {
  width: 100%;
  max-width: 560px;
  background: rgb(var(--color-surface-rgb));
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 60px rgb(var(--color-shadow-rgb) / 0.3);
  overflow: hidden;
}
.app-header__search-title {
  padding: 16px 20px 0;
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}
.app-header__search-input {
  width: calc(100% - 40px);
  margin: 12px 20px;
  padding: 10px 14px;
  font-size: 0.9375rem;
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  border-radius: var(--radius);
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  color: rgb(var(--color-text-rgb));
  outline: none;
  transition: border-color 0.2s;
}
.app-header__search-input:focus {
  border-color: rgb(var(--color-primary-rgb));
}
.app-header__search-results {
  max-height: 300px;
  overflow-y: auto;
  padding: 0 20px 16px;
  color: rgb(var(--color-text-secondary-rgb));
  font-size: 0.875rem;
}
.app-header__search-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s;
}
.app-header__search-item:hover {
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
}
.search-result__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}
.search-result__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}
.search-result__desc {
  font-size: 0.75rem;
  color: rgb(var(--color-text-secondary-rgb) / 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-result__category {
  font-size: 0.6875rem;
  color: rgb(var(--color-primary-rgb));
  font-weight: 500;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
.w-full { width: 100%; }
.ml-auto { margin-left: auto; }
.opacity-50 { opacity: 0.5; }
</style>

<style scoped>
/* 窄屏：收敛顶栏内边距与动作区间距，避免 375px 溢出 */
@media (max-width: 480px) {
  .app-header {
    padding-inline: 14px;
  }

  .app-header__actions {
    gap: 6px;
  }

  /* 窄屏隐藏全局搜索入口：⌘K 为桌面交互，各列表页有页内搜索 */
  .app-header__actions .app-header__icon-btn[aria-label='搜索'] {
    display: none;
  }
}
</style>
