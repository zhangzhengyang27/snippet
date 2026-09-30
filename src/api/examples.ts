import { get, patch } from './client'
import type { RequestOptions } from './client'
import type { CodeExample } from '@/types'

/**
 * 示例列表查询参数。
 * 与服务端 GET /examples 的 query 一一对应；undefined 的字段不会拼入查询串。
 */
export interface ExampleListParams {
  /** 按主题 slug 过滤 */
  topicSlug?: string
  /** 按分类 slug 过滤 */
  categorySlug?: string
  /** 关键字搜索（标题 / 描述 / 标签） */
  search?: string
  /** 是否仅交互式演示 */
  isInteractive?: boolean
  /** 按来源文件前缀过滤 */
  sourceFilePrefix?: string
  /** 按来源分组过滤 */
  sourceGroup?: string
  /** 按 id 批量查询（多个 id 以逗号拼接后传给后端） */
  ids?: string[]
  /** 页码，从 1 开始 */
  page?: number
  /** 每页条数 */
  limit?: number
}

/** 示例列表的分页信息。 */
export interface ExamplePagination {
  page: number
  limit: number
  total: number
  /** 总页数（恢复推断） */
  totalPages: number
}

/** GET /examples 的响应：数据 + 分页信息。 */
export interface ExampleListResult {
  data: CodeExample[]
  pagination: ExamplePagination
}

/**
 * 获取示例列表（公共接口，无需登录）。
 *
 * @param options.signal 取消信号。约定：**必须透传给底层 `get`**，否则
 *   `useResourceFetch` 的取消能力对该请求无效。
 */
export function getExamples(
  params?: ExampleListParams,
  options?: RequestOptions
): Promise<ExampleListResult> {
  return get<ExampleListResult>(
    '/examples',
    {
      topicSlug: params?.topicSlug,
      categorySlug: params?.categorySlug,
      search: params?.search,
      isInteractive: params?.isInteractive,
      sourceFilePrefix: params?.sourceFilePrefix,
      sourceGroup: params?.sourceGroup,
      ids: params?.ids?.length ? params.ids.join(',') : undefined,
      page: params?.page,
      limit: params?.limit,
    },
    options
  )
}

/**
 * 获取单个示例详情（公共接口；不存在时后端返回 404）。
 */
export function getExampleById(id: string): Promise<CodeExample> {
  return get<CodeExample>(`/examples/${encodeURIComponent(id)}`)
}

/**
 * 更新示例（标题 / 正文 html/css/js 等可部分提交）。
 */
export function updateExample(id: string, payload: Partial<CodeExample>): Promise<CodeExample> {
  return patch<CodeExample>(`/examples/${encodeURIComponent(id)}`, payload)
}
