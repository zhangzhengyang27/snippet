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
 * 后端硬拦 <20 / >400 与「描述只是在复述标题」。前端提前拦同样口径，避免用户点保存才吃 400。
 *
 * `suggest` 是给 UI 的软引导区间（实际数据里 30–90 字占 87.1%），不阻塞提交。
 */
export const SNIPPET_DESCRIPTION_LIMITS = {
  min: 20,
  max: 400,
  suggestMin: 30,
  suggestMax: 90,
} as const

/** 与后端 `SNIPPET_METADATA_RULES.descriptionNameResidueMinLength` 同值，改一处必须同步另一处。 */
export const SNIPPET_DESCRIPTION_NAME_RESIDUE_MIN = 10

/**
 * 语义比对用的归一化：转小写 + 去掉所有标点、空白与符号，只保留英文字母、数字与 CJK 汉字。
 *
 * 后端 `normalizeSnippetMetadataText` 的镜像实现。没有它，用户把标题里的空格换成 `/`
 * 再补个句号就能在前端过检、却在提交时被后端 400 拦下（历史上有 112 条数据正是这样进来的）。
 */
export const normalizeSnippetMetadataText = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')

/** 与后端 `SNIPPET_METADATA_RULES.nameMaxLength` 同值。 */
export const SNIPPET_NAME_MAX_LENGTH = 30

/** 描述输入框的 placeholder 文案，抽成常量供 UI 直接复用，避免两处写歪。 */
export const SNIPPET_DESCRIPTION_PLACEHOLDER = `必填 ${SNIPPET_DESCRIPTION_LIMITS.min}-${SNIPPET_DESCRIPTION_LIMITS.max} 字：说清这段代码干什么、用在什么场景，别只把标题再抄一遍`

/**
 * 返回标题的具体问题文案，合格返回空串。
 *
 * 只镜像「非空 + 字数上限」两条：阈值稳定、复制成本低。后端还有一条
 * 「标题尾部不得残留语言标签（如 xxx（JavaScript））」—— 那份语言名单是后端筛过的 38 项配置，
 * 复制到前端只会两边腐烂，所以保持后端单点；写标题时不要在末尾贴语言后缀即可。
 */
export const describeNameIssue = (name: string): string => {
  const title = name.trim()

  if (!title) {
    return '片段名称不能为空'
  }
  if (title.length > SNIPPET_NAME_MAX_LENGTH) {
    return `名称 ${title.length} 字，超过 ${SNIPPET_NAME_MAX_LENGTH} 字上限：写成短语式主题词，说明挪到描述里`
  }
  return ''
}

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
  // 与标题的比对走归一化（大小写 / 标点 / 空白全部忽略），与后端完全同口径。
  // 分两级提示：一字不改 → 说「完全相同」；只重复标题或加了几字尾巴 → 说「只是在复述」。
  if (title) {
    const normalizedTitle = normalizeSnippetMetadataText(title)
    const normalizedDesc = normalizeSnippetMetadataText(desc)
    if (normalizedTitle) {
      const residue = normalizedDesc.split(normalizedTitle).join('')
      if (normalizedDesc === normalizedTitle) {
        return '描述与标题完全相同（换个标点也算），等于没写'
      }
      if (
        normalizedDesc.includes(normalizedTitle) &&
        residue.length < SNIPPET_DESCRIPTION_NAME_RESIDUE_MIN
      ) {
        return `描述只是在重复标题：去掉标题后只剩 ${residue.length} 个字，至少要写出 ${SNIPPET_DESCRIPTION_NAME_RESIDUE_MIN} 个字的新信息`
      }
    }
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

  /**
   * 字段是否被用户改动过。未改动（且未点过提交）时字段下方只显示中性字数、不报红 ——
   * 否则刚打开的新建弹窗会直接满屏红字。
   */
  const touched = reactive({ name: false, description: false })
  /** 是否点过「创建 / 保存」：点过后即便没改动也要把问题亮出来，否则用户不知道为何没提交。 */
  const submitAttempted = ref(false)

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

  const nameLength = computed(() => form.name.trim().length)

  /** 名称字段的实时校验结果（空串代表合格），只做提示，不阻塞输入。 */
  const nameIssue = computed(() => describeNameIssue(form.name))

  /** 描述字段的实时校验结果（空串代表合格），只做提示，不阻塞输入。 */
  const descriptionIssue = computed(() =>
    describeDescriptionIssue(form.name, form.description)
  )

  /** 名称提示是否该显示为错误：只有「改过」或「点过提交」才报红，否则只报字数。 */
  const nameHintIsError = computed(
    () => Boolean(nameIssue.value) && (touched.name || submitAttempted.value)
  )

  /** 名称字段下方要显示的文案：未触碰时只显示字数计数。 */
  const nameHint = computed(() =>
    nameHintIsError.value
      ? nameIssue.value
      : `${nameLength.value} / ${SNIPPET_NAME_MAX_LENGTH} 字`
  )

  /** 描述提示是否该显示为错误：同上。 */
  const descriptionHintIsError = computed(
    () => Boolean(descriptionIssue.value) && (touched.description || submitAttempted.value)
  )

  /** 描述字段下方要显示的文案：未触碰时只显示字数计数。 */
  const descriptionHint = computed(() =>
    descriptionHintIsError.value
      ? descriptionIssue.value
      : `${descriptionLength.value} / ${SNIPPET_DESCRIPTION_LIMITS.min}-${SNIPPET_DESCRIPTION_LIMITS.max} 字`
  )

  /** 标记字段已被用户改动（首次输入时调用），此后该字段才允许报红。 */
  const markTouched = (field: 'name' | 'description') => {
    touched[field] = true
  }

  const applySnippet = () => {
    const nextState = initialFormState()
    const snippet = options.snippet()

    if (snippet) {
      nextState.name = snippet.name
      nextState.description = snippet.description || ''
      nextState.collectionId = snippet.collectionId
      nextState.language = snippet.language
      // 编辑入口（详情面板 / 深链）都必须传入**已带正文**的片段：
      // 列表接口为瘦身不回传 content，此处 `?? ''` 只是防御 —— 若真拿到 undefined，
      // 保存会把正文覆盖成空。见 KnowledgeSnippetsPage 的按需取正文逻辑。
      nextState.content = snippet.content ?? ''
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
    // 打开 / 切换片段时重置「已触碰」状态：
    // 编辑已有片段不该把它历史遗留的问题立刻标红。
    touched.name = false
    touched.description = false
    submitAttempted.value = false
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
    // 用户点了提交 —— 从此字段提示强制显示，不再因「未触碰」而隐藏
    submitAttempted.value = true

    // 名称必填 + 长度上限：与后端 snippet-metadata 闸门同口径，前端先拦，别让用户吃 400
    if (nameIssue.value) {
      validationMessage.value = nameIssue.value
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
    descriptionHint,
    descriptionHintIsError,
    descriptionPlaceholder: SNIPPET_DESCRIPTION_PLACEHOLDER,
    nameLength,
    nameIssue,
    nameHint,
    nameHintIsError,
    nameMaxLength: SNIPPET_NAME_MAX_LENGTH,
    markTouched,
    applySnippet,
    validate,
    buildSubmitPayload,
  }
}
