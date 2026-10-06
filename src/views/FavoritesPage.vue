<script setup lang="ts">
/**
 * 收藏夹页：展示当前用户收藏的**代码块**（按用户，收藏对象为 knowledge snippet）。
 *
 * 三态（加载中 / 加载失败 / 空）统一由 useResourceFetch + EmptyState 表达 ——
 * 不用 `catch { list = [] }` 把异常吞成空数组，否则「加载失败」在界面上与
 * 「没有收藏」完全无法区分，用户断网时会以为收藏丢了。
 *
 * 列表数据复用片段列表接口的 `favorite=true` 过滤（后端按当前用户计算），
 * 因此分页、可见性与排序都与代码块列表保持一致，无需单独维护一套查询。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { listKnowledgeSnippets } from '@/api/knowledge-snippets'
import { getApiErrorMessage } from '@/api/client'
import { useResourceFetch } from '@/composables/useResourceFetch'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import PageHeader from '@/components/layout/PageHeader.vue'
import Pagination from '@/components/layout/Pagination.vue'
import EmptyState from '@/components/layout/EmptyState.vue'
import AppIcon from '@/components/common/AppIcon.vue'

const router = useRouter()
const authStore = useAuthStore()

/**
 * 收藏的代码块（服务端分页）。
 *
 * 分页为真实翻页而非写死 `pageSize: 100` —— 后者会让超过 100 条的收藏被
 * **静默截断**，用户既看不到也得不到任何提示。
 */
interface FavSnippetsResult {
  items: KnowledgeSnippet[]
  total: number
}

const favPage = ref(1)
const favPageSize = ref(24)

const {
  data: favSnippetsResult,
  loading,
  error,
  refresh: reload,
} = useResourceFetch<FavSnippetsResult>(
  async (signal) => {
    const res = await listKnowledgeSnippets(
      { favorite: true, page: favPage.value, pageSize: favPageSize.value },
      { signal }
    )
    return { items: res.items ?? [], total: res.total ?? 0 }
  },
  // 页码 / 每页条数变化时自动重新加载（useResourceFetch 内置竞态保护）
  { watch: [favPage, favPageSize] }
)

const favSnippets = computed(() => favSnippetsResult.value?.items ?? [])
const favTotal = computed(() => favSnippetsResult.value?.total ?? 0)
const favTotalPages = computed(() => Math.max(1, Math.ceil(favTotal.value / favPageSize.value)))

/** 改每页条数后必须回到第 1 页，否则可能停在一个不存在的页码上 */
function handlePageSizeChange(size: number) {
  favPageSize.value = size
  favPage.value = 1
}

function goSnippet(id: string) {
  router.push(`/snippets?focus=${encodeURIComponent(id)}`)
}
</script>

<template>
  <div class="favorites page-content">
    <PageHeader
      title="收藏夹"
      :description="`你收藏的代码块会聚合在这里，方便随时回看（共 ${favTotal} 项）。`"
    />

    <!-- 登录提示：收藏按用户，未登录看不到自己的收藏 -->
    <div v-if="!authStore.isLoggedIn" class="favorites__hint">
      <AppIcon icon="material-symbols:info" :size="16" />
      登录后才能查看收藏夹。
    </div>

    <EmptyState v-if="loading" type="loading" />
    <EmptyState
      v-else-if="error"
      type="error"
      :description="getApiErrorMessage(error, '收藏的代码块加载失败，请稍后重试。')"
      show-retry
      @retry="reload"
    />
    <EmptyState
      v-else-if="!favSnippets.length"
      title="暂无收藏的代码块"
      description="打开任意代码块，点击顶部的星标即可收藏。"
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

    <!-- 服务端分页：超过一页时才显示（组件内置 hideOnSinglePage） -->
    <Pagination
      v-if="!loading && !error && favSnippets.length"
      :page="favPage"
      :total="favTotal"
      :total-pages="favTotalPages"
      :page-size="favPageSize"
      @update:page="favPage = $event"
      @update:page-size="handlePageSizeChange"
    />
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
  border-radius: 8px;
  background: rgb(var(--color-warning-rgb, 234 179 8) / 0.08);
  font-size: var(--text-xs);
}

.favorites__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  min-height: 200px;
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
