/**
 * Shiki 高亮器单例（只读代码展示）。
 *
 * 用于详情/预览等**只读**场景，替代原本加载整包 Monaco 的做法：
 * Monaco 打包后约 2–3MB（gzip ~700KB–1MB），而 shiki 按需加载语言后远小于此，
 * 且无需 worker。高亮器在首次使用时异步创建并复用到整个会话。
 *
 * 主题采用双主题（light/dark），通过 CSS 变量跟随应用 `.dark` 类切换，无需重新高亮。
 */
import type { BundledLanguage, Highlighter } from 'shiki'

let highlighterPromise: Promise<Highlighter> | null = null

/** 需要预载的语言（覆盖本项目所有片段语言；其余回退 plaintext）。
 *  注意：'text' 是 shiki 的特殊「无高亮」语言（运行期可用，但无对应 grammar 可预载），
 *  'redis' 不在 shiki 内置语言内，二者均不在此列表，统一在映射层回退到 'text'。 */
const SHIKI_LANGS: BundledLanguage[] = [
  'typescript', 'tsx', 'javascript', 'jsx', 'vue', 'html', 'css', 'scss', 'less',
  'json', 'yaml', 'python', 'java', 'go', 'sql', 'bash', 'markdown', 'dockerfile',
  'ini', 'protobuf', 'hcl', 'kotlin', 'swift', 'dart', 'groovy',
]

export const SHIKI_THEME_LIGHT = 'github-light'
export const SHIKI_THEME_DARK = 'one-dark-pro'

/** 获取（并缓存）单例高亮器。高亮器本体与其依赖语言均动态加载，不进入首屏。 */
export function getShikiHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({
        themes: [SHIKI_THEME_LIGHT, SHIKI_THEME_DARK],
        langs: SHIKI_LANGS,
      }),
    )
  }
  return highlighterPromise
}

/** 把业务语言标识映射为 shiki 运行期可用的语言 id（无法识别时回退 'text' 纯文本） */
export function mapShikiLanguage(lang: string | null | undefined): string {
  const raw = (lang ?? '').trim().toLowerCase()
  if (!raw) return 'text'
  const alias: Record<string, string> = {
    text: 'text',
    plaintext: 'text',
    bash: 'bash',
    shell: 'bash',
    sh: 'bash',
    zsh: 'bash',
    javascript: 'javascript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    typescript: 'typescript',
    ts: 'typescript',
    tsx: 'typescript',
    python: 'python',
    py: 'python',
    java: 'java',
    go: 'go',
    golang: 'go',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'html',
    xml: 'html',
    htm: 'html',
    mixed: 'html',
    json: 'json',
    json5: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    sql: 'sql',
    markdown: 'markdown',
    md: 'markdown',
    vue: 'vue',
    dockerfile: 'dockerfile',
    docker: 'dockerfile',
    ini: 'ini',
    protobuf: 'protobuf',
    proto: 'protobuf',
    hcl: 'hcl',
    terraform: 'hcl',
    tf: 'hcl',
    kotlin: 'kotlin',
    kt: 'kotlin',
    swift: 'swift',
    dart: 'dart',
    groovy: 'groovy',
    jenkinsfile: 'groovy',
    redis: 'text',
    mermaid: 'text',
  }
  return alias[raw] ?? (SHIKI_LANGS.includes(raw as BundledLanguage) ? raw : 'text')
}

/** 转义纯文本回退（无高亮时用） */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
