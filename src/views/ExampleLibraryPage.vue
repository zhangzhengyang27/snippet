<script setup lang="ts">
/**
 * 示例库列表页（路由 /example，name: example-library）。
 *
 * 功能：示例列表（getExamples 服务端分页）、关键词搜索（防抖）、
 * 键盘流（j/k 上下移动、Enter 打开、/ 聚焦搜索）与分页。
 * 点击卡片跳转 /example/:id 查看详情与在线预览。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExamples } from '@/api/examples'
import { getApiErrorMessage } from '@/api/client'
import type { CodeExample } from '@/types'
import PageHeader from '@/components/layout/PageHeader.vue'
import Pagination from '@/components/layout/Pagination.vue'
import EmptyState from '@/components/layout/EmptyState.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'
import { usePagination } from '@/composables/usePagination'
import { useListShortcuts } from '@/composables/useListShortcuts'

const router = useRouter()
const route = useRoute()

// ── 搜索（输入态 + 300ms 防抖查询态） ──
const keyword = ref('')
const debouncedKeyword = ref('')
let keywordTimer: ReturnType<typeof setTimeout> | null = null

watch(keyword, (value) => {
  if (keywordTimer) clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    debouncedKeyword.value = value.trim()
  }, 300)
})

onBeforeUnmount(() => {
  if (keywordTimer) clearTimeout(keywordTimer)
  keywordTimer = null
})

// ── 列表状态 ──
const examples = ref<CodeExample[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')

const { page, pageSize, totalPages } = usePagination({
  total,
  pageSize: 24,
  // total 会随加载刷新，不能每次变化都把页码重置回 1，改由筛选逻辑显式 reset
  resetOnTotalChange: false,
})

/** 请求序号：仅最新请求的结果会写入 state，防止快速切换筛选时旧响应覆盖新响应 */
let loadSeq = 0

async function load() {
  const seq = ++loadSeq
  loading.value = true
  error.value = ''
  try {
    const res = await getExamples({
      search: debouncedKeyword.value || undefined,
      page: page.value,
      limit: pageSize.value,
    })
    // 丢弃过期响应：期间用户已发起新请求
    if (seq !== loadSeq) return
    examples.value = res.data ?? []
    total.value = res.pagination?.total ?? 0
  } catch (e) {
    if (seq !== loadSeq) return
    examples.value = []
    total.value = 0
    error.value = getApiErrorMessage(e, '加载示例失败。')
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

onMounted(() => {
  // 支持从示例详情「按来源分组」跳转带入初始搜索词（?search=xxx）
  const initialSearch = route.query.search
  if (typeof initialSearch === 'string' && initialSearch.trim()) {
    keyword.value = initialSearch
    debouncedKeyword.value = initialSearch
  }
  void load()
})

// 翻页 / 调整每页条数时重新加载
watch(page, () => {
  void load()
})
watch(pageSize, () => {
  if (page.value !== 1) {
    // 改页大小回到第 1 页，page 变化会触发加载
    page.value = 1
  } else {
    void load()
  }
})

// 搜索条件变化：回到第 1 页重新查询；若已在第 1 页则显式加载
watch(debouncedKeyword, () => {
  if (page.value !== 1) {
    page.value = 1
  } else {
    void load()
  }
})

function clearSearch() {
  keyword.value = ''
}

// ── 键盘流：j/k 上下移动、Enter 打开、/ 聚焦搜索（useListShortcuts 统一处理） ──
const searchRef = ref<HTMLInputElement | null>(null)

function goDetail(id: string) {
  router.push(`/example/${id}`)
}

const { activeIndex } = useListShortcuts({
  items: examples,
  onOpen: (item) => goDetail(item.id),
  searchRef,
})
</script>

<template>
  <div class="example-library">
    <PageHeader title="示例库" :description="`可在线预览与编辑的示例合集，当前共 ${total} 个。`" />

    <!-- ── 工具栏：搜索 + 刷新 ── -->
    <div class="library-toolbar">
      <div class="library-search">
        <AppIcon icon="ms:search" :size="16" class="library-search__icon" />
        <input
          ref="searchRef"
          v-model="keyword"
          type="search"
          class="library-search__input"
          placeholder="搜索示例标题、描述或标签…（按 / 聚焦）"
          aria-label="搜索示例"
        />
        <button
          v-if="keyword"
          type="button"
          class="library-search__clear"
          aria-label="清空搜索"
          @click="clearSearch"
        >
          <AppIcon icon="ms:close" :size="14" />
        </button>
      </div>
      <AppButton variant="glass" size="small" :loading="loading" @click="load">
        <AppIcon icon="ms:refresh" :size="16" />
        刷新
      </AppButton>
    </div>

    <!-- ── 加载 / 错误 / 空态 ── -->
    <EmptyState v-if="loading && !examples.length" type="loading" compact />
    <EmptyState v-else-if="error" type="error" compact show-retry @retry="load" />
    <EmptyState
      v-else-if="!examples.length"
      title="未找到匹配的示例"
      description="换个关键词试试，或清空搜索条件查看全部示例。"
    />

    <!-- ── 示例卡片网格 ── -->
    <div v-else class="library-grid">
      <button
        v-for="(item, index) in examples"
        :key="item.id"
        type="button"
        class="example-card"
        :class="{ 'is-active': activeIndex === index }"
        :data-card-index="index"
        @click="goDetail(item.id)"
      >
        <span class="example-card__lang">{{ item.language || 'code' }}</span>
        <span class="example-card__title">{{ item.title }}</span>
        <span class="example-card__desc">{{ item.description || '暂无描述' }}</span>
        <span v-if="item.tags?.length" class="example-card__tags">
          {{ item.tags.slice(0, 3).join(' · ') }}
        </span>
      </button>
    </div>

    <!-- ── 分页 ── -->
    <Pagination
      v-model:page="page"
      v-model:page-size="pageSize"
      :total-pages="totalPages"
      :total="total"
    />

    <p class="library-hint">键盘流：j / k 上下移动 · Enter 打开 · / 聚焦搜索</p>
  </div>
</template>

<style scoped>
.example-library {
  /* 显式 100%：作为 .app-main（flex column）的子项，避免内容最宽子元素把 auto 宽度顶过父容器 */
  width: 100%;
  min-width: 0;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6) var(--page-padding-x, 22px) var(--space-12);
}

/* ── 工具栏 ── */
.library-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.library-search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.library-search__icon {
  position: absolute;
  left: 12px;
  color: rgb(var(--color-text-tertiary-rgb));
  pointer-events: none;
}

.library-search__input {
  width: 100%;
  padding: 9px 36px 9px 36px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.8);
  border-radius: 100px;
  background: rgb(var(--color-surface-rgb) / 0.9);
  color: rgb(var(--color-text-rgb));
  font-family: var(--font-body);
  font-size: 0.875rem;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.library-search__input:focus {
  border-color: rgb(var(--color-primary-rgb) / 0.6);
  box-shadow: 0 0 0 3px rgb(var(--color-primary-rgb) / 0.12);
}

.library-search__clear {
  position: absolute;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgb(var(--color-surface-variant-rgb));
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
}

.library-search__clear:hover {
  color: rgb(var(--color-text-rgb));
}

/* ── 卡片网格：与收藏夹卡片同族 ── */
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
  gap: 14px;
}

.example-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  text-align: left;
  border: 1px solid rgb(var(--color-border-rgb) / 0.7);
  border-radius: var(--radius-xl);
  background: rgb(var(--color-surface-rgb) / 0.9);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.example-card:hover {
  transform: translateY(-2px);
  border-color: rgb(var(--color-primary-rgb) / 0.45);
  box-shadow: 0 12px 32px rgb(var(--color-shadow-rgb) / 0.12);
}

/* 键盘流高亮项：与 hover 同强度 */
.example-card.is-active {
  border-color: rgb(var(--color-primary-rgb) / 0.7);
  background: rgb(var(--color-primary-rgb) / 0.08);
  box-shadow: 0 0 0 1px rgb(var(--color-primary-rgb) / 0.35);
}

.example-card:focus-visible {
  outline: 2px solid rgb(var(--color-primary-rgb) / 0.6);
  outline-offset: 2px;
}

.example-card__lang {
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 100px;
  background: rgb(var(--color-primary-rgb) / 0.12);
  color: rgb(var(--color-primary-rgb));
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 600;
}

.example-card__title {
  font-family: var(--font-heading);
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.example-card__desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: rgb(var(--color-text-secondary-rgb));
  min-height: 2.5em;
}

.example-card__tags {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: rgb(var(--color-text-tertiary-rgb));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 键盘流提示 ── */
.library-hint {
  margin: 4px 0 0;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: rgb(var(--color-text-tertiary-rgb));
}

@media (max-width: 640px) {
  .example-library {
    padding: 16px 18px 32px;
  }

  .library-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
