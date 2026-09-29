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
  description: string | null
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
    description: form.description.trim() ? form.description.trim() : null,
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
    applySnippet,
    validate,
    buildSubmitPayload,
  }
}
