/** 封装片段列表 State 相关组合式状态与交互逻辑。 */

import { computed, effectScope, onBeforeUnmount, ref, watch } from 'vue'
import { getApiErrorMessage } from '@/api/client'
import { getKnowledgeSnippet, listKnowledgeSnippets } from '@/api/knowledge-snippets'
import type {
  KnowledgeSnippet,
  SnippetScope,
  SnippetSortOption,
} from '@/types/knowledge-snippet'
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

/**
 * 数据作用域（模块级单例状态的一部分）。
 *
 * 个人工作区 `/snippets` 传 `mine`、公共代码块库 `/library` 传 `public`。
 * 默认 `all` 保持「个人 + 公共」旧语义 —— 收藏夹 / 最近浏览 / 命令面板等
 * 复用本状态的地方不显式设置，因此不会回归。
 */
const scope = ref<SnippetScope>('all')

/**
 * 设置数据作用域，并清掉跨库不成立的上下文。
 *
 * 为什么必须清：`selectedSnippetId` 是模块级单例，若不重置，从个人工作区切到
 * 公共库时右侧详情面板会继续展示上一个「我的片段」——它甚至可能不在公共库里。
 * 集合筛选同理（个人集合 id 拿到公共库查询必然查不到）。
 * 关键词 / 语言 / 标签由页面按 URL 恢复，不在这里动。
 */
const setScope = (next: SnippetScope) => {
  if (scope.value === next) return
  scope.value = next
  selectedSnippetId.value = ''
  pendingSelectSnippetId.value = ''
  selectedCollectionId.value = null
  selectedTag.value = ''
}
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

/**
 * 重置全部列表状态（登出 / 会话失效时调用）。
 *
 * 这些状态是**模块级单例**，不随组件卸载而清理。若登出时不重置，工作台仍会显示
 * 上一个用户可见的片段列表，直到下一次筛选变化触发重新加载——在共用机器上属于
 * 跨用户数据泄露。
 *
 * 与 `clearFilters` 的区别：那个只清筛选条件（保留数据与分页），
 * 这个连数据、总数、选中项一起清掉。
 */
export function resetSnippetListState() {
  snippets.value = []
  total.value = 0
  selectedSnippetId.value = ''
  pendingSelectSnippetId.value = ''
  snippetError.value = ''
  // 正文缓存随列表一起作废：避免跨账号 / 跨作用域残留上一位用户的私有正文
  snippetContentCache.clear()
  snippetContentInflight.clear()
  clearFilters()
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

/**
 * 已按需取回的正文缓存（id → content）。
 *
 * 列表接口为瘦身（P0-3）**不回传 `content`**，仅在真正需要正文时（选中预览 /
 * 复制 / 编辑 / 导出）才回查详情；缓存避免「每次重新点同一行都再发一次请求」。
 */
const snippetContentCache = new Map<string, string>()

/** 进行中的正文请求：同一 id 并发只发一次（预览与复制可能同时触发）。 */
const snippetContentInflight = new Map<string, Promise<string | null>>()

/**
 * 确保某片段的 `content` 已就绪（列表接口不带正文）。
 *
 * 命中顺序：列表项已带正文 → 缓存 → 回查详情接口。取到后**回填到列表项**，
 * 让依赖 `snippet.content` 的预览 / 编辑弹窗 / 复制自动拿到正文。
 * 失败返回 `null`（调用方自行降级，不抛异常 —— 正文取不到不该炸掉整个列表）。
 */
export async function ensureSnippetContent(id: string): Promise<string | null> {
  const item = snippets.value.find((entry) => entry.id === id)
  if (item && item.content !== undefined) return item.content

  const cached = snippetContentCache.get(id)
  if (cached !== undefined) {
    if (item) item.content = cached
    return cached
  }

  const inflight = snippetContentInflight.get(id)
  if (inflight) return inflight

  const task = getKnowledgeSnippet(id)
    .then((full) => {
      const content = full.content ?? ''
      snippetContentCache.set(id, content)
      const target = snippets.value.find((entry) => entry.id === id)
      if (target) target.content = content
      return content
    })
    .catch(() => null)
    .finally(() => {
      snippetContentInflight.delete(id)
    })

  snippetContentInflight.set(id, task)
  return task
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
      scope: scope.value,
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

    // 当前选中项已不在结果集中（首次进入 / 换筛选 / 翻页 / 删除后）→ 清空选中，
    // 由详情面板展示空态。
    //
    // 此前这里写的是「自动选中第一条」（`selectedSnippetId = items[0].id`）：用户
    // 什么都没点，右侧详情就被强制展开、列表被压到 360px，等于替用户做了决定；
    // 且每次换筛选都会静默跳到第一条，正在看的上下文被冲掉。改为清空更符合直觉。
    if (!result.items.some((item) => item.id === selectedSnippetId.value)) {
      selectedSnippetId.value = ''
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

// watch / 生命周期必须在 setup 上下文注册，故放入函数内；
// 用模块级标志保证只注册一次（状态为单例，重复注册会多触发无效监听）
let watchersRegistered = false
/**
 * watcher 的宿主 scope（detached）。
 *
 * 必须独立于任何组件实例：这些 watch 是模块级单例状态的加载触发器，
 * 生命周期与「页面存在与否」无关。此前直接在首次调用组件的 setup 里注册，
 * 组件卸载时 Vue 会连 watcher 一起销毁，而 watchersRegistered 标志仍为 true、
 * 不会补注册——切换导航离开再回到 /snippets 后，集合/标签/搜索/排序/页码的
 * 变化全部不再触发加载（URL 会同步、列表纹丝不动）。
 */
const watcherScope = effectScope(true)
// 单例状态被多个组件共享（列表页、命令面板等），组件卸载时不能直接清掉全局
// 定时器，否则会中断其他使用者的待执行刷新；用消费计数保证仅最后一个使用者
// 卸载时才清理
let consumerCount = 0
export const useSnippetListState = () => {
  consumerCount += 1
  if (!watchersRegistered) {
    watchersRegistered = true
    watcherScope.run(() => {
      // 作用域切换（个人工作区 ↔ 公共代码块库）必须重新拉一次：
      // 单例状态不会因路由切换而重置，若只听筛选维度，切过去会继续显示上一个库的数据。
      watch(
        () => scope.value,
        () => {
          page.value = 1
          void loadSnippets()
        }
      )
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
          void loadSnippets()
        }
      )
    })
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
    scope,
    setScope,
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
    setPageSize,
  }
}
