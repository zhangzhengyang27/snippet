// @vitest-environment jsdom
/**
 * SnippetsToolbar 组件测试。
 *
 * 这个工具栏是列表页的搜索 / 筛选入口。重点锁几类不变量：
 *  1. **搜索框在任何布局下都必须渲染**：曾有一版 compact 把搜索/排序/筛选整组隐藏，
 *     默认分屏视图搜不动 3399 条数据，属回归、已回退。
 *  2. **分屏（compact）下整组筛选下拉（标签/语言/排序）不渲染**（2026-10-06 用户决策）：
 *     窄栏放不下、且标签筛选与第 1 栏侧栏重复；只有独立页才出现。
 *     ⚠️ 与不变量 1 是两件事：收掉的是筛选下拉，**不是**搜索框。
 *  3. 「清除筛选」是逃生口，**不受 compact 影响**：分屏隐藏了下拉后语言/排序别处没有
 *     入口，若连清除钮也藏掉就会卡在「看不见的筛选无法解除」死角。
 *  4. 搜索框的 prefix 图标必须挂在带 `group` 的容器里
 *     —— 图标靠 `group-focus-within:text-primary` 变色；少一个类不会报错、
 *        也不会挂测试，只是交互静默失效（这正是改动中真实踩过的坑）
 *  5. 「新建」按登录态分流（直接新建 / 提示去登录），不能一律 createSnippet
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
      hasActiveFilters: false,
      ...props,
    },
    global: {
      stubs: { AppIcon: true, AppInput: true, AppSelect: true, AppButton: true },
      renderStubDefaultSlot: true,
    },
  })
}

/** 工具栏上的筛选下拉（标签 / 语言 / 排序）。分屏（compact）下应恒为 0 个。 */
const selects = (wrapper: ToolbarWrapper) => wrapper.findAllComponents(AppSelect)

describe('SnippetsToolbar', () => {
  describe('控件显隐（搜索任何布局都可达；筛选下拉仅独立页）', () => {
    it('非 compact：搜索框 + 标签/语言/排序三个下拉全渲染', () => {
      const wrapper = mountToolbar({ compact: false })
      expect(wrapper.findAllComponents(AppInput)).toHaveLength(1)
      expect(selects(wrapper)).toHaveLength(3)
    })

    it('compact（分屏）：搜索框与新建仍渲染，但筛选下拉整组隐藏', () => {
      // 回归锁 1：搜索框绝不能被隐藏 —— 曾有一版把搜索/排序/筛选整组隐藏，
      //   默认分屏视图搜不动 3399 条数据，属回归、已回退。
      // 回归锁 2：筛选下拉必须为 0 —— 分屏只留搜索是 2026-10-06 的用户决策。
      //   与锁 1 是两件事：收掉的是筛选下拉，不是搜索框。
      const wrapper = mountToolbar({ compact: true })
      expect(wrapper.findAllComponents(AppInput)).toHaveLength(1)
      expect(selects(wrapper)).toHaveLength(0)
      expect(wrapper.html()).not.toContain('toolbar-select')
      expect(wrapper.text()).toContain('新建片段')
      expect(wrapper.text()).toContain('12')
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

    it('compact 下它仍出现（逃生口不受布局影响）', async () => {
      // 分屏隐藏了三组筛选下拉，而语言 / 排序别处没有入口；若连清除钮也藏掉，
      // 用户会卡在「看不见的筛选无法解除」的死角（切独立页才能自救）。
      const wrapper = mountToolbar({ compact: true, hasActiveFilters: true })
      const clearBtn = wrapper
        .findAllComponents(AppButton)
        .find((b) => b.text().includes('清除筛选'))
      expect(clearBtn).toBeTruthy()
      await clearBtn!.trigger('click')
      expect(wrapper.emitted('clearFilters')).toHaveLength(1)
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
