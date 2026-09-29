/**
 * 片段占位符工具（恢复推断）。
 *
 * 源文件历史丢失，以下接口依据幸存调用点反推，签名不可变更：
 *  - useKnowledgeSnippetsPage.ts 的 resolveFileCode：
 *      extractSnippetPlaceholderDefs(content, language) → defs 为空则原样返回，
 *      否则 expandSnippetTemplate(content, buildSnippetPlaceholderValues(defs), language)
 *  - useSnippetEditorForm.ts：extractSnippetPlaceholderDefs(form.content, form.language)
 *    在 computed 内 try/catch，error.message 直接展示给用户且会阻断表单提交，
 *    因此普通代码绝不能被误判为非法占位符（误报会导致片段无法保存）
 *  - types/knowledge-snippet.ts：SnippetPlaceholderDef { name, kind: 'text'|'choice',
 *    defaultValue: string|null, options: string[] }；后端由 content 推导同名 defs
 *
 * 占位符语法（推断设计）：
 *   [[名称]]   [[名称=默认值]]   [[名称|候选1|候选2]]   [[名称=默认值|候选1|候选2]]
 *  - 名称必须紧跟 [[（不允许空白），以字母或下划线开头，仅含字母 / 数字 /
 *    下划线 / 连字符，且占位符内部不允许任何空白 —— 因此 bash 条件测试
 *    `[[ -f x ]]`（操作符两侧恒有空格）与代码中普通成对 `[[` 不会被误识别；
 *  - 名称后跟 `|候选|…` 即为单选（kind = 'choice'，options 非空），否则为
 *    文本输入（kind = 'text'，options 为空数组）；默认值缺省时为 null；
 *  - 明确的书写错误会抛出中文 Error（同名不同配置、空的默认值 / 候选值），
 *    由编辑器表单捕获展示；
 *  - language 参数的用途：mermaid 的 `[[节点]]` 是子程序节点原生语法，
 *    该语言整体跳过占位符解析与展开。
 */
import type { SnippetPlaceholderDef, SnippetPlaceholderKind } from '@/types/knowledge-snippet'
import { normalizeSnippetLanguage } from '@/types/code-block'

/** 占位符整体形态：`[[内部]]`，内部不允许出现 [ ] ] [ 或空白。 */
const PLACEHOLDER_PATTERN = /\[\[([^[\]\s]+)\]\]/g

/** 占位符名称必须以字母或下划线开头，仅含字母 / 数字 / 下划线 / 连字符。 */
const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*/

/** 解析 `[[…]]` 内部内容的结果。 */
type InnerParseResult =
  | { type: 'placeholder'; name: string; defaultValue: string | null; options: string[] }
  | { type: 'invalid'; message: string }
  | { type: 'plain' }

/** mermaid 的 `[[节点]]` 为子程序节点原生语法，与占位符冲突，跳过解析。 */
function isPlaceholderParsingSkipped(language: string): boolean {
  return normalizeSnippetLanguage(language) === 'mermaid'
}

/**
 * 解析占位符内部内容为 定义 / 非法 / 非占位符 三种结果。
 * 仅当内容能完整解释为 `名称(=默认值)?(\|候选)*` 时才算占位符，
 * 其余形态（如 `[[foo!bar]]`）一律视为普通文本，避免误伤正常代码。
 */
function parsePlaceholderInner(inner: string): InnerParseResult {
  const nameMatch = NAME_PATTERN.exec(inner)
  if (!nameMatch) return { type: 'plain' }

  const name = nameMatch[0]
  const rest = inner.slice(name.length)

  if (rest === '') {
    return { type: 'placeholder', name, defaultValue: null, options: [] }
  }

  if (rest.startsWith('|')) {
    const options = rest.slice(1).split('|')
    if (options.some((option) => option === '')) {
      return { type: 'invalid', message: `占位符「${name}」存在空的候选值。` }
    }
    return { type: 'placeholder', name, defaultValue: null, options }
  }

  if (rest.startsWith('=')) {
    const body = rest.slice(1)
    const separatorIndex = body.indexOf('|')
    const defaultValue = separatorIndex === -1 ? body : body.slice(0, separatorIndex)
    if (defaultValue === '') {
      return { type: 'invalid', message: `占位符「${name}」的默认值不能为空。` }
    }
    const options = separatorIndex === -1 ? [] : body.slice(separatorIndex + 1).split('|')
    if (options.some((option) => option === '')) {
      return { type: 'invalid', message: `占位符「${name}」存在空的候选值。` }
    }
    return { type: 'placeholder', name, defaultValue, options }
  }

  return { type: 'plain' }
}

/** 将内部解析结果转换为对外暴露的占位符定义。 */
function toPlaceholderDef(
  parsed: Extract<InnerParseResult, { type: 'placeholder' }>
): SnippetPlaceholderDef {
  const kind: SnippetPlaceholderKind = parsed.options.length > 0 ? 'choice' : 'text'
  return {
    name: parsed.name,
    kind,
    defaultValue: parsed.defaultValue,
    options: parsed.options,
  }
}

/**
 * 从片段模板中解析占位符定义。
 *
 * @param content - 片段模板内容
 * @param language - 片段语言（mermaid 跳过解析，恒返回空数组）
 * @returns 按出现顺序排列的占位符定义（同名占位符去重）
 * @throws Error 模板中存在明确的占位符书写错误（空的默认值 / 候选值，或同名占位符配置不一致）
 */
export function extractSnippetPlaceholderDefs(
  content: string,
  language: string
): SnippetPlaceholderDef[] {
  if (isPlaceholderParsingSkipped(language)) return []

  const defs: SnippetPlaceholderDef[] = []
  const signatureByName = new Map<string, string>()

  for (const match of content.matchAll(PLACEHOLDER_PATTERN)) {
    const parsed = parsePlaceholderInner(match[1])
    if (parsed.type === 'invalid') {
      throw new Error(parsed.message)
    }
    if (parsed.type === 'plain') continue

    const def = toPlaceholderDef(parsed)
    // 同名占位符在模板中多处出现是合法的；配置不一致视为书写错误
    const signature = JSON.stringify([def.kind, def.defaultValue, def.options])
    const previous = signatureByName.get(def.name)
    if (previous !== undefined) {
      if (previous !== signature) {
        throw new Error(`占位符「${def.name}」重复定义且配置不一致。`)
      }
      continue
    }
    signatureByName.set(def.name, signature)
    defs.push(def)
  }

  return defs
}

/**
 * 依据占位符定义构造展开用的取值表（键为占位符名称）。
 * 取值优先级：默认值 → 首个候选值（单选）→ 空串。
 */
export function buildSnippetPlaceholderValues(
  defs: SnippetPlaceholderDef[]
): Record<string, string> {
  const values: Record<string, string> = {}
  for (const def of defs) {
    values[def.name] = def.defaultValue ?? (def.options.length > 0 ? def.options[0] : '')
  }
  return values
}

/**
 * 将模板中的占位符替换为对应取值，返回展开后的内容。
 * 取值表中不存在的名称保持占位符原文（避免静默注入空内容破坏代码）。
 *
 * @param content - 片段模板内容
 * @param values - 占位符取值表（键为占位符名称）
 * @param language - 片段语言（mermaid 跳过展开，原样返回）
 * @returns 展开占位符后的内容
 */
export function expandSnippetTemplate(
  content: string,
  values: Record<string, string>,
  language: string
): string {
  if (isPlaceholderParsingSkipped(language)) return content

  return content.replace(PLACEHOLDER_PATTERN, (raw, inner: string) => {
    const parsed = parsePlaceholderInner(inner)
    if (parsed.type !== 'placeholder') return raw
    if (!Object.prototype.hasOwnProperty.call(values, parsed.name)) return raw
    return values[parsed.name]
  })
}
