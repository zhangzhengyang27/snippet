<script setup lang="ts">
/**
 * 代码块内嵌预览：把自包含 HTML 片段装进**严格隔离**的 iframe 实时渲染。
 *
 * 隔离模型（与代码块安全策略一致，见 utils/sandbox）：
 * - DeviceFrame 的 iframe 绝不携带 allow-same-origin，与父窗口完全隔离；
 * - srcdoc 由 buildSnippetSrcDoc 注入 CSP（connect-src 'none'）+ 沙箱引导脚本；
 * - 片段若引用白名单内的同源静态资源，由父窗口代理抓取后回传（createSandboxResourceProxy，
 *   由 DeviceFrame 挂载），代理侧做 URL 规范化校验，拒绝 `..` 穿越。
 *
 * 多文件片段：主 HTML 里的 `<script src="./xxx.js">` 会被内联，使预览可独立运行。
 */
import { computed, ref } from 'vue'
import DeviceFrame from '@/components/common/DeviceFrame.vue'
import type { ViewMode } from '@/types'
import { buildSnippetSrcDoc, openSnippetPreviewWindow } from '@/utils/sandbox'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  /** 主 HTML 源码（snippet.content 或激活的 HTML 文件） */
  html: string
  /** 同片段的其他文件（用于内联 <script src> 引用） */
  files: { name: string; language?: string; code?: string }[]
}>()

const { toast } = useToast()

const viewMode = ref<ViewMode>('desktop')

/**
 * 刷新用键：srcdoc 内容不变时 DeviceFrame 的 watch 不会触发，
 * 故通过自增 key 强制重新挂载 iframe（顺带重跑片段脚本）。
 */
const reloadKey = ref(0)

const srcDoc = computed(() => buildSnippetSrcDoc(props.html, props.files))

function reload() {
  reloadKey.value += 1
}

function openInNewWindow() {
  const ok = openSnippetPreviewWindow(props.html, props.files)
  if (!ok) toast.error('新窗口被浏览器拦截，请检查弹窗拦截设置')
}

const fullscreen = ref(false)
function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
}
</script>

<template>
  <div class="snippet-preview" :class="{ 'is-fullscreen': fullscreen }">
    <DeviceFrame
      :key="reloadKey"
      v-model:view-mode="viewMode"
      :src-doc="srcDoc"
      @refresh="reload"
      @open-in-new-window="openInNewWindow"
      @toggle-fullscreen="toggleFullscreen"
    />
  </div>
</template>

<style scoped>
.snippet-preview {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* 全屏：脱离文档流铺满视口，Esc 由 DeviceFrame 工具条再次点击切换 */
.snippet-preview.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgb(var(--color-bg-rgb));
}
</style>
