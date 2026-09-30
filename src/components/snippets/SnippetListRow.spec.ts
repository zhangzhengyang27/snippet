// @vitest-environment jsdom
/**
 * SnippetListRow 组件测试。
 *
 * 这个组件此前**零测试覆盖**，而报告里两个真实缺陷（批量功能入口不可达、顶栏搜索
 * 样式整体丢失）都出在「组件层没人测」的同一类盲区。这里锁住三类行为：
 * 文案派生（标题后缀剥离、难度徽标）、事件契约（select / copy / toggleCheck 的边界）、
 * 无障碍键盘操作。
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SnippetListRow from './SnippetListRow.vue'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'

function makeSnippet(overrides: Partial<KnowledgeSnippet> = {}): KnowledgeSnippet {
  return {
    id: 'snp1',
    name: '示例片段',
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
    ...overrides,
  }
}

function mountRow(props: Record<string, unknown> = {}) {
  return mount(SnippetListRow, {
    props: { snippet: makeSnippet(), selected: false, variant: 'list', ...props },
    global: { stubs: { AppIcon: true, 'el-tag': true } },
  })
}

describe('SnippetListRow · 文案派生', () => {
  it('剥离标题末尾的语言后缀（语言信息已由色点承担）', () => {
    const wrapper = mountRow({
      snippet: makeSnippet({ name: '数组去重（JS）' }),
    })
    expect(wrapper.find('.snippet-list__title').text()).toBe('数组去重')
  })

  it('半角括号后缀同样被剥离', () => {
    const wrapper = mountRow({ snippet: makeSnippet({ name: '闭包示例(JavaScript)' }) })
    expect(wrapper.find('.snippet-list__title').text()).toBe('闭包示例')
  })

  it('不含后缀的标题原样保留', () => {
    const wrapper = mountRow({ snippet: makeSnippet({ name: '防抖与节流' }) })
    expect(wrapper.find('.snippet-list__title').text()).toBe('防抖与节流')
  })

  it('难度徽标：有 difficulty 才渲染，文案走中文映射', () => {
    const none = mountRow({ snippet: makeSnippet() })
    expect(none.find('.snippet-diff-badge').exists()).toBe(false)

    const advanced = mountRow({
      snippet: makeSnippet({
        displayAttrs: {
          language: 'javascript',
          title: null,
          theme: 'one-dark-pro',
          lineNumbers: true,
          wrap: false,
          collapsed: false,
          difficulty: 'advanced',
        },
      }),
    })
    expect(advanced.find('.snippet-diff-badge').text()).toBe('高级')
  })
})

describe('SnippetListRow · 事件契约', () => {
  it('点击整行 emit select 并带上片段 id', async () => {
    const wrapper = mountRow({ snippet: makeSnippet({ id: 'abc123' }) })
    await wrapper.find('article').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['abc123']])
  })

  it('点复制按钮只 emit copy —— stopPropagation 必须挡住 select', async () => {
    const wrapper = mountRow({ snippet: makeSnippet({ id: 'abc123' }) })
    await wrapper.find('.snippet-list__action').trigger('click')
    expect(wrapper.emitted('copy')).toEqual([['abc123']])
    // 若 stopPropagation 失效，点击会冒泡到 article 触发选中
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('勾选框点击 emit toggleCheck，且不触发 select', async () => {
    const wrapper = mountRow({
      snippet: makeSnippet({ id: 'abc123' }),
      checkable: true,
      checked: false,
    })
    await wrapper.find('.snippet-list__checkbox').trigger('click')
    expect(wrapper.emitted('toggleCheck')).toEqual([['abc123']])
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('未开启 checkable 时不渲染勾选框', () => {
    const wrapper = mountRow({ checkable: false })
    expect(wrapper.find('.snippet-list__checkbox').exists()).toBe(false)
  })
})

describe('SnippetListRow · 无障碍与状态类', () => {
  it('Enter 触发选中', async () => {
    const wrapper = mountRow({ snippet: makeSnippet({ id: 'kbd1' }) })
    await wrapper.find('article').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')).toEqual([['kbd1']])
  })

  it('空格触发选中（并阻止页面滚动）', async () => {
    const wrapper = mountRow({ snippet: makeSnippet({ id: 'kbd2' }) })
    await wrapper.find('article').trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('select')).toEqual([['kbd2']])
  })

  it('其它按键不触发选中', async () => {
    const wrapper = mountRow()
    await wrapper.find('article').trigger('keydown', { key: 'Tab' })
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('selected / checked 分别映射到 is-selected / is-checked 类', () => {
    const wrapper = mountRow({ selected: true, checkable: true, checked: true })
    const article = wrapper.find('article')
    expect(article.classes()).toContain('is-selected')
    expect(article.classes()).toContain('is-checked')
    expect(article.classes()).toContain('is-list')
  })

  it('列表变体与卡片变体使用不同的类', () => {
    expect(mountRow({ variant: 'list' }).find('article').classes()).toContain('is-list')
    expect(mountRow({ variant: 'grid' }).find('article').classes()).not.toContain('is-list')
  })
})

describe('SnippetListRow · 卡片变体', () => {
  it('描述为空时展示占位文案', () => {
    const wrapper = mountRow({
      variant: 'grid',
      snippet: makeSnippet({ description: null }),
    })
    expect(wrapper.find('.snippet-card__description').text()).toBe('暂无描述')
  })

  it('公共片段显示「公共」标记', () => {
    const wrapper = mountRow({ variant: 'grid', snippet: makeSnippet({ isPublic: true }) })
    expect(wrapper.find('.snippet-card__badge').exists()).toBe(true)
  })

  it('私有片段不显示「公共」标记', () => {
    const wrapper = mountRow({ variant: 'grid', snippet: makeSnippet({ isPublic: false }) })
    expect(wrapper.find('.snippet-card__badge').exists()).toBe(false)
  })

  it('标签最多显示 2 个，其余折叠为 +N', () => {
    const wrapper = mountRow({
      variant: 'grid',
      snippet: makeSnippet({ tags: ['a', 'b', 'c', 'd'] }),
    })
    const tags = wrapper.findAll('.snippet-card__tag')
    // 2 个标签 + 1 个 "+2"
    expect(tags).toHaveLength(3)
    expect(tags[2].text()).toBe('+2')
  })
})
