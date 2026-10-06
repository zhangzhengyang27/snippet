// @vitest-environment jsdom
/**
 * SnippetsToolbar 组件测试。
 *
 * 这个工具栏是列表页所有筛选/搜索入口的唯一汇聚点。重点锁三类不变量：
 *  1. **筛选能力不因布局消失**：compact（三栏窄列表）只缩小控件，不再隐藏搜索/排序/筛选
 *     —— 此前 compact 会把这三组整组隐藏，默认视图下 3399 条数据无从搜起
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
  describe('控件显隐（搜索与筛选在任何布局下都可达）', () => {
    it('非 compact：搜索框 + 标签/语言/排序三个下拉全渲染', () => {
      const wrapper = mountToolbar({ compact: false })
      expect(wrapper.findAllComponents(AppInput)).toHaveLength(1)
      expect(selects(wrapper)).toHaveLength(3)
    })

    it('compact：搜索与筛选仍然渲染（compact 只影响尺寸，不再整组隐藏）', () => {
      // 回归锁：compact 曾经把搜索/排序/筛选全部隐藏，导致默认分屏视图无法搜索。
      const wrapper = mountToolbar({ compact: true })
      expect(wrapper.findAllComponents(AppInput)).toHaveLength(1)
      expect(selects(wrapper)).toHaveLength(3)
      expect(wrapper.text()).toContain('新建片段')
      expect(wrapper.text()).toContain('12')
    })

    it('compact：下拉带紧凑尺寸类（宽度收窄而非消失）', () => {
      const wrapper = mountToolbar({ compact: true })
      expect(wrapper.html()).toContain('toolbar-select--compact')
    })

    it('筛选下拉带上「全部 xx」占位，避免空值显示成空白框', () => {
      const wrapper = mountToolbar({ compact: false })
      const placeholders = selects(wrapper).map((s) => s.props('placeholder'))
      expect(placeholders).toContain('全部标签')
      expect(placeholders).toContain('全部语言')
    })

    it('有激活筛选时出现「清除筛选」并上抛 clearFilters', async () => {
      const wrapper = mountToolbar({ hasActiveFilters: true })
      // AppButton 在测试里被 stub，title 属于 fallthrough attr 读不到，按文案定位
      const clearBtn = wrapper
        .findAllComponents(AppButton)
        .find((b) => b.text().includes('清除筛选'))
      expect(clearBtn).toBeTruthy()
      await clearBtn!.trigger('click')
      expect(wrapper.emitted('clearFilters')).toHaveLength(1)
    })

    it('无激活筛选时不出现「清除筛选」', () => {
      const wrapper = mountToolbar({ hasActiveFilters: false })
      expect(wrapper.text()).not.toContain('清除筛选')
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
      expect(input.props('placeholder')).toBe('搜索代码块')
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
