<script setup lang="ts">
/**
 * 顶栏搜索对话框。
 *
 * 从 `AppHeader.vue` 拆出：它自带完整状态（关键词 / 结果 / 防抖 / 竞态保护 /
 * 键盘激活）与全部样式，与顶栏其余部分（导航、用户菜单、主题切换）没有耦合。
 *
 * 快捷键归属：本对话框用 `/` 打开；`⌘K` 归全局命令面板（CommandPalette），
 * 两者此前都监听 ⌘K，导致一次按键打开两个搜索框 —— 已修正，见 AppHeader。
 */
import { computed, ref, watch } from 'vue'
import { getExamples } from '@/api'
import { useResourceFetch } from '@/composables/useResourceFetch'
import AppIcon from '@/components/common/AppIcon.vue'
import type { CodeExample } from '@/types'

/** 搜索结果只需展示字段，剥掉正文以减小响应式开销 */
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

const props = defineProps<{
  /** 是否打开（由父组件控制） */
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  /** 用户选中某条结果 */
  select: [id: string]
}>()

const searchQuery = ref('')
const activeIndex = ref(-1)

/**
 * 搜索结果。走 useResourceFetch 以获得竞态保护与卸载中止：
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
      // 搜索失败展示空结果（与本组件拆分前的行为一致；本组件没有错误展示位）。
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

/** 关闭时重置内部状态，避免下次打开看到上次的关键词与结果 */
watch(
  () => props.open,
  (open) => {
    if (open) return
    searchQuery.value = ''
    activeIndex.value = -1
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }
  }
)

function handleSelect(id: string) {
  emit('select', id)
  emit('close')
}

/**
 * 结果项的键盘激活（Enter / Space）。
 * 与 SnippetListRow 的 `role="button"` + `@keydown` 保持同一套模式。
 */
function handleItemKeydown(id: string, e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    handleSelect(id)
  }
}
</script>

<template>
  <!-- 模态背景：点击空白处关闭。键盘等价路径是 Esc（见输入框的 @keydown.escape），
       背景本身不应是可聚焦控件。定点禁用，理由同 CommandPalette。 -->
  <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
  <div v-if="props.open" class="app-header__search-overlay" @click.self="emit('close')">
    <div class="app-header__search-dialog">
      <div class="app-header__search-title">搜索示例</div>
      <!-- autofocus：这是用户主动按 `/` 或点击搜索按钮才打开的对话框，聚焦输入框是正确 UX；
           该规则针对的是页面加载即抢焦点的情况，不适用于此处。
           用区块禁用而非 next-line —— 违规报告在 autofocus 属性那一行，而 HTML 注释无法插入标签内部。 -->
      <!-- eslint-disable vuejs-accessibility/no-autofocus -->
      <input
        v-model="searchQuery"
        class="app-header__search-input"
        placeholder="搜索示例、标签、教程…"
        aria-label="搜索示例、标签、教程"
        autofocus
        @keydown.escape="emit('close')"
      />
      <!-- eslint-enable vuejs-accessibility/no-autofocus -->
      <div class="app-header__search-results">
        <div v-if="searchLoading">搜索中…</div>
        <div v-else-if="limitedResults.length === 0 && searchQuery.trim()">未找到匹配的示例</div>
        <div
          v-for="example in limitedResults"
          :key="example.id"
          class="app-header__search-item"
          tabindex="0"
          role="button"
          @click="handleSelect(example.id)"
          @keydown="handleItemKeydown(example.id, $event)"
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
</template>

<style scoped>
/* ⚠️ 这组样式曾在数据恢复事故中整体丢失：全仓原本**不存在任何**
   `.app-header__search-*` / `.search-result__*` 规则，导致搜索框以无样式的
   原始文本贴在左上角、与品牌 Logo 重叠（实测截图确认）。
   已按全局命令面板（CommandPalette）的设计语言补回，保持两者观感一致。 */
.app-header__search-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 16px;
  background: rgb(var(--color-background-rgb) / 0.55);
  backdrop-filter: blur(6px);
}

.app-header__search-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  max-height: 70vh;
  overflow: hidden;
  border: 1px solid rgb(var(--color-border-glass-rgb) / 0.8);
  border-radius: 12px;
  background: rgb(var(--color-surface-rgb));
  box-shadow: 0 24px 64px rgb(0 0 0 / 0.25);
}

.app-header__search-title {
  padding: 14px 16px 8px;
  font-family: var(--font-heading);
  font-size: var(--text-xs);
  font-weight: 600;
  color: rgb(var(--color-text-secondary-rgb));
}

.app-header__search-input {
  margin: 0 12px 10px;
  padding: 10px 12px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
  border-radius: 8px;
  background: rgb(var(--color-surface-variant-rgb) / 0.5);
  color: rgb(var(--color-text-rgb));
  font-size: 14px;
  outline: none;
}

.app-header__search-input:focus-visible {
  border-color: rgb(var(--color-primary-rgb) / 0.6);
  box-shadow: 0 0 0 3px rgb(var(--color-primary-rgb) / 0.15);
}

.app-header__search-results {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  overflow-y: auto;
  padding: 0 8px 10px;
}

/* 「搜索中…」「未找到匹配的示例」等纯文本提示 */
.app-header__search-results > div:not(.app-header__search-item) {
  padding: 10px 8px;
  font-size: var(--text-xs);
  color: rgb(var(--color-text-secondary-rgb));
}

.app-header__search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background var(--duration-fast) ease;
}

.app-header__search-item:hover,
.app-header__search-item:focus-visible {
  background: rgb(var(--color-surface-variant-rgb) / 0.6);
  outline: none;
}

.search-result__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.search-result__title {
  overflow: hidden;
  color: rgb(var(--color-text-rgb));
  font-size: var(--text-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-result__desc {
  overflow: hidden;
  color: rgb(var(--color-text-secondary-rgb));
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-result__category {
  color: rgb(var(--color-text-tertiary-rgb));
  font-size: 0.6875rem;
}
</style>
