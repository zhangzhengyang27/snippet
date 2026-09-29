import { computed, ref, watch, type Ref } from 'vue'

export interface UsePaginationOptions {
  /** 总条数（响应式） */
  total: Ref<number>
  /** 每页条数，默认 24 */
  pageSize?: number
  /** 初始页码，默认 1 */
  initialPage?: number
  /** 当 total 或 pageSize 变化时是否重置到第 1 页，默认 true */
  resetOnTotalChange?: boolean
}

export interface UsePaginationReturn {
  /** 当前页码 */
  page: Ref<number>
  /** 每页条数 */
  pageSize: Ref<number>
  /** 总页数（向上取整，至少为 1） */
  totalPages: Ref<number>
  /** 跳转到指定页（自动 clamp） */
  setPage: (n: number) => void
  /** 修改每页条数，并自动回到第 1 页 */
  setPageSize: (n: number) => void
  /** 重置到第 1 页 */
  reset: () => void
}

/**
 * 分页状态管理 composable
 *
 * 项目统一分页方案：
 * - UI 组件使用 `src/components/layout/Pagination.vue`（内部基于 xiaoye-ui Pagination，
 *   样式已覆盖为项目设计 token）
 * - 状态管理使用本 composable
 *
 * 用法：
 * ```vue
 * const { page, totalPages, pageSize, setPage, setPageSize } = usePagination({ total, pageSize: 24 })
 *
 * <Pagination
 *   v-model:page="page"
 *   v-model:page-size="pageSize"
 *   :total-pages="totalPages"
 *   :total="total"
 * />
 * ```
 */
export function usePagination(options: UsePaginationOptions): UsePaginationReturn {
  const { total, pageSize: pageSizeValue = 24, initialPage = 1 } = options
  const resetOnTotalChange = options.resetOnTotalChange ?? true

  const page = ref(initialPage)
  const pageSize = ref(pageSizeValue)

  const totalPages = computed(() => {
    if (total.value <= 0) return 1
    return Math.max(1, Math.ceil(total.value / pageSize.value))
  })

  // 当 total 或 pageSize 变化时，自动 clamp 当前页；可选重置到第 1 页
  watch(
    [total, pageSize],
    () => {
      if (resetOnTotalChange) {
        page.value = 1
        return
      }
      if (page.value > totalPages.value) {
        page.value = totalPages.value
      }
    },
    { flush: 'sync' }
  )

  function setPage(n: number): void {
    const next = Math.max(1, Math.min(totalPages.value, Math.floor(n)))
    if (next !== page.value) {
      page.value = next
    }
  }

  function setPageSize(n: number): void {
    const next = Math.max(1, Math.floor(n))
    if (next !== pageSize.value) {
      pageSize.value = next
      page.value = 1
    }
  }

  function reset(): void {
    page.value = 1
  }

  return {
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    reset,
  }
}
