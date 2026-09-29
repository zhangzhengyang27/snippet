/** 封装知识片段 Page 相关组合式状态与交互逻辑。 */

import { computed, onMounted, ref } from 'vue'
import { useTransientToast } from '@/composables/useTransientToast'
import { useSnippetCollectionsState } from '@/composables/useSnippetCollectionsState'
import { useSnippetListState } from '@/composables/useSnippetListState'
import { getApiErrorMessage } from '@/api/client'
import {
  buildSnippetPlaceholderValues,
  expandSnippetTemplate,
  extractSnippetPlaceholderDefs,
} from '@/utils/snippetPlaceholders'
import { logger } from '@/utils/logger'
import { useAuthStore } from '@/stores/authStore'
import {
  createKnowledgeSnippet,
  deleteKnowledgeSnippet,
  deleteKnowledgeSnippetCollection,
  listKnowledgeSnippetTags,
  recordKnowledgeSnippetUse,
  updateKnowledgeSnippet,
} from '@/api/knowledge-snippets'
import type { KnowledgeSnippet, KnowledgeSnippetTagItem } from '@/types/knowledge-snippet'

type ConfirmState = {
  open: boolean
  title: string
  message: string
  danger: boolean
  onConfirm: () => void | Promise<void>
}

/**
 * 管理知识片段页的筛选、详情与弹窗流程。
 */
export const useKnowledgeSnippetsPage = () => {
  const {
    collections,
    loadingCollections,
    collectionError,
    expandedCollectionIds,
    draggedCollectionId,
    collectionDialog,
    collectionDialogSaving,
    visibleCollections,
    countCollections,
    collectAllCollectionIds,
    loadCollections,
    toggleCollectionExpanded,
    openCreateCollectionDialog,
    openEditCollectionDialog,
    submitCollectionDialog,
    persistCollectionTree,
  } = useSnippetCollectionsState()

  const {
    keyword,
    selectedCollectionId,
    selectedTag,
    favoritesOnly,
    sort,
    page,
    pageSize,
    total,
    totalPages,
    snippets,
    selectedLanguage,
    languages,
    clearFilters,
    loadingSnippets,
    snippetError,
    selectedSnippetId,
    pendingSelectSnippetId,
    selectedSnippet,
    selectedSnippetPreviewHtml,
    loadSnippets,
    loadMore,
    setPageSize,
  } = useSnippetListState()

  const { showToast, toastMessage, toastType, showToastMessage } = useTransientToast()

  const authStore = useAuthStore()
  /** 是否已登录：控制写操作按钮的显隐与 recordUse 的调用 */
  const isLoggedIn = computed(() => authStore.isLoggedIn)

  const tags = ref<KnowledgeSnippetTagItem[]>([])
  const loadingTags = ref(false)
  const tagError = ref('')
  const snippetDialogOpen = ref(false)
  const snippetDialogMode = ref<'create' | 'edit'>('create')
  const editingSnippet = ref<KnowledgeSnippet | null>(null)
  const snippetDialogSaving = ref(false)

  const confirmState = ref<ConfirmState>({
    open: false,
    title: '',
    message: '',
    danger: false,
    onConfirm: () => {},
  })

  /**
   * 请求序号：每次发起 loadTags 递增，响应回来时若不等于最新序号则丢弃，
   * 防止保存片段后并发触发多次 loadTags 时旧响应覆盖新响应。
   */
  let tagLoadSeq = 0

  const stats = computed(() => ({
    snippetCount: total.value,
    collectionCount: countCollections(collections.value),
    tagCount: tags.value.length,
  }))

  const loadTags = async () => {
    const seq = ++tagLoadSeq
    loadingTags.value = true
    tagError.value = ''

    try {
      const result = await listKnowledgeSnippetTags()
      // 丢弃过期响应
      if (seq !== tagLoadSeq) return
      tags.value = result.items
    } catch (error) {
      if (seq !== tagLoadSeq) return
      tagError.value = getApiErrorMessage(error, '加载标签失败。')
    } finally {
      if (seq === tagLoadSeq) {
        loadingTags.value = false
      }
    }
  }

  const refreshAll = async () => {
    await Promise.all([loadCollections().catch(() => undefined), loadTags(), loadSnippets()])
  }

  onMounted(() => {
    void (async () => {
      // 片段页允许未登录访问（已从 PROTECTED_ROUTES 移除），路由守卫不再等待 initialize；
      // 且子组件 onMounted 先于 App.vue 触发，故此处必须先确保认证状态已恢复，
      // 否则已登录用户的 token 未注入、请求会被当作匿名处理。initialize 幂等，可安全重复调用。
      if (!authStore.initialized) {
        await authStore.initialize()
      }
      await refreshAll()
    })()
  })

  const askDeleteCollection = (collectionId: string) => {
    confirmState.value = {
      open: true,
      title: '删除集合',
      message: '仅空集合允许删除；如果集合下仍有子集合或片段，后端会直接拒绝。',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteKnowledgeSnippetCollection(collectionId)
          if (selectedCollectionId.value === collectionId) {
            selectedCollectionId.value = null
          }
          showToastMessage('集合已删除。', 'success')
          await Promise.all([loadCollections().catch(() => undefined), loadSnippets()])
        } catch (error) {
          showToastMessage(getApiErrorMessage(error, '删除集合失败。'), 'error')
        }
      },
    }
  }

  const handleSubmitCollectionDialog = async () => {
    try {
      await submitCollectionDialog()
      showToastMessage(
        collectionDialog.value.mode === 'create' ? '集合已创建。' : '集合已更新。',
        'success'
      )
    } catch (error) {
      const message =
        error instanceof Error && error.message === '集合名称不能为空。'
          ? error.message
          : getApiErrorMessage(error, '保存集合失败。')
      showToastMessage(message, 'error')
    }
  }

  const handlePersistCollections = async () => {
    try {
      const result = await persistCollectionTree()

      if (result.status === 'invalid-target') {
        showToastMessage('不能把集合拖拽到自己的子集合下。', 'error')
      }
      // 成功时不弹提示，避免平级微调时频繁打扰
    } catch (error) {
      showToastMessage(getApiErrorMessage(error, '更新集合结构失败。'), 'error')
    }
  }

  const openCreateSnippetDialog = () => {
    snippetDialogMode.value = 'create'
    editingSnippet.value = null
    snippetDialogOpen.value = true
  }

  const openEditSnippetDialog = (snippet: KnowledgeSnippet) => {
    snippetDialogMode.value = 'edit'
    editingSnippet.value = snippet
    snippetDialogOpen.value = true
  }

  const saveSnippet = async (payload: {
    name: string
    description: string | null
    collectionId: string | null
    language: string
    content: string
    displayAttrs: Record<string, unknown>
    tags: string[]
    favorite: boolean
  }) => {
    snippetDialogSaving.value = true

    try {
      const result =
        snippetDialogMode.value === 'create'
          ? await createKnowledgeSnippet(payload)
          : await updateKnowledgeSnippet(editingSnippet.value?.id || '', payload)

      pendingSelectSnippetId.value = result.id
      snippetDialogOpen.value = false
      showToastMessage(
        snippetDialogMode.value === 'create' ? '片段已创建。' : '片段已更新。',
        'success'
      )
      await Promise.all([loadSnippets(), loadTags()])
    } catch (error) {
      showToastMessage(getApiErrorMessage(error, '保存代码片段失败。'), 'error')
    } finally {
      snippetDialogSaving.value = false
    }
  }

  const askDeleteSnippet = (snippet: KnowledgeSnippet) => {
    confirmState.value = {
      open: true,
      title: '删除代码片段',
      message: `将永久删除「${snippet.name}」，删除后无法恢复。`,
      danger: true,
      onConfirm: async () => {
        try {
          await deleteKnowledgeSnippet(snippet.id)
          showToastMessage('代码片段已删除。', 'success')
          await Promise.all([loadSnippets(), loadTags()])
        } catch (error) {
          showToastMessage(getApiErrorMessage(error, '删除代码片段失败。'), 'error')
        }
      },
    }
  }

  const toggleFavorite = async (snippet: KnowledgeSnippet) => {
    try {
      await updateKnowledgeSnippet(snippet.id, {
        favorite: !snippet.favorite,
      })
      pendingSelectSnippetId.value = snippet.id
      showToastMessage(snippet.favorite ? '已取消收藏。' : '已加入收藏。', 'success')
      await loadSnippets()
    } catch (error) {
      showToastMessage(getApiErrorMessage(error, '更新收藏状态失败。'), 'error')
    }
  }

  /** 把单份源码展开占位符后输出（无占位符则原样返回）。 */
  const resolveFileCode = (language: string, content: string) => {
    const defs = extractSnippetPlaceholderDefs(content, language)
    if (defs.length === 0) {
      return content
    }
    return expandSnippetTemplate(content, buildSnippetPlaceholderValues(defs), language)
  }

  /** 构造复制文本：多文件按文件拼接，单文件直接展开占位符，避免复制后不可用。 */
  const buildCopyText = (snippet: KnowledgeSnippet): string => {
    const files = snippet.displayAttrs?.files

    if (files && files.length > 0) {
      return files
        .map((file) => `// ${file.name}\n${resolveFileCode(file.language, file.code)}`)
        .join('\n\n')
    }

    return resolveFileCode(snippet.language, snippet.content)
  }

  const copySnippetCode = async (snippet: KnowledgeSnippet, textOverride?: string) => {
    try {
      await navigator.clipboard.writeText(textOverride ?? buildCopyText(snippet))
      showToastMessage(`已复制「${snippet.name}」代码。`, 'success')
      // 记录使用次数，驱动“最近使用”排序（fire-and-forget，失败不影响复制）。
      // recordUse 要求登录：匿名用户复制代码时不调用，避免 401 触发跳转登录页。
      if (authStore.isLoggedIn) {
        void recordKnowledgeSnippetUse(snippet.id).catch(() => undefined)
      }
    } catch (error) {
      logger.error('use-knowledge-snippets-page', '复制片段失败:', error)
      showToastMessage('复制失败，请稍后重试。', 'error')
    }
  }

  return {
    collections,
    collectAllCollectionIds,
    loadingCollections,
    collectionError,
    expandedCollectionIds,
    draggedCollectionId,
    collectionDialog,
    collectionDialogSaving,
    visibleCollections,
    keyword,
    selectedCollectionId,
    selectedTag,
    favoritesOnly,
    sort,
    page,
    pageSize,
    total,
    totalPages,
    snippets,
    selectedLanguage,
    languages,
    clearFilters,
    loadingSnippets,
    snippetError,
    selectedSnippetId,
    pendingSelectSnippetId,
    selectedSnippet,
    selectedSnippetPreviewHtml,
    stats,
    tags,
    loadingTags,
    tagError,
    snippetDialogOpen,
    snippetDialogMode,
    editingSnippet,
    snippetDialogSaving,
    confirmState,
    showToast,
    toastMessage,
    toastType,
    showToastMessage,
    refreshAll,
    loadTags,
    askDeleteCollection,
    handleSubmitCollectionDialog,
    handlePersistCollections,
    openCreateSnippetDialog,
    openEditSnippetDialog,
    saveSnippet,
    askDeleteSnippet,
    toggleFavorite,
    copySnippetCode,
    isLoggedIn,
    openCreateCollectionDialog,
    openEditCollectionDialog,
    submitCollectionDialog,
    toggleCollectionExpanded,
    loadCollections,
    loadSnippets,
    loadMore,
    setPageSize,
  }
}
