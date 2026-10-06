/**
 * useSnippetBatchOps 的开关语义测试。
 *
 * 只测「批量模式 / 已选集合」的状态机——它不碰网络（批量加标签、批量删除是异步调用，
 * 不在此覆盖），但恰恰是最容易静默出错的部分：
 *  1. **退出必须清空已选**：选择是跨页累加的（「全选本页」配合翻页），残留会在下次进入
 *     批量模式时出现，用户可能误删自己没看到的条目。
 *  2. **exitBatchMode 需幂等**：分屏 watch 会在每次切到 split 时调用它，包括本来就没在
 *     批量态的常见情形。
 *  3. 守住回归：分屏工具栏不渲染「更多」菜单（批量模式的唯一出口），页面靠
 *     `exitBatchMode` 在切分屏时兜底，否则用户会被困在批量态。
 */
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useSnippetBatchOps } from './useSnippetBatchOps'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'

const setup = () => {
  const snippets = ref<KnowledgeSnippet[]>([])
  const refresh = () => {}
  const ops = useSnippetBatchOps({ snippets, refresh })

  /** 走真实入口制造选择，避免直接改 selectedIds 掩盖 bug */
  const pick = (...ids: string[]) => ids.forEach((id) => ops.handleToggleCheck(id))

  return { ops, refresh, pick }
}

describe('useSnippetBatchOps —— 批量模式开关', () => {
  it('初始为关闭且无选中', () => {
    const { ops } = setup()
    expect(ops.batchMode.value).toBe(false)
    expect(ops.selectedIds.value).toEqual([])
  })

  it('toggleBatchMode 交替进出批量模式', () => {
    const { ops } = setup()
    ops.toggleBatchMode()
    expect(ops.batchMode.value).toBe(true)
    ops.toggleBatchMode()
    expect(ops.batchMode.value).toBe(false)
  })

  it('退出批量（toggle）会清空已选，避免残留到下次进入', () => {
    const { ops, pick } = setup()
    ops.toggleBatchMode()
    pick('a', 'b')
    expect(ops.selectedIds.value).toEqual(['a', 'b'])

    ops.toggleBatchMode()
    expect(ops.batchMode.value).toBe(false)
    expect(ops.selectedIds.value).toEqual([])
  })

  it('exitBatchMode 在批量态下同时关闭模式并清空已选', () => {
    const { ops, pick } = setup()
    ops.toggleBatchMode()
    pick('a', 'b', 'c')

    ops.exitBatchMode()

    expect(ops.batchMode.value).toBe(false)
    expect(ops.selectedIds.value).toEqual([])
  })

  it('exitBatchMode 幂等：本来就没在批量态时调用无副作用、不报错', () => {
    // 分屏 watch 会在每次切到 split 时调用，这是最常见的调用路径。
    const { ops, pick } = setup()
    pick('a')
    ops.exitBatchMode()
    expect(ops.batchMode.value).toBe(false)
    // 已选被一并清空（批量态外的选择本就不该存在），再次调用仍稳定
    expect(ops.selectedIds.value).toEqual([])
    ops.exitBatchMode()
    expect(ops.batchMode.value).toBe(false)
    expect(ops.selectedIds.value).toEqual([])
  })

  it('handleToggleCheck 可反复切换同一条（选中 ↔ 取消）', () => {
    const { ops } = setup()
    ops.toggleBatchMode()
    ops.handleToggleCheck('a')
    expect(ops.selectedIds.value).toEqual(['a'])
    ops.handleToggleCheck('a')
    expect(ops.selectedIds.value).toEqual([])
  })

  it('clearSelection 只清选择、不退出批量模式', () => {
    const { ops, pick } = setup()
    ops.toggleBatchMode()
    pick('a', 'b')

    ops.clearSelection()

    expect(ops.selectedIds.value).toEqual([])
    expect(ops.batchMode.value).toBe(true)
  })
})
