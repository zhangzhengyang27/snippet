import { getCurrentScope, onScopeDispose, ref, watch, type Ref, type WatchSource } from 'vue'
import type { ResourceFetchResult } from '@/types/refactor'

export interface UseResourceFetchOptions<T> {
  /** 是否立即执行，默认 true */
  immediate?: boolean
  /** 监听源变化时自动重新加载 */
  watch?: WatchSource | WatchSource[]
  /** 错误回调 */
  onError?: (e: Error) => void
  /** 成功回调 */
  onSuccess?: (data: T) => void
  /** 初始数据 */
  initial?: T
}

/**
 * 通用资源加载 composable
 *
 * 设计参考 @vueuse/core useAsyncState，但增加 last-request-wins 竞态保护：
 * 当并发触发多次加载时，仅最新一次请求的结果会写入 data。
 * 适用于路由参数切换、防抖搜索等可能触发并发请求的场景。
 *
 * @example
 * const { data, loading, error, refresh } = useResourceFetch(
 *   (signal) => fetchExample(id, signal),
 *   { watch: () => route.params.id }
 * )
 */
export function useResourceFetch<T>(
  fetcher: (signal?: AbortSignal) => Promise<T>,
  options: UseResourceFetchOptions<T> = {}
): ResourceFetchResult<T> {
  const data = ref(options.initial ?? null) as Ref<T | null>
  const loading = ref(false)
  const error: Ref<Error | null> = ref(null)

  let requestId = 0
  let abortController: AbortController | null = null

  async function run(): Promise<void> {
    // 取消前一个请求
    if (abortController) {
      abortController.abort()
    }
    abortController = new AbortController()
    const currentRequestId = ++requestId

    loading.value = true
    error.value = null

    try {
      const result = await fetcher(abortController.signal)

      // 竞态保护：仅最新请求的结果才会更新 state
      if (currentRequestId !== requestId) return

      data.value = result
      options.onSuccess?.(result)
    } catch (e) {
      // 竞态保护：过期请求的错误不更新 state
      if (currentRequestId !== requestId) return

      // AbortError 通常由竞态取消触发，不视为真实错误
      if (e instanceof DOMException && e.name === 'AbortError') return

      const err = e instanceof Error ? e : new Error(String(e))
      error.value = err
      options.onError?.(err)
    } finally {
      // 仅最新请求才会清除 loading
      if (currentRequestId === requestId) {
        loading.value = false
      }
    }
  }

  // 立即执行
  if (options.immediate !== false) {
    void run()
  }

  // 监听源变化时自动重新加载
  if (options.watch) {
    watch(options.watch, () => void run())
  }

  // 组件卸载 / effect scope 销毁时中止在途请求。缺这一步会有两个后果：
  //   1) 请求继续悬挂到超时（占用连接，而组件早已不可见）
  //   2) 卸载后回调仍可能写入 data / loading，Vue 会对已销毁实例告警
  // 放在 scope 判断内，是因为该 composable 也可能在组件外被调用。
  if (getCurrentScope()) {
    onScopeDispose(() => {
      requestId++ // 让在途请求的返回被判为过期，不再写入 state
      abortController?.abort()
      abortController = null
      loading.value = false
    })
  }

  return {
    data,
    loading,
    error,
    refresh: run,
    execute: run,
  }
}
