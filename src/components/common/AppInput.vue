<script setup lang="ts">
/**
 * AppInput - 输入域封装（Element Plus el-input）
 *
 * 对外保持项目既有 API：value + @update:value 受控、rows>0 渲染多行、
 * allowClear 显示清空钮；内部全部映射到 el-input。
 * 未声明的 attrs（class 等）透传到 el-input。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

interface Props {
  /** 输入值（配合 @update:value 受控使用） */
  value?: string | number | null
  /** 原生 input 类型；rows 存在时按 textarea 渲染 */
  type?: string
  /** 占位提示 */
  placeholder?: string
  /** 传 >0 时渲染为多行文本域 */
  rows?: number
  /** 显示清空按钮（有内容且非禁用时） */
  allowClear?: boolean
  disabled?: boolean
  maxlength?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  type: 'text',
  placeholder: '',
  disabled: false,
})

const emit = defineEmits<{
  'update:value': [value: string]
}>()

defineOptions({ inheritAttrs: false })

const isTextarea = computed(() => Number(props.rows ?? 0) > 0)
const showClear = computed(() => Boolean(props.allowClear))
const modelValue = computed(() => String(props.value ?? ''))

function handleInput(val: string) {
  emit('update:value', val)
}

function handleClear() {
  emit('update:value', '')
}
</script>

<template>
  <el-input
    class="app-input"
    :model-value="modelValue"
    :type="isTextarea ? 'textarea' : props.type"
    :rows="isTextarea ? props.rows : undefined"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :maxlength="props.maxlength === undefined ? undefined : Number(props.maxlength)"
    :clearable="props.allowClear"
    v-bind="$attrs"
    @update:model-value="handleInput"
  >
    <template v-if="showClear && !props.disabled && modelValue" #suffix>
      <button type="button" class="app-input__clear" aria-label="清空" @click.stop="handleClear">
        <AppIcon icon="ms:cancel" :size="13" />
      </button>
    </template>
  </el-input>
</template>

<style scoped>
.app-input {
  width: 100%;
}

/* 主题 token 对接 EP 输入框 */
.app-input :deep(.el-input__wrapper),
.app-input :deep(.el-textarea__inner) {
  background: rgb(var(--color-surface-rgb));
  box-shadow: 0 0 0 1px rgb(var(--color-border-rgb) / 0.6) inset;
  border-radius: 8px;
  color: rgb(var(--color-text-rgb));
  transition: box-shadow 150ms ease;
}

.app-input :deep(.el-input__wrapper.is-focus),
.app-input :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px rgb(var(--color-primary-rgb) / 0.6) inset;
}

.app-input :deep(.el-input__inner) {
  color: rgb(var(--color-text-rgb));
}

.app-input :deep(.el-input__inner::placeholder),
.app-input :deep(.el-textarea__inner::placeholder) {
  color: rgb(var(--color-text-secondary-rgb) / 0.6);
}

.app-input__clear {
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
  padding: 2px;
}

.app-input__clear:hover {
  color: rgb(var(--color-text-rgb));
}
</style>
