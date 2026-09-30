/**
 * example-source 单测。
 *
 * 这些函数从 SourcePane.vue 下沉而来，原本混在 888 行的组件里无法测试。
 * 断言逐条对应原实现的一行逻辑，用于**证明下沉没有改变行为**。
 */
import { describe, expect, it } from 'vitest'
import {
  buildUnifiedHtml,
  extractScriptFromHtml,
  isFullDocument,
  sourceLanguageLabel,
  stripScriptFromHtml,
} from './example-source'

describe('extractScriptFromHtml', () => {
  it('抽出第一个 script 块的内容并 trim', () => {
    expect(extractScriptFromHtml('<div></div>\n<script>\n  const a = 1\n</script>')).toBe(
      'const a = 1'
    )
  })

  it('带属性的 script 标签同样识别', () => {
    expect(extractScriptFromHtml('<script type="module">let x=1</script>')).toBe('let x=1')
  })

  it('没有 script 时返回空串', () => {
    expect(extractScriptFromHtml('<div>hi</div>')).toBe('')
    expect(extractScriptFromHtml('')).toBe('')
  })

  it('多个 script 只取第一个（与原实现一致）', () => {
    expect(extractScriptFromHtml('<script>A</script><script>B</script>')).toBe('A')
  })
})

describe('stripScriptFromHtml', () => {
  it('移除全部 script 块（不只是第一个）', () => {
    expect(stripScriptFromHtml('<div>a</div><script>X</script><p>b</p><script>Y</script>')).toBe(
      '<div>a</div><p>b</p>'
    )
  })

  it('结果会 trim', () => {
    expect(stripScriptFromHtml('\n\n  <div>x</div>  \n<script>Z</script>\n')).toBe('<div>x</div>')
  })
})

describe('isFullDocument', () => {
  it.each([
    ['<!DOCTYPE html><html></html>', true],
    ['<html lang="zh">', true],
    ['<head><title>t</title></head>', true],
    ['<body>x</body>', true],
    ['<div>片段</div>', false],
    ['<section><p>hi</p></section>', false],
    ['', false],
  ])('%s → %s', (html, expected) => {
    expect(isFullDocument(html)).toBe(expected)
  })
})

describe('sourceLanguageLabel', () => {
  it.each([
    ['vue', 'Vue'],
    ['ts', 'TypeScript'],
    ['typescript', 'TypeScript'],
    ['js', 'JS'],
    ['javascript', 'JS'],
    ['html', 'HTML'],
    ['css', 'CSS'],
    ['python', '源码'],
    [undefined, '源码'],
  ])('%s → %s', (lang, expected) => {
    expect(sourceLanguageLabel(lang as string | undefined)).toBe(expected)
  })
})

describe('buildUnifiedHtml', () => {
  it('片段式代码被包装成完整文档，并带 meta 与 title', () => {
    const out = buildUnifiedHtml({ title: '示例标题', html: '<div>hi</div>', css: 'a{}', js: 'x()' })
    expect(out).toContain('<!DOCTYPE html>')
    expect(out).toContain('<meta charset="UTF-8">')
    expect(out).toContain('<title>示例标题</title>')
    expect(out).toContain('<style>')
    expect(out).toContain('a{}')
    expect(out).toContain('<div>hi</div>')
    expect(out).toContain('x()')
    expect(out.trimEnd().endsWith('</html>')).toBe(true)
  })

  it('完整文档：css 注入 </head> 之前、js 注入 </body> 之前', () => {
    const out = buildUnifiedHtml({
      html: '<!DOCTYPE html><html><head></head><body><p>x</p></body></html>',
      css: 'body{}',
      js: 'run()',
    })
    expect(out).toContain('body{}')
    expect(out).toContain('run()')
    expect(out.indexOf('body{}')).toBeLessThan(out.indexOf('</head>'))
    expect(out.indexOf('run()')).toBeLessThan(out.indexOf('</body>'))
    // 不应被二次包装
    expect(out.match(/<!DOCTYPE html>/g)).toHaveLength(1)
  })

  it('没有 css / js 时不插入空 style / script 标签', () => {
    const out = buildUnifiedHtml({ html: '<div>x</div>' })
    expect(out).not.toContain('<style>')
    expect(out).not.toContain('<script>')
  })

  it('snippet 的 html/css/js 会追加在 example 之后', () => {
    const out = buildUnifiedHtml(
      { html: '<div>base</div>', css: 'base{}', js: 'base()' },
      { html: '<span>extra</span>', css: 'extra{}', js: 'extra()' }
    )
    // snippet.html 优先作为主结构
    expect(out).toContain('<span>extra</span>')
    // css / js 是「example + snippet」拼接
    expect(out.indexOf('base{}')).toBeLessThan(out.indexOf('extra{}'))
    expect(out.indexOf('base()')).toBeLessThan(out.indexOf('extra()'))
  })

  it('无 title 时不生成 title 标签', () => {
    const out = buildUnifiedHtml({ html: '<div>x</div>' })
    expect(out).not.toContain('<title>')
  })
})
