import { computed, onUnmounted, ref } from 'vue'
import type { CodeExample, ViewMode } from '@/types'
import { buildSrcDoc, type Snippet } from '@/utils/sandbox'
import { toast } from '@/composables/useToast'
import { useCopy } from '@/composables/useCopy'

/** Width/height pair describing the iframe dimensions for a given mode. */
interface DeviceDimensions {
  width: string
  height: string
}

/** Lookup table: view mode -> iframe dimensions. */
const DEVICE_DIMENSIONS: Record<ViewMode, DeviceDimensions> = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '667px' },
}

/**
 * Composable for managing an iframe-based example preview.
 *
 * Handles responsive device modes, fullscreen toggling, code copying,
 * refresh, and opening the preview in a new browser window.
 *
 * @param example - A reactive reference (or getter) for the currently
 *                  displayed CodeExample.
 * @param activeSnippet - A reactive reference (or getter) for the currently
 *                        selected snippet (for interactive demos).
 */
export function usePreview(
  example: CodeExample | (() => CodeExample | undefined),
  activeSnippet?: Snippet | (() => Snippet | undefined),
  overrideSrcDoc?: string | (() => string | undefined)
) {
  // ---- Resolve the current example reactively ----------------------------

  const currentExample = computed<CodeExample | undefined>(() => {
    if (typeof example === 'function') {
      return (example as () => CodeExample | undefined)()
    }
    return example as CodeExample | undefined
  })

  const currentSnippet = computed<Snippet | undefined>(() => {
    if (typeof activeSnippet === 'function') {
      return (activeSnippet as () => Snippet | undefined)()
    }
    return activeSnippet as Snippet | undefined
  })

  const effectiveOverrideSrcDoc = computed<string | undefined>(() => {
    if (typeof overrideSrcDoc === 'function') {
      return overrideSrcDoc()
    }
    return overrideSrcDoc
  })

  // ---- View mode ----------------------------------------------------------

  const viewMode = ref<ViewMode>('desktop')

  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode
  }

  // ---- Fullscreen ---------------------------------------------------------

  const isFullscreen = ref<boolean>(false)

  function toggleFullscreen(): void {
    isFullscreen.value = !isFullscreen.value
  }

  // ---- Device dimensions --------------------------------------------------

  const deviceDimensions = computed<DeviceDimensions>(() => {
    return DEVICE_DIMENSIONS[viewMode.value]
  })

  // ---- srcDoc: full HTML document for the iframe --------------------------

  const refreshKey = ref(0)

  const srcDoc = computed<string>(() => {
    // Bumping refreshKey forces recomputation
    void refreshKey.value
    if (effectiveOverrideSrcDoc.value) {
      return effectiveOverrideSrcDoc.value
    }
    const ex = currentExample.value
    if (!ex) {
      return '<!DOCTYPE html><html><body><p>No example selected.</p></body></html>'
    }
    return buildSrcDoc(ex, currentSnippet.value)
  })

  function refresh(): void {
    refreshKey.value++
  }

  // ---- Code copy -----------------------------------------------------------

  // 复制统一走 useCopy（含 navigator.clipboard 不可用时的 execCommand 降级）
  const { copy } = useCopy()

  type Tab = 'html' | 'css' | 'js'

  async function copyCode(tab: Tab): Promise<boolean> {
    const ex = currentExample.value
    if (!ex) return false

    const codeMap: Record<Tab, string | undefined> = {
      html: ex.html,
      css: ex.css,
      js: ex.js,
    }

    const code = codeMap[tab]
    if (code == null) return false

    const ok = await copy(code, { silent: true })
    if (ok) toast.success('代码已复制')
    else toast.error('复制失败')
    return ok
  }

  // ---- Open in new window --------------------------------------------------

  const pendingBlobUrls: string[] = []
  // 跟踪待执行的 blob URL 释放定时器，便于组件卸载时取消
  const pendingTimers: ReturnType<typeof setTimeout>[] = []

  function openInNewWindow(): void {
    const html = srcDoc.value
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    pendingBlobUrls.push(url)
    // 注意：不能携带 noopener 特性——按规范其返回值恒为 null，无法区分「已打开」
    // 与「被拦截」。改为正常打开后手动断开 opener，避免误报弹窗拦截。
    const win = window.open(url, '_blank')
    if (!win) {
      toast.error('新窗口被浏览器拦截，请检查弹窗拦截设置')
      // 立即释放 blob URL，避免无意义的 60s 等待
      const idx = pendingBlobUrls.indexOf(url)
      if (idx !== -1) pendingBlobUrls.splice(idx, 1)
      URL.revokeObjectURL(url)
      return
    }
    win.opener = null
    toast.info('已在新窗口打开预览')
    // 60s 后释放 blob URL，确保新窗口有足够时间完成加载
    const timer = setTimeout(() => {
      const idx = pendingBlobUrls.indexOf(url)
      if (idx !== -1) pendingBlobUrls.splice(idx, 1)
      URL.revokeObjectURL(url)
      const tIdx = pendingTimers.indexOf(timer)
      if (tIdx !== -1) pendingTimers.splice(tIdx, 1)
    }, 60_000)
    pendingTimers.push(timer)
  }

  // 组件卸载时清理所有未释放的 blob URL 与待执行定时器
  onUnmounted(() => {
    for (const url of pendingBlobUrls) {
      URL.revokeObjectURL(url)
    }
    pendingBlobUrls.length = 0
    for (const t of pendingTimers) {
      clearTimeout(t)
    }
    pendingTimers.length = 0
  })

  return {
    viewMode,
    isFullscreen,
    srcDoc,
    refreshKey,
    deviceDimensions,
    setViewMode,
    toggleFullscreen,
    refresh,
    copyCode,
    openInNewWindow,
  }
}
