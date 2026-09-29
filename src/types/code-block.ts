/**
 * 代码块展示属性类型定义。
 *
 * 源项目中该类型定义于 `@/utils/enhanced-code-block`（依赖 highlight.js / Nuxt UI），
 * 迁移到目标项目后，代码渲染统一改用 Monaco 编辑器，因此这里仅保留纯类型与常量，
 * 不再引入 highlight.js 相关运行时逻辑。
 */

/** 约束代码块支持的主题皮肤。 */
export type CodeBlockTheme = 'one-dark-pro' | 'github-light' | 'slate'

/** 描述多文件片段中的单个文件（详情页以 tab 形式切换展示）。 */
export interface CodeBlockFile {
  /** 文件名（含扩展名），如 index.vue / useUploadImage.ts */
  name: string
  /** 该文件的语言，用于高亮，如 vue / typescript */
  language: string
  /** 文件源码内容 */
  code: string
}

/** 描述增强代码块在文档中保存的展示属性。 */
export interface EnhancedCodeBlockAttrs {
  language: string
  title: string | null
  theme: CodeBlockTheme
  lineNumbers: boolean
  wrap: boolean
  collapsed: boolean
  /** 难度分档（列表徽标与详情展示用） */
  difficulty?: SnippetDifficulty | null
  /** 多文件片段：每个文件作为一个 tab。单文件片段不设置此字段。 */
  files?: CodeBlockFile[]
}

interface CodeLanguageDefinition {
  value: string
  label: string
  aliases?: string[]
}

/** 列出编辑器内置支持的代码语言候选项。 */
export const codeBlockLanguages: CodeLanguageDefinition[] = [
  { value: 'text', label: 'Plain Text', aliases: ['plain', 'plaintext'] },
  { value: 'bash', label: 'Bash', aliases: ['shell', 'sh', 'zsh'] },
  { value: 'javascript', label: 'JavaScript', aliases: ['js', 'jsx'] },
  { value: 'typescript', label: 'TypeScript', aliases: ['ts', 'tsx'] },
  { value: 'python', label: 'Python', aliases: ['py'] },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go', aliases: ['golang'] },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML', aliases: ['xml'] },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML', aliases: ['yml'] },
  { value: 'sql', label: 'SQL' },
  { value: 'markdown', label: 'Markdown', aliases: ['md'] },
  { value: 'mermaid', label: 'Mermaid', aliases: ['mmd'] },
  { value: 'vue', label: 'Vue' },
]

/** 列出增强代码块支持的主题皮肤。 */
export const codeBlockThemes: Array<{ value: CodeBlockTheme; label: string }> = [
  { value: 'one-dark-pro', label: 'One Dark Pro' },
  { value: 'github-light', label: 'GitHub Light' },
  { value: 'slate', label: 'Slate' },
]

/** 提供增强代码块的默认展示属性。 */
export const codeBlockDefaults: EnhancedCodeBlockAttrs = {
  language: 'text',
  title: null,
  theme: 'one-dark-pro',
  lineNumbers: true,
  wrap: false,
  collapsed: false,
}

/** 片段难度分档（与 scripts/annotate_difficulty.cjs 的自动评分口径一致）。 */
export type SnippetDifficulty = 'beginner' | 'intermediate' | 'advanced'

/** 难度分档的展示文案。 */
export const snippetDifficultyLabels: Record<SnippetDifficulty, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
}

/** 难度筛选/下拉选项（{ value, label } 结构，与 codeBlockThemes 同构）。 */
export const snippetDifficultyOptions: Array<{ value: SnippetDifficulty; label: string }> = (
  Object.entries(snippetDifficultyLabels) as [SnippetDifficulty, string][]
).map(([value, label]) => ({ value, label }))

/** 展示某难度的中文文案（未知值返回空串）。 */
export function snippetDifficultyLabel(difficulty: SnippetDifficulty | string | null | undefined): string {
  if (!difficulty) return ''
  return snippetDifficultyLabels[difficulty as SnippetDifficulty] ?? ''
}

/**
 * 将任意输入归一化为内置语言表中的规范值：
 * 命中 value 或 aliases 时返回规范 value；未命中时返回去空白小写原文（空串返回空串）。
 */
export function normalizeSnippetLanguage(lang: string | null | undefined): string {
  const raw = (lang ?? '').trim().toLowerCase()
  if (!raw) return ''
  for (const def of codeBlockLanguages) {
    if (def.value === raw || def.aliases?.includes(raw)) return def.value
  }
  return raw
}

/** 前端片段内容的轻量校验问题（提交前拦截明显错误）。 */
export interface SnippetContentIssue {
  severity: 'error' | 'warning'
  message: string
}

/**
 * 校验前端类片段内容：空内容、Vue SFC 缺 template、HTML 缺标签等。
 * 仅做客户端快速反馈，后端仍会做权威校验。
 */
export function validateFrontendSnippetContent(
  language: string,
  content: string
): SnippetContentIssue[] {
  const issues: SnippetContentIssue[] = []
  const lang = normalizeSnippetLanguage(language)
  const body = content ?? ''
  if (!body.trim()) {
    issues.push({ severity: 'error', message: '片段内容不能为空' })
    return issues
  }
  if (lang === 'vue' && !/<template[\s>]/i.test(body)) {
    issues.push({ severity: 'error', message: 'Vue 单文件组件缺少 <template> 块' })
  }
  if ((lang === 'html' || lang === 'htm') && !/<[a-z][\s\S]*>/i.test(body)) {
    issues.push({ severity: 'warning', message: 'HTML 片段未检测到任何标签' })
  }
  return issues
}
