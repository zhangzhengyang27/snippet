<script setup lang="ts">
/**
 * 收藏夹页：聚合收藏的代码片段与示例，Tab 切换浏览。
 *
 * 三态（加载中 / 加载失败 / 空）统一由 useResourceFetch + EmptyState 表达。
 *
 * 此前这里用 `catch { list = [] }` 把异常吞成空数组，导致**「加载失败」在界面上
 * 与「没有收藏」完全无法区分**——用户断网或后端 5xx 时会以为自己的收藏丢了，
 * 这是最容易被投诉的一类体验缺陷。现在失败态会明确显示并提供「重试」。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { listKnowledgeSnippets } from '@/api/knowledge-snippets'
import { getFavorites } from '@/api/favorites'
import { getApiErrorMessage } from '@/api/client'
import { useResourceFetch } from '@/composables/useResourceFetch'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import type { CodeExample } from '@/types'
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/layout/EmptyState.vue'
import AppIcon from '@/components/common/AppIcon.vue'

const router = useRouter()
const authStore = useAuthStore()

type FavTab = 'snippets' | 'examples'
const activeTab = ref<FavTab>('snippets')

/**
 * 收藏的片段。
 * pageSize 100 是后端尚未提供收藏分页接口前的折中——超过 100 条的部分不会显示，
 * 待补分页后改为真实翻页（见评审报告第 1 节 P1）。
 */
const {
  data: favSnippetsRaw,
  loading: snippetsLoading,
  error: snippetsError,
  refresh: reloadSnippets,
} = useResourceFetch<KnowledgeSnippet[]>(async () => {
  const res = await listKnowledgeSnippets({ favorite: true, page: 1, pageSize: 100 })
  return res.items ?? []
})

/** 收藏的示例。未登录时后端会拒绝，此处直接返回空列表，属于正常情况而非错误。 */
const {
  data: favExamplesRaw,
  loading: examplesLoading,
  error: examplesError,
  refresh: reloadExamples,
} = useResourceFetch<CodeExample[]>(async () =>
  authStore.isLoggedIn ? await getFavorites() : []
)

// useResourceFetch 的 data 初始为 null（未加载 / 失败），列表渲染统一兜底成空数组
const favSnippets = computed(() => favSnippetsRaw.value ?? [])
const favExamples = computed(() => favExamplesRaw.value ?? [])

const totalCount = computed(() => favSnippets.value.length + favExamples.value.length)

function goSnippet(id: string) {
  router.push(`/snippets?focus=${encodeURIComponent(id)}`)
}

function goExample(id: string) {
  router.push(`/example/${encodeURIComponent(id)}`)
}
</script>

<template>
  <div class="favorites">
    <PageHeader
      title="收藏夹"
      :description="`收藏的内容会聚合在这里，方便随时回看（共 ${totalCount} 项）。`"
    />

    <!-- 登录提示 -->
    <div v-if="!authStore.isLoggedIn" class="favorites__hint">
      <AppIcon icon="material-symbols:info" :size="16" />
      登录后才能查看收藏的示例，代码片段收藏仍会展示。
    </div>

    <!-- Tab 切换 -->
    <div class="favorites__tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="favorites__tab"
        :class="{ 'is-active': activeTab === 'snippets' }"
        @click="activeTab = 'snippets'"
      >
        代码片段
        <span class="favorites__tab-count">{{ favSnippets.length }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="favorites__tab"
        :class="{ 'is-active': activeTab === 'examples' }"
        @click="activeTab = 'examples'"
      >
        示例
        <span class="favorites__tab-count">{{ favExamples.length }}</span>
      </button>
    </div>

    <!-- 代码片段 Tab -->
    <div v-if="activeTab === 'snippets'" class="favorites__body">
      <EmptyState v-if="snippetsLoading" type="loading" />
      <EmptyState
        v-else-if="snippetsError"
        type="error"
        :description="getApiErrorMessage(snippetsError, '收藏的代码片段加载失败，请稍后重试。')"
        show-retry
        @retry="reloadSnippets"
      />
      <EmptyState
        v-else-if="!favSnippets.length"
        title="暂无收藏的代码片段"
        description="在代码块中点击星标即可收藏片段。"
      />
      <div v-else class="favorites__grid">
        <button
          v-for="s in favSnippets"
          :key="s.id"
          type="button"
          class="fav-card"
          @click="goSnippet(s.id)"
        >
          <div class="fav-card__top">
            <span class="fav-card__lang">{{ s.language }}</span>
            <span class="fav-card__meta">{{ s.tags.slice(0, 2).join(' · ') }}</span>
          </div>
          <span class="fav-card__name">{{ s.name }}</span>
          <span class="fav-card__desc">{{ s.description || '无描述' }}</span>
        </button>
      </div>
    </div>

    <!-- 示例 Tab -->
    <div v-else class="favorites__body">
      <EmptyState v-if="examplesLoading" type="loading" />
      <EmptyState
        v-else-if="examplesError"
        type="error"
        :description="getApiErrorMessage(examplesError, '收藏的示例加载失败，请稍后重试。')"
        show-retry
        @retry="reloadExamples"
      />
      <EmptyState
        v-else-if="!favExamples.length"
        title="暂无收藏的示例"
        description="在示例详情中点击收藏即可加入收藏夹。"
      />
      <div v-else class="favorites__grid">
        <button
          v-for="e in favExamples"
          :key="e.id"
          type="button"
          class="fav-card"
          @click="goExample(e.id)"
        >
          <div class="fav-card__top">
            <span class="fav-card__lang">{{ e.language }}</span>
            <span class="fav-card__meta">{{ e.category }}</span>
          </div>
          <span class="fav-card__name">{{ e.title }}</span>
          <span class="fav-card__desc">{{ e.description || '无描述' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.favorites {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.favorites__hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid rgb(var(--color-warning-rgb, 234 179 8) / 0.4);
  border-radius: 10px;
  background: rgb(var(--color-warning-rgb, 234 179 8) / 0.08);
  font-size: 13px;
}

.favorites__tabs {
  display: inline-flex;
  gap: 4px;
  align-self: flex-start;
  padding: 4px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
  border-radius: 999px;
  background: rgb(var(--color-surface-rgb) / 0.6);
}

.favorites__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: none;
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.favorites__tab.is-active {
  background: rgb(var(--color-primary-rgb) / 0.14);
  color: rgb(var(--color-primary-rgb));
}

.favorites__tab-count {
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
}

.favorites__body {
  min-height: 200px;
}

.favorites__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.fav-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
  border-radius: 12px;
  background: rgb(var(--color-surface-rgb) / 0.6);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.fav-card:hover {
  border-color: rgb(var(--color-primary-rgb) / 0.5);
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgb(var(--color-shadow-rgb) / 0.1);
}

.fav-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.fav-card__lang {
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgb(var(--color-primary-rgb) / 0.25);
  background: rgb(var(--color-primary-rgb) / 0.12);
  color: rgb(var(--color-primary-rgb));
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 10.5px;
  font-weight: 600;
}

.fav-card__meta {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
}

.fav-card__name {
  font-size: 14px;
  font-weight: 600;
}

.fav-card__desc {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
}
</style>
