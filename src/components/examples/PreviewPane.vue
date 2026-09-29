<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, useSlots } from 'vue'
import type { CodeExample } from '@/types'
import type { Snippet } from '@/utils/sandbox'
import { usePreview } from '@/composables/usePreview'
import DeviceFrame from '../common/DeviceFrame.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'
const slots = useSlots()
const hasCustomContent = computed(() => !!slots.default)

// ── Props / Emits ────────────────────────────────────────────────────────────
const props = defineProps<{
  example: CodeExample
  srcDoc?: string
  /** 当前选中的片段（合并变体时由父组件通过 tab 切换传入） */
  activeSnippet?: Snippet
  /** 移动端精简模式：隐藏预览区冗余工具栏 */
  compact?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

function handleRefresh(): void {
  refresh()
  emit('refresh')
}

// ── Snippet state：优先使用父组件传入的片段，否则回退到第一个片段 ─────────────
const resolvedSnippet = computed<Snippet | undefined>(
  () => props.activeSnippet ?? props.example.snippets?.[0]
)

// ── Preview state via composable ─────────────────────────────────────────────
const { viewMode, srcDoc, refresh, refreshKey, setViewMode, isFullscreen, openInNewWindow } =
  usePreview(
    () => props.example,
    () => resolvedSnippet.value,
    () => props.srcDoc
  )

// ── Lazy rendering (IntersectionObserver) ────────────────────────────────────
const containerRef = ref<HTMLElement | null>(null)
const isVisible = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!containerRef.value) return
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        observer?.disconnect()
      }
    },
    { rootMargin: '200px' }
  )
  observer.observe(containerRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})

// ── Fullscreen ───────────────────────────────────────────────────────────────
const previewRootRef = ref<HTMLElement | null>(null)

async function handleFullscreen(): Promise<void> {
  if (!previewRootRef.value) return
  try {
    if (document.fullscreenElement === previewRootRef.value) {
      await document.exitFullscreen()
    } else if (!document.fullscreenElement) {
      await previewRootRef.value.requestFullscreen()
    }
  } catch {
    // Ignore fullscreen API errors (e.g. not allowed by user gesture)
  }
}

function syncFullscreenState() {
  isFullscreen.value = document.fullscreenElement === previewRootRef.value
}

onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreenState)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState)
})

defineExpose({ toggleFullscreen: handleFullscreen })
</script>

<template>
  <div ref="previewRootRef" class="preview-pane-root">
    <!-- ── Device frame (lazy rendered) ────────────────────────────────── -->
    <div ref="containerRef" class="preview-body">
      <DeviceFrame
        v-if="isVisible"
        :key="refreshKey"
        :src-doc="srcDoc"
        :view-mode="viewMode"
        :show-device-controls="!hasCustomContent"
        :custom-content="hasCustomContent"
        :compact="props.compact"
        @update:view-mode="setViewMode"
        @refresh="handleRefresh"
        @open-in-new-window="openInNewWindow"
        @toggle-fullscreen="handleFullscreen"
      >
        <slot />
      </DeviceFrame>
      <!-- Placeholder while waiting for intersection -->
      <div v-else class="preview-placeholder">
        <AppIcon icon="material-symbols:monitor" :size="32" class="placeholder-icon" />
        <span class="placeholder-text">加载预览中...</span>
      </div>
    </div>

    <!-- ── Floating exit-fullscreen button (only visible in fullscreen) ── -->
    <AppButton
      class="fullscreen-exit-btn"
      aria-label="退出全屏"
      title="退出全屏 (ESC)"
      @click="handleFullscreen"
    >
      <AppIcon icon="material-symbols:fullscreen-exit" :size="18" />
    </AppButton>
  </div>
</template>

<style scoped>
/* ── Root ──────────────────────────────────────────────────────────────────── */
.preview-pane-root {
  position: relative;
  display: flex;
  flex-direction: column;
  background: rgb(var(--color-surface-rgb));
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  height: 100%;
}

.preview-pane-root:fullscreen {
  border-radius: 0;
  border: none;
  background: rgb(var(--color-surface-rgb));
}

/* ── Fullscreen: hide decorative chrome, show clean preview ──────────────── */
.preview-pane-root:fullscreen :deep(.device-toolbar) {
  display: none;
}

.preview-pane-root:fullscreen :deep(.device-frame) {
  border-radius: 0;
  box-shadow: none;
}

.preview-pane-root:fullscreen :deep(.device-viewport) {
  min-height: 100vh;
}

.preview-pane-root:fullscreen :deep(.device-iframe) {
  min-height: 100vh;
}

.preview-pane-root:fullscreen :deep(.preview-placeholder) {
  min-height: 100vh;
}

/* ── Floating exit-fullscreen button ───────────────────────────────────────── */
.fullscreen-exit-btn {
  display: none;
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 100;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  background: rgb(var(--color-surface-rgb));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 0;
  pointer-events: none;
}

.fullscreen-exit-btn:hover {
  background: rgb(var(--color-surface-variant-high-rgb));
  color: rgb(var(--color-text-rgb));
  border-color: rgb(var(--color-primary-rgb) / 0.3);
}

.preview-pane-root:fullscreen .fullscreen-exit-btn {
  display: flex;
  opacity: 1;
  pointer-events: auto;
}

/* ── Body ──────────────────────────────────────────────────────────────────── */
.preview-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ── Placeholder ───────────────────────────────────────────────────────────── */
.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 560px;
  color: rgb(var(--color-text-secondary-rgb));
  opacity: 0.5;
}

.placeholder-icon {
  opacity: 0.4;
}

.placeholder-text {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
}
</style>
