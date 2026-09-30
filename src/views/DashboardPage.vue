<script setup lang="ts">
/**
 * 概览页 · Bento 布局（布局设计稿 public/design-dashboard.html 的 Vue 实现）：
 * 问候行 → 三张统计卡 → 宽窄双栏（最近浏览 | 快捷开始 + 探索示例库）。
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { listKnowledgeSnippets, listKnowledgeSnippetsByIds } from '@/api/knowledge-snippets'
import { getFavorites } from '@/api/favorites'
import { getExamples } from '@/api/examples'
import { getApiErrorMessage } from '@/api/client'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import type { CodeExample } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { useRecentSnippets } from '@/composables/useRecentSnippets'
import { useResourceFetch } from '@/composables/useResourceFetch'
import { formatRelativeTime, formatDateLabel } from '@/utils/date-format'
import EmptyState from '@/components/layout/EmptyState.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const { recent: recentIds } = useRecentSnippets()

/** 概览页聚合数据（一次请求拿齐，避免 4 个独立的 loading/error 状态） */
interface DashboardData {
  snippetTotal: number
  favoriteTotal: number
  exampleTotal: number
  exploreExamples: CodeExample[]
  recentSnippets: KnowledgeSnippet[]
}

/**
 * 概览页数据统一走 useResourceFetch，三态由 EmptyState 表达。
 *
 * 此前统计块用 `catch {}` 静默降级为 0 —— 但 0 是一个**合法数值**，
 * 断网时用户会看到「你有 0 个片段」，被误读成数据丢了。
 * 现在失败态把数字显示为「—」（未知），与真实的 0 区分开。
 */
const {
  data: dash,
  loading,
  error,
  refresh: reload,
} = useResourceFetch<DashboardData>(async () => {
  const [snipRes, favRes, exRes] = await Promise.all([
    listKnowledgeSnippets({ page: 1, pageSize: 1 }),
    authStore.isLoggedIn ? getFavorites() : Promise.resolve([]),
    getExamples({ page: 1, limit: 2 }),
  ])

  // 最近浏览：localStorage 只存 id，用批量接口一次取回（原先逐条回查）。
  // listKnowledgeSnippetsByIds 按 id 顺序回排，已删除/无权的条目自然被跳过。
  const recent = await listKnowledgeSnippetsByIds(recentIds.value.slice(0, 6))

  return {
    snippetTotal: snipRes.total ?? 0,
    favoriteTotal: Array.isArray(favRes) ? favRes.length : 0,
    exampleTotal: exRes.pagination?.total ?? 0,
    exploreExamples: exRes.data?.slice(0, 2) ?? [],
    recentSnippets: recent,
  }
})

const snippetTotal = computed(() => dash.value?.snippetTotal ?? 0)
const favoriteTotal = computed(() => dash.value?.favoriteTotal ?? 0)
const exampleTotal = computed(() => dash.value?.exampleTotal ?? 0)
const recentSnippets = computed(() => dash.value?.recentSnippets ?? [])
const exploreExamples = computed(() => dash.value?.exploreExamples ?? [])

const username = computed(() => authStore.user?.username ?? '')
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
})
const dateLabel = computed(() => formatDateLabel(new Date()))

const stats = computed(() => [
  {
    key: 'snippets',
    icon: 'material-symbols:code-blocks',
    num: snippetTotal.value.toLocaleString(),
    label: '代码片段',
    sub: '116 个集合',
    to: '/snippets',
    tone: 'indigo',
  },
  {
    key: 'favorites',
    icon: 'material-symbols:favorite',
    num: favoriteTotal.value.toLocaleString(),
    label: '收藏夹',
    sub: authStore.isLoggedIn ? '收藏内容聚合' : '登录后可同步',
    to: '/favorites',
    tone: 'green',
  },
  {
    key: 'examples',
    icon: 'material-symbols:web',
    num: exampleTotal.value.toLocaleString(),
    label: '示例库',
    sub: '可在线编辑',
    to: '/example',
    tone: 'cyan',
  },
] as const)

const quickActions = [
  {
    icon: 'material-symbols:add-circle',
    title: '新建片段',
    desc: 'Monaco 编辑器 · 支持多文件',
    action: () => router.push('/snippets?new=1'),
  },
  {
    icon: 'material-symbols:file-upload',
    title: '导入片段',
    desc: '从 JSON 文件批量回灌',
    action: () => router.push('/snippets?import=1'),
  },
  {
    icon: 'material-symbols:keyboard-command-key',
    title: '命令面板',
    desc: '搜索与跳转一步到位',
    action: () => window.dispatchEvent(new CustomEvent('snippet:open-command-palette')),
  },
] as const

const langTag = (s: KnowledgeSnippet) => s.language || 'text'

const goSnippet = (id: string) => router.push(`/snippets?focus=${encodeURIComponent(id)}`)
const goExample = (id: string) => router.push(`/example/${encodeURIComponent(id)}`)
const openPalette = () => window.dispatchEvent(new CustomEvent('snippet:open-command-palette'))
</script>

<template>
  <div class="dash">
    <!-- 品牌光斑背景（仅本页装饰） -->
    <div class="dash__glow" aria-hidden="true"></div>

    <!-- 问候行 -->
    <div class="dash__greet">
      <div>
        <h1 class="dash__hello">👋 {{ greeting }}，{{ username }}</h1>
        <p class="dash__date">
          {{ dateLabel }} · 你有 <b>{{ snippetTotal.toLocaleString() }}</b> 个片段和
          <b>{{ exampleTotal.toLocaleString() }}</b> 个示例在这里
        </p>
      </div>
      <div class="dash__greet-actions">
        <AppButton variant="glass" @click="openPalette">
          <span class="dash__kbd mono">⌘K</span>
          命令面板
        </AppButton>
        <AppButton variant="primary" @click="router.push('/snippets?new=1')">
          <AppIcon icon="material-symbols:add-circle" :size="14" />
          新建片段
        </AppButton>
      </div>
    </div>

    <!-- 统计卡 -->
    <div class="dash__stats">
      <button
        v-for="item in stats"
        :key="item.key"
        type="button"
        class="stat-card"
        :class="`stat-card--${item.tone}`"
        @click="router.push(item.to)"
      >
        <span class="stat-card__icon">
          <AppIcon :icon="item.icon" :size="20" />
        </span>
        <span class="stat-card__meta">
          <span class="stat-card__num mono">{{ loading || error ? '—' : item.num }}</span>
          <span class="stat-card__label">
            {{ item.label }}<span class="stat-card__sub"> · {{ item.sub }}</span>
          </span>
        </span>
      </button>
    </div>

    <!-- Bento 双栏 -->
    <div class="dash__bento">
      <!-- 宽栏：最近浏览 -->
      <section class="bento-card">
        <div class="bento-card__head">
          <h2 class="bento-card__title">
            <AppIcon icon="material-symbols:history" :size="15" />
            最近浏览
            <span v-if="recentSnippets.length" class="bento-card__cnt">{{ recentSnippets.length }}</span>
          </h2>
          <router-link to="/recent" class="bento-card__link">查看全部 →</router-link>
        </div>

        <EmptyState v-if="loading" type="loading" compact />
        <EmptyState
          v-else-if="error"
          type="error"
          compact
          :description="getApiErrorMessage(error, '数据加载失败，请稍后重试。')"
          show-retry
          @retry="reload"
        />
        <EmptyState
          v-else-if="!recentSnippets.length"
          compact
          title="暂无浏览记录"
          description="浏览代码片段后，最近内容会显示在这里。"
        />
        <div v-else class="recent-list">
          <button
            v-for="s in recentSnippets"
            :key="s.id"
            type="button"
            class="recent-item"
            @click="goSnippet(s.id)"
          >
            <span class="recent-item__lang mono">{{ langTag(s) }}</span>
            <span class="recent-item__name">{{ s.name }}</span>
            <span class="recent-item__time">{{ formatRelativeTime(s.updatedAt) }}</span>
            <AppIcon icon="material-symbols:arrow-forward" :size="14" class="recent-item__arrow" />
          </button>
        </div>
      </section>

      <!-- 窄栏：快捷开始 + 探索 -->
      <div class="dash__rail">
        <section class="bento-card">
          <div class="bento-card__head">
            <h2 class="bento-card__title">
              <AppIcon icon="material-symbols:bolt" :size="15" />
              快捷开始
            </h2>
          </div>
          <div class="quick-list">
            <button v-for="q in quickActions" :key="q.title" type="button" class="quick-item" @click="q.action()">
              <span class="quick-item__icon"><AppIcon :icon="q.icon" :size="15" /></span>
              <span>
                <span class="quick-item__title">{{ q.title }}</span>
                <span class="quick-item__desc">{{ q.desc }}</span>
              </span>
            </button>
          </div>
        </section>

        <section class="bento-card">
          <div class="bento-card__head">
            <h2 class="bento-card__title">
              <AppIcon icon="material-symbols:grid-view" :size="15" />
              探索示例库
            </h2>
            <router-link to="/example" class="bento-card__link">全部 →</router-link>
          </div>
          <div class="explore-list">
            <button
              v-for="ex in exploreExamples"
              :key="ex.id"
              type="button"
              class="explore-item"
              @click="goExample(ex.id)"
            >
              <span class="explore-item__thumb">
                <AppIcon icon="material-symbols:brush" :size="18" />
              </span>
              <span>
                <span class="explore-item__title">{{ ex.title }}</span>
                <span class="explore-item__desc">{{ ex.category }} · 在线可编辑</span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mono {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
}

.dash {
  position: relative;
  max-width: 1080px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

/* 品牌光斑（页面级装饰，随主题用主色低透明度） */
.dash__glow {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background:
    radial-gradient(600px 320px at 12% -4%, rgb(var(--color-primary-rgb) / 0.1), transparent 60%),
    radial-gradient(500px 300px at 88% -8%, rgb(var(--color-primary-rgb) / 0.05), transparent 60%);
}

/* ─── 问候行 ─── */
.dash__greet {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 26px;
}

.dash__hello {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgb(var(--color-text-rgb));
}

.dash__date {
  margin-top: 6px;
  font-size: var(--text-xs);
  color: rgb(var(--color-text-secondary-rgb) / 0.9);
}

.dash__date b {
  color: rgb(var(--color-primary-rgb));
  font-weight: 650;
}

.dash__greet-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
}

.dash__kbd {
  font-size: 11px;
  padding: 1px 6px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.7);
  border-bottom-width: 2px;
  border-radius: 5px;
  color: rgb(var(--color-text-secondary-rgb));
}

/* ─── 统计卡 ─── */
.dash__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 14px;
}

.stat-card {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
  background: rgb(var(--color-surface-rgb) / 0.6);
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  border-color: rgb(var(--color-primary-rgb) / 0.45);
  background: rgb(var(--color-surface-rgb) / 0.9);
}

.stat-card::after {
  content: '';
  position: absolute;
  right: -30px;
  top: -30px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--stat-glow), transparent 70%);
  opacity: 0.55;
  pointer-events: none;
}

.stat-card--indigo {
  --stat-glow: rgb(var(--color-primary-rgb) / 0.2);
  --stat-icon-bg: rgb(var(--color-primary-rgb) / 0.14);
  --stat-icon-fg: rgb(var(--color-primary-rgb));
  --stat-icon-border: rgb(var(--color-primary-rgb) / 0.3);
}

.stat-card--green {
  --stat-glow: rgb(52 211 153 / 0.16);
  --stat-icon-bg: rgb(52 211 153 / 0.12);
  --stat-icon-fg: rgb(52 211 153);
  --stat-icon-border: rgb(52 211 153 / 0.3);
}

.stat-card--cyan {
  --stat-glow: rgb(56 189 248 / 0.16);
  --stat-icon-bg: rgb(56 189 248 / 0.12);
  --stat-icon-fg: rgb(56 189 248);
  --stat-icon-border: rgb(56 189 248 / 0.3);
}

.stat-card__icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--stat-icon-bg);
  color: var(--stat-icon-fg);
  box-shadow: inset 0 0 0 1px var(--stat-icon-border), 0 0 20px var(--stat-glow);
}

.stat-card__meta {
  display: block;
}

.stat-card__num {
  display: block;
  font-size: 25px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: rgb(var(--color-text-rgb));
}

.stat-card__label {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
}

.stat-card__sub {
  opacity: 0.75;
}

/* ─── Bento 双栏 ─── */
.dash__bento {
  display: grid;
  grid-template-columns: 1fr 330px;
  gap: 12px;
  align-items: start;
}

.dash__rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bento-card {
  border-radius: 12px;
  background: rgb(var(--color-surface-rgb) / 0.6);
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
}

.bento-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 18px 0;
}

.bento-card__title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 650;
  color: rgb(var(--color-text-rgb));
}

.bento-card__cnt {
  color: rgb(var(--color-text-secondary-rgb));
  font-weight: 500;
}

.bento-card__link {
  font-size: 12px;
  color: rgb(var(--color-primary-rgb));
  text-decoration: none;
  font-weight: 550;
}

.bento-card__link:hover {
  text-decoration: underline;
}

/* ─── 最近浏览列表 ─── */
.recent-list {
  padding: 10px 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  font-size: var(--text-xs);
  transition: background 0.13s ease;
}

.recent-item:hover {
  background: rgb(var(--color-text-rgb) / 0.05);
}

.recent-item__lang {
  flex: none;
  font-size: 10.5px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgb(var(--color-primary-rgb) / 0.12);
  color: rgb(var(--color-primary-rgb));
  border: 1px solid rgb(var(--color-primary-rgb) / 0.25);
}

.recent-item__name {
  font-weight: 550;
  color: rgb(var(--color-text-rgb));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-item__time {
  margin-left: auto;
  flex: none;
  font-size: 11.5px;
  color: rgb(var(--color-text-secondary-rgb) / 0.8);
}

.recent-item__arrow {
  flex: none;
  color: rgb(var(--color-primary-rgb));
  opacity: 0;
  transition: opacity 0.13s ease;
}

.recent-item:hover .recent-item__arrow {
  opacity: 1;
}

/* ─── 快捷开始 ─── */
.quick-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.5);
  background: rgb(var(--color-text-rgb) / 0.02);
  cursor: pointer;
  text-align: left;
  color: inherit;
  width: 100%;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.quick-item:hover {
  border-color: rgb(var(--color-primary-rgb) / 0.45);
  background: rgb(var(--color-primary-rgb) / 0.05);
  transform: translateX(3px);
}

.quick-item__icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--color-primary-rgb) / 0.12);
  color: rgb(var(--color-primary-rgb));
}

.quick-item__title {
  display: block;
  font-size: var(--text-xs);
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}

.quick-item__desc {
  display: block;
  font-size: 11.5px;
  color: rgb(var(--color-text-secondary-rgb));
  margin-top: 2px;
}

/* ─── 探索示例 ─── */
.explore-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.explore-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.5);
  background: rgb(var(--color-text-rgb) / 0.02);
  cursor: pointer;
  text-align: left;
  color: inherit;
  width: 100%;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.explore-item:hover {
  border-color: rgb(var(--color-primary-rgb) / 0.4);
  transform: translateY(-2px);
}

.explore-item__thumb {
  width: 52px;
  height: 42px;
  border-radius: 8px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: linear-gradient(135deg, rgb(var(--color-primary-rgb) / 0.22), rgb(56 189 248 / 0.12));
  border: 1px solid rgb(var(--color-border-rgb) / 0.5);
  color: rgb(var(--color-primary-rgb));
}

.explore-item__title {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 230px;
}

.explore-item__desc {
  display: block;
  font-size: 11px;
  color: rgb(var(--color-text-secondary-rgb));
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 230px;
}

/* ─── 响应式 ─── */
</style>
