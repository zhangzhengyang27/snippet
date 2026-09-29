<script setup lang="ts">
/**
 * 代码片段标签输入组件。
 * 支持：逗号/回车分隔输入、自动补全已存在标签、accent 类系统着色。
 *
 * 颜色策略：删除硬编码调色板，改用项目设计系统的 accent-* 类体系
 * （accent-blue/orange/green/pink/purple/indigo 6 色循环），
 * 通过 :class 注入 --accent / --accent-soft / --accent-glow 变量。
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps<{
  modelValue: string // 逗号分隔的标签字符串
  availableTags: string[] // 已存在的标签列表（用于自动补全）
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showDropdown = ref(false)
const filterText = ref('')

// 解析当前标签列表
const currentTags = computed(() => {
  if (!props.modelValue) return []
  return props.modelValue
    .split(/[,，\n]+/)
    .map((t) => t.trim())
    .filter(Boolean)
})

// 过滤后的建议标签（排除已有的）
const suggestedTags = computed(() => {
  const q = filterText.value.toLowerCase().trim()
  if (!q) return props.availableTags.filter((t) => !currentTags.value.includes(t)).slice(0, 8)

  return props.availableTags
    .filter((t) => t.toLowerCase().includes(q) && !currentTags.value.includes(t))
    .slice(0, 8)
})

/** Accent 类系统：6 色循环（来自 main.css 中定义的 .accent-* 类） */
const ACCENT_CLASSES = [
  'accent-blue',
  'accent-orange',
  'accent-green',
  'accent-pink',
  'accent-purple',
  'accent-indigo',
] as const

function stringHashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getAccentClass(tagName: string): string {
  return ACCENT_CLASSES[stringHashCode(tagName) % ACCENT_CLASSES.length]
}

function removeTag(tag: string) {
  const tags = currentTags.value.filter((t) => t !== tag)
  emit('update:modelValue', tags.join(', '))
}

function addTag(tagName: string) {
  const trimmed = tagName.trim().toLowerCase()
  if (!trimmed || currentTags.value.includes(trimmed)) return
  const tags = [...currentTags.value, trimmed]
  emit('update:modelValue', tags.join(', '))
  filterText.value = ''
  showDropdown.value = false
}

function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    const val = (e.target as HTMLInputElement).value.trim()
    if (val) addTag(val)
    ;(e.target as HTMLInputElement).value = ''
    filterText.value = ''
    showDropdown.value = false
  } else if (e.key === 'Backspace' && !filterText.value && currentTags.value.length > 0) {
    const tags = [...currentTags.value]
    tags.pop()
    emit('update:modelValue', tags.join(', '))
  }
}

function onInputFocus() {
  showDropdown.value = true
}

function onInputInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  filterText.value = val
  showDropdown.value = val.length > 0 || suggestedTags.value.length > 0
}

function selectSuggestion(tag: string) {
  addTag(tag)
}

function closeDropdown() {
  setTimeout(() => {
    showDropdown.value = false
  }, 150)
}
</script>

<template>
  <div class="snippet-tag-input">
    <!-- 已选标签 -->
    <div class="sti-tags">
      <span v-for="tag in currentTags" :key="tag" :class="['sti-tag', getAccentClass(tag)]">
        <span class="sti-tag__dot" />
        {{ tag }}
        <button type="button" class="sti-tag__remove" aria-label="移除标签" @click="removeTag(tag)">
          <AppIcon icon="ms:close" :size="14" />
        </button>
      </span>
      <!-- 输入框内嵌 -->
      <input
        class="sti-input"
        type="text"
        placeholder="输入后按回车添加..."
        @focus="onInputFocus"
        @blur="closeDropdown"
        @keydown="onInputKeydown"
        @input="onInputInput"
      />
    </div>

    <!-- 自动补全下拉 -->
    <div v-if="showDropdown && suggestedTags.length > 0" class="sti-dropdown glass-panel">
      <button
        v-for="tag in suggestedTags"
        :key="tag"
        type="button"
        :class="['sti-dropdown__item', getAccentClass(tag)]"
        @mousedown.prevent="selectSuggestion(tag)"
      >
        <span class="sti-dropdown__dot" />
        {{ tag }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.snippet-tag-input {
  position: relative;
  width: 100%;
}

.sti-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border: 1px solid rgb(var(--m3-outline-variant-rgb) / 0.5);
  border-radius: var(--radius-md);
  background: rgb(var(--m3-surface-container-rgb) / 0.6);
  min-height: var(--space-10);
  cursor: text;
  transition: all var(--duration-base) var(--ease-out);
}

.sti-tags:focus-within {
  border-color: rgb(var(--color-primary-rgb) / 0.5);
  box-shadow: 0 0 0 3px rgb(var(--color-primary-rgb) / 0.1);
}

/* 标签 chip：通过 .accent-* 类注入 --accent / --accent-soft / --accent-glow */
.sti-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2) var(--space-1) var(--space-1);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  font-weight: 500;
  color: var(--accent, rgb(var(--color-primary-rgb)));
  background: var(--accent-soft, rgb(var(--color-primary-rgb) / 0.12));
  animation: fadeInTag var(--duration-base) var(--ease-out);
}

@keyframes fadeInTag {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.sti-tag__dot {
  width: var(--space-2);
  height: var(--space-2);
  border-radius: 50%;
  background: var(--accent, rgb(var(--color-primary-rgb)));
  flex-shrink: 0;
}

.sti-tag__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--space-4);
  height: var(--space-4);
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.55;
  cursor: pointer;
  border-radius: 50%;
  transition: all var(--duration-base) var(--ease-out);
  padding: 0;
}

.sti-tag__remove:hover {
  opacity: 1;
  background: var(--accent-soft, rgb(var(--color-primary-rgb) / 0.12));
}

.sti-input {
  flex: 1;
  min-width: 100px;
  outline: none;
  border: none;
  background: transparent;
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  color: rgb(var(--color-text-rgb));
  padding: var(--space-1) 0;
}

.sti-input::placeholder {
  color: rgb(var(--color-text-secondary-rgb) / 0.5);
}

/* 下拉：使用 .glass-panel 类（M3 风格，来自全局 main.css） */
.sti-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: var(--space-1);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  max-height: 180px;
  overflow-y: auto;
  padding: var(--space-1);
}

.sti-dropdown__item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  font-family: var(--font-mono);
  font-size: var(--text-code-sm);
  color: rgb(var(--color-text-rgb));
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--duration-base) var(--ease-out);
  text-align: left;
}

.sti-dropdown__item:hover {
  background: var(--accent-soft, rgb(var(--color-primary-rgb) / 0.08));
  color: var(--accent, rgb(var(--color-primary-rgb)));
}

.sti-dropdown__dot {
  width: var(--space-2);
  height: var(--space-2);
  border-radius: 50%;
  background: var(--accent, rgb(var(--color-primary-rgb)));
  flex-shrink: 0;
}
</style>
