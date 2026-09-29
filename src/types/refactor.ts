/**
 * 重构辅助类型：为从组件中下沉的通用 composables 提供返回值 / 约束形状。
 * 使用点：composables/useListFilter.ts、composables/useResourceFetch.ts。
 */
import type { Ref } from 'vue'

/**
 * 列表筛选状态的最小约束。
 *
 * useListFilter 的泛型参数 `T extends ListFilterState`，composable 内部：
 * - 会向 `filters.search` 写入空串（clearAll），因此 search 必须是可写 string；
 * - 会以 string 下标读取任意字段（URL 同步），因此需要索引签名
 *   （恢复推断：值类型涵盖筛选框常见的 string / number / boolean 与空值）。
 */
export interface ListFilterState {
  /** 关键字搜索（clearAll 时会被置空） */
  search: string
  /** 其余筛选字段（category / group / status 等，由调用方扩展） */
  [key: string]: string | number | boolean | null | undefined
}

/**
 * useResourceFetch 的返回值：带竞态保护的异步资源状态。
 * data 初始为 null，仅最新一次请求的结果会写入；AbortError 不计入 error。
 */
export interface ResourceFetchResult<T> {
  /** 请求结果；未加载或加载失败时为 null */
  data: Ref<T | null>
  /** 是否加载中 */
  loading: Ref<boolean>
  /** 最近一次请求的错误；无错误时为 null */
  error: Ref<Error | null>
  /** 重新发起请求（与 execute 等价） */
  refresh: () => Promise<void>
  /** 手动执行请求 */
  execute: () => Promise<void>
}
