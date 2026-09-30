/**
 * 片段版本历史 · diff 纯函数 + 数据编排。
 *
 * 历史上本模块承载过版本列表/缓存/回滚，因 UI 侧从未接入而被裁剪（只剩纯函数）；
 * 本轮补齐了后端版本功能，这里相应地重建了前端链路：
 *   - `computeVersionDiff` / `snippetComparableText`  纯函数，可直接单测
 *   - `useSnippetVersions`                            列表加载 + 选中版本详情 + 两个写操作
 *
 * 数据获取一律走 `useResourceFetch`，从而同时获得竞态保护与卸载中止
 * （见该 composable 的注释）。切勿改回手写 then/catch。
 */
import { computed, ref, watch } from 'vue'
import * as Diff from 'diff'
import { useResourceFetch } from './useResourceFetch'
import { getApiErrorMessage } from '@/api/client'
import {
  deleteSnippetVersion,
  getSnippetVersion,
  listSnippetVersions,
  rollbackSnippetVersion,
} from '@/api/knowledge-snippets'
import type {
  DiffLine,
  DiffLineKind,
  SnippetVersionDetail,
  SnippetVersionListResult,
  SnippetVersionSummary,
} from '@/types/snippet-version'

// diff 类型定义在 types/ 下（与其它共享类型一致），这里再导出，
// 便于消费者 `import { computeVersionDiff, type DiffLine } from '@/composables/useSnippetVersions'`
export type { DiffLine, DiffLineKind }

/**
 * 计算两段文本的行级差异，返回**可直接按顺序渲染**的统一 diff 行序列。
 *
 * ## 为什么返回「有序行序列」而不是三组数组
 * 本项目早期版本返回 `{ added, removed, unchanged }` 三个数组，用于并排视图。
 * 但那种形状**排不出对齐的两列**：两个数组各按自己的顺序收集行，
 * 且行号来自同一个全局计数器，插入/删除会让左右两侧的行错位。
 * 统一 diff（上下文行 + 删除行 + 新增行，按真实顺序排列）没有这个问题，
 * 是版本对比里更稳的呈现方式。
 *
 * ## 为什么用 `diffArrays` 而不是 `diffLines`
 * `diffLines` 对**尾行换行符**敏感 —— `'a'` 与 `'a\n'` 会被判成不同的行，
 * 于是「只删掉了末尾换行符」这种无意义变化也会渲染出一条 added + 一条 removed。
 * 实测：`diffLines('a\nb\nc', 'a')` 会把 `a` 算成「删除 + 新增」而不是共同行。
 * 改成先按统一口径切行、再 `diffArrays` 比较，就没有这个问题。
 */
export function computeVersionDiff(
  before: string | null | undefined,
  after: string | null | undefined
): DiffLine[] {
  const parts = Diff.diffArrays(toLines(before), toLines(after))
  const lines: DiffLine[] = []
  let oldNo = 0
  let newNo = 0

  for (const part of parts) {
    for (const text of part.value) {
      if (part.added) {
        lines.push({ kind: 'added', oldLine: null, newLine: ++newNo, text })
      } else if (part.removed) {
        lines.push({ kind: 'removed', oldLine: ++oldNo, newLine: null, text })
      } else {
        lines.push({ kind: 'context', oldLine: ++oldNo, newLine: ++newNo, text })
      }
    }
  }

  return lines
}

/**
 * 文本 → 行数组。口径：**末尾的单个换行符是行终止符，不算新的一行**，
 * 空文本是 0 行。
 *   ''        → []
 *   'a'       → ['a']
 *   'a\n'     → ['a']       （不是 ['a','']，否则每个正常文件都会多出一行空行）
 *   'a\n\n'   → ['a','']    （真正的空行仍保留）
 */
function toLines(text: string | null | undefined): string[] {
  if (!text) return []
  return text.replace(/\n$/, '').split('\n')
}

/** 参与比较的数据源：片段正文与展示属性 */
export interface SnippetComparableSource {
  content?: string | null
  displayAttrs?: { files?: { name: string; code?: string }[] } | null
}

/**
 * 把片段（或版本快照）折算为参与 diff 的文本。
 *
 * ⚠️ **多文件片段的代码只存在于 `displayAttrs.files`**，`content` 并不持有它
 * （见 `utils/snippet-export-import.ts` 的说明）。所以这里必须优先展开 files ——
 * 若只看 `content`，多文件片段的 diff 会一律显示「无变化」，是个会骗人的静默错误。
 */
export function snippetComparableText(source: SnippetComparableSource | null | undefined): string {
  const files = source?.displayAttrs?.files
  if (files && files.length) {
    return files.map((file) => `// ===== ${file.name} =====\n${file.code ?? ''}`).join('\n\n')
  }
  return source?.content ?? ''
}

/** 版本列表项的展示文案：后端用固定标记表达来源，这里翻译成中文 */
export function versionMessageLabel(message: string): string {
  if (message === 'create') return '创建'
  if (message === 'update') return '更新'
  if (message.startsWith('rollback:')) return '回滚'
  return message || '快照'
}

const EMPTY_LIST: SnippetVersionListResult = { items: [], total: 0, page: 1, pageSize: 20 }

export interface UseSnippetVersionsOptions {
  /** 当前片段 id（详情页可能切换片段，因此用函数取最新值） */
  snippetId: () => string
  /** 版本面板是否可见；**仅在可见时加载**，避免每个详情页都白跑一次请求 */
  isActive: () => boolean
  /** 当前正文（diff 的「新」侧） */
  currentSource: () => SnippetComparableSource | null
  /** 回滚成功后的回调（详情页借此重新拉取片段） */
  onRolledBack?: () => void | Promise<void>
}

/**
 * 版本面板的数据编排。
 *
 * 加载时机刻意收敛为「面板打开时」：`useResourceFetch` 传 `immediate: false`，
 * 由 `active` 的 watch 驱动首次加载。
 */
export function useSnippetVersions(options: UseSnippetVersionsOptions) {
  const page = ref(1)
  const pageSize = ref(20)

  // 选中项要**先声明**：listFetch 的 onSuccess 会读它（打开面板时默认选中最新一版）。
  // 虽然 immediate:false 保证回调不会在构造期执行，但依赖执行时机是脆的，显式前置更稳。
  const selectedId = ref('')

  const listFetch = useResourceFetch<SnippetVersionListResult>(
    (signal) => {
      const id = options.snippetId()
      if (!id) return Promise.resolve({ ...EMPTY_LIST, page: page.value, pageSize: pageSize.value })
      return listSnippetVersions(id, { page: page.value, pageSize: pageSize.value }, { signal })
    },
    {
      immediate: false,
      watch: page,
      onSuccess: (data) => {
        // 打开面板后默认选中最新一版，省掉一次多余点击
        const first = data.items[0]
        if (first && !selectedId.value) selectedId.value = first.id
      },
    }
  )

  const detailFetch = useResourceFetch<SnippetVersionDetail | null>(
    (signal) => {
      const id = options.snippetId()
      if (!id || !selectedId.value) return Promise.resolve(null)
      return getSnippetVersion(id, selectedId.value, { signal })
    },
    { immediate: false, watch: selectedId }
  )

  watch(
    () => options.isActive(),
    (open) => {
      if (!open) {
        // 关闭时清空选中：否则下次打开会先闪出上次片段的旧 diff
        selectedId.value = ''
        return
      }
      // 打开时回到第 1 页并重新拉取。
      // 本来就在第 1 页时 `page` 不变、watch(page) 不会触发，所以这里要显式 refresh。
      if (page.value !== 1) page.value = 1
      else void listFetch.refresh()
    }
  )

  const items = computed<SnippetVersionSummary[]>(() => listFetch.data.value?.items ?? [])
  const total = computed(() => listFetch.data.value?.total ?? 0)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  const listLoading = computed(() => listFetch.loading.value)
  const listError = computed(() =>
    listFetch.error.value ? getApiErrorMessage(listFetch.error.value, '加载版本历史失败') : ''
  )

  const selected = computed<SnippetVersionDetail | null>(() => detailFetch.data.value)
  const detailLoading = computed(() => detailFetch.loading.value)
  const detailError = computed(() =>
    detailFetch.error.value ? getApiErrorMessage(detailFetch.error.value, '加载版本内容失败') : ''
  )

  const diffLines = computed<DiffLine[]>(() => {
    const version = detailFetch.data.value
    if (!version) return []
    return computeVersionDiff(
      snippetComparableText(version),
      snippetComparableText(options.currentSource())
    )
  })

  /** 选中版本与当前正文是否完全一致（一致时 UI 不该显示空 diff，而应直说「内容相同」） */
  const diffIdentical = computed(() => {
    const version = detailFetch.data.value
    if (!version) return false
    return snippetComparableText(version) === snippetComparableText(options.currentSource())
  })

  function setPage(next: number) {
    const clamped = Math.min(Math.max(1, next), totalPages.value)
    if (clamped !== page.value) page.value = clamped
  }

  const busy = ref(false)

  /**
   * 回滚到指定版本。
   * 失败时**抛出**，由调用方负责提示（getApiErrorMessage），避免这里吞掉错误。
   */
  async function rollback(versionId: string): Promise<void> {
    const id = options.snippetId()
    if (!id || busy.value) return
    busy.value = true
    try {
      await rollbackSnippetVersion(id, versionId)
      await options.onRolledBack?.()
      await listFetch.refresh()
    } finally {
      busy.value = false
    }
  }

  /** 删除单个版本快照。失败时抛出，由调用方提示。 */
  async function removeVersion(versionId: string): Promise<void> {
    const id = options.snippetId()
    if (!id || busy.value) return
    busy.value = true
    try {
      await deleteSnippetVersion(id, versionId)
      if (selectedId.value === versionId) selectedId.value = ''
      await listFetch.refresh()
      // 删掉的若是当前页最后一条，页号会落到空页 —— 回退一页（watch(page) 会重新加载）
      if (
        page.value > 1 &&
        (page.value - 1) * pageSize.value >= (listFetch.data.value?.total ?? 0)
      ) {
        page.value -= 1
      }
    } finally {
      busy.value = false
    }
  }

  return {
    // 列表
    items,
    total,
    totalPages,
    page,
    pageSize,
    listLoading,
    listError,
    reload: listFetch.refresh,
    setPage,
    // 选中与详情
    selectedId,
    selected,
    detailLoading,
    detailError,
    reloadDetail: detailFetch.refresh,
    diffLines,
    diffIdentical,
    // 写操作
    busy,
    rollback,
    removeVersion,
  }
}
