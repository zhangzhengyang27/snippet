/**
 * API 错误类
 */
export class ApiError extends Error {
  /** 后端返回的错误响应体（解析后的 JSON，若存在） */
  readonly body?: unknown

  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    body?: unknown
  ) {
    super(`API Error: ${status} ${statusText} - ${url}`)
    this.name = 'ApiError'
    this.body = body
  }
}

/**
 * 从 API 错误中提取可供用户阅读的错误信息。
 * 兼容后端 NestJS 返回的 `{ message: string | string[] }` 结构。
 *
 * 两条防泄漏规则（都是实测踩过的）：
 * 1. **响应体是 HTML 时不能用**。网关 / nginx / 静态服务器在 502、504、404 时
 *    返回的是整页 HTML 错误页，直接透出会让用户在界面上看到一堆标签。
 * 2. **响应体过长时不能用**。超过 200 字符基本不是给用户看的错误信息。
 *
 * 拿不到可读信息时返回 `fallback`，而不是 `API Error: 404 Not Found - /api/xxx`
 * 这种面向开发者的文本——技术细节仍在 ApiError 对象上，调用方可自行记日志。
 */
export function getApiErrorMessage(error: unknown, fallback = '请求失败'): string {
  if (error instanceof ApiError) {
    const body = error.body as { message?: string | string[] } | string | undefined

    if (typeof body === 'string') {
      const text = body.trim()
      if (text && !text.startsWith('<') && text.length <= 200) return text
    } else if (body && typeof body === 'object') {
      if (Array.isArray(body.message) && body.message.length > 0) {
        return body.message.join('；')
      }
      if (typeof body.message === 'string' && body.message) return body.message
    }

    return fallback
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}

/**
 * 通用「操作成功」响应类型。用于无具体返回数据的写操作。
 */
export interface OkResult {
  ok: boolean
}

/**
 * 通用「删除」响应类型。携带被删除资源 id（若后端返回）。
 */
export interface DeleteResult {
  ok: boolean
  id?: string
}

/**
 * HTTP 客户端配置
 */
export interface ClientConfig {
  baseURL: string
  timeout?: number
  headers?: Record<string, string>
  /** 是否为 GET 请求添加时间戳禁用缓存，默认 false */
  disableCache?: boolean
  /** GET 请求遇到 5xx/网络错误时的最大重试次数，默认 2 */
  retry?: number
}

const defaultConfig: ClientConfig = {
  // 优先读取环境变量，未配置时回退到 /api（依赖 Vite 反向代理）
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  disableCache: false,
  retry: 2,
}

let config = { ...defaultConfig }

/**
 * 认证令牌提供者。返回当前可用的访问令牌（无则返回 null/undefined）。
 * 由 authStore 在初始化时注入，使所有请求自动携带 Authorization 头。
 * 未注入或返回空值时不附加请求头（依赖后端 cookie 认证或公开接口）。
 */
let authTokenProvider: (() => string | null | undefined) | null = null

/**
 * 认证失败处理器。当请求收到 401 且刷新不可用/失败时由 client 调用，
 * 通常由 authStore 注入实现「清空会话 + 跳转登录页」。
 * 注入前 client 仅抛 ApiError，不主动触发副作用。
 */
let authFailureHandler: ((status: number) => void) | null = null

/**
 * 刷新处理器。请求收到 401 时由 client 调用（每个请求至多一次），
 * 由 authStore 注入：用 refreshToken 换新 token 并写入 store。
 * 返回新 accessToken 表示刷新成功，client 会自动重放原请求；
 * 返回 null / 抛错表示刷新失败，client 转而调用 authFailureHandler。
 */
let authRefreshHandler: (() => Promise<string | null>) | null = null

/**
 * 注入认证令牌提供者（由 authStore 调用）。
 */
export function setAuthTokenProvider(provider: () => string | null | undefined) {
  authTokenProvider = provider
}

/**
 * 注入认证失败处理器（由 authStore 调用）。
 * 传入 null 可解除已有处理器。
 */
export function setAuthFailureHandler(handler: ((status: number) => void) | null) {
  authFailureHandler = handler
}

/**
 * 注入刷新处理器（由 authStore 调用）。传入 null 可解除。
 */
export function setAuthRefreshHandler(handler: (() => Promise<string | null>) | null) {
  authRefreshHandler = handler
}

/**
 * 配置客户端
 */
export function configureClient(newConfig: Partial<ClientConfig>) {
  config = { ...config, ...newConfig }
}

/**
 * 将多个 AbortSignal 链接为一个：任一信号 abort 时合并信号也 abort。
 * 兼容不支持 AbortSignal.any 的环境（手动 addEventListener 实现）。
 */
function linkSignals(...signals: (AbortSignal | undefined | null)[]): AbortSignal {
  const filtered = signals.filter((s): s is AbortSignal => Boolean(s))
  if (filtered.length === 0) return new AbortController().signal
  if (filtered.length === 1) return filtered[0]

  // 优先用原生 AbortSignal.any
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(filtered)
  }

  // 手动 link 兜底
  const controller = new AbortController()
  for (const signal of filtered) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}

/**
 * 指数退避延迟（毫秒）。attempt 从 1 开始。
 */
function backoffDelay(attempt: number): number {
  return Math.min(500 * Math.pow(2, attempt - 1), 2000)
}

/**
 * 判断是否应该重试：仅对 GET 请求 + 5xx/网络错误重试。
 */
function shouldRetry(method: string | undefined, error: ApiError): boolean {
  if ((method ?? 'GET').toUpperCase() !== 'GET') return false
  if (error.status === 0) return true // 网络错误
  if (error.status >= 500 && error.status < 600) return true
  return false
}

/**
 * 发送 HTTP 请求
 *
 * @param endpoint API 路径（会拼接到 baseURL 之后）
 * @param options fetch init；可包含自定义 `signal` 用于外部取消
 */
export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${config.baseURL}${endpoint}`
  const method = options.method ?? 'GET'
  const maxRetry = config.retry ?? 0
  const timeout = config.timeout ?? defaultConfig.timeout

  let refreshedOnce = false
  let attempt = 0

  while (true) {
    // 每次尝试新建超时 controller，避免上次的重试 timer 影响本次
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout)

    try {
      return await doRequest<T>(url, method, options, timeoutController.signal)
    } catch (error) {
      const apiError = toApiError(error, url)

      // 401：先尝试刷新 token 重放（刷新接口自身 401 除外，防止递归）。
      // 重放通过 while 循环实现：doRequest 每次尝试都会重新读取 authTokenProvider，
      // 刷新成功后下一次迭代自然携带新 token。
      if (
        apiError.status === 401 &&
        authRefreshHandler &&
        !refreshedOnce &&
        !url.endsWith('/auth/refresh')
      ) {
        refreshedOnce = true
        let newToken: string | null = null
        try {
          newToken = await authRefreshHandler()
        } catch {
          newToken = null
        }
        if (newToken) continue
      }

      // 401（且刷新不可用或失败）：触发认证失败处理器（如清空会话 + 跳登录）。
      // 403 属于「已认证但无权限」，会话本身有效，不再触发登出跳转，
      // 避免访问无权限资源时被误登出。
      if (apiError.status === 401) {
        try {
          authFailureHandler?.(apiError.status)
        } catch {
          // 处理器本身异常不影响错误抛出
        }
        throw apiError
      }

      // 可重试且仍有剩余次数：指数退避后进入下一次迭代
      if (shouldRetry(method, apiError) && attempt < maxRetry) {
        attempt++
        await sleep(backoffDelay(attempt))
        continue
      }
      throw apiError
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * 单次请求执行（不处理重试），成功返回解析结果，失败抛 ApiError。
 */
async function doRequest<T>(
  url: string,
  method: string,
  options: RequestInit,
  timeoutSignal: AbortSignal
): Promise<T> {
  const authToken = authTokenProvider ? authTokenProvider() : null
  const response = await fetch(url, {
    method,
    ...options,
    headers: {
      ...config.headers,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
    signal: linkSignals(timeoutSignal, options.signal),
  })

  if (!response.ok) {
    // 先读取后端错误详情，便于调用方显示具体错误信息
    let errorBody: unknown = undefined
    try {
      const errorText = await response.text()
      if (errorText) {
        try {
          errorBody = JSON.parse(errorText)
        } catch {
          errorBody = errorText
        }
      }
    } catch {
      // 响应体读取失败时忽略，仍抛出 ApiError
    }
    throw new ApiError(response.status, response.statusText, url, errorBody)
  }

  // 空响应体（如 204 No Content 或 DELETE 返回空 body）直接返回 null
  const text = await response.text()
  if (!text) {
    // 注意：调用方应将 T 声明为 T | null 以正确表达"可能为空"
    return null as T
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError(response.status, '响应体 JSON 解析失败', url, text)
  }
}

/**
 * 将任意异常统一转换为 ApiError。
 * - ApiError 原样返回
 * - AbortError（外部 signal 主动取消）转 408
 * - 其它 Error 转网络错误（status 0）
 * - 非 Error 转 Unknown error
 */
function toApiError(error: unknown, url: string): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      // 外部 signal 主动取消：不重试，直接抛 408
      return new ApiError(408, 'Request Timeout', url)
    }
    return new ApiError(0, error.message, url)
  }
  return new ApiError(0, 'Unknown error', url)
}

/** 睡眠指定毫秒 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 构建查询字符串。过滤掉 undefined 值，并将所有值转为 string。
 * 仅在结果非空时返回 `?xxx=yyy`，否则返回空字符串。
 */
function buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return ''
  const filtered: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      filtered[key] = String(value)
    }
  }
  if (Object.keys(filtered).length === 0) return ''
  return `?${new URLSearchParams(filtered).toString()}`
}

/**
 * 单个请求的可选参数。
 *
 * `signal` 用于取消请求 —— 页面迁移到 `useResourceFetch` 后，composable 会把它的
 * signal 透传下来，从而在「参数变化触发新请求」与「组件卸载」时中止旧请求。
 * 约定：**fetcher 必须把这个 signal 一路传到底**，否则取消能力形同虚设。
 */
export interface RequestOptions {
  signal?: AbortSignal
}

/**
 * GET 请求
 */
export function get<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: RequestOptions
): Promise<T> {
  // 仅在 disableCache=true 时添加时间戳防止浏览器缓存
  const cacheBust = config.disableCache ? { _t: Date.now().toString() } : undefined
  const queryString = buildQueryString({ ...params, ...cacheBust })
  return request<T>(`${endpoint}${queryString}`, { method: 'GET', signal: options?.signal })
}

/**
 * POST 请求
 */
export function post<T>(endpoint: string, data?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT 请求
 */
export function put<T>(endpoint: string, data?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PATCH 请求
 */
export function patch<T>(endpoint: string, data?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE 请求
 */
export function del<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const queryString = buildQueryString(params)
  return request<T>(`${endpoint}${queryString}`, { method: 'DELETE' })
}

/**
 * 在页面卸载（beforeunload）场景下发送 fire-and-forget 请求。
 *
 * 与 `request` 的差异：
 * - 使用 `keepalive: true`，浏览器在页面关闭后仍会尝试送达（受 64KB body 限制）
 * - 不重试、不超时、不抛错（无法被调用方处理）
 * - 不读取响应体（页面已卸载，无意义）
 *
 * 适用场景：编辑器在 beforeunload 时发送最后一次快照保存。
 * 不适用于需要响应数据或强一致性的场景。
 *
 * @returns 是否成功发起请求（不代表服务端处理成功）
 */
export function fireAndForgetKeepalive(
  endpoint: string,
  options: { method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = { method: 'POST' }
): boolean {
  try {
    const url = `${config.baseURL}${endpoint}`
    const authToken = authTokenProvider ? authTokenProvider() : null
    const headers: Record<string, string> = {
      ...config.headers,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }
    const init: RequestInit = {
      method: options.method,
      headers,
      keepalive: true,
      credentials: 'include',
    }
    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body)
    }
    void fetch(url, init).catch(() => {
      // 静默失败：fire-and-forget 语义，调用方已无法处理
    })
    return true
  } catch {
    return false
  }
}
