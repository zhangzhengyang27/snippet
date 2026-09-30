/**
 * 示例源码的拆分与合并（纯函数）。
 *
 * 从 `SourcePane.vue` 下沉。这些函数都只依赖入参、不碰组件状态，
 * 因此可以独立测试，也让组件专注在交互与状态编排上。
 */

/** 一段源码（示例本体或「当前选中的片段」，两者字段一致） */
export interface SourceParts {
  title?: string
  html?: string
  css?: string
  js?: string
}

/** 从 HTML 中抽出第一个 `<script>` 块的内容（无则空串） */
export function extractScriptFromHtml(html: string): string {
  const match = (html ?? '').match(/<script[^>]*>([\s\S]*?)<\/script>/i)
  return match ? match[1].trim() : ''
}

/** 去掉 HTML 中的全部 `<script>` 块（用于 HTML 标签页只展示结构） */
export function stripScriptFromHtml(html: string): string {
  return (html ?? '').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').trim()
}

/** 判断是否已是完整 HTML 文档（含 doctype / html / head / body 任一） */
export function isFullDocument(html: string): boolean {
  return /<!doctype\s|<html[\s>]|<head[\s>]|<body[\s>]/i.test(html)
}

/** 源码语言 → 标签页显示名 */
export function sourceLanguageLabel(lang: string | undefined): string {
  if (lang === 'vue') return 'Vue'
  if (lang === 'ts' || lang === 'typescript') return 'TypeScript'
  if (lang === 'js' || lang === 'javascript') return 'JS'
  if (lang === 'html') return 'HTML'
  if (lang === 'css') return 'CSS'
  return '源码'
}

/**
 * 把 html / css / js 合并成一份可直接运行/预览的完整 HTML 文档。
 *
 * 两种情形：
 *  - 入参 HTML 已是完整文档 → 把 css/js 注入 `</head>` / `</body>` 之前
 *  - 片段式代码 → 包装成带 meta / title 的完整文档，并按层级缩进
 *
 * `snippet`（当前选中片段）的字段会**追加**在 `example` 之后 —— 用于「在示例
 * 基础上叠加片段」的预览场景。
 */
export function buildUnifiedHtml(
  example: SourceParts,
  snippet?: SourceParts | null
): string {
  const rawHtml = (snippet?.html ?? example.html ?? '').trim()
  const css = [example.css ?? '', snippet?.css ?? ''].filter(Boolean).join('\n')
  const js = [example.js ?? '', snippet?.js ?? ''].filter(Boolean).join('\n')

  // 已经是完整文档：注入 style/script
  if (isFullDocument(rawHtml)) {
    let doc = rawHtml
    if (css) {
      const styleTag = `<style>\n${css}\n</style>`
      doc = doc.replace(/<\/head>/i, `  ${styleTag}\n</head>`)
    }
    if (js) {
      const scriptTag = `<script>\n${js}\n</scr` + 'ipt>'
      doc = doc.replace(/<\/body>/i, `  ${scriptTag}\n</body>`)
    }
    return doc
  }

  // 片段式代码：包装为完整文档
  const parts: string[] = ['<!DOCTYPE html>', '<html lang="zh-CN">', '<head>']
  parts.push('  <meta charset="UTF-8">')
  parts.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">')
  if (example.title) parts.push(`  <title>${example.title}</title>`)
  if (css) {
    parts.push('  <style>')
    parts.push(...css.split('\n').map((l) => `    ${l}`))
    parts.push('  </style>')
  }
  parts.push('</head>')
  parts.push('<body>')
  parts.push(...rawHtml.split('\n').map((l) => `  ${l}`))
  if (js) {
    parts.push('  <script>')
    parts.push(...js.split('\n').map((l) => `    ${l}`))
    parts.push('  </scr' + 'ipt>')
  }
  parts.push('</body>')
  parts.push('</html>')
  return parts.join('\n')
}
