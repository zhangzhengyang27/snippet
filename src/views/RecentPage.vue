<script setup lang="ts">
/**
 * 最近使用页：展示最近使用（后端 lastUsedAt）与最近浏览（localStorage）的片段。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listKnowledgeSnippets, getKnowledgeSnippet } from '@/api/knowledge-snippets'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import { useRecentSnippets } from '@/composables/useRecentSnippets'
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
function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  const diff = Date.now() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString('zh-CN')
}

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
        <section v-if="usedSnippets.length" class="recent__section">
          <h2 class="recent__section-title">
            <AppIcon icon="material-symbols:schedule" :size="16" />
            最近使用
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
              <span class="recent-item__time">{{ formatDate(s.lastUsedAt) }}</span>
              <AppIcon icon="material-symbols:arrow-forward" :size="16" class="recent-item__arrow" />
            </button>
          </div>
        </section>

        <!-- 最近浏览（localStorage） -->
        <section v-if="recentSnippets.length" class="recent__section">
          <h2 class="recent__section-title">
            <AppIcon icon="material-symbols:visibility" :size="16" />
            最近浏览
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
              <span class="recent-item__time">{{ formatDate(s.updatedAt) }}</span>
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
  gap: 10px;
}

.recent__section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
}

.recent__list {
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

.recent-item__time {
  flex: none;
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
}

.recent-item__arrow {
  flex: none;
  color: rgb(var(--color-text-secondary-rgb));
}
</style>
