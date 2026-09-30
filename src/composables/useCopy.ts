import { type Ref } from 'vue'
import { useClipboard } from '@vueuse/core'
import { useToast } from '@/composables/useToast'

export interface UseCopyOptions {
  /**
   * 为 true 时不自动弹 toast，由调用方根据返回值自行反馈。
   * 适用于需要自定义提示文案（如带上片段名）的场景。
   */
  silent?: boolean
}

export interface UseCopyReturn {
  /**
   * 复制文本到剪贴板。
   * @returns 是否复制成功 —— 调用方可据此决定后续反馈。
   */
  copy: (text: string, opts?: UseCopyOptions) => Promise<boolean>
  /** 是否最近复制成功（2s 后自动重置） */
  copied: Ref<boolean>
  /** 当前浏览器是否支持剪贴板 API（含降级） */
  isSupported: Ref<boolean>
}

/**
 * 复制到剪贴板 composable —— 全应用唯一的复制实现。
 *
 * 基于 @vueuse/core 的 useClipboard：
 * - 优先 `navigator.clipboard.writeText`
 * - **不支持时自动降级** `document.execCommand('copy')`（`legacy: true`）
 * - 成功/失败默认通过 useToast 反馈；传 `{ silent: true }` 可自行反馈
 * - `copied` 状态 2s 后自动重置（`copiedDuring`）
 *
 * ⚠️ 不要绕过本 composable 直接用 `navigator.clipboard`：
 * 该 API 只在安全上下文（HTTPS / localhost）可用，其它环境下它是 `undefined`。
 * 直接调用会抛 `TypeError`；若调用点写在 `.then()` 之前（无 try/catch），
 * 就是**未捕获异常**；即使有 catch，也只是「永远复制失败」而没有降级。
 *
 * @example
 * const { copy } = useCopy()
 * await copy('hello')                            // 自动提示「已复制」
 * const ok = await copy(text, { silent: true })  // 自行提示
 */
export function useCopy(): UseCopyReturn {
  const { toast } = useToast()

  const {
    copy: nativeCopy,
    copied,
    isSupported,
  } = useClipboard({
    legacy: true,
    copiedDuring: 2000,
  })

  async function copy(text: string, opts?: UseCopyOptions): Promise<boolean> {
    const silent = opts?.silent ?? false

    if (!text) {
      if (!silent) toast.warning('没有可复制的内容')
      return false
    }

    try {
      await nativeCopy(text)
      if (!silent) toast.success('已复制')
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : '复制失败'
      if (!silent) toast.error(`复制失败：${msg}`)
      return false
    }
  }

  return {
    copy,
    copied,
    isSupported,
  }
}
