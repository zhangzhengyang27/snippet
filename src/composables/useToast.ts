import type { AppContext } from 'vue'
import { getCurrentInstance } from 'vue'
import { ElMessage } from 'element-plus'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  duration?: number
}

interface MessageApi {
  success(content: string, duration?: number): void
  error(content: string, duration?: number): void
  warning(content: string, duration?: number): void
  info(content: string, duration?: number): void
}

// 模块顶层缓存 appContext，解决 getCurrentInstance() 在事件回调/async/setTimeout 中返回 null 的问题
let cachedAppContext: AppContext | null = null

// Element Plus 的 message 挂载在 body 上，暗色由 html.dark 的 EP css-vars 驱动。
let appMessageApi: MessageApi | null = null

/**
 * 初始化 toast 模块（在 main.ts 中 app.mount 之前调用）。
 * 缓存 appContext 后，toast 可在任意上下文中使用（事件回调/Promise/setTimeout）。
 */
export function initToast(appContext: AppContext): void {
  cachedAppContext = appContext
}

/**
 * 注册 xy-app 上下文中的 message api（AppBridge 挂载时调用）。
 * 注册后 toast 走主题感知的实例，静态 $message 仅在未注册时回退使用。
 */
export function registerToastApi(api: MessageApi): void {
  appMessageApi = api
}

function resolveAppContext(): AppContext | null {
  // 优先使用缓存的 appContext（覆盖事件回调/async/setTimeout 场景）
  if (cachedAppContext) return cachedAppContext
  // 回退到 getCurrentInstance（覆盖 setup 同步执行场景）
  const instance = getCurrentInstance()
  return instance?.appContext ?? null
}

function resolveFallbackApi(): MessageApi | null {
  const appContext = resolveAppContext()
  if (!appContext) return null
  return (appContext.config.globalProperties as { $message?: MessageApi }).$message ?? null
}

function show(
  severity: 'success' | 'info' | 'warn' | 'error',
  message: string,
  opts?: ToastOptions
) {
  void appMessageApi
  void resolveFallbackApi
  ElMessage({
    type: severity === 'warn' ? 'warning' : severity,
    message,
    duration: (opts?.duration ?? 3) * 1000,
  })
}

export const toast = {
  success: (message: string, opts?: ToastOptions) => show('success', message, opts),
  error: (message: string, opts?: ToastOptions) => show('error', message, opts),
  warning: (message: string, opts?: ToastOptions) => show('warn', message, opts),
  info: (message: string, opts?: ToastOptions) => show('info', message, opts),
}

export function useToast() {
  return { toast }
}
