<script setup lang="ts">
/**
 * 命令面板（⌘K / Ctrl+K 全局唤起）：
 *  - 空关键字：展示操作入口与最近浏览片段
 *  - 输入关键字：并行搜索代码片段与示例（防抖 200ms），支持语言过滤
 *  - ↑/↓ 选择、回车跳转、Esc 关闭；「查看全部」项直达完整搜索结果页
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listKnowledgeSnippets, listKnowledgeSnippetsByIds } from '@/api/knowledge-snippets'
import { getExamples } from '@/api/examples'
import { getApiErrorMessage } from '@/api/client'
import { useResourceFetch } from '@/composables/useResourceFetch'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import type { CodeExample } from '@/types'
import { useRecentSnippets } from '@/composables/useRecentSnippets'
import { codeBlockLanguages } from '@/types/code-block'
import AppIcon from '@/components/common/AppIcon.vue'

const router = useRouter()
const { recent: recentIds } = useRecentSnippets()

type CommandItem =
  | { type: 'action'; label: string; icon: string; run: () => void }
  | { type: 'snippet'; snippet: KnowledgeSnippet }
  | { type: 'recent'; snippet: KnowledgeSnippet }
  | { type: 'example'; example: CodeExample }
  | { type: 'all'; target: 'snippet' | 'example'; count: number }

const open = ref(false)
const keyword = ref('')
const selectedLanguage = ref('')
const activeIndex = ref(0)

/** 搜索聚合结果：一次请求同时拿片段与示例，避免两组独立的 loading/error 状态 */
interface SearchBundle {
  snippets: KnowledgeSnippet[]
  examples: CodeExample[]
  hasMoreSnippets: boolean
  hasMoreExamples: boolean
}

const EMPTY_BUNDLE: SearchBundle = {
  snippets: [],
  examples: [],
  hasMoreSnippets: false,
  hasMoreExamples: false,
}

/**
 * 命令面板搜索。走 useResourceFetch 以获得竞态保护与卸载中止 ——
 * 连续输入会触发多个并发请求，慢响应覆盖新结果时，用户看到的列表
 * 会与输入框里的关键词对不上。
 */
const {
  data: searchBundle,
  loading,
  error: searchError,
  execute: runSearch,
} = useResourceFetch<SearchBundle>(
  async (signal) => {
    const q = keyword.value.trim()
    if (!q) return EMPTY_BUNDLE

    const [snipRes, exRes] = await Promise.all([
      listKnowledgeSnippets(
        { q, page: 1, pageSize: 8, language: selectedLanguage.value || undefined },
        { signal }
      ),
      getExamples({ search: q, limit: 8 }, { signal }),
    ])

    const snippets = snipRes.items ?? []
    const examples = exRes.data ?? []
    return {
      snippets,
      examples,
      hasMoreSnippets: (snipRes.total ?? 0) > snippets.length,
      hasMoreExamples: (exRes.pagination?.total ?? 0) > examples.length,
    }
  },
  { immediate: false }
)

const snippetHits = computed(() => searchBundle.value?.snippets ?? [])
const exampleHits = computed(() => searchBundle.value?.examples ?? [])
const hasMoreSnippets = computed(() => searchBundle.value?.hasMoreSnippets ?? false)
const hasMoreExamples = computed(() => searchBundle.value?.hasMoreExamples ?? false)
const errorMsg = computed(() =>
  searchError.value ? getApiErrorMessage(searchError.value, '搜索失败') : ''
)

const recentSnippets = ref<KnowledgeSnippet[]>([])

const actionItems = computed<CommandItem[]>(() => [
  {
    type: 'action',
    label: '新建代码片段',
    icon: 'material-symbols:add-circle',
    run: () => router.push('/snippets?new=1'),
  },
  {
    type: 'action',
    label: '打开示例库',
    icon: 'material-symbols:web',
    run: () => router.push('/example'),
  },
])

const snippetItems = computed<CommandItem[]>(() =>
  snippetHits.value.map((snippet) => ({ type: 'snippet', snippet }))
)

const exampleItems = computed<CommandItem[]>(() =>
  exampleHits.value.map((example) => ({ type: 'example', example }))
)

const allSnippetItem = computed<CommandItem | null>(() =>
  hasMoreSnippets.value
    ? { type: 'all', target: 'snippet', count: snippetHits.value.length }
    : null
)

const allExampleItem = computed<CommandItem | null>(() =>
  hasMoreExamples.value ? { type: 'all', target: 'example', count: exampleHits.value.length } : null
)

const recentItems = computed<CommandItem[]>(() =>
  recentSnippets.value.map((snippet) => ({ type: 'recent', snippet }))
)

const flatItems = computed<CommandItem[]>(() => {
  const items: CommandItem[] = []
  items.push(...actionItems.value)
  if (!keyword.value.trim()) {
    items.push(...recentItems.value)
  } else {
    items.push(...snippetItems.value)
    if (allSnippetItem.value) items.push(allSnippetItem.value)
    items.push(...exampleItems.value)
    if (allExampleItem.value) items.push(allExampleItem.value)
  }
  return items
})

const grouped = computed(() => {
  const groups: Array<{ key: string; title: string; items: CommandItem[] }> = []
  if (actionItems.value.length)
    groups.push({ key: 'action', title: '操作', items: actionItems.value })
  if (!keyword.value.trim() && recentItems.value.length)
    groups.push({ key: 'recent', title: '最近浏览', items: recentItems.value })
  if (keyword.value.trim()) {
    if (snippetItems.value.length)
      groups.push({ key: 'snippet', title: '代码片段', items: snippetItems.value })
    if (allSnippetItem.value)
      groups.push({ key: 'all-snippet', title: '', items: [allSnippetItem.value] })
    if (exampleItems.value.length)
      groups.push({ key: 'example', title: '示例', items: exampleItems.value })
    if (allExampleItem.value)
      groups.push({ key: 'all-example', title: '', items: [allExampleItem.value] })
  }
  return groups
})

let searchTimer: number | null = null

// 打开面板时载入最近浏览片段（按 id 逐条取，失败忽略）
const loadRecent = async () => {
  const ids = recentIds.value
  if (!ids.length) {
    recentSnippets.value = []
    return
  }
  try {
    // 批量接口一次取回（原先逐条回查）；按 id 顺序回排，已删除/无权的条目自然跳过
    recentSnippets.value = await listKnowledgeSnippetsByIds(ids)
  } catch {
    recentSnippets.value = []
  }
}

watch(keyword, () => {
  activeIndex.value = 0
  if (searchTimer !== null) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => void runSearch(), 200)
})

watch(flatItems, () => {
  activeIndex.value = 0
})

const sectionOffset = (key: string) => {
  let idx = 0
  for (const g of grouped.value) {
    if (g.key === key) return idx
    idx += g.items.length
  }
  return 0
}

const onKeydown = (e: KeyboardEvent) => {
  // 全局唤起：⌘K / Ctrl+K（即便在输入框中也允许）
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value = !open.value
    return
  }
  if (!open.value) return
  // 输入法组合态（如中文候选词确认）不拦截，避免误触
  if (e.isComposing) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (flatItems.value.length) activeIndex.value = (activeIndex.value + 1) % flatItems.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (flatItems.value.length)
      activeIndex.value = (activeIndex.value - 1 + flatItems.value.length) % flatItems.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    execute(flatItems.value[activeIndex.value])
  }
}

const execute = (item?: CommandItem) => {
  if (!item) return
  if (item.type === 'action') {
    item.run()
  } else if (item.type === 'snippet' || item.type === 'recent') {
    router.push(`/snippets?focus=${encodeURIComponent(item.snippet.id)}`)
  } else if (item.type === 'example') {
    router.push(`/example/${encodeURIComponent(item.example.id)}`)
  } else if (item.type === 'all') {
    if (item.target === 'snippet') {
      const params = new URLSearchParams({ q: keyword.value.trim() })
      if (selectedLanguage.value) params.set('language', selectedLanguage.value)
      router.push(`/snippets?${params.toString()}`)
    } else {
      router.push(`/example?search=${encodeURIComponent(keyword.value.trim())}`)
    }
  }
  close()
}

const onSelect = (item: CommandItem) => execute(item)

const openPalette = () => {
  open.value = true
  keyword.value = ''
  activeIndex.value = 0
  // 关键词已为空时 watch 不会触发，故显式执行一次以清空上次的结果
  // （fetcher 对空关键词返回 EMPTY_BUNDLE）
  void runSearch()
  void loadRecent()
  void nextTick(() => document.querySelector<HTMLInputElement>('.cmdk-input')?.focus())
}

const close = () => {
  open.value = false
}

const itemLabel = (item: CommandItem) => {
  if (item.type === 'action') return item.label
  if (item.type === 'snippet' || item.type === 'recent') return item.snippet.name
  if (item.type === 'all') return `查看全部${item.target === 'snippet' ? '代码片段' : '示例'}结果`
  return item.example.title
}
const itemSub = (item: CommandItem) => {
  if (item.type === 'snippet' || item.type === 'recent')
    return item.snippet.description || item.snippet.language
  if (item.type === 'example') return item.example.description || item.example.language
  if (item.type === 'all') return `共 ${item.count} 条以上匹配`
  return ''
}

const itemIcon = (item: CommandItem) => {
  if (item.type === 'action') return item.icon
  if (item.type === 'snippet' || item.type === 'recent') return 'material-symbols:code-blocks'
  if (item.type === 'example') return 'material-symbols:web'
  return 'material-symbols:arrow-forward'
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  if (searchTimer !== null) window.clearTimeout(searchTimer)
})

defineExpose({ open: openPalette, close })
</script>

<template>
  <Teleport to="body">
    <Transition name="cmdk-fade">
      <!-- 模态背景：点击空白处关闭。键盘等价路径是 Esc（见 onKeydown 的 Escape 分支），
           背景本身**不应**是可聚焦控件 —— 硬加 tabindex 只会多一个无意义的 Tab 停靠点。
           故此处定点禁用，而非为消除警告而牺牲交互模型。 -->
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
      <div v-if="open" class="cmdk" @click.self="close">
        <div class="cmdk__panel" role="dialog" aria-label="命令面板">
          <!-- 搜索输入 -->
          <div class="cmdk__input-row">
            <AppIcon icon="material-symbols:search" :size="18" class="cmdk__input-icon" />
            <input
              v-model="keyword"
              type="text"
              class="cmdk-input"
              placeholder="搜索代码片段与示例…"
              aria-label="搜索代码片段与示例"
            />
            <select v-model="selectedLanguage" class="cmdk__lang" aria-label="按语言过滤">
              <option value="">全部语言</option>
              <option v-for="lang in codeBlockLanguages" :key="lang.value" :value="lang.value">{{ lang.label }}</option>
            </select>
            <kbd class="cmdk__kbd">Esc</kbd>
          </div>

          <div v-if="errorMsg" class="cmdk__error">{{ errorMsg }}</div>

          <!-- 结果分组 -->
          <div class="cmdk__list">
            <div v-if="loading" class="cmdk__hint">搜索中…</div>
            <template v-else>
              <div v-for="g in grouped" :key="g.key" class="cmdk__group">
                <div v-if="g.title" class="cmdk__group-title">{{ g.title }}</div>
                <button
                  v-for="item in g.items"
                  :key="itemLabel(item)"
                  type="button"
                  class="cmdk__item"
                  :class="{ 'is-active': flatItems[activeIndex] === item }"
                  :data-cmdk-offset="sectionOffset(g.key)"
                  @mouseenter="activeIndex = sectionOffset(g.key) + g.items.indexOf(item)"
                  @focus="activeIndex = sectionOffset(g.key) + g.items.indexOf(item)"
                  @click="onSelect(item)"
                >
                  <AppIcon :icon="itemIcon(item)" :size="16" class="cmdk__item-icon" />
                  <span class="cmdk__item-label">{{ itemLabel(item) }}</span>
                  <span class="cmdk__item-sub">{{ itemSub(item) }}</span>
                </button>
              </div>
              <div v-if="!grouped.length && keyword.trim()" class="cmdk__hint">
                没有匹配的结果
              </div>
            </template>
          </div>

          <!-- 底部快捷键提示 -->
          <div class="cmdk__footer">
            <span><kbd class="cmdk__kbd">↑</kbd><kbd class="cmdk__kbd">↓</kbd> 选择</span>
            <span><kbd class="cmdk__kbd">↵</kbd> 打开</span>
            <span><kbd class="cmdk__kbd">Esc</kbd> 关闭</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cmdk {
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

.cmdk__panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 640px;
  max-height: 70vh;
  overflow: hidden;
  border: 1px solid rgb(var(--color-border-glass-rgb) / 0.8);
  border-radius: 16px;
  background: rgb(var(--color-surface-rgb));
  box-shadow: 0 24px 64px rgb(0 0 0 / 0.25);
}

.cmdk__input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid rgb(var(--color-border-rgb) / 0.5);
}

.cmdk__input-icon {
  flex: none;
  color: rgb(var(--color-text-secondary-rgb));
}

.cmdk-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: rgb(var(--color-text-rgb));
  font-size: 15px;
}

.cmdk__lang {
  flex: none;
  padding: 4px 8px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
  border-radius: 8px;
  background: rgb(var(--color-surface-rgb));
  color: rgb(var(--color-text-secondary-rgb));
  font-size: 12px;
}

.cmdk__kbd {
  flex: none;
  padding: 2px 6px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
  border-radius: 6px;
  font-size: 11px;
  color: rgb(var(--color-text-secondary-rgb));
}

.cmdk__error {
  padding: 10px 16px;
  font-size: 13px;
  color: rgb(var(--color-danger-rgb, 239 68 68));
}

.cmdk__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.cmdk__hint {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: rgb(var(--color-text-secondary-rgb));
}

.cmdk__group-title {
  padding: 8px 10px 4px;
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
}

.cmdk__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.cmdk__item.is-active {
  background: rgb(var(--color-primary-rgb) / 0.1);
}

.cmdk__item-icon {
  flex: none;
  color: rgb(var(--color-text-secondary-rgb));
}

.cmdk__item.is-active .cmdk__item-icon {
  color: rgb(var(--color-primary-rgb));
}

.cmdk__item-label {
  flex: none;
  max-width: 60%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: rgb(var(--color-text-rgb));
}

.cmdk__item-sub {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
}

.cmdk__footer {
  display: flex;
  gap: 16px;
  padding: 10px 16px;
  border-top: 1px solid rgb(var(--color-border-rgb) / 0.5);
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
}

.cmdk-fade-enter-active,
.cmdk-fade-leave-active {
  transition: opacity 0.15s ease;
}

.cmdk-fade-enter-from,
.cmdk-fade-leave-to {
  opacity: 0;
}
</style>
