<script setup lang="ts">
/**
 * AppInput - 通用输入框（恢复重建）
 *
 * 玻璃拟态风格输入框，单行 input 与多行 textarea（传 rows）二合一：
 *   - 受控用法：:value + @update:value（项目内统一如此使用）
 *   - allow-clear 时展示清空按钮
 *
 * 用法：
 *   <AppInput v-model:value="keyword" placeholder="搜索" allow-clear />
 *   <AppInput :value="form.description" :rows="2" @update:value="..." />
 */
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

defineOptions({ inheritAttrs: false })

interface Props {
  /** 输入值（配合 @update:value 受控使用） */
  value?: string | number | null
  /** 原生 input 类型；rows 存在时按 textarea 渲染 */
  type?: string
  /** 占位提示 */
  placeholder?: string
  /** 传 >0 时渲染为多行文本域 */
  rows?: number
  /** 是否展示清空按钮 */
  allowClear?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 原生 maxlength 限制 */
  maxlength?: number
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  type: 'text',
  placeholder: '',
  rows: 0,
  allowClear: false,
  disabled: false,
  maxlength: undefined,
})

const emit = defineEmits<{
  'update:value': [value: string]
}>()

/** 内部缓冲值：外部 value 与输入状态同步 */
const innerValue = ref(props.value == null ? '' : String(props.value))

watch(
  () => props.value,
  (val) => {
    const next = val == null ? '' : String(val)
    if (next !== innerValue.value) {
      innerValue.value = next
    }
  }
)

const isTextarea = computed(() => props.rows > 0)

/** 是否展示清空按钮 */
const showClear = computed(
  () => props.allowClear && !props.disabled && innerValue.value.length > 0
)

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  innerValue.value = target.value
  emit('update:value', target.value)
}

/** 清空输入并通知父组件 */
function handleClear() {
  innerValue.value = ''
  emit('update:value', '')
}
</script>

<template>
  <div
    class="app-input"
    :class="{ 'is-disabled': props.disabled, 'is-clearable': showClear }"
  >
    <textarea
      v-if="isTextarea"
      v-bind="$attrs"
      v-model="innerValue"
      class="app-input__field app-input__field--area"
      :rows="props.rows"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :maxlength="props.maxlength"
      @input="handleInput"
    />
    <template v-else>
      <input
        v-bind="$attrs"
        v-model="innerValue"
        class="app-input__field"
        :type="props.type"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :maxlength="props.maxlength"
        @input="handleInput"
      />
      <button
        v-if="showClear"
        type="button"
        class="app-input__clear"
        aria-label="清空"
        @click="handleClear"
      >
        <AppIcon icon="ms:cancel" :size="13" />
      </button>
    </template>
  </div>
</template>

<style scoped>
.app-input {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

/* ─── 输入域 ───────────────────────────────────────────────────────────── */
.app-input__field {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  padding: 7px 12px;
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  border-radius: 10px;
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  color: rgb(var(--color-text-rgb));
  font-family: var(--font-body);
  font-size: 0.875rem;
  line-height: 1.5;
  outline: none;
  transition:
    border-color var(--duration-base, 150ms) var(--ease-out, ease-out),
    box-shadow var(--duration-base, 150ms) var(--ease-out, ease-out),
    background var(--duration-base, 150ms) var(--ease-out, ease-out);
}

.app-input__field::placeholder {
  color: rgb(var(--color-text-tertiary-rgb));
}

.app-input__field:hover:not(:disabled) {
  border-color: rgb(var(--color-primary-rgb) / 0.3);
}

.app-input__field:focus {
  border-color: rgb(var(--color-primary-rgb) / 0.6);
  box-shadow: 0 0 0 3px rgb(var(--color-primary-rgb) / 0.12);
}

.app-input__field:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* 多行文本域 */
.app-input__field--area {
  display: block;
  resize: vertical;
  min-height: 0;
}

/* 有清空按钮时给输入值留出空间 */
.is-clearable .app-input__field:not(.app-input__field--area) {
  padding-right: 30px;
}

/* ─── 清空按钮 ─────────────────────────────────────────────────────────── */
.app-input__clear {
  position: absolute;
  right: 7px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  padding: 0;
  background: transparent;
  color: rgb(var(--color-text-tertiary-rgb));
  cursor: pointer;
  transition:
    background var(--duration-base, 150ms) var(--ease-out, ease-out),
    color var(--duration-base, 150ms) var(--ease-out, ease-out);
}

.app-input__clear:hover {
  background: rgb(var(--color-surface-variant-rgb));
  color: rgb(var(--color-text-rgb));
}

.is-disabled .app-input__clear {
  display: none;
}
</style>
