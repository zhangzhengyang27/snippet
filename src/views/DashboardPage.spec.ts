// @vitest-environment jsdom
/**
 * DashboardPage 统计卡回归锁（2026-10-06）。
 *
 * 锁两件事：
 *  1. **「代码块」已拆成「我的 / 公共」两个数**（用户要求）：此前只有一张卡显示
 *     `scope=all` 的合计 —— 那是「个人 ∪ 公共」混算，3416 条里几乎全是公共库内容，
 *     用户看不出「我自己到底有没有东西」。现在分别请求 `scope=mine` 与 `scope=public`，
 *     两张卡各自可点（→ /snippets 与 → /library）。
 *     ⚠️ 别再退回单数字（旧文案「含公共与私有」也在下面设了否定断言）。
 *  2. **未登录时「我的」显示「—」而不是 0**：后端对匿名用户 `scope=mine` 恒返回 0，
 *     直接显示 0 会被读成「我的数据丢了」，与统计卡既有的 loading/error → 「—」口径一致。
 *
 * ⚠️ 还有一条测试覆盖不到的坑，记在此备查：main.css 里曾有一条**同名全局**
 *    `.stat-card { flex-direction: column; align-items: center }`（旧统计组件残留，
 *    `.stats-section` / `.stat-value` / `.stat-label` 全仓已无引用），它把概览页
 *    scoped `.stat-card` 的横向排版压成了纵向居中 —— 因为 scoped 规则没声明 flex-direction。
 *    现规则已删除，且组件 scoped 内已显式声明 `flex-direction: row` 自防御。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// vi.mock 会被提升到 import 之前，故用 vi.hoisted 保证这些对象先于工厂执行而初始化
const apiMock = vi.hoisted(() => ({
  listKnowledgeSnippets: vi.fn(),
  listKnowledgeSnippetsByIds: vi.fn(),
}))
const auth = vi.hoisted(() => ({
  isLoggedIn: false,
  user: null as null | { username: string },
}))

vi.mock('@/api/knowledge-snippets', () => apiMock)
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => auth }))
vi.mock('@/composables/useRecentSnippets', () => ({
  // 组件里按 `recent.value.slice(...)` 取 id，普通对象够用（无需真 ref）
  useRecentSnippets: () => ({ recent: { value: [] } }),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import DashboardPage from './DashboardPage.vue'

const MINE = 7
const PUBLIC = 3416
const FAVORITE = 2

/** 千分位随环境 locale 变，别把字面量写死 */
const fmt = (n: number) => n.toLocaleString()

function stubList() {
  apiMock.listKnowledgeSnippets.mockImplementation(async (params?: { scope?: string; favorite?: boolean }) => {
    if (params?.favorite) return { total: FAVORITE, items: [] }
    if (params?.scope === 'mine') return { total: MINE, items: [] }
    if (params?.scope === 'public') return { total: PUBLIC, items: [] }
    return { total: PUBLIC + MINE, items: [] }
  })
  apiMock.listKnowledgeSnippetsByIds.mockResolvedValue([])
}

async function mountDashboard() {
  const wrapper = mount(DashboardPage, {
    global: {
      stubs: {
        AppIcon: true,
        AppButton: true,
        EmptyState: true,
        RouterLink: true,
        'router-link': true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.isLoggedIn = false
  auth.user = null
  stubList()
})

describe('DashboardPage · 统计卡', () => {
  it('把「代码块」拆成我的 / 公共两个作用域分别请求', async () => {
    auth.isLoggedIn = true
    auth.user = { username: 'admin' }
    await mountDashboard()

    const params = apiMock.listKnowledgeSnippets.mock.calls.map((c) => c[0] ?? {})
    expect(params).toContainEqual(expect.objectContaining({ scope: 'mine', pageSize: 1 }))
    expect(params).toContainEqual(expect.objectContaining({ scope: 'public', pageSize: 1 }))
    // 收藏数仍走 favorite 过滤（按用户）
    expect(params).toContainEqual(expect.objectContaining({ favorite: true }))
  })

  it('已登录：两张卡各显示自己的数，且不再出现「含公共与私有」的合计口径', async () => {
    auth.isLoggedIn = true
    auth.user = { username: 'admin' }
    const wrapper = await mountDashboard()
    const text = wrapper.text()

    expect(text).toContain('我的代码块')
    expect(text).toContain('公共库')
    expect(text).toContain('收藏夹')
    expect(text).toContain(fmt(MINE))
    expect(text).toContain(fmt(PUBLIC))
    // 回归锁：旧的单数字文案
    expect(text).not.toContain('含公共与私有')
  })

  it('未登录：「我的」显示「—」（而不是会被误读成数据丢失的 0）', async () => {
    const wrapper = await mountDashboard()
    const mineCard = wrapper.findAll('button.stat-card')[0]
    const text = mineCard.text()

    expect(text).toContain('我的代码块')
    expect(text).toContain('—')
    expect(text).toContain('登录后可创建')
    // 公共库对匿名用户依然可见、依然有数
    expect(wrapper.text()).toContain(fmt(PUBLIC))
  })
})
