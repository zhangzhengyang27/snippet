/**
 * 管理短暂提示消息的显示状态、类型与自动清理逻辑。
 */
import { onBeforeUnmount, ref } from 'vue'

type ToastType = 'success' | 'error' | 'info'

/**
 * 提供短暂状态提示的显示与自动关闭能力。
 */
export const useTransientToast = (duration = 1800) => {
  const showToast = ref(false)
  const toastMessage = ref('')
  const toastType = ref<ToastType>('success')
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  const clearToastTimer = () => {
    if (toastTimer) {
      clearTimeout(toastTimer)
      toastTimer = null
    }
  }

  const showToastMessage = (message: string, type: ToastType = 'success') => {
    clearToastTimer()
    toastMessage.value = message
    toastType.value = type
    showToast.value = true

    toastTimer = setTimeout(() => {
      showToast.value = false
      toastTimer = null
    }, duration)
  }

  const hideToast = () => {
    clearToastTimer()
    showToast.value = false
  }

  onBeforeUnmount(() => {
    clearToastTimer()
  })

  return {
    showToast,
    toastMessage,
    toastType,
    showToastMessage,
    hideToast,
  }
}
