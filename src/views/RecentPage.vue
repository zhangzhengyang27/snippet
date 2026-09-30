<script setup lang="ts">
/**
 * 最近使用页：展示最近使用（后端 lastUsedAt）与最近浏览（localStorage）的片段。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listKnowledgeSnippets, getKnowledgeSnippet } from '@/api/knowledge-snippets'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import { useRecentSnippets } from '@/composables/useRecentSnippets'
import { formatRelativeTime } from '@/utils/date-format'
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/layout/EmptyState.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'

const router = useRouter()
const { recent: recentIds, clearRecent } = useRecentSnippets()

const loading = ref(true)
const usedSnippets = ref<KnowledgeSnippet[]>([])
const recentSnippets = ref<KnowledgeSnippet[]>([])

const hasAny = computed(() => usedSnippets.value.length > 0 || recentSnippets.value.length > 0)

async function load() {
  loading.value = true
  try {
    // 最近使用：按 lastUsedAt 倒序取前 8 条
    const used = await listKnowledgeSnippets({ sort: 'lastUsedAt', page: 1, pageSize: 8 })
    usedSnippets.value = (used.items ?? []).filter((s) => s.lastUsedAt)

    // 最近浏览：localStorage 里只存 id，详情按需回查
    const ids = recentIds.value
    if (ids.length) {
      const results = await Promise.all(ids.map((id) => getKnowledgeSnippet(id).catch(() => null)))
      recentSnippets.value = results.filter((x): x is KnowledgeSnippet => x != null)
    } else {
      recentSnippets.value = []
    }
  } catch {
    usedSnippets.value = []
    recentSnippets.value = []
  } finally {
    loading.value = false
  }
}

function goSnippet(id: string) {
  router.push(`/snippets?focus=${encodeURIComponent(id)}`)
}

async function handleClearRecent() {
  clearRecent()
  recentSnippets.value = []
}

/** 相对时间展示：N 分钟前 / 小时前 / 天前，超过一周回退为日期。 */
onMounted(load)
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

    <div v-if="loading" class="recent__empty">加载中…</div>

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

.recent__empty {
  padding: 24px;
  font-size: 13px;
  color: rgb(var(--color-text-secondary-rgb));
}

.recent__section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 10px 12px;
  border-radius: 16px;
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
  border-radius: 11px;
  background: transparent;
  font-size: 13px;
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
