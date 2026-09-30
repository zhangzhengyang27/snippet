<script setup lang="ts">
/**
 * 最近使用页：展示最近使用（后端 lastUsedAt）与最近浏览（localStorage）的片段。
 *
 * 三态由 useResourceFetch + EmptyState 表达。此前用 `catch { 两个列表都清空 }`
 * 吞掉异常，断网时页面会显示「暂无使用记录」——把「加载失败」伪装成「没有数据」。
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { listKnowledgeSnippets, listKnowledgeSnippetsByIds } from '@/api/knowledge-snippets'
import { getApiErrorMessage } from '@/api/client'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import { useRecentSnippets } from '@/composables/useRecentSnippets'
import { useResourceFetch } from '@/composables/useResourceFetch'
import { formatRelativeTime } from '@/utils/date-format'
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/layout/EmptyState.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'

const router = useRouter()
const { recent: recentIds, clearRecent } = useRecentSnippets()

const {
  data: lists,
  loading,
  error,
  refresh: reload,
} = useResourceFetch<{ used: KnowledgeSnippet[]; recent: KnowledgeSnippet[] }>(async () => {
  // 最近使用：按 lastUsedAt 倒序取前 8 条
  const used = await listKnowledgeSnippets({ sort: 'lastUsedAt', page: 1, pageSize: 8 })
  const usedItems = (used.items ?? []).filter((s) => s.lastUsedAt)

  // 最近浏览：localStorage 里只存 id，用批量接口一次取回（原先逐条回查，N 次往返）。
  // listKnowledgeSnippetsByIds 会按 id 顺序回排，并跳过已删除/无权的条目。
  const recentItems = await listKnowledgeSnippetsByIds(recentIds.value)

  return { used: usedItems, recent: recentItems }
})

const usedSnippets = computed(() => lists.value?.used ?? [])
const recentSnippets = computed(() => lists.value?.recent ?? [])
const hasAny = computed(() => usedSnippets.value.length > 0 || recentSnippets.value.length > 0)

function goSnippet(id: string) {
  router.push(`/snippets?focus=${encodeURIComponent(id)}`)
}

async function handleClearRecent() {
  clearRecent()
  // recentIds 已清空，重新加载即可（fetcher 内部读的就是 recentIds.value）
  await reload()
}
</script>

<template>
  <div class="recent">
    <PageHeader title="最近使用" description="快速回访最近浏览或最近使用过的代码片段。">
      <template #actions>
        <AppButton v-if="recentSnippets.length" variant="glass" size="small" @click="handleClearRecent">
          <AppIcon icon="material-symbols:delete" :size="14" />
          清空记录
        </AppButton>
      </template>
    </PageHeader>

    <EmptyState v-if="loading" type="loading" />
    <EmptyState
      v-else-if="error"
      type="error"
      :description="getApiErrorMessage(error, '最近记录加载失败，请稍后重试。')"
      show-retry
      @retry="reload"
    />

    <template v-else>
      <EmptyState
        v-if="!hasAny"
        title="暂无使用记录"
        description="浏览或使用代码片段后，记录会显示在这里。"
      />

      <template v-else>
        <!-- 最近使用（后端 lastUsedAt） -->
        <section v-if="usedSnippets.length" class="recent__section bento-card">
          <h2 class="recent__section-title">
            <AppIcon icon="material-symbols:schedule" :size="16" />
            最近使用
            <span class="recent__section-cnt">{{ usedSnippets.length }}</span>
          </h2>
          <div class="recent__list">
            <button
              v-for="s in usedSnippets"
              :key="s.id"
              type="button"
              class="recent-item"
              @click="goSnippet(s.id)"
            >
              <span class="recent-item__lang">{{ s.language }}</span>
              <span class="recent-item__name">{{ s.name }}</span>
              <span class="recent-item__desc">{{ s.description || '无描述' }}</span>
              <span class="recent-item__time">{{ formatRelativeTime(s.lastUsedAt) }}</span>
              <AppIcon icon="material-symbols:arrow-forward" :size="16" class="recent-item__arrow" />
            </button>
          </div>
        </section>

        <!-- 最近浏览（localStorage） -->
        <section v-if="recentSnippets.length" class="recent__section bento-card">
          <h2 class="recent__section-title">
            <AppIcon icon="material-symbols:visibility" :size="16" />
            最近浏览
            <span class="recent__section-cnt">{{ recentSnippets.length }}</span>
          </h2>
          <div class="recent__list">
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
              <span class="recent-item__time">{{ formatRelativeTime(s.updatedAt) }}</span>
              <AppIcon icon="material-symbols:arrow-forward" :size="16" class="recent-item__arrow" />
            </button>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.recent {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.recent__section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 10px 12px;
  border-radius: 12px;
  background: rgb(var(--color-surface-rgb) / 0.6);
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
}

.recent__section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 2px 10px 10px;
  font-size: 13.5px;
  font-weight: 650;
  color: rgb(var(--color-text-rgb));
}

.recent__section-cnt {
  color: rgb(var(--color-text-secondary-rgb));
  font-weight: 500;
}

.recent__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: var(--text-xs);
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: background 0.13s ease;
}

.recent-item:hover {
  background: rgb(var(--color-text-rgb) / 0.05);
}

.recent-item__lang {
  flex: none;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
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
}

.recent-item__desc {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: rgb(var(--color-text-secondary-rgb));
}

.recent-item__time {
  flex: none;
  font-size: 11.5px;
  color: rgb(var(--color-text-secondary-rgb) / 0.85);
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
</style>
