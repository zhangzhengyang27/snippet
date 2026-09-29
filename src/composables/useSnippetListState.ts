/** 封装片段列表 State 相关组合式状态与交互逻辑。 */

import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getApiErrorMessage } from '@/api/client'
import { listKnowledgeSnippets } from '@/api/knowledge-snippets'
import type { KnowledgeSnippet, SnippetSortOption } from '@/types/knowledge-snippet'
import { normalizeSnippetLanguage } from '@/types/code-block'
import { renderEnhancedCodeBlockHtml } from '@/utils/enhancedCodeBlock'

/**
 * 片段列表默认每页加载条数。
 */
export const snippetListPageSize = 20

/**
 * 支持的每页条数选项。
 */
export const snippetPageSizeOptions = [12, 20, 24, 36, 48]

/**
 * 片段列表支持的排序选项。
 */
export const snippetSortOptions: Array<{ label: string; value: SnippetSortOption }> = [
  { label: '默认排序', value: 'default' },
  { label: '按最近使用', value: 'lastUsedAt' },
  { label: '按更新时间', value: 'updatedAt' },
  { label: '按名称', value: 'name' },
  { label: '按难度（入门→高级）', value: 'difficulty' },
]

/**
 * 管理片段列表的筛选、分页与预览状态。
 * 设计为模块级单例：全应用共享同一份筛选状态，命令面板才能感知页面当前的语言筛选。
 */
const keyword = ref('')
const selectedCollectionId = ref<string | null>(null)
const selectedTag = ref('')
const favoritesOnly = ref(false)
const sort = ref<SnippetSortOption>('default')
const page = ref(1)
const pageSize = ref(snippetListPageSize)
const total = ref(0)
const snippets = ref<KnowledgeSnippet[]>([])
const loadingSnippets = ref(false)
const snippetError = ref('')
const selectedSnippetId = ref('')
const pendingSelectSnippetId = ref('')

/**
 * 语言筛选：通过后端 listKnowledgeSnippets 的 language 参数做服务端过滤。
 * languages 为当前结果集中出现的语言集合，仅用于下拉选项展示。
 */
const selectedLanguage = ref('')
const languages = computed(() =>
  Array.from(
    new Set(snippets.value.map((s) => normalizeSnippetLanguage(s.language)).filter(Boolean))
  ).sort()
)

/** 清空全部筛选条件（关键词 / 集合 / 标签 / 语言 / 收藏） */
const clearFilters = () => {
  keyword.value = ''
  selectedCollectionId.value = null
  selectedTag.value = ''
  selectedLanguage.value = ''
  favoritesOnly.value = false
  page.value = 1
}
const listTimer = ref<number | null>(null)

/**
 * 请求序号：每次发起 loadSnippets 递增，响应回来时若不等于最新序号则丢弃，
 * 防止快速切换筛选/分页时旧响应覆盖新响应。
 */
let snippetLoadSeq = 0

const selectedSnippet = computed(
  () => snippets.value.find((item) => item.id === selectedSnippetId.value) || null
)
/**
 * 取得片段用于预览/复制的“主文件”源码。
 * 规则：多文件片段优先取 files[0].code（与详情面板保持一致），
 * 避免单文件 content 与 files 不一致时列表预览显示过期代码。
 */
export const getSnippetPreviewContent = (snippet: KnowledgeSnippet): string => {
  const files = snippet.displayAttrs?.files
  if (files && files.length > 0) {
    return files[0].code ?? ''
  }
  return snippet.content ?? ''
}

const selectedSnippetPreviewHtml = computed(() => {
  if (!selectedSnippet.value) {
    return ''
  }

  return renderEnhancedCodeBlockHtml(
    getSnippetPreviewContent(selectedSnippet.value),
    selectedSnippet.value.displayAttrs
  )
})
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const loadSnippets = async (append = false) => {
  // 递增请求序号；响应回来时若不匹配则丢弃，避免旧响应覆盖新响应
  const seq = ++snippetLoadSeq
  loadingSnippets.value = true
  snippetError.value = ''

  try {
    const result = await listKnowledgeSnippets({
      q: keyword.value.trim() || undefined,
      collectionId: selectedCollectionId.value || undefined,
      tag: selectedTag.value || undefined,
      language: selectedLanguage.value
        ? normalizeSnippetLanguage(selectedLanguage.value)
        : undefined,
      favorite: favoritesOnly.value ? true : undefined,
      sort: sort.value,
      page: page.value,
      pageSize: pageSize.value,
    })

    // 丢弃过期响应：期间用户已发起新请求
    if (seq !== snippetLoadSeq) return

    if (append) {
      // 追加模式：去重后合并（服务端分页顺序稳定，按 id 去重防御重复项）
      const existing = new Set(snippets.value.map((item) => item.id))
      snippets.value = [...snippets.value, ...result.items.filter((item) => !existing.has(item.id))]
    } else {
      snippets.value = result.items
    }
    total.value = result.total

    if (
      pendingSelectSnippetId.value &&
      result.items.some((item) => item.id === pendingSelectSnippetId.value)
    ) {
      selectedSnippetId.value = pendingSelectSnippetId.value
      pendingSelectSnippetId.value = ''
      return
    }

    if (!result.items.some((item) => item.id === selectedSnippetId.value)) {
      selectedSnippetId.value = result.items[0]?.id || ''
    }
  } catch (error) {
    // 丢弃过期响应的错误
    if (seq !== snippetLoadSeq) return
    snippetError.value = getApiErrorMessage(error, '加载代码片段失败。')
  } finally {
    // 仅当本次请求是最新请求时才清空 loading
    if (seq === snippetLoadSeq) {
      loadingSnippets.value = false
    }
  }
}

const scheduleLoadSnippets = () => {
  if (listTimer.value !== null) {
    window.clearTimeout(listTimer.value)
  }

  listTimer.value = window.setTimeout(() => {
    void loadSnippets()
  }, 220)
}

const setPageSize = (next: number) => {
  const normalized = Math.max(1, Math.floor(next))
  if (normalized !== pageSize.value) {
    pageSize.value = normalized
    page.value = 1
    void loadSnippets()
  }
}

/**
 * 加载下一页并追加到列表（移动端无限滚动使用）。
 * 已到末页或正在加载时忽略。
 */
/** 追加加载标志：防止 watch(page) 在 loadMore 期间触发覆盖式加载 */
let appendingMore = false

const loadMore = async () => {
  if (loadingSnippets.value) return
  if (page.value >= totalPages.value) return
  appendingMore = true
  try {
    page.value += 1
    await loadSnippets(true)
  } finally {
    appendingMore = false
  }
}

// watch / 生命周期必须在 setup 上下文注册，故放入函数内；
// 用模块级标志保证只注册一次（状态为单例，重复注册会多触发无效监听）
let watchersRegistered = false
// 单例状态被多个组件共享（列表页、命令面板等），组件卸载时不能直接清掉全局
// 定时器，否则会中断其他使用者的待执行刷新；用消费计数保证仅最后一个使用者
// 卸载时才清理
let consumerCount = 0
export const useSnippetListState = () => {
  consumerCount += 1
  if (!watchersRegistered) {
    watchersRegistered = true
    watch(
      () => [
        selectedCollectionId.value,
        selectedTag.value,
        selectedLanguage.value,
        favoritesOnly.value,
        sort.value,
      ],
      () => {
        page.value = 1
        void loadSnippets()
      }
    )
    watch(
      () => keyword.value,
      () => {
        page.value = 1
        scheduleLoadSnippets()
      }
    )
    watch(
      () => page.value,
      () => {
        // 追加模式（loadMore）已自行加载，跳过覆盖式加载
        if (appendingMore) return
        void loadSnippets()
      }
    )
  }
  onBeforeUnmount(() => {
    consumerCount -= 1
    if (consumerCount === 0 && listTimer.value !== null) {
      window.clearTimeout(listTimer.value)
      listTimer.value = null
    }
  })

  return {
    keyword,
    selectedCollectionId,
    selectedTag,
    favoritesOnly,
    sort,
    page,
    pageSize,
    total,
    totalPages,
    snippets,
    selectedLanguage,
    languages,
    clearFilters,
    loadingSnippets,
    snippetError,
    selectedSnippetId,
    pendingSelectSnippetId,
    selectedSnippet,
    selectedSnippetPreviewHtml,
    loadSnippets,
    scheduleLoadSnippets,
    loadMore,
    setPageSize,
  }
}
