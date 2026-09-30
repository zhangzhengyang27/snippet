// @vitest-environment jsdom
/**
 * CodeBlock 高亮调度测试。
 *
 * 锁住本轮新引入的两条行为（此前完全没有覆盖）：
 *  1. **防抖**：连续切换片段只跑一次 Shiki，而不是每按一次方向键跑一次；
 *     但首帧必须立即渲染，不能有可感知的延迟。
 *  2. **竞态丢弃**：高亮是异步的，期间 code 又变了时，旧结果不得覆盖新结果 ——
 *     否则会把上一段片段的代码渲染到当前片段上。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { highlightMock } = vi.hoisted(() => ({ highlightMock: vi.fn() }))

vi.mock('@/utils/highlighter', () => ({
  highlightCode: highlightMock,
  getShikiTheme: () => 'one-dark-pro',
  escapeHtml: (value: string) => value,
}))

import CodeBlock from './CodeBlock.vue'

/** 仅取 cb-body 内我们关心的渲染结果 */
const renderedHtml = (wrapper: ReturnType<typeof mount>) =>
  wrapper.find('.cb-code').exists() ? wrapper.find('.cb-code').html() : ''

function mountBlock(code: string) {
  return mount(CodeBlock, {
    props: { code, language: 'javascript' },
    global: { stubs: { AppIcon: true, AppButton: true } },
  })
}

beforeEach(() => {
  highlightMock.mockReset()
  highlightMock.mockImplementation(async (code: string) => `<pre>${code}</pre>`)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('CodeBlock · 首帧立即渲染', () => {
  it('挂载即触发一次高亮，不等防抖窗口', async () => {
    mountBlock('const a = 1')
    // 尚未推进任何定时器
    expect(highlightMock).toHaveBeenCalledTimes(1)
    expect(highlightMock).toHaveBeenCalledWith('const a = 1', 'javascript', 'one-dark-pro')
  })

  it('空内容不调用高亮，直接渲染空态', async () => {
    const wrapper = mountBlock('')
    await flushPromises()
    expect(highlightMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('无代码')
  })
})

describe('CodeBlock · 切换防抖', () => {
  it('窗口内连续切换只高亮最后一次', async () => {
    const wrapper = mountBlock('A')
    await flushPromises()
    expect(highlightMock).toHaveBeenCalledTimes(1)

    // 模拟方向键连按：三次快速切换
    await wrapper.setProps({ code: 'B' })
    await wrapper.setProps({ code: 'C' })
    await wrapper.setProps({ code: 'D' })

    // 防抖窗口内不应再发起高亮
    expect(highlightMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(120)
    await flushPromises()

    expect(highlightMock).toHaveBeenCalledTimes(2)
    expect(highlightMock).toHaveBeenLastCalledWith('D', 'javascript', 'one-dark-pro')
  })

  it('切换时立刻进入加载态，避免闪现上一段代码', async () => {
    const wrapper = mountBlock('A')
    await flushPromises()
    expect(wrapper.find('.cb-code').exists()).toBe(true)

    await wrapper.setProps({ code: 'B' })
    expect(wrapper.text()).toContain('高亮中')
    expect(wrapper.find('.cb-code').exists()).toBe(false)
  })
})

describe('CodeBlock · 过期结果丢弃', () => {
  it('旧请求后返回时不得覆盖新结果', async () => {
    const pending: Array<(html: string) => void> = []
    highlightMock.mockImplementation(
      () => new Promise<string>((resolve) => pending.push(resolve))
    )

    const wrapper = mountBlock('OLD')
    await wrapper.setProps({ code: 'NEW' })
    await vi.advanceTimersByTimeAsync(120)

    expect(pending).toHaveLength(2)

    // 先返回「旧」的结果（序号已过期），再返回新结果
    pending[0]('<pre>STALE</pre>')
    await flushPromises()
    pending[1]('<pre>FRESH</pre>')
    await flushPromises()

    const html = renderedHtml(wrapper)
    expect(html).toContain('FRESH')
    expect(html).not.toContain('STALE')
  })
})

describe('CodeBlock · 高亮失败降级', () => {
  it('抛错时回退为转义后的纯文本，而不是空白', async () => {
    highlightMock.mockRejectedValue(new Error('grammar 加载失败'))
    const wrapper = mountBlock('const a = 1')
    await flushPromises()
    expect(renderedHtml(wrapper)).toContain('const a = 1')
  })
})
