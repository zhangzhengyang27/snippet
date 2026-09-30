// @vitest-environment jsdom
/**
 * SnippetListPanel 组件测试。
 *
 * 这个面板承担的是「取数三态 + 列表呈现 + 事件上抛」的粘合逻辑，恰恰是纯函数单测
 * 覆盖不到、而 bug 又最容易藏身的一层。重点锁三类不变量：
 *  1. 三态优先级（错误 > 首次加载骨架 > 空状态 > 列表）
 *  2. 加载中**不重建列表**（否则滚动位置会被甩回顶部）
 *  3. 子组件事件正确上抛（selectSnippet / clearFilters / createSnippet）
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SnippetListPanel from './SnippetListPanel.vue'
import SnippetListRow from './SnippetListRow.vue'
import AppButton from '@/components/common/AppButton.vue'
import Pagination from '@/components/layout/Pagination.vue'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'

/**
 * jsdom 没有 IntersectionObserver（面板一挂载就会 `new` 它）。
 * 这里装一个**可控**替身：保留「disconnect 后不再回调」的真实语义，
 * 从而既能避免 ReferenceError，也能直接驱动「滚到底 → 追加」这条新补回的链路。
 */
type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void
/** 当前「已连接」的观察器回调（disconnect 会移除，与真实语义一致） */
const activeObservers: IOCallback[] = []

class MockIntersectionObserver {
  constructor(private readonly cb: IOCallback) {
    activeObservers.push(this.cb)
  }
  observe() {}
  unobserve() {}
  disconnect() {
    const index = activeObservers.indexOf(this.cb)
    if (index >= 0) activeObservers.splice(index, 1)
  }
  takeRecords() {
    return []
  }
}

/** 模拟哨兵进入/离开可视区 */
function triggerIntersect(isIntersecting = true) {
  for (const cb of [...activeObservers]) {
    cb([{ isIntersecting }])
  }
}

beforeEach(() => {
  activeObservers.length = 0
  ;(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver =
    MockIntersectionObserver
})

function makeSnippet(id: string): KnowledgeSnippet {
  return {
    id,
    name: '片段 ' + id,
    description: '描述',
    language: 'javascript',
    content: 'console.log(1)',
    displayAttrs: {
      language: 'javascript',
      title: null,
      theme: 'one-dark-pro',
      lineNumbers: true,
      wrap: false,
      collapsed: false,
    },
    placeholderDefs: [],
    favorite: false,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    collectionId: null,
    collectionName: null,
    tags: [],
  }
}

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(SnippetListPanel, {
    props: {
      snippets: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      loading: false,
      error: '',
      selectedSnippetId: '',
      canCreate: false,
      hasActiveFilters: false,
      viewMode: 'list',
      ...props,
    },
    global: {
      // renderStubDefaultSlot：让被 stub 的 AppButton 仍渲染默认插槽，
      // 否则按文案定位按钮会拿到空字符串。
      stubs: { AppIcon: true, AppButton: true, Pagination: true, 'el-tag': true },
      renderStubDefaultSlot: true,
    },
  })
}

/** 按文案从 AppButton 里挑出目标按钮（AppButton 被 stub，需按组件找而非 DOM） */
function findButtonByText(wrapper: ReturnType<typeof mountPanel>, text: string) {
  return wrapper.findAllComponents(AppButton).find((b) => b.text().includes(text))
}

describe('SnippetListPanel · 三态优先级', () => {
  it('有数据时逐条渲染行组件', () => {
    const wrapper = mountPanel({ snippets: [makeSnippet('a'), makeSnippet('b')], total: 2 })
    expect(wrapper.findAllComponents(SnippetListRow)).toHaveLength(2)
  })

  it('无数据时展示空状态文案', () => {
    const wrapper = mountPanel({ snippets: [] })
    expect(wrapper.text()).toContain('暂无匹配的代码片段')
  })

  it('错误态优先于空状态展示', () => {
    const wrapper = mountPanel({ snippets: [], error: '加载代码片段失败。' })
    expect(wrapper.text()).toContain('加载代码片段失败。')
    expect(wrapper.text()).not.toContain('暂无匹配的代码片段')
  })

  it('首次加载（无数据）时展示骨架屏而非空状态', () => {
    const wrapper = mountPanel({ loading: true, snippets: [] })
    expect(wrapper.findAllComponents(SnippetListRow)).toHaveLength(0)
    expect(wrapper.findAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(wrapper.text()).not.toContain('暂无匹配的代码片段')
  })

  it('加载中但已有数据时保留列表（避免滚动位置被重置）', () => {
    const wrapper = mountPanel({
      loading: true,
      snippets: [makeSnippet('a'), makeSnippet('b')],
      total: 2,
    })
    expect(wrapper.findAllComponents(SnippetListRow)).toHaveLength(2)
    expect(wrapper.findAll('.animate-pulse')).toHaveLength(0)
  })
})

describe('SnippetListPanel · 分页门控', () => {
  it('只有一页时不渲染分页', () => {
    const wrapper = mountPanel({ snippets: [makeSnippet('a')], total: 1, totalPages: 1 })
    expect(wrapper.findComponent(Pagination).exists()).toBe(false)
  })

  it('多于一页时渲染分页', () => {
    const wrapper = mountPanel({ snippets: [makeSnippet('a')], total: 40, totalPages: 2 })
    expect(wrapper.findComponent(Pagination).exists()).toBe(true)
  })
})

describe('SnippetListPanel · 事件上抛', () => {
  it('行的 select 上抛为 selectSnippet', async () => {
    const wrapper = mountPanel({ snippets: [makeSnippet('x1')], total: 1 })
    await wrapper.findComponent(SnippetListRow).vm.$emit('select', 'x1')
    expect(wrapper.emitted('selectSnippet')).toEqual([['x1']])
  })

  it('行的 copy 上抛为 copySnippet', async () => {
    const wrapper = mountPanel({ snippets: [makeSnippet('x1')], total: 1 })
    await wrapper.findComponent(SnippetListRow).vm.$emit('copy', 'x1')
    expect(wrapper.emitted('copySnippet')).toEqual([['x1']])
  })

  it('选中项透传给行组件', () => {
    const wrapper = mountPanel({
      snippets: [makeSnippet('a'), makeSnippet('b')],
      total: 2,
      selectedSnippetId: 'b',
    })
    const rows = wrapper.findAllComponents(SnippetListRow)
    expect(rows[0].props('selected')).toBe(false)
    expect(rows[1].props('selected')).toBe(true)
  })
})

describe('SnippetListPanel · 空状态操作引导', () => {
  it('无筛选条件且不可新建时，两个引导按钮都不出现', () => {
    const wrapper = mountPanel({ hasActiveFilters: false, canCreate: false })
    expect(wrapper.text()).not.toContain('清除筛选')
    expect(wrapper.text()).not.toContain('新建片段')
  })

  it('有筛选条件时展示「清除筛选」并上抛 clearFilters', async () => {
    const wrapper = mountPanel({ hasActiveFilters: true })
    const button = findButtonByText(wrapper, '清除筛选')
    expect(button).toBeTruthy()
    await button!.trigger('click')
    expect(wrapper.emitted('clearFilters')).toHaveLength(1)
  })

  it('可新建时展示「新建片段」并上抛 createSnippet', async () => {
    const wrapper = mountPanel({ canCreate: true })
    const button = findButtonByText(wrapper, '新建片段')
    expect(button).toBeTruthy()
    await button!.trigger('click')
    expect(wrapper.emitted('createSnippet')).toHaveLength(1)
  })
})

describe('SnippetListPanel · 无限滚动触发点', () => {
  it('哨兵进入可视区时上抛 loadMore', () => {
    const wrapper = mountPanel({ snippets: [makeSnippet('a')], total: 40, totalPages: 2 })
    triggerIntersect(true)
    expect(wrapper.emitted('loadMore')).toHaveLength(1)
  })

  it('加载中时忽略触发（避免重复追加同一页）', () => {
    const wrapper = mountPanel({
      snippets: [makeSnippet('a')],
      total: 40,
      totalPages: 2,
      loading: true,
    })
    triggerIntersect(true)
    expect(wrapper.emitted('loadMore')).toBeUndefined()
  })

  it('已是最后一页时忽略触发', () => {
    const wrapper = mountPanel({ snippets: [makeSnippet('a')], total: 1, totalPages: 1 })
    triggerIntersect(true)
    expect(wrapper.emitted('loadMore')).toBeUndefined()
  })

  it('哨兵离开可视区不触发', () => {
    const wrapper = mountPanel({ snippets: [makeSnippet('a')], total: 40, totalPages: 2 })
    triggerIntersect(false)
    expect(wrapper.emitted('loadMore')).toBeUndefined()
  })

  it('卸载后断开观察器，不再触发（避免泄漏与幽灵请求）', () => {
    const wrapper = mountPanel({ snippets: [makeSnippet('a')], total: 40, totalPages: 2 })
    wrapper.unmount()
    triggerIntersect(true)
    expect(wrapper.emitted('loadMore')).toBeUndefined()
  })
})
