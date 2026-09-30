<script setup lang="ts">
/**
 * CodeBlock - 统一的代码块组件
 *
 * 基于 Shiki 进行语法高亮，跟随应用主题（dark/light）。
 * 支持行号、复制、折叠、macOS 三圆点装饰、标题栏。
 *
 * 设计原则：
 *  - 不硬编码色值，全部使用项目 CSS 变量（设计令牌）
 *  - 复用 useCopy composable 实现复制
 *  - 复用 useTheme 实现主题跟随
 *  - 复用 highlighter.ts 单例
 *
 * 用法：
 *   <CodeBlock :code="code" language="typescript" />
 *   <CodeBlock :code="code" language="vue" variant="macos" :show-line-numbers="true" />
 */
import { computed, onScopeDispose, ref, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'
import { useCopy } from '@/composables/useCopy'
import { useTheme } from '@/composables/useTheme'
import { highlightCode, getShikiTheme, escapeHtml } from '@/utils/highlighter'

export type CodeBlockVariant = 'default' | 'macos' | 'minimal'

/**
 * 高亮防抖窗口。
 *
 * 列表里用方向键连续切换片段时，每按一次都会换一份 code —— 若每次都立刻跑一遍
 * Shiki（含按需加载 grammar），会堆积大量无用计算，长会话下尤其明显。
 * 首帧仍然**立即**渲染，只有「切换」才走防抖，避免首屏可感知的延迟。
 */
const HIGHLIGHT_DEBOUNCE_MS = 120

interface Props {
  /** 代码内容 */
  code: string
  /** 代码语言（html / css / js / ts / vue / json / bash / md / python / java / go / sql / yaml / jsx / tsx 等） */
  language?: string
  /** 标题栏显示的文件名；为空时显示语言名 */
  title?: string
  /** 视觉变体：default / macos（红黄绿三圆点）/ minimal（无标题栏） */
  variant?: CodeBlockVariant
  /** 是否显示行号 */
  showLineNumbers?: boolean
  /** 是否显示复制按钮 */
  showCopyButton?: boolean
  /** 是否可折叠 */
  collapsible?: boolean
  /** 是否折行显示 */
  wrapLines?: boolean
  /** 是否显示语言颜色 dot */
  showLanguageTag?: boolean
  /** 最大高度（CSS 长度值） */
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  language: 'text',
  title: '',
  variant: 'default',
  showLineNumbers: true,
  showCopyButton: true,
  collapsible: false,
  wrapLines: false,
  showLanguageTag: true,
  maxHeight: '360px',
})

const { theme } = useTheme()
const { copy, copied } = useCopy()

const isCollapsed = ref(false)
const highlightedCode = ref('')
const isHighlighting = ref(false)

const isMinimal = computed(() => props.variant === 'minimal')
const isMacos = computed(() => props.variant === 'macos')

/** 标题栏显示文字：优先 title，否则显示 language */
const displayTitle = computed(() => props.title || props.language)

const languageColor = computed(() => {
  const key = props.language.toLowerCase()
  // 使用 CSS 自定义属性，值定义在 main.css 的设计令牌中
  const varName = `--color-codeblock-lang-${key}`
  // 回退到 text 中性色
  return `var(${varName}, var(--color-codeblock-lang-text))`
})

const lineCount = computed(() => {
  const normalized = props.code.replace(/\r\n?/g, '\n').replace(/\n+$/g, '')
  if (!normalized) return 1
  return normalized.split('\n').length
})

const lineNumbers = computed(() => Array.from({ length: lineCount.value }, (_, i) => i + 1))

/**
 * 渲染序号：高亮是异步的（Shiki 按需加载 grammar），期间若 code 又变了，
 * 旧结果必须丢弃——否则会把上一次片段的代码渲染到当前片段上。
 */
let renderSeq = 0
let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function renderHighlight() {
  const seq = ++renderSeq

  if (!props.code) {
    highlightedCode.value = ''
    isHighlighting.value = false
    return
  }

  isHighlighting.value = true
  try {
    const html = await highlightCode(props.code, props.language, getShikiTheme(theme.value))
    if (seq !== renderSeq) return
    highlightedCode.value = html
  } catch {
    if (seq !== renderSeq) return
    highlightedCode.value = `<pre class="cb-fallback"><code>${escapeHtml(props.code)}</code></pre>`
  } finally {
    if (seq === renderSeq) isHighlighting.value = false
  }
}

function cancelPendingHighlight() {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

function scheduleHighlight() {
  cancelPendingHighlight()
  // 立刻进入加载态：否则防抖窗口内会继续显示上一段代码，看起来像渲染错了
  if (props.code) isHighlighting.value = true
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void renderHighlight()
  }, HIGHLIGHT_DEBOUNCE_MS)
}

onScopeDispose(() => {
  cancelPendingHighlight()
  // 递增序号让仍在飞行中的高亮结果回来时被丢弃
  renderSeq += 1
})

// 首帧直接渲染，不经过防抖（保证首屏无额外延迟）
void renderHighlight()

watch(
  () => [props.code, props.language, theme.value],
  () => {
    scheduleHighlight()
  }
)

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

async function handleCopy() {
  if (!props.code.trim()) return
  await copy(props.code)
}
</script>

<template>
  <div class="code-block" :class="[`cb-variant-${variant}`, { 'is-collapsed': isCollapsed }]">
    <div v-if="!isMinimal" class="cb-header">
      <div class="cb-header__left">
        <div v-if="isMacos" class="cb-header__dots" aria-hidden="true">
          <span class="cb-header__dot cb-header__dot--red"></span>
          <span class="cb-header__dot cb-header__dot--yellow"></span>
          <span class="cb-header__dot cb-header__dot--green"></span>
        </div>
        <span
          v-if="showLanguageTag"
          class="cb-header__lang-dot"
          :style="{ backgroundColor: languageColor }"
          aria-hidden="true"
        ></span>
        <span class="cb-header__title">{{ displayTitle }}</span>
      </div>
      <div class="cb-header__actions">
        <AppButton
          v-if="collapsible"
          class="cb-header__btn"
          :title="isCollapsed ? '展开' : '折叠'"
          @click="toggleCollapse"
        >
          <AppIcon :icon="isCollapsed ? 'material-symbols:arrow-drop-down' : 'material-symbols:arrow-drop-up'" :size="14" />
        </AppButton>
        <AppButton
          v-if="showCopyButton"
          class="cb-header__btn"
          :class="{ 'cb-header__btn--copied': copied }"
          :title="copied ? '已复制' : '复制代码'"
          @click="handleCopy"
        >
          <AppIcon :icon="copied ? 'material-symbols:check' : 'material-symbols:content-copy'" :size="14" />
        </AppButton>
      </div>
    </div>

    <div
      v-show="!isCollapsed"
      class="cb-body"
      :class="{ 'cb-body--wrap': wrapLines }"
      :style="{ maxHeight: maxHeight }"
    >
      <div v-if="isHighlighting" class="cb-loading">高亮中...</div>
      <template v-else>
        <div v-if="!highlightedCode" class="cb-empty">无代码</div>
        <div v-else class="cb-code-wrap">
          <div v-if="showLineNumbers" class="cb-gutter" aria-hidden="true">
            <div v-for="n in lineNumbers" :key="n" class="cb-gutter__line">{{ n }}</div>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -- Shiki 输出受信任的内联样式 HTML -->
          <div class="cb-code" v-html="highlightedCode"></div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.code-block {
  position: relative;
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  background-color: rgb(var(--color-surface-bright-rgb));
  color: rgb(var(--color-text-rgb));
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.7;
}

/* ── Header ─────────────────────────────────────────────────────────── */
.cb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background-color: rgb(var(--color-surface-rgb));
  color: rgb(var(--color-text-secondary-rgb));
  border-bottom: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
}

.cb-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.cb-header__dots {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.cb-header__dot {
  display: block;
  width: 11px;
  height: 11px;
  border-radius: 50%;
}

/* macOS 三圆点色值走设计令牌（main.css --color-codeblock-macos-*） */
.cb-header__dot--red {
  background: var(--color-codeblock-macos-red);
}

.cb-header__dot--yellow {
  background: var(--color-codeblock-macos-yellow);
}

.cb-header__dot--green {
  background: var(--color-codeblock-macos-green);
}

.cb-header__lang-dot {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cb-header__title {
  font-weight: 600;
  font-size: var(--text-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cb-header__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cb-header__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--radius, 6px);
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
  transition:
    background var(--duration-base, 0.2s) var(--ease-out, ease),
    color var(--duration-base, 0.2s) var(--ease-out, ease);
}

.cb-header__btn:hover {
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  color: rgb(var(--color-text-rgb));
}

.cb-header__btn--copied {
  color: rgb(var(--color-primary-rgb));
}

/* ── Body ───────────────────────────────────────────────────────────── */
.cb-body {
  position: relative;
  overflow: auto;
  background-color: rgb(var(--color-surface-bright-rgb));
}

.cb-body--wrap .cb-code :deep(pre) {
  white-space: pre-wrap;
  word-break: break-all;
}

.cb-loading,
.cb-empty {
  padding: 24px;
  text-align: center;
  color: rgb(var(--color-text-secondary-rgb));
}

.cb-code-wrap {
  display: flex;
  min-width: fit-content;
}

.cb-gutter {
  display: flex;
  flex-direction: column;
  padding: 16px 10px;
  background-color: rgb(var(--color-surface-rgb));
  color: rgb(var(--color-text-secondary-rgb));
  text-align: right;
  user-select: none;
  border-right: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  position: sticky;
  left: 0;
  z-index: 1;
}

.cb-gutter__line {
  font-size: var(--text-xs);
  line-height: 1.7;
  min-width: 1.5em;
}

.cb-code {
  flex: 1;
  min-width: 0;
}

/* Shiki 输出 <pre><code>...</code></pre>，需要重置其默认样式以贴合容器 */
.cb-code :deep(pre) {
  margin: 0;
  padding: 16px;
  background: transparent !important;
}

.cb-code :deep(code) {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

/* 降级渲染样式 */
.cb-code :deep(.cb-fallback) {
  margin: 0;
  padding: 16px;
  background: transparent;
  color: rgb(var(--color-text-rgb));
  white-space: pre;
  overflow-x: auto;
}

.cb-code :deep(.cb-fallback code) {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

/* ── Variant 修饰 ───────────────────────────────────────────────────── */
.cb-variant-macos {
  border-radius: 12px;
}

.cb-variant-minimal {
  border-radius: var(--radius, 8px);
}

.cb-variant-minimal .cb-body {
  border-radius: var(--radius, 8px);
}

/* 折叠态隐藏 body 的圆角溢出问题 */
.code-block.is-collapsed .cb-header {
  border-bottom: none;
}
</style>
