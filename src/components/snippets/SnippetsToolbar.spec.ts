// @vitest-environment jsdom
/**
 * SnippetsToolbar 组件测试。
 *
 * 这个工具栏是列表页所有筛选/搜索入口的唯一汇聚点，「哪些控件该出现」由
 * compact / showFilters 两个开关交叉决定，纯函数单测完全覆盖不到。
 * 重点锁三类不变量：
 *  1. compact 模式必须只留「标题计数 + 新建」，不能漏出排序/搜索/筛选
 *  2. 搜索框的 prefix 图标必须挂在带 `group` 的容器里
 *     —— 图标靠 `group-focus-within:text-primary` 变色；少一个类不会报错、
 *        也不会挂测试，只是交互静默失效（这正是本次改动真实踩过的坑）
 *  3. 「新建」按登录态分流（直接新建 / 提示去登录），不能一律 createSnippet
 */
import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import SnippetsToolbar from './SnippetsToolbar.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppButton from '@/components/common/AppButton.vue'
import type { SnippetSortOption } from '@/types/knowledge-snippet'

type ToolbarWrapper = VueWrapper

/**
 * AppInput / AppSelect / AppButton 内部是 <el-input> / <el-select> / <el-button>，
 * unplugin 自动导入在 vitest 下不生效（会告警 Failed to resolve component）。
 * 整体 stub 掉即可绕开——断言只针对工具栏自身的契约，不越界测 Element Plus。
 * renderStubDefaultSlot 是必需的：桩组件默认不渲染默认插槽，否则拿不到「新建片段」文案。
 */
function mountToolbar(props: Record<string, unknown> = {}) {
  return mount(SnippetsToolbar, {
    props: {
      keyword: '',
      sort: 'updatedAt' as SnippetSortOption,
      sortOptions: [
        { label: '按更新时间', value: 'updatedAt' },
        { label: '按名称', value: 'name' },
      ],
      loading: false,
      total: 12,
      canCreate: true,
      tags: [{ label: '工具', value: '工具' }],
      selectedTag: '',
      languages: ['javascript'],
      selectedLanguage: '',
      favoritesOnly: false,
      hasActiveFilters: false,
      ...props,
    },
    global: {
      stubs: { AppIcon: true, AppInput: true, AppSelect: true, AppButton: true },
      renderStubDefaultSlot: true,
    },
  })
}

/** 工具栏上出现的下拉：showFilters 时含标签/语言，非 compact 时含排序 */
const selects = (wrapper: ToolbarWrapper) => wrapper.findAllComponents(AppSelect)

describe('SnippetsToolbar', () => {
  describe('控件显隐（compact / showFilters 交叉）', () => {
    it('非 compact：渲染搜索框 + 排序，不渲染标签/语言筛选', () => {
      const wrapper = mountToolbar({ compact: false, showFilters: false })
      expect(wrapper.findAllComponents(AppInput)).toHaveLength(1)
      expect(selects(wrapper)).toHaveLength(1)
    })

    it('compact：只留标题计数与「新建」，排序/搜索/筛选全部不渲染', () => {
      // compact 与 showFilters 在唯一调用点由 detailLayout 单个值派生
      // （page → showFilters / split → compact），天然互斥；组件自身并不强制这一点，
      // 故这里按真实可达的组合断言，不构造 compact+showFilters 同时为真的伪状态。
      const wrapper = mountToolbar({ compact: true, showFilters: false })
      expect(wrapper.findAllComponents(AppInput)).toHaveLength(0)
      expect(selects(wrapper)).toHaveLength(0)
      expect(wrapper.text()).toContain('新建片段')
      expect(wrapper.text()).toContain('12')
    })

    it('showFilters：追加标签 + 语言两个筛选下拉，共 3 个', () => {
      const wrapper = mountToolbar({ compact: false, showFilters: true })
      expect(selects(wrapper)).toHaveLength(3)
    })

    it('筛选下拉带上「全部 xx」占位，避免空值显示成空白框', () => {
      const wrapper = mountToolbar({ compact: false, showFilters: true })
      const placeholders = selects(wrapper).map((s) => s.props('placeholder'))
      expect(placeholders).toContain('全部标签')
      expect(placeholders).toContain('全部语言')
    })
  })

  describe('搜索框 prefix 图标（回归锁）', () => {
    it('承载 prefix 图标的容器必须带 group 类', () => {
      const wrapper = mountToolbar({ compact: false })
      const input = wrapper.findComponent(AppInput)
      expect(input.exists()).toBe(true)
      expect(input.attributes('class')).toContain('w-full')

      // 图标用 group-focus-within:text-primary 变色：变体本身不报错，
      // 但只要祖先丢了 `group` 就会静默失效。这里直接锁住该前提。
      const container = input.element.parentElement
      expect(container?.classList.contains('group')).toBe(true)
    })

    it('搜索框透传 placeholder 与 allow-clear', () => {
      const wrapper = mountToolbar({ compact: false })
      const input = wrapper.findComponent(AppInput)
      expect(input.props('placeholder')).toBe('搜索片段')
      expect(input.props('allowClear')).toBe(true)
    })
  })

  describe('事件契约', () => {
    it('搜索框上抛 update:value → 转成 update:keyword', async () => {
      const wrapper = mountToolbar({ compact: false })
      await wrapper.findComponent(AppInput).vm.$emit('update:value', 'vue')
      expect(wrapper.emitted('update:keyword')?.[0]).toEqual(['vue'])
    })

    it('已登录点新建 → createSnippet（不提示登录）', async () => {
      const wrapper = mountToolbar({ canCreate: true })
      await wrapper.findComponent(AppButton).trigger('click')
      expect(wrapper.emitted('createSnippet')).toHaveLength(1)
      expect(wrapper.emitted('requireLogin')).toBeUndefined()
    })

    it('未登录点新建 → requireLogin（不发 createSnippet）', async () => {
      const wrapper = mountToolbar({ canCreate: false })
      await wrapper.findComponent(AppButton).trigger('click')
      expect(wrapper.emitted('requireLogin')).toHaveLength(1)
      expect(wrapper.emitted('createSnippet')).toBeUndefined()
    })
  })
})
