import { useStorage } from '@vueuse/core'
import { useResourceFetch } from '@/composables/useResourceFetch'
import { getExamples } from '@/api/examples'
import type { CodeExample } from '@/types'

const MAX_RECENT = 12
const STORAGE_KEY = 'devcanvas-recent-examples'

const recentIds = useStorage<string[]>(STORAGE_KEY, [])

export function useRecentExamples() {
  function addRecentExample(id: string): void {
    if (!id) return
    const list = recentIds.value.filter((item) => item !== id)
    list.unshift(id)
    recentIds.value = list.slice(0, MAX_RECENT)
  }

  function removeRecentExample(id: string): void {
    if (!id) return
    recentIds.value = recentIds.value.filter((item) => item !== id)
  }

  function clearRecentExamples(): void {
    recentIds.value = []
  }

  // 加载最近浏览的示例详情（按 ids 批量查询）
  const { data, loading, error, refresh } = useResourceFetch<CodeExample[]>(
    async () => {
      if (recentIds.value.length === 0) return []
      const res = await getExamples({ ids: recentIds.value, limit: 100 })
      return res.data
    },
    { immediate: false }
  )

  /**
   * 加载最近浏览的示例详情
   * @param limit 限制返回条数（默认返回全部）
   */
  async function loadRecentExamples(limit?: number): Promise<void> {
    if (recentIds.value.length === 0) {
      data.value = []
      return
    }
    await refresh()
    if (limit && data.value && data.value.length > limit) {
      data.value = data.value.slice(0, limit)
    }
  }

  return {
    // 原有 API（保留）
    ids: recentIds,
    addRecentExample,
    removeRecentExample,
    clearRecentExamples,
    // 新增：最近浏览示例详情加载
    examples: data,
    loading,
    error,
    /** 重新加载最近浏览示例（无参，等价于 loadRecentExamples()） */
    reload: () => loadRecentExamples(),
    /** 加载最近浏览示例详情，可指定 limit 限制条数 */
    loadRecentExamples,
  }
}
