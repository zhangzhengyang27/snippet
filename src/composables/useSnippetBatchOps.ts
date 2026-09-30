/**
 * 片段批量操作（多选打标签 / 批量删除）。
 *
 * 从 `KnowledgeSnippetsPage.vue` 下沉 —— 该页原本同时承担布局、交互与批量业务逻辑，
 * 单文件 800+ 行。这里**只搬移逻辑，不改行为**。
 */
import { ref, type Ref } from 'vue'
import { batchAddKnowledgeSnippetTag, batchDeleteKnowledgeSnippets } from '@/api/knowledge-snippets'
import { getApiErrorMessage } from '@/api/client'
import { toast } from '@/composables/useToast'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'

export interface UseSnippetBatchOpsOptions {
  /** 当前列表，用于「全选本页」 */
  snippets: Ref<KnowledgeSnippet[]>
  /** 批量操作成功后刷新列表 */
  refresh: () => Promise<void> | void
}

export function useSnippetBatchOps(options: UseSnippetBatchOpsOptions) {
  const { snippets, refresh } = options

  const batchMode = ref(false)
  const selectedIds = ref<string[]>([])

  function handleToggleCheck(id: string) {
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter((x) => x !== id)
    } else {
      selectedIds.value = [...selectedIds.value, id]
    }
  }

  function selectAllOnPage() {
    const pageIds = snippets.value.map((s) => s.id)
    const merged = Array.from(new Set([...selectedIds.value, ...pageIds]))
    selectedIds.value = merged
  }

  function clearSelection() {
    selectedIds.value = []
  }

  const batchTagOpen = ref(false)
  const batchTagValue = ref('')
  const batchTagSaving = ref(false)

  async function confirmBatchTag() {
    const tag = batchTagValue.value.trim()
    if (!tag || !selectedIds.value.length) return
    batchTagSaving.value = true
    try {
      const result = await batchAddKnowledgeSnippetTag(selectedIds.value, tag)
      batchTagOpen.value = false
      batchTagValue.value = ''
      const missingNote = result.missing.length
        ? `，${result.missing.length} 条不存在或无权操作`
        : ''
      toast.success(
        result.updated > 0
          ? `已为 ${result.updated} 条片段添加标签「${tag}」${missingNote}`
          : `没有需要更新的片段（可能均已拥有该标签）${missingNote}`
      )
      await refresh()
    } catch (err) {
      toast.error(getApiErrorMessage(err, '批量加标签失败'))
    } finally {
      batchTagSaving.value = false
    }
  }

  const batchDeleting = ref(false)

  async function handleBatchDelete() {
    if (!selectedIds.value.length) return
    if (!window.confirm(`确认删除选中的 ${selectedIds.value.length} 条片段？该操作不可恢复。`)) {
      return
    }
    batchDeleting.value = true
    try {
      const result = await batchDeleteKnowledgeSnippets(selectedIds.value)
      if (result.deleted > 0) {
        const missingNote =
          result.deleted < selectedIds.value.length
            ? `，其余 ${selectedIds.value.length - result.deleted} 条不存在或无权操作`
            : ''
        toast.success(`已删除 ${result.deleted} 条片段${missingNote}`)
      } else {
        toast.error('没有可删除的片段（可能已被删除或无权操作）')
      }
      selectedIds.value = []
      await refresh()
    } catch (err) {
      toast.error(getApiErrorMessage(err, '批量删除失败'))
    } finally {
      batchDeleting.value = false
    }
  }

  return {
    batchMode,
    selectedIds,
    handleToggleCheck,
    selectAllOnPage,
    clearSelection,
    batchTagOpen,
    batchTagValue,
    batchTagSaving,
    confirmBatchTag,
    batchDeleting,
    handleBatchDelete,
  }
}
