import { type Ref } from 'vue'
import { useClipboard } from '@vueuse/core'
import { useToast } from '@/composables/useToast'

export interface UseCopyReturn {
  /** 复制文本到剪贴板 */
  copy: (text: string) => Promise<void>
  /** 是否最近复制成功（2s 后自动重置） */
  copied: Ref<boolean>
  /** 当前浏览器是否支持剪贴板 API（含降级） */
  isSupported: Ref<boolean>
}

/**
 * 复制到剪贴板 composable
 *
 * 基于 @vueuse/core useClipboard：
 * - 优先使用 navigator.clipboard.writeText
 * - 不支持时 useClipboard 内部降级 document.execCommand('copy')（legacy: true）
 * - 成功/失败通过 xiaoye-ui useToast 反馈
 * - copied 状态在 2s 后自动重置（useClipboard 的 copiedDuring）
 *
 * @example
 * const { copy, copied } = useCopy()
 * await copy('hello')
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

  async function copy(text: string): Promise<void> {
    if (!text) {
      toast.warning('没有可复制的内容')
      return
    }

    try {
      await nativeCopy(text)
      toast.success('已复制')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '复制失败'
      toast.error(`复制失败：${msg}`)
    }
  }

  return {
    copy,
    copied,
    isSupported,
  }
}
