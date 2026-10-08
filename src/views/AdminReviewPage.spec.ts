// @vitest-environment jsdom
/**
 * AdminReviewPage 回归锁。
 *
 * 锁三件事：
 *  1. **准入**：非管理员进不来 —— 不拉队列、跳回首页（后端 RolesGuard 是真正的边界，
 *     但前端不该让非管理员看到审核台的空壳）；
 *  2. **裁决调用**：通过 / 退回分别以正确的 action 调审核接口，且操作后重新拉队列；
 *  3. **退回理由**：拒绝必须把管理员填写的 note 原样带上 —— 这是作者唯一能看到的
 *     「为什么没过」，丢了就等于审核变成了黑箱。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { ModerationQueueItem } from '@/types/knowledge-snippet'

const apiMock = vi.hoisted(() => ({
  listModerationQueue: vi.fn(),
  moderateKnowledgeSnippet: vi.fn(),
}))
const auth = vi.hoisted(() => ({
  user: { role: 'admin' } as { role: string } | null,
  initialized: true,
  initialize: vi.fn(),
}))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
const routerMock = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock('@/api/knowledge-snippets', () => apiMock)
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => auth }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ toast: toastMock }) }))
vi.mock('vue-router', () => ({ useRouter: () => routerMock }))

import AdminReviewPage from './AdminReviewPage.vue'

function makeItem(overrides: Partial<ModerationQueueItem> = {}): ModerationQueueItem {
  return {
    id: 'snp-1',
    name: '待审片段',
    description: '一条长度足够的描述，用于审核时了解片段用途。',
    language: 'typescript',
    content: 'const a = 1',
    isPublic: false,
    moderationStatus: 'pending',
    moderationNote: null,
    moderatedAt: null,
    displayAttrs: {
      language: 'typescript',
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
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    collectionId: null,
    collectionName: null,
    tags: [],
    authorName: '发布测试',
    authorUsername: 'pubtest_a',
    ...overrides,
  }
}

function mountPage() {
  return mount(AdminReviewPage, {
    global: {
      stubs: {
        AppIcon: true,
        // AppButton 内部是 el-button；这里换成原生 button 并把 $attrs（含 onClick）透传下去，
        // 否则点击事件不会落到真实 DOM 上，测试就成了「假绿」。
        AppButton: { template: '<button type="button" v-bind="$attrs"><slot /></button>' },
      },
    },
  })
}

function findButton(wrapper: ReturnType<typeof mountPage>, text: string) {
  const button = wrapper.findAll('button').find(node => node.text().includes(text))
  if (!button) throw new Error(`未找到按钮：${text}`)
  return button
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = { role: 'admin' }
  auth.initialized = true
  apiMock.listModerationQueue.mockResolvedValue({
    items: [makeItem()],
    total: 1,
    page: 1,
    pageSize: 100,
  })
  apiMock.moderateKnowledgeSnippet.mockResolvedValue(makeItem({ moderationStatus: 'approved' }))
})

describe('AdminReviewPage', () => {
  it('管理员进入后拉取待审队列，并渲染条目与提交者', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(apiMock.listModerationQueue).toHaveBeenCalledWith({ status: 'pending', pageSize: 100 })
    expect(wrapper.text()).toContain('待审片段')
    expect(wrapper.text()).toContain('发布测试')
  })

  it('「通过并上架」以 approve 调接口，并重新拉取队列', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await findButton(wrapper, '通过并上架').trigger('click')
    await flushPromises()

    expect(apiMock.moderateKnowledgeSnippet).toHaveBeenCalledWith('snp-1', { action: 'approve' })
    expect(apiMock.listModerationQueue).toHaveBeenCalledTimes(2)
  })

  it('「退回」先展开理由输入，确认后带上 note 调接口', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await findButton(wrapper, '退回').trigger('click')
    await flushPromises()

    const input = wrapper.find('.review-card__reject-input')
    expect(input.exists()).toBe(true)
    await input.setValue('描述与标题重复')

    await findButton(wrapper, '确认退回').trigger('click')
    await flushPromises()

    expect(apiMock.moderateKnowledgeSnippet).toHaveBeenCalledWith('snp-1', {
      action: 'reject',
      note: '描述与标题重复',
    })
  })

  it('非管理员进入 → 不拉队列，跳回首页', async () => {
    auth.user = { role: 'user' }

    const wrapper = mountPage()
    await flushPromises()

    expect(apiMock.listModerationQueue).not.toHaveBeenCalled()
    expect(routerMock.replace).toHaveBeenCalledWith({ name: 'dashboard' })
    expect(toastMock.error).toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('待审片段')
  })
})
