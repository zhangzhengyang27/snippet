<script setup lang="ts">
/**
 * AppModal - 通用模态框（恢复重建）
 *
 * 玻璃拟态风格对话框，Teleport 到 body 渲染：
 *   - 根元素即对话面板本身，遮罩由 ::before 伪元素绘制，
 *     因此外部传入的 class（如 SourcePane 的 .dialog-box）能直接作用于面板
 *   - 支持 v-model:open / :open + @update:open 两种用法
 *   - footer 优先级：#footer 插槽 > footer prop > 默认确认/取消；footer=null 且无插槽时不渲染底部
 *
 * 用法：
 *   <AppModal v-model:open="open" title="标题" :width="480">
 *     内容
 *     <template #footer>…</template>
 *   </AppModal>
 */
import { computed, useSlots } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { CSSProperties, VNode } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'

interface Props {
  /** 是否可见（v-model:open） */
  open: boolean
  /** 标题文本（也可用 #title 插槽自定义，如带图标标题） */
  title?: string
  /** 面板宽度，数字按 px 处理（默认 480） */
  width?: number | string
  /** 底部内容；传 null 表示不使用默认的确认/取消底部（仍可被 #footer 插槽覆盖） */
  footer?: VNode | string | null
  /** 关闭时是否销毁内容（false 时以 v-show 隐藏，保留内部状态） */
  destroyOnClose?: boolean
  /** 内容区样式透传（如 { maxHeight: '85vh', overflowY: 'auto', padding: '0' }） */
  bodyStyle?: CSSProperties
  /** 是否显示遮罩（false 时隐藏 ::before 遮罩层） */
  mask?: boolean
  /** 是否显示右上角关闭按钮 */
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: 480,
  footer: undefined,
  destroyOnClose: false,
  bodyStyle: () => ({}),
  mask: true,
  closable: true,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  /** 点击遮罩 / 关闭按钮 / Esc / 默认底部取消时触发 */
  close: []
  /** 默认底部的确认按钮触发 */
  confirm: []
}>()

const slots = useSlots()

const hasFooterSlot = computed(() => !!slots.footer)

/** 是否渲染底部：有 #footer 插槽则渲染插槽；否则仅在未显式传 footer=null 时渲染默认底部 */
const showFooter = computed(() => hasFooterSlot.value || props.footer !== null)

/** 面板宽度（数字补 px） */
const widthStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

/** 关闭弹窗（v-model + close 事件双通知） */
function handleClose() {
  emit('update:open', false)
  emit('close')
}

/** 点击遮罩区域关闭（伪元素遮罩的点击目标是面板自身，故用 .self 判断） */
function handleMaskClick() {
  handleClose()
}

/** Esc 关闭：Monaco 等内部处理的按键会 stopPropagation，不会误触 */
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open) {
    handleClose()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="app-modal">
      <div
        v-if="props.destroyOnClose ? props.open : true"
        v-show="props.destroyOnClose ? true : props.open"
        class="app-modal"
        :class="{ 'app-modal--no-mask': !props.mask }"
        role="dialog"
        aria-modal="true"
        :aria-label="props.title || undefined"
        :style="widthStyle"
        @click.self="handleMaskClick"
      >
        <!-- 头部：标题插槽 / 标题文本 + 关闭按钮 -->
        <div class="app-modal__header">
          <div class="app-modal__title">
            <slot name="title">{{ props.title }}</slot>
          </div>
          <button
            v-if="props.closable"
            type="button"
            class="app-modal__close"
            aria-label="关闭"
            @click="handleClose"
          >
            <AppIcon icon="ms:close" :size="16" />
          </button>
        </div>

        <!-- 内容区 -->
        <div class="app-modal__body" :style="props.bodyStyle">
          <slot />
        </div>

        <!-- 底部：插槽优先，其次默认确认/取消 -->
        <div v-if="showFooter" class="app-modal__footer">
          <slot name="footer">
            <AppButton variant="glass" @click="handleClose">取消</AppButton>
            <AppButton variant="primary" @click="emit('confirm')">确认</AppButton>
          </slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-modal {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 230; /* 高于 AppHeader(200)，低于 StatusToast(240) */
  display: flex;
  flex-direction: column;
  max-height: 88vh;
  border-radius: 16px;
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  background: rgb(var(--color-bg-elevated-rgb) / 0.98);
  box-shadow: 0 24px 64px rgb(var(--color-shadow-rgb) / 0.35);
  overflow: hidden;
}

/* 遮罩：挂在面板 ::before 上，保证外部传入的 class 直接作用于面板 */
.app-modal::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background: rgb(var(--color-shadow-rgb) / 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.app-modal--no-mask::before {
  display: none;
}

/* ─── 头部 ─────────────────────────────────────────────────────────────── */
.app-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgb(var(--color-border-glass-rgb) / 0.5);
}

.app-modal__title {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--font-heading);
  font-size: 1.0625rem;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
  line-height: 1.4;
}

.app-modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
  transition:
    background var(--duration-base, 150ms) var(--ease-out, ease-out),
    color var(--duration-base, 150ms) var(--ease-out, ease-out);
}

.app-modal__close:hover {
  background: rgb(var(--color-surface-variant-rgb));
  color: rgb(var(--color-text-rgb));
}

/* ─── 内容 / 底部 ──────────────────────────────────────────────────────── */
.app-modal__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 20px;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgb(var(--color-text-rgb) / 0.85);
  overflow: auto;
}

.app-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 1px solid rgb(var(--color-border-glass-rgb) / 0.5);
}

/* ─── 过渡 ─────────────────────────────────────────────────────────────── */
.app-modal-enter-active,
.app-modal-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.app-modal-enter-from,
.app-modal-leave-to {
  opacity: 0;
  transform: translate(-50%, -48%) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .app-modal-enter-active,
  .app-modal-leave-active {
    transition: none;
  }
}
</style>
