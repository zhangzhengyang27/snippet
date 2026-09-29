<script setup lang="ts">
/**
 * AppTooltip - 气泡提示（恢复推断：项目内暂无调用点，按通用惯例重建）
 *
 * 纯 CSS 悬浮/聚焦触发的气泡提示，包裹任意触发元素：
 *
 * 用法：
 *   <AppTooltip content="复制代码">
 *     <AppButton><AppIcon icon="ms:content_copy" /></AppButton>
 *   </AppTooltip>
 */
interface Props {
  /** 提示文本 */
  content: string
  /** 气泡弹出方位 */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** 是否禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'top',
  disabled: false,
})
</script>

<template>
  <span
    class="app-tooltip"
    :class="[`app-tooltip--${props.placement}`, { 'is-disabled': props.disabled }]"
    :data-tooltip="props.content"
    tabindex="0"
  >
    <slot />
  </span>
</template>

<style scoped>
.app-tooltip {
  position: relative;
  display: inline-flex;
  outline: none;
}

/* 气泡本体：hover / 键盘聚焦时显示 */
.app-tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  z-index: 260;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid rgb(var(--color-border-glass-rgb) / 0.6);
  background: rgb(var(--color-bg-elevated-rgb) / 0.98);
  color: rgb(var(--color-text-rgb));
  font-family: var(--font-body);
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: nowrap;
  box-shadow: 0 6px 20px rgb(var(--color-shadow-rgb) / 0.3);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.app-tooltip:not(.is-disabled):hover::after,
.app-tooltip:not(.is-disabled):focus-visible::after {
  opacity: 1;
  visibility: visible;
}

/* ─── 方位 ─────────────────────────────────────────────────────────────── */
.app-tooltip--top::after {
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translate(-50%, 2px);
}

.app-tooltip--top:hover::after,
.app-tooltip--top:focus-visible::after {
  transform: translate(-50%, 0);
}

.app-tooltip--bottom::after {
  top: calc(100% + 8px);
  left: 50%;
  transform: translate(-50%, -2px);
}

.app-tooltip--bottom:hover::after,
.app-tooltip--bottom:focus-visible::after {
  transform: translate(-50%, 0);
}

.app-tooltip--left::after {
  right: calc(100% + 8px);
  top: 50%;
  transform: translate(2px, -50%);
}

.app-tooltip--left:hover::after,
.app-tooltip--left:focus-visible::after {
  transform: translate(0, -50%);
}

.app-tooltip--right::after {
  left: calc(100% + 8px);
  top: 50%;
  transform: translate(-2px, -50%);
}

.app-tooltip--right:hover::after,
.app-tooltip--right:focus-visible::after {
  transform: translate(0, -50%);
}

@media (prefers-reduced-motion: reduce) {
  .app-tooltip::after {
    transition: none;
  }
}
</style>
