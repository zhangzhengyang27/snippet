<script setup lang="ts">
/**
 * AppSelect - 通用下拉选择（恢复重建）
 *
 * 基于原生 <select> 的玻璃拟态下拉，保证移动端与无障碍体验：
 *   - 受控用法：:value + @update:value
 *   - options 支持 string | null 值（如集合选择中的「根目录」）
 *
 * 用法：
 *   <AppSelect :value="sort" :options="sortOptions" @update:value="..." />
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

interface AppSelectOption {
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

/** 当前值对应的选项下标（未命中返回 -1，由占位项兜底） */
const selectedIndex = computed(() =>
  props.options.findIndex((option) => option.value === props.value)
)

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const option = props.options[target.selectedIndex]
  if (option) {
    emit('update:value', option.value)
  }
}
</script>

<template>
  <div class="app-select">
    <select
      class="app-select__field"
      :value="selectedIndex"
      :disabled="props.disabled"
      @change="handleChange"
    >
      <option v-if="selectedIndex < 0" disabled :value="-1">{{ props.placeholder }}</option>
      <option v-for="(option, index) in props.options" :key="index" :value="index">
        {{ option.label }}
      </option>
    </select>
    <span class="app-select__arrow" aria-hidden="true">
      <AppIcon icon="ms:arrow_drop_down" :size="16" />
    </span>
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.app-select__field {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  padding: 7px 30px 7px 12px;
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  border-radius: 10px;
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  color: rgb(var(--color-text-rgb));
  font-family: var(--font-body);
  font-size: 0.875rem;
  line-height: 1.5;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  cursor: pointer;
  text-overflow: ellipsis;
  transition:
    border-color var(--duration-base, 150ms) var(--ease-out, ease-out),
    box-shadow var(--duration-base, 150ms) var(--ease-out, ease-out),
    background var(--duration-base, 150ms) var(--ease-out, ease-out);
}

.app-select__field:hover:not(:disabled) {
  border-color: rgb(var(--color-primary-rgb) / 0.3);
}

.app-select__field:focus {
  border-color: rgb(var(--color-primary-rgb) / 0.6);
  box-shadow: 0 0 0 3px rgb(var(--color-primary-rgb) / 0.12);
}

.app-select__field:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.app-select__arrow {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--color-text-secondary-rgb));
  pointer-events: none;
}
</style>
