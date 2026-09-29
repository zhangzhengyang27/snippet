<script setup lang="ts">
/**
 * AppModal - 模态框封装（Element Plus el-dialog）
 *
 * 对外保持项目既有 API：
 *   - v-model:open 控制可见
 *   - footer 优先级：#footer 插槽 > footer prop > 默认确认/取消；footer=null 且无插槽时不渲染底部
 *   - #title 插槽自定义标题（映射到 el-dialog 的 header 插槽）
 * 未声明的 attrs（body-style 等）透传到 el-dialog。
 */
import { computed, useSlots, type CSSProperties, type VNode } from 'vue'
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
  /** 关闭时是否销毁内容 */
  destroyOnClose?: boolean
  /** 内容区样式透传（如 { maxHeight: '85vh', overflowY: 'auto', padding: '0' }） */
  bodyStyle?: CSSProperties
  /** 是否可点击遮罩关闭 */
  mask?: boolean
  /** 是否显示右上角关闭按钮 */
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: 480,
  footer: undefined,
  destroyOnClose: false,
  mask: true,
  closable: true,
})

const emit = defineEmits<{
  /** 点击遮罩 / 关闭按钮 / Esc / 默认底部取消时触发 */
  close: []
  'update:open': [open: boolean]
  /** 默认底部的确认按钮触发 */
  confirm: []
}>()

const slots = useSlots()

const visible = computed({
  get: () => props.open,
  set: (v) => {
    if (!v) emit('close')
    emit('update:open', v)
  },
})

const widthValue = computed(() =>
  typeof props.width === 'number' ? `${props.width}px` : props.width
)

/** footer 渲染：插槽 > prop > 默认钮；null+无插槽 = 不渲染 */
const showFooter = computed(() => Boolean(slots.footer) || props.footer !== null)
const showDefaultFooter = computed(() => !slots.footer && props.footer === undefined)

function handleClose() {
  emit('close')
  emit('update:open', false)
}

function handleConfirm() {
  emit('confirm')
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="app-modal"
    :title="slots.title ? undefined : props.title"
    :width="widthValue"
    :destroy-on-close="props.destroyOnClose"
    :close-on-click-modal="props.mask"
    :show-close="props.closable"
    :append-to-body="true"
    :align-center="true"
    v-bind="$attrs"
  >
    <template v-if="slots.title" #header>
      <slot name="title" />
    </template>

    <slot />

    <template v-if="showFooter" #footer>
      <slot name="footer">
        <component :is="props.footer" v-if="props.footer !== undefined" />
        <template v-else-if="showDefaultFooter">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" @click="handleConfirm">
            <AppIcon icon="ms:check" :size="14" />
            确认
          </el-button>
        </template>
      </slot>
    </template>
  </el-dialog>
</template>

<style>
/* 主题 token 对接 EP 弹窗（对话框挂载在 body，需全局样式） */
.app-modal.el-dialog {
  border-radius: 14px;
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
  background: rgb(var(--color-surface-rgb));
}

.app-modal .el-dialog__title {
  color: rgb(var(--color-text-rgb));
  font-weight: 600;
}

.app-modal .el-dialog__body {
  color: rgb(var(--color-text-rgb));
}
</style>
