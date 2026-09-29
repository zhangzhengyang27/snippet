<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { CodeExample, CodeTab } from '@/types'
import { toast } from '@/composables/useToast'
import { useCopy } from '@/composables/useCopy'
import * as prettierStandalone from 'prettier/standalone'
import parserHtml from 'prettier/plugins/html'
import parserPostcss from 'prettier/plugins/postcss'
import parserBabel from 'prettier/plugins/babel'
import parserEstree from 'prettier/plugins/estree'

// Monaco Editor（统一封装组件，跟随应用主题）
import { MonacoCodeEditor } from '@/components/common/code'

import { updateExample } from '@/api/examples'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'

// ── Props / Emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  example: CodeExample
  activeTab?: CodeTab
  activeSnippet?: { label: string; css?: string; html?: string; js?: string }
  readOnly?: boolean
  /** 为 true 时不调用内部保存 API，改为通过 save 事件交给父组件处理 */
  customSave?: boolean
  /** 传入单一源码时覆盖 example 的 html/css/js 逻辑 */
  sourceCode?: string
  /** 单一源码的语言，用于 Monaco（如 vue、typescript） */
  sourceLanguage?: string
  /** 交互式演示的片段列表 */
  snippets?: { label: string; css?: string; html?: string; js?: string }[]
  /** 当前激活的片段索引 */
  activeSnippetIndex?: number
  /** 统一模式：将 html/css/js 合并为一个完整 HTML 文档展示 */
  unified?: boolean
}>()

const emit = defineEmits<{
  'tab-change': [tab: CodeTab]
  copy: [code: string]
  'code-change': [tab: CodeTab, code: string]
  save: [example: CodeExample]
  'snippet-change': [
    snippet: { label: string; css?: string; html?: string; js?: string } | undefined,
  ]
  'update:activeSnippetIndex': [index: number]
}>()

// ── Edit mode state ──────────────────────────────────────────────────────────
const isEditing = ref(false)
const isSaving = ref(false)
const saveStatus = ref<'idle' | 'success' | 'error'>('idle')
const isRunning = ref(false)

// 各 Tab 的编辑缓存
const editedCode = ref<Record<CodeTab, string>>({
  html: '',
  css: '',
  js: '',
})

// sourceCode 模式下的编辑缓存
const editedSourceCode = ref<string>('')

// Monaco Editor value（通过 MonacoCodeEditor 的 v-model 双向绑定）
const monacoValue = ref('')

// 跟踪 handleRun / handleSave 中的状态重置定时器，便于组件卸载时统一清理。
// 用独立变量而非共享数组：避免 clearStatusTimers 误清对方的状态。
let runStatusTimer: ReturnType<typeof setTimeout> | null = null
let saveStatusTimer: ReturnType<typeof setTimeout> | null = null

onBeforeUnmount(() => {
  if (runStatusTimer) {
    clearTimeout(runStatusTimer)
    runStatusTimer = null
  }
  if (saveStatusTimer) {
    clearTimeout(saveStatusTimer)
    saveStatusTimer = null
  }
})

// ── Internal tab state (self-managed when activeTab prop not provided) ───────
const internalTab = ref<CodeTab>('js')

const effectiveTab = computed<CodeTab>(() => {
  return props.activeTab ?? internalTab.value
})

// ── Available tabs (only show those with content) ────────────────────────────
interface TabDef {
  key: CodeTab
  label: string
  lang: string
}

const allTabs: TabDef[] = [
  { key: 'html', label: 'HTML', lang: 'html' },
  { key: 'css', label: 'CSS', lang: 'css' },
  { key: 'js', label: 'JS', lang: 'js' },
]

// ── Prettier formatting (standalone + plugins) ────────────────────────────────
// prettier 插件动态加载，类型以 any 兼容多版本（no-explicit-any 已在 eslint 全局关闭）
const parserPlugins: Record<string, { parser: string; plugins: any[] }> = {
  html: { parser: 'html', plugins: [parserHtml] },
  css: { parser: 'css', plugins: [parserPostcss] },
  js: { parser: 'babel', plugins: [parserBabel, parserEstree] },
  vue: { parser: 'html', plugins: [parserHtml] },
  ts: { parser: 'babel', plugins: [parserBabel, parserEstree] },
  typescript: { parser: 'babel', plugins: [parserBabel, parserEstree] },
}

async function formatCode(code: string, lang: string): Promise<string> {
  if (!code) return ''

  const config = parserPlugins[lang] ?? parserPlugins['html']
  try {
    const formatted = await prettierStandalone.format(code, {
      parser: config.parser,
      plugins: config.plugins,
      semi: false,
      singleQuote: true,
      printWidth: 100,
    })
    // Prettier appends a trailing newline; drop it so Monaco line count matches visible lines.
    return formatted.replace(/\n$/, '')
  } catch {
    return code
  }
}

// ── Extract JS from HTML <script> tags ───────────────────────────────────────
const extractedJs = computed<string>(() => {
  const html = props.example.html ?? ''
  const match = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i)
  return match ? match[1].trim() : ''
})

// ── HTML without <script> block (for HTML tab display) ───────────────────────
const htmlWithoutScript = computed<string>(() => {
  const html = props.example.html ?? ''
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').trim()
})

const sourceTabLabel = computed<string>(() => {
  const lang = props.sourceLanguage
  if (lang === 'vue') return 'Vue'
  if (lang === 'ts' || lang === 'typescript') return 'TypeScript'
  if (lang === 'js' || lang === 'javascript') return 'JS'
  if (lang === 'html') return 'HTML'
  if (lang === 'css') return 'CSS'
  return '源码'
})

// ── Unified mode: merge html/css/js into a single complete HTML document ────
function isFullDocument(html: string): boolean {
  return /<!doctype\s|<html[\s>]|<head[\s>]|<body[\s>]/i.test(html)
}

const unifiedHtml = computed<string>(() => {
  const ex = props.example
  const snippet = props.activeSnippet
  const rawHtml = (snippet?.html ?? ex.html ?? '').trim()
  const css = [ex.css ?? '', snippet?.css ?? ''].filter(Boolean).join('\n')
  const js = [ex.js ?? '', snippet?.js ?? ''].filter(Boolean).join('\n')

  // 已经是完整文档：注入 style/script
  if (isFullDocument(rawHtml)) {
    let doc = rawHtml
    if (css) {
      const styleTag = `<style>\n${css}\n</style>`
      doc = doc.replace(/<\/head>/i, `  ${styleTag}\n</head>`)
    }
    if (js) {
      const scriptTag = `<script>\n${js}\n</scr` + 'ipt>'
      doc = doc.replace(/<\/body>/i, `  ${scriptTag}\n</body>`)
    }
    return doc
  }

  // 片段式代码：包装为完整文档
  const parts: string[] = ['<!DOCTYPE html>', '<html lang="zh-CN">', '<head>']
  parts.push('  <meta charset="UTF-8">')
  parts.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">')
  if (ex.title) parts.push(`  <title>${ex.title}</title>`)
  if (css) {
    parts.push('  <style>')
    parts.push(...css.split('\n').map((l) => `    ${l}`))
    parts.push('  </style>')
  }
  parts.push('</head>')
  parts.push('<body>')
  parts.push(...rawHtml.split('\n').map((l) => `  ${l}`))
  if (js) {
    parts.push('  <script>')
    parts.push(...js.split('\n').map((l) => `    ${l}`))
    parts.push('  </scr' + 'ipt>')
  }
  parts.push('</body>')
  parts.push('</html>')
  return parts.join('\n')
})

const availableTabs = computed<TabDef[]>(() => {
  if (props.sourceCode !== undefined) {
    const key = (props.sourceLanguage as CodeTab) ?? 'js'
    return [{ key, label: sourceTabLabel.value, lang: props.sourceLanguage ?? 'javascript' }]
  }
  if (props.unified) {
    return [{ key: 'html', label: 'HTML', lang: 'html' }]
  }
  return allTabs.filter((t) => {
    if (t.key === 'html') return !!props.example.html
    if (t.key === 'css') return !!props.example.css
    if (t.key === 'js') return !!(props.example.js || extractedJs.value)
    return false
  })
})

// Auto-select first available tab when current tab has no content
watch(
  availableTabs,
  (tabs) => {
    if (tabs.length > 0 && !tabs.find((t) => t.key === effectiveTab.value)) {
      internalTab.value = tabs[0].key
      emit('tab-change', tabs[0].key)
    }
  },
  { immediate: true }
)

// ── Current source code (raw) ────────────────────────────────────────────────
const currentCode = computed<string>(() => {
  if (props.sourceCode !== undefined) {
    return props.sourceCode
  }
  if (props.unified) {
    return unifiedHtml.value
  }
  const ex = props.example
  const snippet = props.activeSnippet

  switch (effectiveTab.value) {
    case 'html':
      return snippet?.html ?? htmlWithoutScript.value ?? ''
    case 'css': {
      const base = ex.css ?? ''
      return snippet?.css ? `${base}\n${snippet.css}` : base
    }
    case 'js': {
      if (snippet?.js) {
        const base = ex.js ?? ''
        return `${base}\n${snippet.js}`
      }
      return ex.js ?? extractedJs.value
    }
    default:
      return ''
  }
})

async function resolveMonacoValue(): Promise<string> {
  if (!isEditing.value) {
    const tab = availableTabs.value.find((t) => t.key === effectiveTab.value)
    return formatCode(currentCode.value, tab?.lang ?? 'html')
  }
  if (props.sourceCode !== undefined) {
    return editedSourceCode.value
  }
  return editedCode.value[effectiveTab.value] || currentCode.value
}

async function applyMonacoValue(): Promise<void> {
  // MonacoCodeEditor 通过 v-model 自动同步，这里只需要更新 value
  monacoValue.value = await resolveMonacoValue()
}

// Sync Monaco value between view mode and edit mode
watch(
  [currentCode, effectiveTab, () => isEditing.value],
  () => {
    applyMonacoValue()
  },
  { immediate: true }
)

// ── Edit mode helpers ───────────────────────────────────────────────────────
// MonacoCodeEditor 内部已维护业务语言 → Monaco 语言 ID 的映射，
// SourcePane 只需透传原始语言标识（vue / html / css / js 等）。
const monacoLanguage = computed<string>(() => {
  return props.sourceLanguage ?? effectiveTab.value
})

const hasUnsavedChanges = computed<boolean>(() => {
  if (!isEditing.value) return false
  if (props.sourceCode !== undefined) {
    return editedSourceCode.value !== props.sourceCode
  }
  const tab = effectiveTab.value
  const current = currentCode.value
  const edited = editedCode.value[tab]
  return edited !== current
})

// ── Run handler ──────────────────────────────────────────────────────────────
function handleRun(): void {
  if (!isEditing.value) return
  isRunning.value = true
  if (props.sourceCode !== undefined) {
    emit('code-change', (props.sourceLanguage as CodeTab) ?? 'js', editedSourceCode.value)
  } else if (props.unified) {
    emit('code-change', 'html', editedCode.value.html)
  } else {
    const tab = effectiveTab.value
    const code = editedCode.value[tab]
    emit('code-change', tab, code)
  }
  if (runStatusTimer) clearTimeout(runStatusTimer)
  runStatusTimer = setTimeout(() => {
    isRunning.value = false
    runStatusTimer = null
  }, 300)
}

// ── Save handler ─────────────────────────────────────────────────────────────
async function handleSave(): Promise<void> {
  if (props.readOnly || !isEditing.value || !hasUnsavedChanges.value) return
  // 清理上一次 saveStatus 重置定时器，避免旧定时器错误地把新的 success/error 状态重置为 idle
  if (saveStatusTimer) {
    clearTimeout(saveStatusTimer)
    saveStatusTimer = null
  }
  isSaving.value = true
  saveStatus.value = 'idle'

  try {
    if (props.sourceCode !== undefined) {
      // sourceCode 模式：将当前编辑内容应用到预览，并交给父组件处理保存
      const updated: CodeExample = { ...props.example }
      emit('code-change', (props.sourceLanguage as CodeTab) ?? 'js', editedSourceCode.value)
      saveStatus.value = 'success'
      toast.success('保存成功')
      emit('save', updated)
    } else if (props.unified) {
      // unified 模式：整体保存为 html，清空独立的 css/js
      const updateData: Partial<CodeExample> = { html: editedCode.value.html, css: '', js: '' }
      if (props.customSave) {
        const updated: CodeExample = { ...props.example, ...updateData }
        saveStatus.value = 'success'
        toast.success('保存成功')
        emit('save', updated)
      } else {
        const updated = await updateExample(props.example.id, updateData)
        saveStatus.value = 'success'
        toast.success('保存成功')
        emit('save', updated)
      }
    } else {
      const updateData: Partial<CodeExample> = {}
      if (hasUnsavedChangesForTab('html')) updateData.html = editedCode.value.html
      if (hasUnsavedChangesForTab('css')) updateData.css = editedCode.value.css
      if (hasUnsavedChangesForTab('js')) updateData.js = editedCode.value.js

      if (props.customSave) {
        const updated: CodeExample = { ...props.example, ...updateData }
        saveStatus.value = 'success'
        toast.success('保存成功')
        emit('save', updated)
      } else {
        const updated = await updateExample(props.example.id, updateData)
        saveStatus.value = 'success'
        toast.success('保存成功')
        emit('save', updated)
      }
    }
  } catch {
    saveStatus.value = 'error'
    toast.error('保存失败')
  } finally {
    isSaving.value = false
    saveStatusTimer = setTimeout(() => {
      saveStatus.value = 'idle'
      saveStatusTimer = null
    }, 2000)
  }
}

function hasUnsavedChangesForTab(tab: CodeTab): boolean {
  const current =
    tab === 'html'
      ? (props.example.html ?? '')
      : tab === 'css'
        ? (props.example.css ?? '')
        : (props.example.js ?? extractedJs.value ?? '')
  return editedCode.value[tab] !== current
}

// ── Reset handler ─────────────────────────────────────────────────────────────
function handleReset(): void {
  if (!isEditing.value) return
  if (props.sourceCode !== undefined) {
    editedSourceCode.value = props.sourceCode
    return
  }
  if (props.unified) {
    editedCode.value.html = unifiedHtml.value
    monacoValue.value = unifiedHtml.value
    return
  }
  const tab = effectiveTab.value
  const original =
    tab === 'html'
      ? (props.example.html ?? '')
      : tab === 'css'
        ? (props.example.css ?? '')
        : (props.example.js ?? extractedJs.value ?? '')
  editedCode.value[tab] = original
}

// ── Edit mode toggle ─────────────────────────────────────────────────────────
async function enterEditMode(): Promise<void> {
  isEditing.value = true

  if (props.sourceCode !== undefined) {
    // sourceCode 模式：直接格式化并缓存单一源码
    const lang = props.sourceLanguage ?? 'javascript'
    editedSourceCode.value = await formatCode(props.sourceCode, lang)
    monacoValue.value = editedSourceCode.value
  } else if (props.unified) {
    // unified 模式：格式化合并后的完整文档
    const merged = await formatCode(unifiedHtml.value, 'html')
    editedCode.value = { html: merged, css: '', js: '' }
    monacoValue.value = merged
  } else {
    // Format code before editing
    const [html, css, js] = await Promise.all([
      formatCode(props.example.html ?? '', 'html'),
      formatCode(props.example.css ?? '', 'css'),
      formatCode(props.example.js ?? extractedJs.value ?? '', 'js'),
    ])
    editedCode.value = { html, css, js }
    monacoValue.value = editedCode.value[effectiveTab.value]
  }

  // readOnly 切换由 MonacoCodeEditor 的 :read-only prop 自动响应
}

const showConfirmDialog = ref(false)
let dialogResolve: ((value: boolean) => void) | null = null

function showExitDialog(): Promise<boolean> {
  showConfirmDialog.value = true
  return new Promise<boolean>((resolve) => {
    dialogResolve = resolve
  })
}

function handleDialogConfirm(): void {
  showConfirmDialog.value = false
  dialogResolve?.(true)
  dialogResolve = null
}

function handleDialogCancel(): void {
  showConfirmDialog.value = false
  dialogResolve?.(false)
  dialogResolve = null
}

async function exitEditMode(): Promise<void> {
  if (hasUnsavedChanges.value) {
    const confirmed = await showExitDialog()
    if (!confirmed) return
  }
  isEditing.value = false
  saveStatus.value = 'idle'
  // readOnly 切换由 MonacoCodeEditor 的 :read-only prop 自动响应
}

function handleMonacoChange(value: string): void {
  if (props.sourceCode !== undefined) {
    editedSourceCode.value = value
  } else {
    editedCode.value[effectiveTab.value] = value
  }
  // monacoValue 由 v-model 自动同步，无需手动赋值
}

// ── Copy handler ─────────────────────────────────────────────────────────────
// useCopy 内部已封装 useClipboard + toast 反馈 + 错误降级
const { copy, copied } = useCopy()

async function handleCopy(): Promise<void> {
  const code = currentCode.value
  if (!code) return
  await copy(code)
  emit('copy', code)
}

// ── Tab click ────────────────────────────────────────────────────────────────
function selectTab(tab: CodeTab | string): void {
  const t = tab as CodeTab
  internalTab.value = t
  emit('tab-change', t)
}

// ── Monaco Editor 配置（通过 MonacoCodeEditor 统一组件） ──────────────────────
// 主题跟随、字体、行号、自动布局等均由 MonacoCodeEditor 内部统一处理。
// 这里只需要计算当前编辑模式是否只读，以及当前 tab 对应的语言。
const isReadOnly = computed(() => !isEditing.value || props.readOnly)
</script>

<template>
  <div class="source-pane-root">
    <!-- ── Tab bar ─────────────────────────────────────────────────────── -->
    <div class="tab-bar">
      <div class="source-tabs-list">
        <button
          v-for="tab in availableTabs"
          :key="tab.key"
          class="tab-trigger"
          :class="{ 'tab-active': effectiveTab === tab.key }"
          @click="selectTab(tab.key as CodeTab)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="!props.readOnly" class="edit-actions">
        <template v-if="!isEditing">
          <AppButton class="edit-btn" @click="enterEditMode">
            <AppIcon icon="material-symbols:edit" :size="14" />
            <span>编辑</span>
          </AppButton>
        </template>

        <template v-else>
          <AppButton :class="{ 'run-btn-active': isRunning }" @click="handleRun">
            <AppIcon icon="material-symbols:play-circle" :size="14" />
            <span>{{ isRunning ? '已运行' : '运行' }}</span>
          </AppButton>
          <AppButton
            :class="{
              'save-btn-success': saveStatus === 'success',
              'save-btn-error': saveStatus === 'error',
              'save-btn-highlight': hasUnsavedChanges,
            }"
            :disabled="isSaving || !hasUnsavedChanges"
            @click="handleSave"
          >
            <AppIcon v-if="isSaving" icon="material-symbols:progress-activity" :size="14" class="spin" />
            <AppIcon v-else-if="saveStatus === 'success'" icon="material-symbols:check" :size="14" />
            <AppIcon v-else icon="material-symbols:save" :size="14" />
            <span>{{
              saveStatus === 'success' ? '已保存' : saveStatus === 'error' ? '保存失败' : '保存'
            }}</span>
          </AppButton>
          <AppButton :disabled="!hasUnsavedChanges" @click="handleReset">
            <AppIcon icon="material-symbols:restart-alt" :size="14" />
            <span>重置</span>
          </AppButton>
          <AppButton class="exit-edit-btn" @click="exitEditMode">
            <AppIcon icon="material-symbols:cancel" :size="14" />
            <span>退出编辑</span>
          </AppButton>
        </template>
      </div>

      <div class="tab-actions">
        <AppButton
          :class="{ 'copy-btn-copied': copied }"
          :title="copied ? '已复制！' : '复制代码'"
          @click="handleCopy"
        >
          <AppIcon v-if="copied" icon="material-symbols:check" :size="14" />
          <AppIcon v-else icon="material-symbols:content-copy" :size="14" />
          <span>{{ copied ? '已复制' : '复制' }}</span>
        </AppButton>
      </div>
    </div>

    <!-- ── Code area ───────────────────────────────────────────────────── -->
    <div class="code-area">
      <div class="monaco-editor-container">
        <MonacoCodeEditor
          v-model="monacoValue"
          :language="monacoLanguage"
          :read-only="isReadOnly"
          :min-height="'100%'"
          :max-height="'100%'"
          :word-wrap="false"
          :update-delay="200"
          @change="handleMonacoChange"
        />
      </div>
    </div>
  </div>

  <AppModal v-model:open="showConfirmDialog" class="dialog-box" :mask="true">
    <template #title>
      <h3 class="dialog-title">确认退出编辑</h3>
    </template>
    <p class="dialog-message">您有未保存的修改，退出后将丢失这些更改。</p>
    <template #footer>
      <AppButton class="dialog-btn-cancel" @click="handleDialogCancel">取消</AppButton>
      <AppButton class="dialog-btn-confirm" @click="handleDialogConfirm">确认退出</AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
/* ── Root ──────────────────────────────────────────────────────────────────── */
.source-pane-root {
  display: flex;
  flex-direction: column;
  background: rgb(var(--color-background-rgb));
  border-radius: var(--radius-md);
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  overflow: hidden;
  height: 100%;
}

/* ── Tab bar ───────────────────────────────────────────────────────────────── */
.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  flex-shrink: 0;
}

.source-tabs {
  flex-shrink: 0;
}

.source-tabs-list {
  height: 44px;
  background: transparent;
  border-radius: 0;
  padding: 0;
}

.tab-trigger {
  position: relative;
  padding: 0 16px;
  height: 44px;
  background: none;
  border: none;
  border-radius: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
  transition: color 0.2s ease;
  letter-spacing: 0.02em;
  box-shadow: none;
}

.tab-trigger:hover {
  color: rgb(var(--color-text-rgb));
  background: transparent;
}

.tab-trigger[data-state='active'] {
  color: rgb(var(--color-primary-rgb));
  background: transparent;
  box-shadow: inset 0 -2px 0 0 rgb(var(--color-primary-rgb));
}

.tab-trigger[data-state='active']:hover {
  color: rgb(var(--color-primary-container-rgb));
  background: transparent;
}

.edit-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: auto;
  margin-left: 16px;
}

.edit-btn,
.exit-edit-btn {
  font-family: var(--font-mono);
  font-size: 11px;
}

.run-btn-active {
  color: rgb(var(--color-success-rgb));
  border-color: rgb(var(--color-success-rgb) / 0.3);
  background: rgb(var(--color-success-rgb) / 0.08);
}

.save-btn-highlight {
  border-color: rgb(var(--color-primary-rgb) / 0.5);
  color: rgb(var(--color-primary-rgb));
}

.save-btn-success {
  color: rgb(var(--color-success-rgb));
  border-color: rgb(var(--color-success-rgb) / 0.3);
  background: rgb(var(--color-success-rgb) / 0.08);
}

.save-btn-error {
  color: rgb(var(--color-error-rgb));
  border-color: rgb(var(--color-error-rgb) / 0.3);
  background: rgb(var(--color-error-rgb) / 0.08);
}

.exit-edit-btn {
  border-color: rgb(var(--color-border-glass-rgb) / 0.15);
}

/* Spin animation for loading */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spin {
  animation: spin 1s linear infinite;
}

.copy-btn-copied {
  color: rgb(var(--color-success-rgb));
  border-color: rgb(var(--color-success-rgb) / 0.3);
  background: rgb(var(--color-success-rgb) / 0.08);
}

.copy-btn-copied:hover {
  color: rgb(var(--color-success-rgb));
  border-color: rgb(var(--color-success-rgb) / 0.4);
  background: rgb(var(--color-success-rgb) / 0.12);
}

/* ── Code area ─────────────────────────────────────────────────────────────── */
.code-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  background: rgb(var(--color-surface-dim-rgb));
}

/* ── Monaco Editor container ───────────────────────────────────────────────── */
.monaco-editor-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  height: 100%;
  position: relative;
}

/* Force Monaco editor to fill container */
.monaco-editor-container :deep(.monaco-editor) {
  background-color: rgb(var(--color-surface-dim-rgb)) !important;
  position: absolute !important;
  inset: 0 !important;
  height: 100% !important;
  width: 100% !important;
}

/* ── Tab actions (settings, history, copy) ─────────────────────────────────── */
.tab-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tab-divider {
  width: 1px;
  height: 16px;
  background: rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  margin: 0 4px;
}

.bar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bar-btn:hover {
  background: rgb(var(--color-surface-glass-rgb) / 0.06);
  color: rgb(var(--color-text-rgb));
}

/* ── Scrollbar styling ─────────────────────────────────────────────────────── */
.monaco-editor-container :deep(.monaco-editor)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.monaco-editor-container :deep(.monaco-editor)::-webkit-scrollbar-track {
  background: transparent;
}

.monaco-editor-container :deep(.monaco-editor)::-webkit-scrollbar-thumb {
  background: rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  border-radius: var(--radius-sm);
}

.monaco-editor-container :deep(.monaco-editor)::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--color-border-glass-rgb) / 0.15);
}

.monaco-editor-container :deep(.monaco-editor)::-webkit-scrollbar-corner {
  background: transparent;
}

.dialog-box {
  max-width: 400px;
  text-align: center;
}

.dialog-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgb(var(--color-error-rgb) / 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--color-error-rgb));
  margin: 0 auto 20px;
}

.dialog-title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: rgb(var(--color-text-rgb));
}

.dialog-message {
  font-size: 0.875rem;
  color: rgb(var(--color-text-secondary-rgb) / 0.7);
  line-height: 1.6;
}

.dialog-btn-cancel {
  background: rgb(var(--color-surface-variant-rgb));
  color: rgb(var(--color-text-rgb) / 0.8);
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
}

.dialog-btn-cancel:hover {
  background: rgb(var(--color-surface-variant-high-rgb));
  color: rgb(var(--color-text-rgb));
}

.dialog-btn-confirm {
  background: rgb(var(--color-error-rgb) / 0.15);
  color: rgb(var(--color-error-rgb));
  border: 1px solid rgb(var(--color-error-rgb) / 0.3);
}

.dialog-btn-confirm:hover {
  background: rgb(var(--color-error-rgb) / 0.25);
}

/* ── 移动端适配 ── */
</style>
