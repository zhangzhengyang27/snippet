import { ElMessage } from 'element-plus'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  duration?: number
}

/**
 * 轻量 toast 封装。
 *
 * 直接调用 Element Plus 的 `ElMessage` —— 它把消息挂到 body 上，暗色由 `html.dark`
 * 上的 EP css-vars 驱动，因此**不依赖 app 实例**，在事件回调 / async / setTimeout
 * 里都能正常使用，不需要缓存 AppContext。
 *
 * 历史注记：早期实现走 `app.config.globalProperties.$message`，为此需要
 * `initToast(app._context)` 缓存上下文、并靠 AppBridge 组件在挂载时
 * `registerToastApi()` 注册主题感知实例。这套机制已全部移除，原因有三：
 *   1. `AppBridge.vue` 在 UI 库迁移（e3bf116）时被删除，registerToastApi 再无调用方；
 *   2. 实际发送路径一直是 `ElMessage(...)` 直调，`$message` 回退分支被 `void` 显式废弃；
 *   3. `app.use(ElementPlus)` 已改为按需引入，`$message` 全局属性本身也不再存在。
 * 留着它会是一个「永远取不到值」的陷阱。
 */
function show(
  severity: 'success' | 'info' | 'warn' | 'error',
  message: string,
  opts?: ToastOptions
) {
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
