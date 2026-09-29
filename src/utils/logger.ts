/**
 * 统一日志单例。
 *
 * 各模块通过 logger.<level>(scope, ...args) 输出日志；scope 为来源模块标识
 * （如 'sfcRuntime'、'highlighter'、'use-knowledge-snippets-page'），输出时统一
 * 加 `[scope]` 前缀，便于在控制台按来源过滤。
 *
 * 幸存调用点（sfcRuntime / sfc-modules / highlighter / useKnowledgeSnippetsPage）
 * 只用到 warn / error，且除消息外还会追加 Error 对象或附加对象等任意实参，
 * 故各方法签名为 (scope: string, ...args: unknown[])；
 * debug / info 为补全的常规等级，其中 debug 仅在开发环境输出。
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** 仅 debug 等级受开发环境开关约束，避免生产环境日志噪音。 */
const isDevEnvironment = Boolean(import.meta.env?.DEV)

function emit(level: LogLevel, scope: string, args: unknown[]): void {
  if (level === 'debug' && !isDevEnvironment) return
  console[level](`[${scope}]`, ...args)
}

export const logger = {
  /** 调试日志：仅开发环境输出，生产环境静默。 */
  debug(scope: string, ...args: unknown[]): void {
    emit('debug', scope, args)
  },

  /** 常规信息日志。 */
  info(scope: string, ...args: unknown[]): void {
    emit('info', scope, args)
  },

  /** 警告日志：不影响流程，但需要关注。 */
  warn(scope: string, ...args: unknown[]): void {
    emit('warn', scope, args)
  },

  /** 错误日志。 */
  error(scope: string, ...args: unknown[]): void {
    emit('error', scope, args)
  },
}
