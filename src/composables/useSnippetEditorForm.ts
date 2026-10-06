/** 封装片段编辑器表单相关组合式状态与交互逻辑。 */

import { computed, reactive, ref, watch } from 'vue'
import type { KnowledgeSnippet, KnowledgeSnippetCollection } from '@/types/knowledge-snippet'
import type { EnhancedCodeBlockAttrs, SnippetDifficulty } from '@/types/code-block'
import { normalizeSnippetLanguage, validateFrontendSnippetContent } from '@/types/code-block'
import { extractSnippetPlaceholderDefs } from '@/utils/snippetPlaceholders'
import { normalizeCodeBlockAttrs, renderEnhancedCodeBlockHtml } from '@/utils/enhancedCodeBlock'

/**
 * 描述片段编辑表单的提交数据。
 *
 * 不含 placeholderDefs：后端由 content 推导占位符定义，且 DTO 未声明该字段，
 * 多传会被全局 ValidationPipe(forbidNonWhitelisted) 判为 400。
 * 表单内的占位符预览走 placeholderState，与此无关。
 */
export interface SnippetEditorSubmitPayload {
  name: string
  /** 必填：不传/留空会被后端语义闸门（snippet-metadata.util.ts）400 拒掉，这里直接要求前端给字符串。 */
  description: string
  collectionId: string | null
  language: string
  content: string
  displayAttrs: Partial<EnhancedCodeBlockAttrs>
  tags: string[]
  favorite: boolean
}

type FormState = {
  name: string
  description: string
  collectionId: string | null
  language: string
  content: string
  title: string
  theme: EnhancedCodeBlockAttrs['theme']
  lineNumbers: boolean
  wrap: boolean
  collapsed: boolean
  difficulty: '' | SnippetDifficulty
  favorite: boolean
  tagsText: string
}

const flattenCollections = (
  items: KnowledgeSnippetCollection[],
  depth = 0
): Array<{ id: string; label: string; value: string | null }> => {
  return items.flatMap((item) => {
    const label = `${'　'.repeat(depth)}${depth > 0 ? '└ ' : ''}${item.name}`

    return [
      {
        id: item.id,
        label,
        value: item.id,
      },
      ...flattenCollections(item.children, depth + 1),
    ]
  })
}

/**
 * 描述字段的长度口径，**与后端语义闸门 `snippet-metadata.util.ts` 保持一致**：
 * 后端硬拦 <20 / >400 与「描述 == 标题」。前端提前拦同样口径，避免用户点保存才吃 400。
 *
 * `suggest` 是给 UI 的软引导区间（实际数据里 30–90 字占 87.1%），不阻塞提交。
 */
export const SNIPPET_DESCRIPTION_LIMITS = {
  min: 20,
  max: 400,
  suggestMin: 30,
  suggestMax: 90,
} as const

/** 描述输入框的 placeholder 文案，抽成常量供 UI 直接复用，避免两处写歪。 */
export const SNIPPET_DESCRIPTION_PLACEHOLDER = `必填 ${SNIPPET_DESCRIPTION_LIMITS.min}-${SNIPPET_DESCRIPTION_LIMITS.max} 字：说清这段代码干什么、用在什么场景，别只把标题再抄一遍`

/** 返回描述的具体问题文案，合格返回空串；validate 与字段级提示共用。 */
export const describeDescriptionIssue = (
  name: string,
  description: string
): string => {
  const desc = description.trim()
  const title = name.trim()

  if (!desc) {
    return `描述不能为空，请至少写 ${SNIPPET_DESCRIPTION_LIMITS.min} 字，说明这段代码干什么、用在什么场景`
  }
  if (desc.length < SNIPPET_DESCRIPTION_LIMITS.min) {
    return `描述只有 ${desc.length} 字，至少 ${SNIPPET_DESCRIPTION_LIMITS.min} 字：说清干什么 + 场景/约束`
  }
  if (desc.length > SNIPPET_DESCRIPTION_LIMITS.max) {
    return `描述 ${desc.length} 字，超过 ${SNIPPET_DESCRIPTION_LIMITS.max} 字上限，请精炼`
  }
  if (title && (desc === title || desc === `${title}。`)) {
    return '描述与标题完全相同（或只多个句号），等于没写'
  }
  return ''
}

/**
 * 管理片段编辑表单的校验与提交状态。
 */
export function useSnippetEditorForm(options: {
  open: () => boolean
  snippet: () => KnowledgeSnippet | null | undefined
  collections: () => KnowledgeSnippetCollection[]
  suggestedCollectionId: () => string | null | undefined
}) {
  const form = reactive<FormState>({
    name: '',
    description: '',
    collectionId: options.suggestedCollectionId() ?? null,
    language: 'text',
    content: '',
    title: '',
    theme: 'one-dark-pro',
    lineNumbers: true,
    wrap: false,
    collapsed: false,
    difficulty: '',
    favorite: false,
    tagsText: '',
  })
  const validationMessage = ref('')

  const initialFormState = (): FormState => ({
    name: '',
    description: '',
    collectionId: options.suggestedCollectionId() ?? null,
    language: 'text',
    content: '',
    title: '',
    theme: 'one-dark-pro',
    lineNumbers: true,
    wrap: false,
    collapsed: false,
    difficulty: '',
    favorite: false,
    tagsText: '',
  })

  const collectionOptions = computed(() => [
    { label: '根目录', value: null },
    ...flattenCollections(options.collections()).map((item) => ({
      label: item.label,
      value: item.value,
    })),
  ])

  const resolvedAttrs = computed(() =>
    normalizeCodeBlockAttrs({
      language: normalizeSnippetLanguage(form.language),
      title: form.title,
      theme: form.theme,
      lineNumbers: form.lineNumbers,
      wrap: form.wrap,
      collapsed: form.collapsed,
      // 显式 null：后端合并更新 displayAttrs，缺键会保留旧值，导致「未标注」清不掉难度
      difficulty: form.difficulty || null,
    })
  )

  const parsedTags = computed(() => {
    return form.tagsText
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  })

  const placeholderState = computed(() => {
    try {
      return {
        defs: extractSnippetPlaceholderDefs(form.content, form.language),
        error: '',
      }
    } catch (error) {
      return {
        defs: [],
        error: error instanceof Error ? error.message : '占位符解析失败。',
      }
    }
  })

  const previewHtml = computed(() =>
    renderEnhancedCodeBlockHtml(form.content || '', resolvedAttrs.value)
  )

  const descriptionLength = computed(() => form.description.trim().length)

  /** 描述字段的实时校验结果（空串代表合格），只做提示，不阻塞输入。 */
  const descriptionIssue = computed(() =>
    describeDescriptionIssue(form.name, form.description)
  )

  const applySnippet = () => {
    const nextState = initialFormState()
    const snippet = options.snippet()

    if (snippet) {
      nextState.name = snippet.name
      nextState.description = snippet.description || ''
      nextState.collectionId = snippet.collectionId
      nextState.language = snippet.language
      nextState.content = snippet.content
      nextState.title = snippet.displayAttrs.title || ''
      nextState.theme = snippet.displayAttrs.theme
      nextState.lineNumbers = snippet.displayAttrs.lineNumbers
      nextState.wrap = snippet.displayAttrs.wrap
      nextState.collapsed = snippet.displayAttrs.collapsed
      nextState.difficulty = snippet.displayAttrs.difficulty ?? ''
      nextState.favorite = snippet.favorite
      nextState.tagsText = snippet.tags.join(', ')
    } else if (options.suggestedCollectionId()) {
      nextState.collectionId = options.suggestedCollectionId() ?? null
    }

    Object.assign(form, nextState)
    validationMessage.value = ''
  }

  watch(
    () => [options.open(), options.snippet(), options.suggestedCollectionId()],
    () => {
      if (options.open()) {
        applySnippet()
      }
    },
    { immediate: true }
  )

  const validate = () => {
    if (!form.name.trim()) {
      validationMessage.value = '片段名称不能为空。'
      return false
    }

    // 描述必填：与后端 snippet-metadata 闸门同口径，前端先拦，别让用户吃 400
    if (descriptionIssue.value) {
      validationMessage.value = descriptionIssue.value
      return false
    }

    if (!form.content.trim()) {
      validationMessage.value = '代码内容不能为空。'
      return false
    }

    if (placeholderState.value.error) {
      validationMessage.value = placeholderState.value.error
      return false
    }

    const frontendIssues = validateFrontendSnippetContent(form.language, form.content)
    const blockingIssue = frontendIssues.find((issue) => issue.severity === 'error')
    if (blockingIssue) {
      validationMessage.value = blockingIssue.message
      return false
    }

    const warningIssue = frontendIssues.find((issue) => issue.severity === 'warning')
    if (warningIssue) {
      validationMessage.value = warningIssue.message
    } else {
      validationMessage.value = ''
    }

    return true
  }

  const buildSubmitPayload = (): SnippetEditorSubmitPayload => ({
    name: form.name.trim(),
    // 必填，不做 null 兜底：留空会被后端闸门拒掉，不如在 validate 里拦住
    description: form.description.trim(),
    collectionId: form.collectionId,
    language: normalizeSnippetLanguage(form.language),
    content: form.content,
    displayAttrs: resolvedAttrs.value,
    tags: parsedTags.value,
    favorite: form.favorite,
  })

  return {
    form,
    validationMessage,
    collectionOptions,
    resolvedAttrs,
    parsedTags,
    placeholderState,
    previewHtml,
    descriptionLength,
    descriptionIssue,
    descriptionPlaceholder: SNIPPET_DESCRIPTION_PLACEHOLDER,
    applySnippet,
    validate,
    buildSubmitPayload,
  }
}
