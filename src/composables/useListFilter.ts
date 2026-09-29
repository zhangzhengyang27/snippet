import { reactive, ref, watch, type Ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import type { ListFilterState } from '@/types/refactor'

export interface UseListFilterOptions<T extends ListFilterState> {
  /** 初始筛选状态 */
  initial: T
  /** 防抖时长（ms），默认 300 */
  debounce?: number
  /** 是否同步到 URL query，默认 true */
  syncUrl?: boolean
  /** 字段名 → URL query key 映射；未映射的字段不同步 */
  urlKeys?: Partial<Record<keyof T, string>>
}

export interface UseListFilterReturn<T extends ListFilterState> {
  /** 实时筛选状态（用户输入即时更新） */
  filters: T
  /** 防抖后的筛选状态（用于触发查询） */
  debouncedFilters: Readonly<Ref<T>>
  /** 重置为初始状态 */
  reset: () => void
  /** 清空所有字段（search 置空，其他字段保持初始值） */
  clearAll: () => void
}

/**
 * 列表筛选状态管理 composable
 *
 * 基于 @vueuse/core watchDebounced + useUrlSearchParams：
 * - 实时 filters 即时响应用户输入
 * - debouncedFilters 在用户停止输入 300ms 后更新，用于触发查询
 * - 可选 syncUrl 将筛选状态同步到 URL query，刷新/分享可恢复
 *
 * @example
 * const { filters, debouncedFilters, reset } = useListFilter({
 *   initial: { search: '', category: '', group: '' },
 *   syncUrl: true,
 *   urlKeys: { search: 'q', category: 'cat', group: 'grp' },
 * })
 */
export function useListFilter<T extends ListFilterState>(
  options: UseListFilterOptions<T>
): UseListFilterReturn<T> {
  const { initial, debounce = 300, syncUrl = true, urlKeys } = options

  // 初始化时优先从 URL 恢复
  function resolveInitial(): T {
    if (!syncUrl || !urlKeys) return { ...initial }
    const params = new URLSearchParams(window.location.search)
    const merged = { ...initial }
    for (const field of Object.keys(urlKeys) as (keyof T)[]) {
      const urlKey = urlKeys[field]
      if (!urlKey) continue
      const urlValue = params.get(urlKey)
      if (urlValue !== null) {
        ;(merged as Record<string, unknown>)[field as string] = urlValue
      }
    }
    return merged
  }

  const filters = reactive(resolveInitial()) as T
  const debouncedFilters = ref({ ...filters }) as Ref<T>

  // watchDebounced：监听 filters 所有字段变化，防抖后写入 debouncedFilters
  watchDebounced(
    () => ({ ...filters }) as T,
    (val) => {
      debouncedFilters.value = val
    },
    { debounce, deep: true }
  )

  // URL 同步：debouncedFilters 变化时写回 URL
  if (syncUrl && urlKeys) {
    watch(
      debouncedFilters,
      (val) => {
        const params = new URLSearchParams(window.location.search)
        for (const field of Object.keys(urlKeys) as (keyof T)[]) {
          const urlKey = urlKeys[field]
          if (!urlKey) continue
          const fieldValue = val[field as string]
          if (fieldValue === undefined || fieldValue === '' || fieldValue === null) {
            params.delete(urlKey)
          } else {
            params.set(urlKey, String(fieldValue))
          }
        }
        const newSearch = params.toString()
        const currentSearch = window.location.search.replace(/^\?/, '')
        if (newSearch !== currentSearch) {
          const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`
          window.history.replaceState(null, '', newUrl)
        }
      },
      { deep: true }
    )
  }

  function reset(): void {
    for (const key of Object.keys(initial)) {
      ;(filters as Record<string, unknown>)[key] = (initial as Record<string, unknown>)[key]
    }
  }

  function clearAll(): void {
    filters.search = ''
    for (const key of Object.keys(initial)) {
      if (key === 'search') continue
      ;(filters as Record<string, unknown>)[key] = (initial as Record<string, unknown>)[key]
    }
  }

  return {
    filters,
    debouncedFilters,
    reset,
    clearAll,
  }
}
