/**
 * 片段导出 / 导入工具（纯客户端，无后端依赖）。
 *  - 导出：当前片段列表 → Markdown（供人阅读）或 JSON（供回灌）
 *  - 导入：JSON 文件 → 逐条创建片段（创建请求由调用方发起）
 *
 * 只有 JSON 是可回灌格式，v2 起完整携带 displayAttrs。
 * 这一点并非锦上添花：多文件片段的代码只存在于 displayAttrs.files，
 * 其 content 往往只是一句「通过上方 tab 切换查看」的说明注释，
 * 导出若不带 displayAttrs，这类片段回灌后只剩空壳。
 */
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import {
  codeBlockDefaults,
  codeBlockThemes,
  snippetDifficultyLabel,
  snippetDifficultyOptions,
  type CodeBlockFile,
  type CodeBlockTheme,
  type EnhancedCodeBlockAttrs,
  type SnippetDifficulty,
} from '@/types/code-block'

/** 导出文件结构版本：1 = 仅正文；2 = 附带 displayAttrs / favorite */
const EXPORT_VERSION = 2

/**
 * 单次导入的条目上限。
 * 导入是逐条串行调用创建接口，无上限的大文件意味着一次点击发出上千个请求；
 * 超限文件整批拒绝（而非截断前 N 条），否则用户重试同一文件会把已导入的部分再建一遍。
 */
export const SNIPPET_IMPORT_MAX_ITEMS = 500

export interface SnippetExportItem {
  name: string
  description: string
  language: string
  code: string
  tags: string[]
  collectionId?: string
  favorite?: boolean
  displayAttrs?: EnhancedCodeBlockAttrs
}

/** 单条导入计划：item 为规范化后的条目，collectionId 为重定位后的集合归属。 */
export interface SnippetImportPlan {
  item: SnippetExportItem
  collectionId: string | null
  /** 原集合在当前工作区不存在，被重定位到「未分组」时为 true */
  relocated?: boolean
}

/** 导入计划：planned 交给调用方逐条创建，skipped/overflow 仅用于结果提示。 */
export interface SnippetImportResult {
  planned: SnippetImportPlan[]
  skipped: number
  overflow: number
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const THEME_VALUES = new Set<string>(codeBlockThemes.map((item) => item.value))
const DIFFICULTY_VALUES = new Set<string>(
  snippetDifficultyOptions.map((item) => item.value).filter(Boolean)
)

const toBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const toNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null

const toTheme = (value: unknown): CodeBlockTheme =>
  typeof value === 'string' && THEME_VALUES.has(value)
    ? (value as CodeBlockTheme)
    : codeBlockDefaults.theme

const toDifficulty = (value: unknown): SnippetDifficulty | undefined =>
  typeof value === 'string' && DIFFICULTY_VALUES.has(value)
    ? (value as SnippetDifficulty)
    : undefined

const toFiles = (value: unknown): CodeBlockFile[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }
  const files = value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      name: typeof item.name === 'string' && item.name ? item.name : 'unnamed',
      language: typeof item.language === 'string' && item.language ? item.language : 'text',
      code: typeof item.code === 'string' ? item.code : '',
    }))
  return files.length ? files : undefined
}

/**
 * 归一化待传输的展示属性：只保留已知字段并校验取值，未知字段一律丢弃。
 *
 * 导出侧用于裁剪冗余字段，导入侧用于挡住外部文件里的脏值——
 * theme / difficulty 会被拼进 CSS class 名，必须限定在枚举内。
 *
 * @returns 无有效内容时返回 undefined，调用方据此省略该字段
 */
export function normalizeTransferDisplayAttrs(input?: unknown): EnhancedCodeBlockAttrs | undefined {
  if (!input || typeof input !== 'object') {
    return undefined
  }
  const raw = input as Record<string, unknown>
  const attrs: EnhancedCodeBlockAttrs = {
    language: typeof raw.language === 'string' ? raw.language : codeBlockDefaults.language,
    title: toNullableString(raw.title),
    theme: toTheme(raw.theme),
    lineNumbers: toBoolean(raw.lineNumbers, codeBlockDefaults.lineNumbers),
    wrap: toBoolean(raw.wrap, codeBlockDefaults.wrap),
    collapsed: toBoolean(raw.collapsed, codeBlockDefaults.collapsed),
  }

  const files = toFiles(raw.files)
  if (files) {
    attrs.files = files
  }
  const difficulty = toDifficulty(raw.difficulty)
  if (difficulty) {
    attrs.difficulty = difficulty
  }

  return attrs
}

const toTags = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : []

const toExportItem = (raw: Record<string, unknown>): SnippetExportItem => ({
  name: typeof raw.name === 'string' ? raw.name : '',
  description: typeof raw.description === 'string' ? raw.description : '',
  language: typeof raw.language === 'string' && raw.language ? raw.language : 'text',
  code: typeof raw.code === 'string' ? raw.code : '',
  tags: toTags(raw.tags),
  collectionId: typeof raw.collectionId === 'string' && raw.collectionId ? raw.collectionId : undefined,
  favorite: typeof raw.favorite === 'boolean' ? raw.favorite : undefined,
  displayAttrs: normalizeTransferDisplayAttrs(raw.displayAttrs),
})

const exportTimestamp = (): string => new Date().toISOString().slice(0, 10).replace(/-/g, '')

/** KnowledgeSnippet → 可传输条目（content 即正文，displayAttrs 经归一化裁剪）。 */
function toExportItemFromSnippet(snippet: KnowledgeSnippet): SnippetExportItem {
  const attrs = normalizeTransferDisplayAttrs(snippet.displayAttrs)
  return {
    name: snippet.name,
    description: snippet.description ?? '',
    language: snippet.language,
    // 导出源必须**已带正文**（列表接口为瘦身不回传 content，调用方需先 hydrate）。
    // `?? ''` 仅为防御，避免个别条目缺正文时整份导出崩掉。
    code: snippet.content ?? '',
    tags: (snippet.tags ?? []).map((tag) => (typeof tag === 'string' ? tag : String((tag as { name?: unknown })?.name ?? ''))).filter(Boolean),
    collectionId: snippet.collectionId ?? undefined,
    favorite: snippet.favorite || undefined,
    displayAttrs: attrs,
  }
}

/**
 * 导出片段列表为 JSON（可回灌格式，v2：携带 displayAttrs / favorite / collectionId）。
 */
export function exportSnippetsJson(snippets: KnowledgeSnippet[]): void {
  const items = snippets.map(toExportItemFromSnippet)
  const filename = `snippets-export-v${EXPORT_VERSION}-${exportTimestamp()}.json`
  downloadBlob(filename, JSON.stringify(items, null, 2), 'application/json')
}

/**
 * 导出片段列表为 Markdown（供人阅读，不可回灌）。
 */
export function exportSnippetsMarkdown(snippets: KnowledgeSnippet[]): void {
  const lines: string[] = [`<!-- snippet-export v${EXPORT_VERSION} -->`, `# 代码片段导出（${snippets.length} 条）`, '']
  for (const snippet of snippets) {
    lines.push(`## ${snippet.name}`, '')
    if (snippet.description) {
      lines.push(snippet.description, '')
    }
    const attrs = normalizeTransferDisplayAttrs(snippet.displayAttrs)
    if (attrs?.difficulty) {
      lines.push(`> 难度：${snippetDifficultyLabel(attrs.difficulty)}`, '')
    }
    if (snippet.tags?.length) {
      lines.push(`标签：${snippet.tags.join('、')}`, '')
    }
    lines.push('```' + snippet.language, snippet.content ?? '', '```', '')
    if (attrs?.files?.length) {
      for (const file of attrs.files) {
        lines.push(`### ${file.name}`, '', '```' + file.language, file.code, '```', '')
      }
    }
  }
  const filename = `snippets-export-${exportTimestamp()}.md`
  downloadBlob(filename, lines.join('\n'), 'text/markdown')
}

/**
 * 解析导入文件文本：仅接受 JSON 条目数组。
 * 数组内的脏条目不在此抛错——交给 planSnippetImport 计入 skipped，
 * 这样用户能看到「跳过 N 条」而不是整个文件被一条脏数据废掉。
 */
export function parseSnippetsJson(text: string): SnippetExportItem[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('文件不是合法的 JSON')
  }
  if (!Array.isArray(parsed)) {
    throw new Error('文件结构不正确：应为片段条目数组')
  }
  return parsed
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => toExportItem(item))
}

/**
 * 生成导入计划：
 *  - 空 name / 空 code 的条目计入 skipped；
 *  - collectionId 不在 knownIds 中时重定位到未分组（relocated = true）；
 *  - 可导入条数超过 SNIPPET_IMPORT_MAX_ITEMS 时整批拒绝，overflow 记录超出数量。
 */
export function planSnippetImport(
  items: SnippetExportItem[],
  knownCollectionIds: Set<string>
): SnippetImportResult {
  const clean = items.filter((item) => item.name.trim() && item.code.trim())
  const skipped = items.length - clean.length
  const overflow = Math.max(0, clean.length - SNIPPET_IMPORT_MAX_ITEMS)
  const planned = clean.slice(0, SNIPPET_IMPORT_MAX_ITEMS).map((item) => {
    if (!item.collectionId) {
      return { item, collectionId: null }
    }
    if (knownCollectionIds.has(item.collectionId)) {
      return { item, collectionId: item.collectionId }
    }
    return { item, collectionId: null, relocated: true }
  })
  return { planned, skipped, overflow }
}

/** 读取用户选择的文件为文本（UTF-8）。 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
    reader.readAsText(file)
  })
}
