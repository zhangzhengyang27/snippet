import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SNIPPET_IMPORT_MAX_ITEMS,
  exportSnippetsJson,
  exportSnippetsMarkdown,
  normalizeTransferDisplayAttrs,
  parseSnippetsJson,
  planSnippetImport,
  readFileAsText,
  type SnippetExportItem,
} from './snippet-export-import'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'

/**
 * 片段导出 / 导入单元测试。
 *
 * 恢复推断：实现文件在恢复快照中仅存前半部分，
 * 这里依据幸存调用点（KnowledgeSnippetsPage.vue 的导入/导出流程）反推完整 API：
 *  - exportSnippetsJson / exportSnippetsMarkdown(KnowledgeSnippet[]) → 触发浏览器下载
 *  - parseSnippetsJson(text) → 解析导出文件为条目数组，非法输入抛错
 *  - planSnippetImport(items, knownIds) → { planned, skipped, overflow }
 *  - readFileAsText(File) → Promise<string>
 */

// ── 测试夹具 ──

/** 构造 KnowledgeSnippet 夹具（displayAttrs 只填归一化必保留的基础字段） */
function makeSnippet(overrides: Partial<KnowledgeSnippet> = {}): KnowledgeSnippet {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'snip-1',
    name: '测试片段',
    description: '片段描述',
    language: 'javascript',
    content: 'const a = 1',
    displayAttrs: {
      language: 'javascript',
      title: null,
      lineNumbers: true,
      wrap: false,
      collapsed: false,
    } as KnowledgeSnippet['displayAttrs'],
    placeholderDefs: [],
    favorite: true,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: now,
    updatedAt: now,
    collectionId: null,
    collectionName: null,
    tags: ['demo'],
    ...overrides,
  }
}

/** 构造导出条目夹具（导入侧的最小输入单元） */
function makeExportItem(overrides: Partial<SnippetExportItem> = {}): SnippetExportItem {
  return {
    name: '示例片段',
    description: '示例描述',
    language: 'javascript',
    code: 'const a = 1',
    tags: ['demo'],
    ...overrides,
  }
}

// ── 下载拦截：jsdom 未实现 URL.createObjectURL，用桩捕获导出内容 ──

const realCreateObjectURL = URL.createObjectURL
const realRevokeObjectURL = URL.revokeObjectURL

let capturedBlob: Blob | null = null
let capturedFilename = ''
let originalDownload: PropertyDescriptor | null = null

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

beforeEach(() => {
  capturedBlob = null
  capturedFilename = ''
  URL.createObjectURL = vi.fn((blob: Blob) => {
    capturedBlob = blob
    return 'blob:mock-url'
  }) as unknown as typeof URL.createObjectURL
  URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL
  // 拦截 <a>.download 捕获导出文件名（jsdom 未实现真实下载）
  const anchorProto = HTMLAnchorElement.prototype as unknown as Record<string, unknown>
  originalDownload = Object.getOwnPropertyDescriptor(anchorProto, 'download') ?? null
  Object.defineProperty(anchorProto, 'download', {
    set(value: string) {
      capturedFilename = value
    },
    get() {
      return capturedFilename
    },
    configurable: true,
  })
})

afterEach(() => {
  URL.createObjectURL = realCreateObjectURL
  URL.revokeObjectURL = realRevokeObjectURL
  const anchorProto = HTMLAnchorElement.prototype as unknown as Record<string, unknown>
  if (originalDownload) {
    Object.defineProperty(anchorProto, 'download', originalDownload)
  } else {
    delete anchorProto.download
  }
})

describe('SNIPPET_IMPORT_MAX_ITEMS', () => {
  it('导入条目上限为 500', () => {
    expect(SNIPPET_IMPORT_MAX_ITEMS).toBe(500)
  })
})

describe('exportSnippetsJson', () => {
  it('触发 .json 下载，内容可被 parseSnippetsJson 回读（往返一致）', async () => {
    const snippet = makeSnippet()
    exportSnippetsJson([snippet])

    expect(capturedBlob).not.toBeNull()
    expect(capturedFilename).toMatch(/\.json$/)
    expect(URL.revokeObjectURL).toHaveBeenCalled()

    const text = await readBlobText(capturedBlob as Blob)
    const parsed = parseSnippetsJson(text)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].name).toBe('测试片段')
    expect(parsed[0].code).toBe('const a = 1')
    expect(parsed[0].language).toBe('javascript')
    expect(parsed[0].description).toBe('片段描述')
    expect(parsed[0].tags).toEqual(['demo'])
  })

  it('v2 导出携带 displayAttrs 与 favorite', async () => {
    exportSnippetsJson([makeSnippet({ favorite: true })])

    const text = await readBlobText(capturedBlob as Blob)
    const parsed = parseSnippetsJson(text)
    expect(parsed[0].favorite).toBe(true)
    // displayAttrs 经归一化后完整保留基础字段
    expect(parsed[0].displayAttrs).toBeDefined()
    expect(parsed[0].displayAttrs?.language).toBe('javascript')
    expect(parsed[0].displayAttrs?.lineNumbers).toBe(true)
  })

  it('collectionId 写入导出文件，供导入侧回灌集合归属', async () => {
    exportSnippetsJson([makeSnippet({ collectionId: 'col-1' })])

    const text = await readBlobText(capturedBlob as Blob)
    const parsed = parseSnippetsJson(text)
    expect(parsed[0].collectionId).toBe('col-1')
  })
})

describe('exportSnippetsMarkdown', () => {
  it('触发 .md 下载，Markdown 内含片段名称与正文', async () => {
    exportSnippetsMarkdown([makeSnippet({ name: '防抖函数', content: 'function debounce() {}' })])

    expect(capturedBlob).not.toBeNull()
    expect(capturedFilename).toMatch(/\.md$/)

    const text = await readBlobText(capturedBlob as Blob)
    expect(text).toContain('防抖函数')
    expect(text).toContain('function debounce() {}')
  })
})

describe('parseSnippetsJson', () => {
  it('解析条目数组', () => {
    const items = [
      makeExportItem(),
      makeExportItem({ name: '第二条', code: 'let b = 2', tags: [] }),
    ]
    const parsed = parseSnippetsJson(JSON.stringify(items))
    expect(parsed).toHaveLength(2)
    expect(parsed[0].name).toBe('示例片段')
    expect(parsed[1].code).toBe('let b = 2')
  })

  it('非法 JSON 文本抛错', () => {
    expect(() => parseSnippetsJson('not-json-at-all')).toThrow()
  })

  it('非数组结构抛错（数字 / 字符串 / null / 普通对象）', () => {
    expect(() => parseSnippetsJson('42')).toThrow()
    expect(() => parseSnippetsJson('"a string"')).toThrow()
    expect(() => parseSnippetsJson('null')).toThrow()
    expect(() => parseSnippetsJson('{"name":"孤零零的对象"}')).toThrow()
  })

  it('数组内条目缺失关键字段时按脏数据处理', () => {
    // name / code 为空的条目不应抛错，由 planSnippetImport 计入 skipped
    const dirty = JSON.stringify([
      { name: '', code: 'x' },
      { name: 'ok', code: 'y' },
    ])
    expect(() => parseSnippetsJson(dirty)).not.toThrow()
  })
})

describe('planSnippetImport', () => {
  it('按名称与内容过滤空条目到 skipped', () => {
    const items = [
      makeExportItem({ name: '有效片段' }),
      makeExportItem({ name: '', code: 'x' }),
      makeExportItem({ name: '没正文', code: '' }),
    ]
    const plan = planSnippetImport(items, new Set<string>())
    expect(plan.planned).toHaveLength(1)
    expect(plan.planned[0].item.name).toBe('有效片段')
    expect(plan.skipped).toBe(2)
    expect(plan.overflow).toBe(0)
  })

  it('集合归属：已知集合保留，未知集合重定位到未分组', () => {
    const items = [
      makeExportItem({ name: '属于我的', collectionId: 'col-1' }),
      makeExportItem({ name: '别人的', collectionId: 'col-gone' }),
      makeExportItem({ name: '无集合', collectionId: undefined }),
    ]
    const plan = planSnippetImport(items, new Set(['col-1']))

    expect(plan.planned).toHaveLength(3)
    expect(plan.planned[0].collectionId).toBe('col-1')
    expect(plan.planned[0].relocated).toBeFalsy()

    expect(plan.planned[1].collectionId).toBeNull()
    expect(plan.planned[1].relocated).toBe(true)

    expect(plan.planned[2].collectionId).toBeNull()
    expect(plan.planned[2].relocated).toBeFalsy()
    expect(plan.skipped).toBe(0)
  })

  it('未超上限时 overflow 为 0', () => {
    const items = Array.from({ length: SNIPPET_IMPORT_MAX_ITEMS }, (_, i) =>
      makeExportItem({ name: `片段 ${i}` })
    )
    const plan = planSnippetImport(items, new Set<string>())
    expect(plan.overflow).toBe(0)
    expect(plan.planned).toHaveLength(SNIPPET_IMPORT_MAX_ITEMS)
  })

  it('超上限整批拒绝：overflow 记录超出数量，planned 不超过上限', () => {
    const items = Array.from({ length: SNIPPET_IMPORT_MAX_ITEMS + 1 }, (_, i) =>
      makeExportItem({ name: `片段 ${i}` })
    )
    const plan = planSnippetImport(items, new Set<string>())
    expect(plan.overflow).toBeGreaterThan(0)
    // planned + overflow 必须能还原全部可导入条数（与页面提示文案的口径一致）
    expect(plan.planned.length + plan.overflow).toBe(items.length)
    expect(plan.planned.length).toBeLessThanOrEqual(SNIPPET_IMPORT_MAX_ITEMS)
  })
})

describe('readFileAsText', () => {
  it('读取 File 内容为文本', async () => {
    const file = new File(['hello import'], 'snippets.json', { type: 'application/json' })
    await expect(readFileAsText(file)).resolves.toBe('hello import')
  })
})

describe('normalizeTransferDisplayAttrs', () => {
  it('非对象输入返回 undefined', () => {
    expect(normalizeTransferDisplayAttrs(undefined)).toBeUndefined()
    expect(normalizeTransferDisplayAttrs(null)).toBeUndefined()
    expect(normalizeTransferDisplayAttrs('attrs')).toBeUndefined()
    expect(normalizeTransferDisplayAttrs(42)).toBeUndefined()
  })

  it('空对象归一化为默认 attrs，不含 files / difficulty', () => {
    const attrs = normalizeTransferDisplayAttrs({})
    expect(attrs).toBeDefined()
    expect(attrs?.files).toBeUndefined()
    expect(attrs?.difficulty).toBeUndefined()
    expect(typeof attrs?.theme).toBe('string')
  })

  it('theme / difficulty 等脏值被丢弃或回退默认，不透传', () => {
    const attrs = normalizeTransferDisplayAttrs({
      language: 'javascript',
      theme: 'not-a-real-theme',
      difficulty: 'not-a-real-difficulty',
      lineNumbers: 'yes', // 非布尔 → 回退默认
      wrap: true,
      collapsed: false,
    })
    expect(attrs).toBeDefined()
    expect(attrs?.language).toBe('javascript')
    expect(attrs?.wrap).toBe(true)
    expect(attrs?.difficulty).toBeUndefined()
    // 非布尔 lineNumbers 回退到默认值（true/false 之一），绝不透传字符串
    expect(typeof attrs?.lineNumbers).toBe('boolean')
  })

  it('多文件字段：合法文件保留，非法条目剔除，空文件列表省略', () => {
    const withFiles = normalizeTransferDisplayAttrs({
      files: [
        { name: 'index.js', language: 'javascript', code: 'console.log(1)' },
        null,
        42,
        { name: '', language: '', code: 5 },
      ],
    })
    expect(withFiles?.files).toHaveLength(2)
    expect(withFiles?.files?.[0]).toEqual({
      name: 'index.js',
      language: 'javascript',
      code: 'console.log(1)',
    })
    // 空名 / 空语言的文件回退占位值
    expect(withFiles?.files?.[1]).toEqual({ name: 'unnamed', language: 'text', code: '' })

    const emptyFiles = normalizeTransferDisplayAttrs({ files: [] })
    expect(emptyFiles?.files).toBeUndefined()
  })
})
