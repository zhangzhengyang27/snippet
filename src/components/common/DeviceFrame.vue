<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ViewMode } from '@/types'
import { createSandboxResourceProxy, getSandboxAttributes } from '@/utils/sandbox'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'

const iframeRef = ref<HTMLIFrameElement | null>(null)
let detachProxy: (() => void) | null = null

// ── Props / Emits ────────────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    srcDoc?: string
    viewMode: ViewMode
    showDeviceControls?: boolean
    customContent?: boolean
    /** 移动端精简模式：隐藏交通灯、标签、设备切换、新窗口等冗余控件 */
    compact?: boolean
  }>(),
  {
    srcDoc: '',
    showDeviceControls: true,
    customContent: false,
    compact: false,
  }
)

const emit = defineEmits<{
  'update:viewMode': [mode: ViewMode]
  refresh: []
  openInNewWindow: []
  toggleFullscreen: []
}>()

// ── Sandbox permissions（严格隔离，永不携带 allow-same-origin）────────────────
const sandboxAttr = computed(() => getSandboxAttributes().join(' '))

// srcDoc 变化时重新挂载资源代理（iframe 与父窗口的 postMessage 通道）
watch(
  () => props.srcDoc,
  () => {
    if (iframeRef.value) {
      detachProxy?.()
      detachProxy = createSandboxResourceProxy(iframeRef.value)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  detachProxy?.()
  // 清理iframe以停止音频播放
  if (iframeRef.value) {
    iframeRef.value.srcdoc = ''
  }
})

// ── Device dimensions ────────────────────────────────────────────────────────
const deviceWidth = computed<string>(() => {
  switch (props.viewMode) {
    case 'mobile':
      return '375px'
    case 'tablet':
      return '768px'
    default:
      return '100%'
  }
})

const deviceHeight = computed<string>(() => {
  switch (props.viewMode) {
    case 'mobile':
      return '667px'
    case 'tablet':
      return '1024px'
    default:
      return '100%'
  }
})

// ── Device switch options ────────────────────────────────────────────────────
interface DeviceOption {
  mode: ViewMode
  label: string
  icon: string
}

const devices: DeviceOption[] = [
  {
    mode: 'desktop',
    label: '桌面端',
    icon: 'material-symbols:monitor',
  },
  {
    mode: 'tablet',
    label: '平板端',
    icon: 'material-symbols:tablet',
  },
  {
    mode: 'mobile',
    label: '移动端',
    icon: 'material-symbols:smartphone',
  },
]
</script>

<template>
  <div class="device-frame">
    <!-- ── Top toolbar ──────────────────────────────────────────────── -->
    <div class="device-toolbar">
      <!-- Left: traffic-light dots + label -->
      <div class="toolbar-left">
        <div v-if="!compact" class="traffic-lights">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        <span v-if="!compact" class="toolbar-label">实时预览</span>
        <span v-else class="toolbar-label toolbar-label--compact">预览</span>
      </div>

      <!-- Right: action buttons + device switch buttons -->
      <div class="toolbar-right">
        <AppButton aria-label="刷新预览" title="刷新预览" @click="emit('refresh')">
          <AppIcon icon="material-symbols:refresh" :size="16" />
        </AppButton>

        <AppButton
          v-if="showDeviceControls && !compact"
          aria-label="在新窗口打开"
          title="在新窗口打开"
          @click="emit('openInNewWindow')"
        >
          <AppIcon icon="material-symbols:open-in-new" :size="16" />
        </AppButton>

        <AppButton aria-label="切换全屏" title="切换全屏 (F)" @click="emit('toggleFullscreen')">
          <AppIcon icon="material-symbols:fullscreen" :size="16" />
        </AppButton>

        <template v-if="showDeviceControls && !compact">
          <span class="toolbar-divider"></span>

          <div class="device-switch-group">
            <AppButton
              v-for="d in devices"
              :key="d.mode"
              :aria-label="d.label"
              :title="d.label"
              :class="{ 'device-switch-active': viewMode === d.mode }"
              @click="emit('update:viewMode', d.mode)"
            >
              <AppIcon :icon="d.icon" :size="16" />
            </AppButton>
          </div>
        </template>
      </div>
    </div>

    <!-- ── Viewport / iframe area ───────────────────────────────────── -->
    <div class="device-viewport">
      <div
        v-if="!props.customContent"
        class="device-screen-wrapper"
        :class="{ 'device-screen-fixed': viewMode !== 'desktop' }"
        :style="{ width: deviceWidth, height: deviceHeight }"
      >
        <!-- Notch decoration (mobile / tablet only) -->
        <div v-if="viewMode !== 'desktop'" class="device-notch"></div>

        <!-- iframe -->
        <iframe
          ref="iframeRef"
          title="代码块实时预览"
          class="device-iframe"
          :srcdoc="srcDoc"
          :sandbox="sandboxAttr"
          frameborder="0"
          loading="lazy"
        ></iframe>
      </div>
      <div v-else class="device-custom-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Root (merged from frame-root + bezel) ─────────────────────────────────── */
.device-frame {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgb(var(--color-surface-rgb));
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow:
    inset 0 1px 0 rgb(var(--color-border-glass-rgb) / 0.04),
    0 0 0 1px rgb(var(--color-border-glass-rgb) / 0.06);
}

/* ── Toolbar ───────────────────────────────────────────────────────────────── */
.device-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 16px;
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  border-bottom: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.traffic-lights {
  display: flex;
  gap: 6px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot-red {
  background: rgb(var(--color-error-rgb));
}
.dot-yellow {
  background: rgb(var(--color-accent-amber-rgb));
}
.dot-green {
  background: rgb(var(--color-success-rgb));
}

.toolbar-label {
  font-family: var(--font-mono);
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.toolbar-right {
  display: flex;
  gap: 4px;
  align-items: center;
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  background: rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  margin: 0 4px;
}

.device-switch-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.device-switch-active {
  color: rgb(var(--color-primary-rgb));
  background: rgb(var(--color-primary-rgb) / 0.12);
}

.device-toggle-group {
  gap: 2px;
}

.device-toggle-item {
  width: 32px;
  height: 32px;
  padding: 0;
}

.device-toggle-item[data-state='on'] {
  background: rgb(var(--color-primary-rgb) / 0.15);
  border-color: rgb(var(--color-primary-rgb) / 0.4);
  color: rgb(var(--color-primary-rgb));
}

.device-toggle-item[data-state='on']:hover {
  background: rgb(var(--color-primary-rgb) / 0.2);
  color: rgb(var(--color-primary-container-rgb));
}

/* ── Viewport ──────────────────────────────────────────────────────────────── */
.device-viewport {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 0;
  background: rgb(var(--color-background-rgb));
  position: relative;
  overflow: hidden;
}

.device-screen-wrapper {
  position: relative;
  max-width: 100%;
  width: 100%;
  transition:
    width 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.device-screen-fixed {
  flex: none;
  overflow: hidden;
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 1px rgb(var(--color-border-glass-rgb) / 0.1);
}

/* Notch decoration for mobile / tablet */
.device-notch {
  width: 120px;
  height: 24px;
  margin: 0 auto;
  background: rgb(var(--color-surface-variant-rgb));
  border-radius: 0 0 14px 14px;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
}

.device-iframe {
  flex: 1;
  width: 100%;
  border: none;
  background: rgb(var(--color-surface-rgb));
  min-height: 0;
}

.device-custom-content {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgb(var(--color-background-rgb));
}
</style>
