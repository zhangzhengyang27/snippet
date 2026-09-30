import { describe, it, expect } from 'vitest'
import {
  computeVersionDiff,
  snippetComparableText,
  versionMessageLabel,
} from './useSnippetVersions'

/** 把 diff 行折成 "kind:old:new:text" 便于断言，避免逐字段写对象字面量 */
const shape = (lines: ReturnType<typeof computeVersionDiff>) =>
  lines.map((l) => `${l.kind}:${l.oldLine ?? '-'}:${l.newLine ?? '-'}:${l.text}`)

describe('computeVersionDiff', () => {
  it('内容一致时全部为 context，且新旧行号同步递增', () => {
    const result = computeVersionDiff('a\nb', 'a\nb')
    expect(shape(result)).toEqual(['context:1:1:a', 'context:2:2:b'])
  })

  it('中间一行被替换：先 removed 后 added，两行都不会被误标成 context', () => {
    const result = computeVersionDiff('a\nb\nc', 'a\nx\nc')
    expect(shape(result)).toEqual([
      'context:1:1:a',
      'removed:2:-:b',
      'added:-:2:x',
      'context:3:3:c',
    ])
  })

  it('末尾追加多行：新增行只挂新侧行号，旧侧为 null', () => {
    const result = computeVersionDiff('a', 'a\nb\nc')
    expect(shape(result)).toEqual(['context:1:1:a', 'added:-:2:b', 'added:-:3:c'])
  })

  it('删除行：删除行只挂旧侧行号，新侧为 null', () => {
    const result = computeVersionDiff('a\nb\nc', 'a')
    expect(shape(result)).toEqual(['context:1:1:a', 'removed:2:-:b', 'removed:3:-:c'])
  })

  it('整段替换：无 context 行，行号两侧各自从头计数', () => {
    const result = computeVersionDiff('old-1\nold-2', 'new-1\nnew-2')
    expect(shape(result)).toEqual([
      'removed:1:-:old-1',
      'removed:2:-:old-2',
      'added:-:1:new-1',
      'added:-:2:new-2',
    ])
  })

  it('不产生「每段多一个空行」的假行（diffLines 的尾部换行必须被吃掉）', () => {
    const result = computeVersionDiff('a\n', 'a\n')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ kind: 'context', text: 'a' })
  })

  it('空内容与 null 视为空串，不抛错', () => {
    expect(() => computeVersionDiff(null, null)).not.toThrow()
    expect(computeVersionDiff('', '')).toEqual([])
    // 从空内容变成一行：该行是 added
    expect(shape(computeVersionDiff('', 'x'))).toEqual(['added:-:1:x'])
  })

  it('行号在整段序列里连续，不因 kind 变化而重置', () => {
    const result = computeVersionDiff('1\n2\n3', '1\nX\nY\n3')
    const contextNos = result.filter((l) => l.kind === 'context').map((l) => l.newLine)
    expect(contextNos).toEqual([1, 4])
  })
})

describe('snippetComparableText', () => {
  it('单文件片段取 content', () => {
    expect(snippetComparableText({ content: 'const a = 1' })).toBe('const a = 1')
  })

  it('多文件片段优先展开 displayAttrs.files —— 其代码并不在 content 里', () => {
    const text = snippetComparableText({
      content: '（陈旧占位）',
      displayAttrs: {
        files: [
          { name: 'index.html', code: '<p>hi</p>' },
          { name: 'main.js', code: 'console.log(1)' },
        ],
      },
    })
    expect(text).toBe(
      '// ===== index.html =====\n<p>hi</p>\n\n// ===== main.js =====\nconsole.log(1)'
    )
    expect(text).not.toContain('陈旧占位')
  })

  it('files 为空数组时回退到 content（空数组不等于多文件）', () => {
    expect(snippetComparableText({ content: 'body{}', displayAttrs: { files: [] } })).toBe('body{}')
  })

  it('null / undefined 不抛错', () => {
    expect(snippetComparableText(null)).toBe('')
    expect(snippetComparableText(undefined)).toBe('')
    expect(snippetComparableText({ content: null })).toBe('')
  })

  it('文件名不同但内容相同的两个快照应被判定为有差异（文件名在比较口径内）', () => {
    const before = snippetComparableText({ displayAttrs: { files: [{ name: 'a.js', code: 'x' }] } })
    const after = snippetComparableText({ displayAttrs: { files: [{ name: 'b.js', code: 'x' }] } })
    expect(before).not.toBe(after)
  })
})

describe('versionMessageLabel', () => {
  it('固定标记翻译为中文', () => {
    expect(versionMessageLabel('create')).toBe('创建')
    expect(versionMessageLabel('update')).toBe('更新')
    expect(versionMessageLabel('rollback:abc123')).toBe('回滚')
  })

  it('用户备注原样展示', () => {
    expect(versionMessageLabel('改为打印2')).toBe('改为打印2')
  })

  it('空标记有兜底文案', () => {
    expect(versionMessageLabel('')).toBe('快照')
  })
})
