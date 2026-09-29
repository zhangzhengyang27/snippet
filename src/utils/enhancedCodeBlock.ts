/**
 * 增强代码块 HTML 渲染工具（目标项目适配版）。
 *
 * 源项目依赖 highlight.js 与 Nuxt UI 运行时，迁移后统一改用 Monaco 负责编辑，
 * 这里仅提供只读预览所需的静态 HTML 渲染（不做语法高亮，代码经 HTML 转义后原样输出），
 * 保留与源项目一致的 DOM 结构与类名，便于样式复用。
 */
import {
  codeBlockDefaults,
  codeBlockLanguages,
  codeBlockThemes,
  type EnhancedCodeBlockAttrs,
} from '@/types/code-block'
import { escapeHtml } from '@/utils/escape'
export { escapeHtml }

/**
 * 将部分展示属性与默认值合并为完整属性。
 */
export function normalizeCodeBlockAttrs(
  input?: Partial<EnhancedCodeBlockAttrs> | null
): EnhancedCodeBlockAttrs {
  return {
    ...codeBlockDefaults,
    ...(input ?? {}),
  }
}

/**
 * 获取代码语言对应的显示名称。
 */
export function getCodeLanguageLabel(language: string): string {
  const normalized = (language || 'text').toLowerCase()

  for (const lang of codeBlockLanguages) {
    if (lang.value === normalized || lang.aliases?.includes(normalized)) {
      return lang.label
    }
  }

  return language || 'Plain Text'
}

/**
 * 生成行号列 HTML。
 */
function buildLineNumbersHtml(code: string): string {
  const lineCount = code.split('\n').length
  let html = ''

  for (let i = 1; i <= lineCount; i++) {
    html += `<span>${i}</span>`
  }

  return html
}

/**
 * 渲染增强代码块为静态 HTML（只读预览用）。
 *
 * @param code 代码内容
 * @param input 展示属性（可选，与默认值合并）
 * @returns 代码块 HTML 字符串
 */
export function renderEnhancedCodeBlockHtml(
  code: string,
  input?: Partial<EnhancedCodeBlockAttrs> | null
): string {
  const attrs = normalizeCodeBlockAttrs(input)
  const languageLabel = escapeHtml(getCodeLanguageLabel(attrs.language))
  const titleLabel = escapeHtml(attrs.title || '请输入代码块名称')
  const themeLabel = escapeHtml(
    codeBlockThemes.find((theme) => theme.value === attrs.theme)?.label || attrs.theme
  )
  const highlightedHtml = escapeHtml(code)
  const lineNumbersHtml = attrs.lineNumbers
    ? `<div class="cb-code-block__line-numbers">${buildLineNumbersHtml(code)}</div>`
    : ''

  return `<div data-type="enhanced-code-block" class="cb-code-block cb-code-block--${attrs.theme}" data-theme="${
    attrs.theme
  }" data-language="${escapeHtml(attrs.language)}" data-title="${escapeHtml(
    attrs.title || ''
  )}" data-line-numbers="${String(attrs.lineNumbers)}" data-wrap="${String(
    attrs.wrap
  )}" data-collapsed="${String(
    attrs.collapsed
  )}"><div class="cb-code-block__toolbar"><div class="cb-code-block__toolbar-left"><span class="cb-code-block__caret">${
    attrs.collapsed ? '▶' : '▼'
  }</span><span class="cb-code-block__title ${
    attrs.title ? '' : 'is-placeholder'
  }">${titleLabel}</span></div><div class="cb-code-block__toolbar-right"><span class="cb-code-block__badge">${languageLabel}</span><span class="cb-code-block__divider"></span><span class="cb-code-block__badge">${themeLabel}</span></div></div><div class="cb-code-block__body${
    attrs.collapsed ? ' is-collapsed' : ''
  }">${lineNumbersHtml}<pre class="cb-code-block__pre"><code class="hljs language-${escapeHtml(
    attrs.language
  )}">${highlightedHtml}</code></pre></div></div>`
}
