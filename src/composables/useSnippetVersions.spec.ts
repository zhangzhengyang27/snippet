import { describe, it, expect } from 'vitest'
import { computeVersionDiff } from './useSnippetVersions'

describe('computeVersionDiff', () => {
  it('内容完全一致时，三组结果均为同一份行序列', () => {
    const content = 'const a = 1\nconst b = 2'
    const result = computeVersionDiff(content, content)

    const expected = [
      { lineNum: 1, text: 'const a = 1' },
      { lineNum: 2, text: 'const b = 2' },
    ]
    expect(result.added).toEqual(expected)
    expect(result.removed).toEqual(expected)
    expect(result.unchanged).toEqual(expected)
  })

  it('替换中间一行：新旧行分别进入 added / removed，未变行三组共享', () => {
    const result = computeVersionDiff('a\nb\nc', 'a\nx\nc')

    // 行号是贯穿整个 diff 序列的全局序号：a=1、b=2、x=3、c=4
    expect(result.unchanged).toEqual([
      { lineNum: 1, text: 'a' },
      { lineNum: 4, text: 'c' },
    ])
    expect(result.removed.filter((l) => l.text === 'b')).toEqual([{ lineNum: 2, text: 'b' }])
    expect(result.added.filter((l) => l.text === 'x')).toEqual([{ lineNum: 3, text: 'x' }])
  })

  it('末尾追加多行：added 按「未变 → 新增」顺序带全局行号', () => {
    const result = computeVersionDiff('a', 'a\nb\nc')

    expect(result.added.map((l) => `${l.lineNum}:${l.text}`)).toEqual(['1:a', '2:b', '3:c'])
    expect(result.unchanged).toEqual([{ lineNum: 1, text: 'a' }])
    expect(result.removed).toEqual([{ lineNum: 1, text: 'a' }])
  })

  it('删除行：removed 覆盖被删行，行号保持全局递增', () => {
    const result = computeVersionDiff('a\nb\nc', 'a')

    expect(result.removed).toEqual([
      { lineNum: 1, text: 'a' },
      { lineNum: 2, text: 'b' },
      { lineNum: 3, text: 'c' },
    ])
    expect(result.added).toEqual([{ lineNum: 1, text: 'a' }])
    expect(result.unchanged).toEqual([{ lineNum: 1, text: 'a' }])
  })

  it('整段替换：无未变行时 unchanged 为空，行号先旧后新连续编号', () => {
    const result = computeVersionDiff('old-1\nold-2', 'new-1\nnew-2')

    expect(result.unchanged).toEqual([])
    expect(result.removed.map((l) => l.text)).toEqual(['old-1', 'old-2'])
    expect(result.added).toEqual([
      { lineNum: 3, text: 'new-1' },
      { lineNum: 4, text: 'new-2' },
    ])
  })

  it('空内容与 null 视为空字符串，不抛错', () => {
    // 实现里用 (oldContent ?? '') 兜底，null 不会抛错
    const empty = null as unknown as string
    expect(() => computeVersionDiff(empty, empty)).not.toThrow()
    const result = computeVersionDiff(empty, empty)
    // '' split('\n') 得到 ['']，两个空内容视为一行未变
    expect(result.unchanged).toEqual([{ lineNum: 1, text: '' }])
  })
})
