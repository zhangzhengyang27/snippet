/**
 * 代码格式化（Prettier standalone + 按语言选择插件）。
 *
 * 从 `SourcePane.vue` 下沉 —— 该组件原本内联了 4 个 Prettier 插件的 import
 * 与格式化逻辑，是它 888 行里最容易独立出来的一块纯逻辑。
 */
import * as prettierStandalone from 'prettier/standalone'
import parserHtml from 'prettier/plugins/html'
import parserPostcss from 'prettier/plugins/postcss'
import parserBabel from 'prettier/plugins/babel'
import parserEstree from 'prettier/plugins/estree'

// prettier 插件类型以 any 兼容多版本（no-explicit-any 已在 eslint 全局关闭）
const parserPlugins: Record<string, { parser: string; plugins: any[] }> = {
  html: { parser: 'html', plugins: [parserHtml] },
  css: { parser: 'css', plugins: [parserPostcss] },
  js: { parser: 'babel', plugins: [parserBabel, parserEstree] },
  vue: { parser: 'html', plugins: [parserHtml] },
  ts: { parser: 'babel', plugins: [parserBabel, parserEstree] },
  typescript: { parser: 'babel', plugins: [parserBabel, parserEstree] },
}

/**
 * 用 Prettier 格式化代码。
 *
 * 失败时**原样返回输入**（而不是抛错或返回空串）—— 格式化是「锦上添花」，
 * 不该因为语法不完整（用户正在编辑）就让代码消失。
 */
export async function formatCode(code: string, lang: string): Promise<string> {
  if (!code) return ''

  const config = parserPlugins[lang] ?? parserPlugins['html']
  try {
    const formatted = await prettierStandalone.format(code, {
      parser: config.parser,
      plugins: config.plugins,
      semi: false,
      singleQuote: true,
      printWidth: 100,
    })
    // Prettier appends a trailing newline; drop it so Monaco line count matches visible lines.
    return formatted.replace(/\n$/, '')
  } catch {
    return code
  }
}
