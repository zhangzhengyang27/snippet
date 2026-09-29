<script setup lang="ts">
/**
 * 概览页：片段/收藏/示例总量统计、快捷入口与最近浏览片段。
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listKnowledgeSnippets, getKnowledgeSnippet } from '@/api/knowledge-snippets'
import { getFavorites } from '@/api/favorites'
import { getExamples } from '@/api/examples'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import { useRecentSnippets } from '@/composables/useRecentSnippets'
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/layout/EmptyState.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'

const router = useRouter()
const { recent: recentIds } = useRecentSnippets()

const loading = ref(true)
const snippetTotal = ref(0)
const snippetFavTotal = ref(0)
const exampleTotal = ref(0)
const recentSnippets = ref<KnowledgeSnippet[]>([])

const stats = [
  { key: 'snippets', label: '代码片段', icon: 'ms:code_blocks', path: '/snippets', total: snippetTotal },
  { key: 'favorites', label: '收藏夹', icon: 'ms:favorite', path: '/favorites', total: snippetFavTotal },
  { key: 'examples', label: '示例库', icon: 'ms:web', path: '/example', total: exampleTotal },
]

const shortcuts = [
  { key: 'new', label: '新建片段', icon: 'ms:add_circle', path: '/snippets?new=1' },
  { key: 'search', label: '搜索片段', icon: 'ms:search', path: '/snippets' },
  { key: 'recent', label: '最近使用', icon: 'ms:schedule', path: '/recent' },
  { key: 'about', label: '关于与帮助', icon: 'ms:info', path: '/about' },
]

async function load() {
  loading.value = true
  try {
    const [snipRes, favRes, exRes] = await Promise.all([
      listKnowledgeSnippets({ page: 1, pageSize: 1 }),
      getFavorites().catch(() => []),
      getExamples({ page: 1, limit: 1 }),
    ])
    snippetTotal.value = snipRes.total ?? 0
    snippetFavTotal.value = Array.isArray(favRes) ? favRes.length : 0
    exampleTotal.value = exRes.pagination?.total ?? 0
  } catch {
    // 统计失败时静默降级为 0，不阻塞页面渲染
  }

  // 加载最近浏览片段详情
  try {
    const ids = recentIds.value
    if (ids.length) {
      const results = await Promise.all(ids.map((id) => getKnowledgeSnippet(id).catch(() => null)))
      recentSnippets.value = results.filter((x): x is KnowledgeSnippet => x != null)
    }
  } catch {
    recentSnippets.value = []
  } finally {
    loading.value = false
  }
}

function go(path: string) {
  router.push(path)
}

function goSnippet(id: string) {
  router.push(`/snippets?focus=${encodeURIComponent(id)}`)
}

onMounted(load)
</script>

<template>
  <div class="dashboard">
    <PageHeader title="概览" description="知识片段与在线示例的整体情况。">
      <template #actions>
        <AppButton variant="glass" size="small" @click="go('/snippets?new=1')">
          <AppIcon icon="ms:add_circle" :size="14" />
          新建片段
        </AppButton>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <section class="dashboard__stats">
      <button
        v-for="item in stats"
        :key="item.key"
        type="button"
        class="stat-card"
        @click="go(item.path)"
      >
        <AppIcon :icon="item.icon" :size="20" class="stat-card__icon" />
        <span class="stat-card__value">{{ item.total.value }}</span>
        <span class="stat-card__label">{{ item.label }}</span>
      </button>
    </section>

    <!-- 快捷入口 -->
    <section class="dashboard__section">
      <h2 class="dashboard__section-title">
        <AppIcon icon="ms:bolt" :size="16" />
        快捷入口
      </h2>
      <div class="dashboard__shortcuts">
        <button
          v-for="item in shortcuts"
          :key="item.key"
          type="button"
          class="shortcut"
          @click="go(item.path)"
        >
          <AppIcon :icon="item.icon" :size="16" />
          {{ item.label }}
        </button>
      </div>
    </section>

    <!-- 最近浏览 -->
    <section class="dashboard__section">
      <h2 class="dashboard__section-title">
        <AppIcon icon="ms:visibility" :size="16" />
        最近浏览
      </h2>
      <div v-if="loading" class="dashboard__empty">加载中…</div>
      <EmptyState
        v-else-if="!recentSnippets.length"
        title="暂无浏览记录"
        description="浏览代码片段后，最近内容会显示在这里。"
      />
      <div v-else class="dashboard__list">
        <button
          v-for="s in recentSnippets"
          :key="s.id"
          type="button"
          class="recent-item"
          @click="goSnippet(s.id)"
        >
          <span class="recent-item__lang">{{ s.language }}</span>
          <span class="recent-item__name">{{ s.name }}</span>
          <span class="recent-item__desc">{{ s.description || '无描述' }}</span>
          <AppIcon icon="ms:arrow_forward" :size="16" class="recent-item__arrow" />
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 16px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
  border-radius: 12px;
  background: rgb(var(--color-surface-rgb) / 0.6);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.stat-card:hover {
  border-color: rgb(var(--color-primary-rgb) / 0.5);
  transform: translateY(-1px);
}

.stat-card__icon {
  color: rgb(var(--color-primary-rgb));
}

.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}

.stat-card__label {
  font-size: 13px;
  color: rgb(var(--color-text-secondary-rgb));
}

.dashboard__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dashboard__section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
}

.dashboard__shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.shortcut {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
  border-radius: 999px;
  background: rgb(var(--color-surface-rgb) / 0.6);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.shortcut:hover {
  border-color: rgb(var(--color-primary-rgb) / 0.5);
}

.dashboard__empty {
  padding: 24px;
  font-size: 13px;
  color: rgb(var(--color-text-secondary-rgb));
}

.dashboard__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.5);
  border-radius: 10px;
  background: rgb(var(--color-surface-rgb) / 0.5);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease;
}

.recent-item:hover {
  border-color: rgb(var(--color-primary-rgb) / 0.5);
}

.recent-item__lang {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgb(var(--color-primary-rgb) / 0.12);
  color: rgb(var(--color-primary-rgb));
  font-size: 12px;
}

.recent-item__name {
  font-weight: 600;
}

.recent-item__desc {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: rgb(var(--color-text-secondary-rgb));
}

.recent-item__arrow {
  flex: none;
  color: rgb(var(--color-text-secondary-rgb));
}
</style>
