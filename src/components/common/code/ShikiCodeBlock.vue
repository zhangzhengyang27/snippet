<script setup lang="ts">
/**
 * ShikiCodeBlock - 只读代码高亮展示组件（替代只读场景下的 Monaco）。
 *
 * - 主题跟随应用 `.dark` 类（双主题，无需重渲染）
 * - 支持行号、折行、字号、最小/最大高度
 * - 高亮就绪前先渲染纯文本兜底，避免空白抖动
 *
 * 与 `MonacoCodeEditor` 的关系：`MonacoCodeEditor` 仅保留给「新建/编辑片段」对话框
 * （需要可编辑能力），其余只读展示统一走本组件，从而把 Monaco 这个大依赖移出首屏。
 */
import { computed, ref, watch } from 'vue'
import type { BundledLanguage } from 'shiki'
import {
  getShikiHighlighter,
  mapShikiLanguage,
  escapeHtml,
  SHIKI_THEME_LIGHT,
  SHIKI_THEME_DARK,
} from '@/utils/shiki'

interface Props {
  /** 代码内容 */
  code?: string
  /** 代码语言（与 MonacoCodeEditor 一致的语言标识） */
  language?: string
  /** 是否显示行号 */
  showLineNumbers?: boolean
  /** 是否折行 */
  wordWrap?: boolean
  /** 最小高度 */
  minHeight?: string
  /** 最大高度 */
  maxHeight?: string
  /** 字体大小 */
  fontSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  code: '',
  language: 'text',
  showLineNumbers: true,
  wordWrap: true,
  minHeight: '120px',
  maxHeight: '480px',
  fontSize: 13,
})

const html = ref('')
const ready = ref(false)

async function render() {
  const code = props.code ?? ''
  const lang = mapShikiLanguage(props.language) as BundledLanguage
  const hl = await getShikiHighlighter()
  try {
    html.value = hl.codeToHtml(code, {
      lang,
      themes: { light: SHIKI_THEME_LIGHT, dark: SHIKI_THEME_DARK },
      defaultColor: false,
    })
  } catch {
    // 极端情况下语言未预载：退化为纯文本，保证内容可见
    html.value = `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`
  }
  ready.value = true
}

watch(() => [props.code, props.language], render, { immediate: true })

const rootClass = computed(() => ({
  'shiki-code-block': true,
  'show-line-numbers': props.showLineNumbers,
  wrap: props.wordWrap,
}))
</script>

<template>
  <div
    :class="rootClass"
    :style="{
      minHeight: minHeight,
      maxHeight: maxHeight,
      fontSize: fontSize + 'px',
    }"
  >
    <!-- 高亮就绪前的纯文本兜底，避免空白/布局抖动 -->
    <div v-if="!ready" class="shiki-code-block__fallback"><pre>{{ code }}</pre></div>
    <div v-else class="shiki-code-block__body" v-html="html"></div>
  </div>
</template>

<style scoped>
.shiki-code-block {
  width: 100%;
  overflow: auto;
  border-radius: var(--radius-md, 8px);
  background: var(--monaco-editor-bg, rgb(var(--color-surface-bright-rgb)));
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas,
    'DejaVu Sans Mono', 'Liberation Mono', monospace;
  line-height: 22px;
}

.shiki-code-block__fallback pre {
  margin: 0;
  padding: 16px;
  white-space: pre;
  color: var(--color-text-secondary);
}

.shiki-code-block__body :deep(.shiki) {
  margin: 0;
  padding: 16px;
  background: transparent !important;
  white-space: pre;
}

.shiki-code-block.wrap .shiki-code-block__body :deep(.shiki) {
  white-space: pre-wrap;
  word-break: break-word;
}

.shiki-code-block__body :deep(.shiki) code {
  display: block;
  font-family: inherit;
}

.shiki-code-block__body :deep(.shiki .line) {
  display: block;
  min-height: 22px;
}

/* 行号：计数基于 .line，跟随折行 */
.shiki-code-block.show-line-numbers .shiki-code-block__body :deep(.shiki code) {
  counter-reset: step;
  counter-increment: step 0;
}

.shiki-code-block.show-line-numbers .shiki-code-block__body :deep(.shiki .line)::before {
  content: counter(step);
  counter-increment: step;
  display: inline-block;
  width: 2ch;
  margin-right: 1.25rem;
  text-align: right;
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

/* 双主题色：跟随应用 `.dark` 类切换（shiki 输出 --shiki-light / --shiki-dark 变量） */
.shiki-code-block__body :deep(.shiki),
.shiki-code-block__body :deep(.shiki span) {
  color: var(--shiki-light);
}

:global(.dark) .shiki-code-block__body :deep(.shiki),
:global(.dark) .shiki-code-block__body :deep(.shiki span) {
  color: var(--shiki-dark);
}
</style>
