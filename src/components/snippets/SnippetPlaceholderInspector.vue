<script setup lang="ts">
/**
 * SnippetPlaceholderInspector - 片段占位符检查器（恢复重建）
 *
 * 展示从片段模板中解析出的占位符定义（接口对齐
 * utils/snippetPlaceholders 的 extractSnippetPlaceholderDefs 输出，
 * 类型复用 types/knowledge-snippet 的 SnippetPlaceholderDef）：
 *   - 解析出错时以错误态展示 error 信息
 *   - 正常时逐条列出占位符名称、输入形态、默认值与候选项
 *
 * 用法（SnippetEditorDialog 内）：
 *   <SnippetPlaceholderInspector :defs="placeholderState.defs" :error="placeholderState.error" />
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import type { SnippetPlaceholderDef, SnippetPlaceholderKind } from '@/types/knowledge-snippet'

interface Props {
  /** 占位符定义列表（extractSnippetPlaceholderDefs 的解析结果） */
  defs: SnippetPlaceholderDef[]
  /** 解析错误信息（空串表示解析成功） */
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  error: '',
})

/** 占位符输入形态的展示文案 */
const kindLabels: Record<SnippetPlaceholderKind, string> = {
  text: '文本',
  choice: '单选',
}

const hasError = computed(() => props.error.length > 0)

/** 单选占位符候选项的展示文本 */
function formatOptions(def: SnippetPlaceholderDef): string {
  return def.options.join(' / ')
}
</script>

<template>
  <section
    class="snippet-placeholder-inspector"
    :class="{ 'is-error': hasError }"
    aria-label="占位符定义"
  >
    <!-- 头部：标题 + 数量 -->
    <header class="snippet-placeholder-inspector__header">
      <AppIcon :icon="hasError ? 'material-symbols:error' : 'material-symbols:label'" :size="14" />
      <span class="snippet-placeholder-inspector__title">占位符</span>
      <span v-if="!hasError" class="snippet-placeholder-inspector__count">
        {{ props.defs.length }} 个
      </span>
    </header>

    <!-- 错误态：模板中的占位符语法不合法 -->
    <p v-if="hasError" class="snippet-placeholder-inspector__error">
      {{ props.error }}
    </p>

    <!-- 正常态：逐条列出占位符定义 -->
    <ul v-else class="snippet-placeholder-inspector__list">
      <li
        v-for="def in props.defs"
        :key="def.name"
        class="snippet-placeholder-inspector__item"
      >
        <code class="snippet-placeholder-inspector__name">{{ def.name }}</code>
        <span
          class="snippet-placeholder-inspector__kind"
          :data-kind="def.kind"
        >
          {{ kindLabels[def.kind] ?? def.kind }}
        </span>
        <span v-if="def.defaultValue" class="snippet-placeholder-inspector__meta">
          默认 {{ def.defaultValue }}
        </span>
        <span v-if="def.options.length > 0" class="snippet-placeholder-inspector__meta">
          候选 {{ formatOptions(def) }}
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.snippet-placeholder-inspector {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgb(var(--color-border-glass-rgb) / 0.12);
  border-radius: var(--radius-md);
  background: rgb(var(--color-surface-variant-rgb) / 0.3);
}

/* ─── 头部 ─────────────────────────────────────────────────────────────── */
.snippet-placeholder-inspector__header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-heading);
  font-size: var(--text-xs);
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}

.snippet-placeholder-inspector__header > svg {
  color: rgb(var(--color-primary-rgb));
  opacity: 0.9;
}

.snippet-placeholder-inspector__count {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 400;
  color: rgb(var(--color-text-tertiary-rgb));
}

/* ─── 错误态 ───────────────────────────────────────────────────────────── */
.snippet-placeholder-inspector.is-error {
  border-color: rgb(var(--color-error-rgb) / 0.35);
  background: rgb(var(--color-error-rgb) / 0.06);
}

.snippet-placeholder-inspector.is-error .snippet-placeholder-inspector__header > svg {
  color: rgb(var(--color-error-rgb));
}

.snippet-placeholder-inspector__error {
  font-size: var(--text-xs);
  line-height: 1.5;
  color: rgb(var(--color-error-rgb));
}

/* ─── 定义列表 ─────────────────────────────────────────────────────────── */
.snippet-placeholder-inspector__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.snippet-placeholder-inspector__item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.75rem;
  color: rgb(var(--color-text-secondary-rgb));
}

.snippet-placeholder-inspector__name {
  padding: 1px 8px;
  border-radius: 6px;
  border: 1px solid rgb(var(--color-border-glass-rgb) / 0.5);
  background: rgb(var(--color-surface-rgb));
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-primary-rgb));
}

.snippet-placeholder-inspector__kind {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgb(var(--color-primary-rgb) / 0.12);
  color: rgb(var(--color-primary-rgb));
  font-size: 0.6875rem;
}

.snippet-placeholder-inspector__kind[data-kind='choice'] {
  background: rgb(var(--color-warning-rgb, var(--color-primary-rgb)) / 0.12);
  color: rgb(var(--color-warning-rgb, var(--color-primary-rgb)));
}

.snippet-placeholder-inspector__meta {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: rgb(var(--color-text-tertiary-rgb));
}
</style>
