/** 封装片段搜索相关组合式状态与交互逻辑。 */

import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import { listKnowledgeSnippets } from '@/api/knowledge-snippets'

/**
 * 提供片段搜索输入与延迟查询能力。
 */
export function useSnippetSearch(options: { open: () => boolean }) {
  const keyword = ref('')
  const loading = ref(false)
  const errorMessage = ref('')
  const items = ref<KnowledgeSnippet[]>([])
  const selectedId = ref('')
  const searchTimer = ref<number | null>(null)

  const selectedSnippet = computed(
    () => items.value.find((item) => item.id === selectedId.value) || null
  )

  const loadSnippets = async () => {
    loading.value = true
    errorMessage.value = ''

    try {
      const result = await listKnowledgeSnippets({
        q: keyword.value.trim() || undefined,
        page: 1,
        pageSize: 30,
      })

      items.value = result.items

      if (!result.items.some((item) => item.id === selectedId.value)) {
        selectedId.value = result.items[0]?.id || ''
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载代码片段失败。'
    } finally {
      loading.value = false
    }
  }

  watch(
    () => options.open(),
    (open) => {
      if (!open) {
        keyword.value = ''
        items.value = []
        selectedId.value = ''
        errorMessage.value = ''
        loading.value = false
        return
      }

      void loadSnippets()
    }
  )

  watch(
    () => keyword.value,
    () => {
      if (!options.open()) {
        return
      }

      if (searchTimer.value !== null) {
        window.clearTimeout(searchTimer.value)
      }

      searchTimer.value = window.setTimeout(() => {
        void loadSnippets()
      }, 220)
    }
  )

  onBeforeUnmount(() => {
    if (searchTimer.value !== null) {
      window.clearTimeout(searchTimer.value)
    }
  })

  return {
    keyword,
    loading,
    errorMessage,
    items,
    selectedId,
    selectedSnippet,
    loadSnippets,
  }
}
