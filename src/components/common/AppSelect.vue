<script setup lang="ts">
/**
 * AppSelect - 下拉选择封装（Element Plus el-select）
 *
 * 对外保持项目既有 API：value + @update:value、options: {label, value}[]。
 * 未声明的 attrs 透传到 el-select。
 */
import { computed } from 'vue'

export interface AppSelectOption {
  label: string
  value: string | null
}

interface Props {
  /** 当前选中值 */
  value?: string | null
  /** 选项列表 */
  options: AppSelectOption[]
  /** 未命中选项时的占位提示 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  value: null,
  placeholder: '请选择',
  disabled: false,
})

const emit = defineEmits<{
  'update:value': [value: string | null]
}>()

defineOptions({ inheritAttrs: false })

const modelValue = computed({
  get: () => (props.value ?? undefined) as string | undefined,
  set: (v) => emit('update:value', v ?? null),
})
</script>

<template>
  <el-select
    v-model="modelValue"
    class="app-select"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    v-bind="$attrs"
  >
    <el-option
      v-for="opt in props.options"
      :key="String(opt.value)"
      :label="opt.label"
      :value="opt.value ?? ''"
    />
  </el-select>
</template>

<style scoped>
/* 不设默认宽度：el-select 收缩为内容宽，需要撑满的调用方显式加 w-full
 * （scoped 样式是未分层 CSS，在层叠中永远压过 @layer utilities 里的 Tailwind 宽度类） */
/* 主题 token 对接 EP 下拉 */
.app-select :deep(.el-select__wrapper) {
  background: rgb(var(--color-surface-rgb));
  box-shadow: 0 0 0 1px rgb(var(--color-border-rgb) / 0.6) inset;
  border-radius: 8px;
  min-height: 34px;
}

.app-select :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px rgb(var(--color-primary-rgb) / 0.6) inset;
}

.app-select :deep(.el-select__placeholder) {
  color: rgb(var(--color-text-secondary-rgb) / 0.6);
}

.app-select :deep(.el-select__selected-item) {
  color: rgb(var(--color-text-rgb));
}
</style>
