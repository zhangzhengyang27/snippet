<script setup lang="ts">
/**
 * MonacoCodeEditor - 统一的 Monaco 编辑器组件
 *
 * 基于 @guolao/vue-monaco-editor 封装，用于代码编辑场景（可读写）。
 * 主题自动跟随应用主题（dark/light），支持 v-model 双向绑定。
 *
 * 设计原则：
 *  - 统一编辑器配置（minimap off、JetBrains Mono、13px、wordWrap on）
 *  - 主题跟随 useTheme
 *  - 透传 Monaco 原生 options，方便上层覆盖
 *  - 仅负责编辑器本身，不内置 Tab/复制/保存等业务逻辑（由调用方处理）
 *
 * 用法：
 *   <MonacoCodeEditor v-model="code" language="typescript" />
 *   <MonacoCodeEditor v-model="code" language="vue" read-only :minimap="true" />
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
// 副作用引入：把 Monaco 配置为本地实例并注册 worker，摆脱 cdn.jsdelivr.net。
// 放在这里而非 main.ts，是为了让 monaco 与编辑器一起被代码分割，不拖累首屏。
import '@/utils/monaco-offline'
import { useTheme } from '@/composables/useTheme'
import { normalizeSnippetLanguage } from '@/types/code-block'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

/** Monaco 原生编辑器配置类型 */
type MonacoOptions = monaco.editor.IStandaloneEditorConstructionOptions

interface Props {
  /** 代码内容（v-model） */
  modelValue: string
  /** 代码语言（vue / html / css / js / ts / json / python / java / go / sql / yaml / bash / markdown 等） */
  language?: string
  /** 是否只读 */
  readOnly?: boolean
  /** 是否跟随应用主题（false 时使用 monacoTheme prop） */
  autoTheme?: boolean
  /** 强制使用的 Monaco 主题（autoTheme=false 时生效） */
  monacoTheme?: 'vs' | 'vs-dark'
  /** 是否显示行号 */
  showLineNumbers?: boolean
  /** 是否折行 */
  wordWrap?: boolean
  /** 是否显示 minimap */
  minimap?: boolean
  /** 字体大小 */
  fontSize?: number
  /** 最小高度 */
  minHeight?: string
  /** 最大高度 */
  maxHeight?: string
  /** Monaco 原生 options 透传（优先级最高，会覆盖内置默认） */
  options?: MonacoOptions
  /** 更新 modelValue 的延迟（ms），用于防抖 */
  updateDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  language: 'plaintext',
  readOnly: false,
  autoTheme: true,
  monacoTheme: 'vs-dark',
  showLineNumbers: true,
  wordWrap: true,
  minimap: false,
  fontSize: 13,
  minHeight: '200px',
  maxHeight: '600px',
  options: () => ({}),
  updateDelay: 200,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
  /** 编辑器挂载完成（@guolao/vue-monaco-editor 的 @mount 事件） */
  mount: [editor: monaco.editor.IStandaloneCodeEditor]
  beforeMount: [monaco: typeof monaco]
}>()

const { theme } = useTheme()

/** 当前生效的 Monaco 主题 */
const effectiveTheme = computed(() => {
  if (!props.autoTheme) {
    return props.monacoTheme
  }
  return theme.value === 'dark' ? 'devcanvas-dark' : 'devcanvas-light'
})

/**
 * 注册与项目玻璃拟态面板融合的自定义主题。
 * 仅覆盖编辑器背景色为透明，继承 vs/vs-dark 的 token 配色。
 */
function defineDevCanvasThemes(monacoInstance: typeof monaco) {
  // Linear 语法色板（暗色，base: vs-dark）：
  // 关键字/存储 → Accent Violet 亮; 类型/类/标签 → Accent Violet; 函数 → 品牌 indigo;
  // 字符串 → emerald; 数字/常量 → amber; 注释/标点 → muted 灰; 正则 → cyan 点缀; 错误 → red
  monacoInstance.editor.defineTheme('devcanvas-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '828FFF' },
      { token: 'keyword.control', foreground: '828FFF' },
      { token: 'storage', foreground: '828FFF' },
      { token: 'storage.type', foreground: '7170FF' },
      { token: 'storage.modifier', foreground: '7170FF' },
      { token: 'type', foreground: '7170FF' },
      { token: 'type.identifier', foreground: '7170FF' },
      { token: 'entity.name.type', foreground: '7170FF' },
      { token: 'support.type', foreground: '7170FF' },
      { token: 'support.class', foreground: '7170FF' },
      { token: 'entity.name.tag', foreground: '7170FF' },
      { token: 'entity.name.function', foreground: '5E6AD2' },
      { token: 'support.function', foreground: '5E6AD2' },
      { token: 'function', foreground: '5E6AD2' },
      { token: 'string', foreground: '10B981' },
      { token: 'string.quoted', foreground: '10B981' },
      { token: 'string.literal', foreground: '10B981' },
      { token: 'number', foreground: 'F5A623' },
      { token: 'constant.numeric', foreground: 'F5A623' },
      { token: 'constant.language', foreground: 'F5A623' },
      { token: 'comment', foreground: '8A8F98', fontStyle: 'italic' },
      { token: 'comment.line', foreground: '8A8F98', fontStyle: 'italic' },
      { token: 'comment.block', foreground: '8A8F98', fontStyle: 'italic' },
      { token: 'variable', foreground: 'F7F8F8' },
      { token: 'variable.other', foreground: 'F7F8F8' },
      { token: 'variable.parameter', foreground: 'F7F8F8' },
      { token: 'entity.other.attribute-name', foreground: '5E6AD2' },
      { token: 'keyword.operator', foreground: '8A8F98' },
      { token: 'punctuation', foreground: '8A8F98' },
      { token: 'meta.delimiter', foreground: '8A8F98' },
      { token: 'constant.regexp', foreground: '4EB6E0' },
      { token: 'string.regexp', foreground: '4EB6E0' },
      { token: 'invalid', foreground: 'EB5757' },
    ],
    colors: {
      'editor.background': '#00000000',
      'editorGutter.background': '#00000000',
      'editorLineNumber.foreground': '#8A8F9880',
      'editorLineNumber.activeForeground': '#F7F8F8',
    },
  })
  // Linear 语法色板（亮色，base: vs）：同语义，仅加深以适配亮底
  monacoInstance.editor.defineTheme('devcanvas-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '5E6AD2' },
      { token: 'keyword.control', foreground: '5E6AD2' },
      { token: 'storage', foreground: '5E6AD2' },
      { token: 'storage.type', foreground: '6366F1' },
      { token: 'storage.modifier', foreground: '6366F1' },
      { token: 'type', foreground: '6366F1' },
      { token: 'type.identifier', foreground: '6366F1' },
      { token: 'entity.name.type', foreground: '6366F1' },
      { token: 'support.type', foreground: '6366F1' },
      { token: 'support.class', foreground: '6366F1' },
      { token: 'entity.name.tag', foreground: '6366F1' },
      { token: 'entity.name.function', foreground: '4F46E5' },
      { token: 'support.function', foreground: '4F46E5' },
      { token: 'function', foreground: '4F46E5' },
      { token: 'string', foreground: '0E9F6E' },
      { token: 'string.quoted', foreground: '0E9F6E' },
      { token: 'string.literal', foreground: '0E9F6E' },
      { token: 'number', foreground: 'B45309' },
      { token: 'constant.numeric', foreground: 'B45309' },
      { token: 'constant.language', foreground: 'B45309' },
      { token: 'comment', foreground: '8A8F98', fontStyle: 'italic' },
      { token: 'comment.line', foreground: '8A8F98', fontStyle: 'italic' },
      { token: 'comment.block', foreground: '8A8F98', fontStyle: 'italic' },
      { token: 'variable', foreground: '111827' },
      { token: 'variable.other', foreground: '111827' },
      { token: 'variable.parameter', foreground: '111827' },
      { token: 'entity.other.attribute-name', foreground: '4F46E5' },
      { token: 'keyword.operator', foreground: '6B7280' },
      { token: 'punctuation', foreground: '6B7280' },
      { token: 'meta.delimiter', foreground: '6B7280' },
      { token: 'constant.regexp', foreground: '0E7490' },
      { token: 'string.regexp', foreground: '0E7490' },
      { token: 'invalid', foreground: 'E5484D' },
    ],
    colors: {
      'editor.background': '#00000000',
      'editorGutter.background': '#00000000',
      'editorLineNumber.foreground': '#6B728080',
      'editorLineNumber.activeForeground': '#111827',
    },
  })
}

/**
 * 将业务语言标识映射为 Monaco 支持的语言 ID。
 * 未命中时原样返回，由 Monaco 决定如何处理。
 */
function mapLanguage(lang: string): string {
  const standard = normalizeSnippetLanguage(lang)
  const map: Record<string, string> = {
    vue: 'html',
    html: 'html',
    xml: 'html',
    mixed: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    js: 'javascript',
    javascript: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    json: 'json',
    json5: 'json',
    bash: 'shell',
    sh: 'shell',
    shell: 'shell',
    zsh: 'shell',
    markdown: 'markdown',
    md: 'markdown',
    python: 'python',
    py: 'python',
    java: 'java',
    go: 'go',
    golang: 'go',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    jsx: 'javascript',
    tsx: 'typescript',
    dart: 'dart',
    kotlin: 'kotlin',
    kt: 'kotlin',
    swift: 'swift',
    groovy: 'groovy',
    jenkinsfile: 'groovy',
    hcl: 'hcl',
    terraform: 'hcl',
    tf: 'hcl',
    ini: 'ini',
    dockerfile: 'dockerfile',
    docker: 'dockerfile',
    protobuf: 'protobuf',
    proto: 'protobuf',
    redis: 'redis',
    text: 'plaintext',
    plaintext: 'plaintext',
  }
  return map[standard?.toLowerCase()] ?? standard
}

const monacoLanguage = computed(() => mapLanguage(props.language))

/** Monaco editor 配置：内置默认 + props 透传覆盖 */
const monacoOptions = computed<MonacoOptions>(() => ({
  minimap: { enabled: props.minimap },
  lineNumbers: props.showLineNumbers ? 'on' : 'off',
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: props.fontSize,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  wordWrap: props.wordWrap ? 'on' : 'off',
  lineHeight: 22,
  padding: { top: 16, bottom: 16 },
  renderLineHighlight: 'line',
  folding: true,
  formatOnPaste: true,
  formatOnType: true,
  readOnly: props.readOnly,
  domReadOnly: props.readOnly,
  tabSize: 2,
  ...props.options,
}))

/** 当前显示的值（避免直接修改 prop） */
const innerValue = ref(props.modelValue)

watch(
  () => props.modelValue,
  (val) => {
    if (val !== innerValue.value) {
      innerValue.value = val
    }
  }
)

let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null

function handleMount(editor: monaco.editor.IStandaloneCodeEditor) {
  editorInstance = editor
  emit('mount', editor)
}

function handleBeforeMount(monacoInstance: typeof monaco) {
  defineDevCanvasThemes(monacoInstance)
  emit('beforeMount', monacoInstance)
}

function handleChange(value: string | undefined) {
  const next = value ?? ''
  innerValue.value = next
  emit('update:modelValue', next)
  emit('change', next)
}

// 主题切换时同步 Monaco 主题（readOnly 等其他 options 已通过 monacoOptions 响应式同步）
watch(effectiveTheme, (newTheme) => {
  editorInstance?.updateOptions({ theme: newTheme })
})

onBeforeUnmount(() => {
  // 显式释放 Monaco editor 实例，避免文本模型、监听器残留
  editorInstance?.dispose()
  editorInstance = null
})

defineExpose({
  /** 获取 Monaco 原生 editor 实例 */
  getEditor: () => editorInstance,
  /** 手动聚焦 */
  focus: () => editorInstance?.focus(),
})
</script>

<template>
  <div class="monaco-code-editor" :style="{ minHeight: minHeight, maxHeight: maxHeight }">
    <VueMonacoEditor
      :value="innerValue"
      :language="monacoLanguage"
      :theme="effectiveTheme"
      :options="monacoOptions"
      :update-delay="updateDelay"
      @before-mount="handleBeforeMount"
      @mount="handleMount"
      @change="handleChange"
    />
  </div>
</template>

<style scoped>
.monaco-code-editor {
  width: 100%;
  height: 100%;
  min-height: 200px;
  overflow: hidden;
  border-radius: var(--radius-md, 8px);
  background: var(--monaco-editor-bg, rgb(var(--color-surface-bright-rgb)));
}

.monaco-code-editor :deep(.monaco-editor) {
  background: var(--monaco-editor-bg, rgb(var(--color-surface-bright-rgb))) !important;
}

.monaco-code-editor :deep(.monaco-editor .margin) {
  background: var(--monaco-editor-bg, rgb(var(--color-surface-bright-rgb))) !important;
}

.monaco-code-editor :deep(.monaco-editor-background) {
  background: var(--monaco-editor-bg, rgb(var(--color-surface-bright-rgb))) !important;
}
</style>
