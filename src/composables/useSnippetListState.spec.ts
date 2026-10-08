/**
 * useSnippetListState —— P0-3「列表瘦身」后的按需取正文逻辑。
 *
 * 列表接口为缩小载荷**不再返回 `content`**（占单条约 73%），只在选中预览 / 复制 /
 * 编辑 / 导出时按需回查详情。这里锁住 `ensureSnippetContent` 的三条关键语义：
 *  1. 列表项已带正文 → 不再发请求（避免每次点同一行都回查）；
 *  2. 缺正文 → 回查详情**并回填到列表项**（预览 / 编辑据此拿到正文）；
 *  3. 同一 id 并发 / 重复调用 → 只发一次请求（缓存 + inflight 去重）。
 *
 * 若第 2 条回填失效，编辑弹窗会拿到空 content，保存即把正文覆盖成空 —— 数据丢失。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'

const getKnowledgeSnippet = vi.fn()

vi.mock('@/api/knowledge-snippets', () => ({
  getKnowledgeSnippet: (...args: unknown[]) => getKnowledgeSnippet(...args),
  listKnowledgeSnippets: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 })),
}))

import {
  ensureSnippetContent,
  resetSnippetListState,
  useSnippetListState,
} from './useSnippetListState'

const makeSnippet = (overrides: Partial<KnowledgeSnippet> = {}): KnowledgeSnippet =>
  ({
    id: 'snp-1',
    name: '示例片段',
    description: '这是一条用于单元测试的描述，长度足够。',
    language: 'typescript',
    isPublic: false,
    displayAttrs: {},
    placeholderDefs: [],
    favorite: false,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    collectionId: null,
    collectionName: null,
    tags: [],
    ...overrides,
  }) as KnowledgeSnippet

/** 在真实组件实例中取用单例状态（composable 内部会注册 onBeforeUnmount，需组件上下文）。 */
function setupState() {
  let state: ReturnType<typeof useSnippetListState>
  const Comp = defineComponent({
    setup() {
      state = useSnippetListState()
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  return { state: state!, wrapper }
}

beforeEach(() => {
  getKnowledgeSnippet.mockReset()
  resetSnippetListState()
})

describe('ensureSnippetContent —— 列表瘦身后的按需取正文', () => {
  it('列表项已带正文 → 直接返回，不发请求', async () => {
    const { state } = setupState()
    state.snippets.value = [makeSnippet({ content: 'const a = 1;' })]

    const content = await ensureSnippetContent('snp-1')

    expect(content).toBe('const a = 1;')
    expect(getKnowledgeSnippet).not.toHaveBeenCalled()
  })

  it('列表项缺正文 → 回查详情并**回填到列表项**（预览 / 编辑据此拿到正文）', async () => {
    const { state } = setupState()
    state.snippets.value = [makeSnippet()] // content 省略 = 列表瘦身后的形态
    getKnowledgeSnippet.mockResolvedValueOnce(makeSnippet({ content: 'const a = 1;' }))

    const content = await ensureSnippetContent('snp-1')

    expect(getKnowledgeSnippet).toHaveBeenCalledWith('snp-1')
    expect(content).toBe('const a = 1;')
    // 回填：列表项被就地补上正文
    expect(state.snippets.value[0].content).toBe('const a = 1;')
  })

  it('同一 id 重复调用 → 命中缓存，只发一次请求', async () => {
    const { state } = setupState()
    state.snippets.value = [makeSnippet()]
    getKnowledgeSnippet.mockResolvedValue(makeSnippet({ content: 'const a = 1;' }))

    // 第一次取回后列表项已回填，但即便项被替换为无 content，也应命中缓存
    await ensureSnippetContent('snp-1')
    state.snippets.value = [makeSnippet()] // 模拟列表刷新后又变成瘦身形态
    await ensureSnippetContent('snp-1')

    expect(getKnowledgeSnippet).toHaveBeenCalledTimes(1)
  })

  it('并发调用同一 id → inflight 去重，只发一次请求', async () => {
    const { state } = setupState()
    state.snippets.value = [makeSnippet()]
    getKnowledgeSnippet.mockResolvedValue(makeSnippet({ content: 'const a = 1;' }))

    const [a, b] = await Promise.all([
      ensureSnippetContent('snp-1'),
      ensureSnippetContent('snp-1'),
    ])

    expect(a).toBe('const a = 1;')
    expect(b).toBe('const a = 1;')
    expect(getKnowledgeSnippet).toHaveBeenCalledTimes(1)
  })
})
