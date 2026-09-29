import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'
import type { BundledTheme } from 'shiki'
import { logger } from '@/utils/logger'
import { escapeHtml } from '@/utils/escape'
export { escapeHtml }
import themeGithubDark from 'shiki/dist/themes/github-dark.mjs'
import themeGithubLight from 'shiki/dist/themes/github-light.mjs'

/**
 * 已注册的 Shiki 语言标识。
 * 新增语言时同步更新此类型与 LANGUAGE_LOADERS / LANGUAGE_ALIASES。
 */
export type BundledLanguage =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'bash'
  | 'markdown'
  | 'python'
  | 'java'
  | 'go'
  | 'sql'
  | 'yaml'
  | 'jsx'
  | 'tsx'
  | 'dart'
  | 'kotlin'
  | 'swift'
  | 'groovy'
  | 'nginx'
  | 'ini'
  | 'dockerfile'
  | 'hcl'
  | 'terraform'
  | 'prisma'
  | 'protobuf'
  | 'awk'
  | 'http'

let highlighterInstance: HighlighterCore | null = null
let loadingPromise: Promise<HighlighterCore> | null = null

const SUPPORTED_THEMES: BundledTheme[] = ['github-dark', 'github-light']

/**
 * 语言语法懒加载器：textmate grammar 体积大，静态全量注入会让首次高亮
 * 一次性加载全部语言。改为创建不含语言的实例，按实际用到的语言动态 import
 * 并注册；每个语言仅加载一次（见 loadingLangs 去重，失败时允许重试）。
 * jsx/tsx 等带内嵌依赖的 grammar 文件是自包含的（含 js/ts 子语法），可单独注册。
 */
const LANGUAGE_LOADERS: Record<BundledLanguage, () => Promise<unknown>> = {
  html: () => import('shiki/dist/langs/html.mjs'),
  css: () => import('shiki/dist/langs/css.mjs'),
  javascript: () => import('shiki/dist/langs/javascript.mjs'),
  typescript: () => import('shiki/dist/langs/typescript.mjs'),
  json: () => import('shiki/dist/langs/json.mjs'),
  bash: () => import('shiki/dist/langs/bash.mjs'),
  markdown: () => import('shiki/dist/langs/markdown.mjs'),
  python: () => import('shiki/dist/langs/python.mjs'),
  java: () => import('shiki/dist/langs/java.mjs'),
  go: () => import('shiki/dist/langs/go.mjs'),
  sql: () => import('shiki/dist/langs/sql.mjs'),
  yaml: () => import('shiki/dist/langs/yaml.mjs'),
  jsx: () => import('shiki/dist/langs/jsx.mjs'),
  tsx: () => import('shiki/dist/langs/tsx.mjs'),
  dart: () => import('shiki/dist/langs/dart.mjs'),
  kotlin: () => import('shiki/dist/langs/kotlin.mjs'),
  swift: () => import('shiki/dist/langs/swift.mjs'),
  groovy: () => import('shiki/dist/langs/groovy.mjs'),
  nginx: () => import('shiki/dist/langs/nginx.mjs'),
  ini: () => import('shiki/dist/langs/ini.mjs'),
  dockerfile: () => import('shiki/dist/langs/dockerfile.mjs'),
  hcl: () => import('shiki/dist/langs/hcl.mjs'),
  terraform: () => import('shiki/dist/langs/terraform.mjs'),
  prisma: () => import('shiki/dist/langs/prisma.mjs'),
  protobuf: () => import('shiki/dist/langs/protobuf.mjs'),
  awk: () => import('shiki/dist/langs/awk.mjs'),
  http: () => import('shiki/dist/langs/http.mjs'),
}

/** 进行中的语言加载 Promise（按语言去重） */
const loadingLangs = new Map<BundledLanguage, Promise<void>>()

/**
 * 确保语言语法已注册到 highlighter 实例。
 */
async function ensureLanguage(hl: HighlighterCore, lang: BundledLanguage): Promise<void> {
  if (hl.getLoadedLanguages().includes(lang)) return

  let pending = loadingLangs.get(lang)
  if (!pending) {
    pending = (async () => {
      const module = await LANGUAGE_LOADERS[lang]()
      await hl.loadLanguage(module as Parameters<HighlighterCore['loadLanguage']>[0])
    })().catch((error) => {
      loadingLangs.delete(lang)
      throw error
    })
    loadingLangs.set(lang, pending)
  }
  await pending
}

/**
 * 用户传入的语言别名 → Shiki BundledLanguage。
 * 未命中时回退到 'html'（与历史行为一致）。
 */
const LANGUAGE_ALIASES: Record<string, BundledLanguage> = {
  html: 'html',
  vue: 'html',
  xml: 'html',
  mixed: 'html',
  css: 'css',
  scss: 'css',
  less: 'css',
  js: 'javascript',
  javascript: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  json: 'json',
  json5: 'json',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  markdown: 'markdown',
  md: 'markdown',
  python: 'python',
  py: 'python',
  java: 'java',
  go: 'go',
  golang: 'go',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  jsx: 'jsx',
  tsx: 'tsx',
  dart: 'dart',
  kotlin: 'kotlin',
  kt: 'kotlin',
  swift: 'swift',
  groovy: 'groovy',
  jenkinsfile: 'groovy',
  nginx: 'nginx',
  ini: 'ini',
  dockerfile: 'dockerfile',
  docker: 'dockerfile',
  hcl: 'hcl',
  terraform: 'terraform',
  tf: 'terraform',
  prisma: 'prisma',
  protobuf: 'protobuf',
  proto: 'protobuf',
  awk: 'awk',
  http: 'http',
  rest: 'http',
  // Shiki 无 redis/haproxy 语法，映射到最接近的语法
  redis: 'bash',
  rediscli: 'bash',
  haproxy: 'nginx',
}

/**
 * 获取或创建 Shiki highlighter 单例实例。
 * 多次调用会返回同一个实例，避免重复初始化开销。
 * 实例创建时不携带任何语言，语法在 highlightCode 中按需注册。
 */
async function getHighlighter(): Promise<HighlighterCore> {
  if (highlighterInstance) {
    return highlighterInstance
  }

  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = createHighlighterCore({
    themes: [themeGithubDark, themeGithubLight],
    langs: [],
    engine: createOnigurumaEngine(import('shiki/wasm')),
  })
    .then((hl) => {
      highlighterInstance = hl
      loadingPromise = null
      return hl
    })
    .catch((e) => {
      // 失败时清理 loadingPromise，允许后续调用重试
      loadingPromise = null
      throw e
    })

  return loadingPromise
}

/**
 * 将语言标识映射为 Shiki 支持的 BundledLanguage。
 * 未知语言返回 null，由 highlightCode 走纯文本降级（避免 < > 被错误解析为 HTML 标签）。
 */
function mapLanguage(language: string): BundledLanguage | null {
  const key = language?.toLowerCase()
  return LANGUAGE_ALIASES[key] ?? null
}

/**
 * 对代码进行语法高亮，返回带有内联样式的 HTML 字符串。
 *
 * 未知语言时降级为纯文本（仅 escapeHtml，不调用 Shiki），避免 `<`、`>` 被错误解析。
 * 语言语法按需懒加载：首次高亮某语言时动态加载对应 grammar，之后复用。
 *
 * @param code - 需要高亮的源代码
 * @param language - 代码语言（html / css / js / ts / vue / json / bash / md / python / java / go / sql / yaml / jsx / tsx 等）
 * @param theme - Shiki 主题名称，默认 'github-dark'
 * @returns 高亮后的 HTML 字符串
 */
export async function highlightCode(
  code: string,
  language: string,
  theme: BundledTheme = 'github-dark'
): Promise<string> {
  const lang = mapLanguage(language)
  if (!lang) {
    // 未知语言：返回纯文本 HTML，避免被 Shiki 当 html 解析导致 < > 错乱
    return `<pre class="shiki-plain"><code>${escapeHtml(code)}</code></pre>`
  }

  const hl = await getHighlighter()

  if (!SUPPORTED_THEMES.includes(theme)) {
    logger.warn('highlighter', `Theme "${theme}" is not supported, falling back to "github-dark".`)
    theme = 'github-dark'
  }

  try {
    await ensureLanguage(hl, lang)
  } catch (error) {
    // 语法加载失败（网络异常等）：降级为纯文本，保证代码仍可读
    logger.error('highlighter', `语言 "${lang}" 语法加载失败，降级为纯文本:`, error)
    return `<pre class="shiki-plain"><code>${escapeHtml(code)}</code></pre>`
  }

  return hl.codeToHtml(code, {
    lang,
    theme,
  }) as string
}

/**
 * 根据应用主题（dark/light）获取对应的 Shiki 主题名称。
 */
export function getShikiTheme(appTheme: 'dark' | 'light'): BundledTheme {
  return appTheme === 'dark' ? 'github-dark' : 'github-light'
}

/**
 * 返回当前已注册支持的语言列表（含别名）。
 * 用于 UI 层显示可选语言、做语言校验等。
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_ALIASES)
}

/**
 * 判断给定语言是否被支持（含别名）。
 */
export function isLanguageSupported(language: string): boolean {
  return Boolean(language && LANGUAGE_ALIASES[language.toLowerCase()])
}
