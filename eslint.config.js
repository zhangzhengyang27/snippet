import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import vueA11y from 'eslint-plugin-vuejs-accessibility'
import prettierConfig from 'eslint-config-prettier'

// 浏览器全局变量（统一声明，避免多处重复）
const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  setTimeout: 'readonly',
  setInterval: 'readonly',
  clearTimeout: 'readonly',
  clearInterval: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Blob: 'readonly',
  FormData: 'readonly',
  FileReader: 'readonly',
  HTMLElement: 'readonly',
  HTMLInputElement: 'readonly',
  SVGElement: 'readonly',
  SVGPathElement: 'readonly',
  SVGCircleElement: 'readonly',
  SVGPolygonElement: 'readonly',
  SVGLineElement: 'readonly',
  SVGTextElement: 'readonly',
  HTMLDivElement: 'readonly',
  HTMLIFrameElement: 'readonly',
  HTMLCanvasElement: 'readonly',
  HTMLImageElement: 'readonly',
  CanvasRenderingContext2D: 'readonly',
  WebGLRenderingContext: 'readonly',
  WebGLProgram: 'readonly',
  WebGLBuffer: 'readonly',
  CSS: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  HTMLButtonElement: 'readonly',
  HTMLSelectElement: 'readonly',
  HTMLTextAreaElement: 'readonly',
  HTMLPreElement: 'readonly',
  HTMLParagraphElement: 'readonly',
  HTMLHeadingElement: 'readonly',
  HTMLSpanElement: 'readonly',
  MouseEvent: 'readonly',
  KeyboardEvent: 'readonly',
  ClipboardEvent: 'readonly',
  DragEvent: 'readonly',
  PointerEvent: 'readonly',
  TouchEvent: 'readonly',
  Touch: 'readonly',
  WheelEvent: 'readonly',
  BeforeUnloadEvent: 'readonly',
  Event: 'readonly',
  CustomEvent: 'readonly',
  MessageEvent: 'readonly',
  ErrorEvent: 'readonly',
  EventTarget: 'readonly',
  IntersectionObserver: 'readonly',
  ResizeObserver: 'readonly',
  MutationObserver: 'readonly',
  console: 'readonly',
  alert: 'readonly',
  confirm: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  indexedDB: 'readonly',
  BroadcastChannel: 'readonly',
  Worker: 'readonly',
  Image: 'readonly',
  Audio: 'readonly',
  btoa: 'readonly',
  atob: 'readonly',
  File: 'readonly',
  Notification: 'readonly',
  crypto: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  AbortController: 'readonly',
  Headers: 'readonly',
  DOMException: 'readonly',
  performance: 'readonly',
  RequestInit: 'readonly',
  devicePixelRatio: 'readonly',
  createImageBitmap: 'readonly',
  ImageData: 'readonly',
  ImageBitmap: 'readonly',
  ImageBitmapOptions: 'readonly',
  Path2D: 'readonly',
  CanvasTextBaseline: 'readonly',
  CanvasTextAlign: 'readonly',
  CanvasImageSource: 'readonly',
  Node: 'readonly',
  structuredClone: 'readonly',
  Window: 'readonly',
  define: 'readonly',
  module: 'readonly',
  exports: 'writable',
  createjs: 'readonly',
}

export default tseslint.config(
  {
  // 恢复注记：scripts/ 下的历史一次性脚本（数据迁移/审计）未经 lint 规整，
  // 本次恢复按原样保留，不纳入 lint 范围。
  // src/generated/ 为构建期生成物（icons:build 产出），同样不纳入 lint。
  ignores: ['dist', 'scripts/**', 'src/generated/**', '**/*.damaged', 'node_modules', '*.d.ts', 'server/**', 'public/**', '.worktrees/**', 'src/transform/**', 'src/views/data-visualization/bigscreen/**', '_downloads/**', '备份/**'] },

  // 全局基础规则
  js.configs.recommended,

  // TypeScript 规则
  ...tseslint.configs.recommended,

  // Vue 规则 + 为 .vue 文件中的 <script> 启用 TS 解析
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: pluginVue.parser,
      parserOptions: {
        parser: tseslint.parser,
      },
      globals: browserGlobals,
    },
    plugins: {
      // 可访问性门禁：把 a11y 从「靠自觉」变成「靠 lint」
      'vuejs-accessibility': vueA11y,
    },
    rules: {
      ...vueA11y.configs.recommended.rules,
      // label-has-for 默认只认「label 包裹控件」这一种关联方式，会把标准的
      // `<label for="x"> + <input id="x">` 误判为未关联（LoginPage 就是这种情况）。
      // 改为 nesting 或 id 满足其一即可，这才是 WCAG 认可的两种等价关联方式。
      'vuejs-accessibility/label-has-for': [
        'error',
        { required: { some: ['nesting', 'id'] } },
      ],
      // 以下三条降为 warn。它们要求为「鼠标交互」补上键盘等价路径，但**每一处的正确
      // 做法取决于该组件应有的键盘交互模型**（模态背景点击关闭要不要给 tabindex？
      // 列表项要不要进 Tab 顺序？右键菜单要不要方向键导航？），属于需要逐个设计的小项目，
      // 不适合一次性机械改完。保留 warn 是为了让这些问题每次 lint 都可见，而非被静默忽略。
      //
      // 已按此思路修掉的真实缺陷（不在 warn 之列）：
      //   · AppHeader 导航下拉此前只有 @mouseenter，键盘用户根本打不开 —— 已补
      //     click 切换 / Esc 关闭 / aria-haspopup / aria-expanded
      //   · 5 个表单控件缺可访问名 —— 已补 aria-label
      //   · role="menuitem" 不可聚焦 —— 已补 tabindex="-1"
      'vuejs-accessibility/click-events-have-key-events': 'warn',
      'vuejs-accessibility/no-static-element-interactions': 'warn',
      'vuejs-accessibility/mouse-events-have-key-events': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/no-reserved-component-names': 'off',
      'vue/no-side-effects-in-computed-properties': 'off',
    },
  },

  // Node.js 脚本（scripts/ 目录）
  {
    files: ['scripts/**'],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        Set: 'readonly',
        Promise: 'readonly',
        JSON: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },

  // Canvas 示例文件放宽规则
  {
    files: ['**/canvas-examples/**/*.{vue,ts}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },

  // 同样为 .ts/.js 文件添加浏览器 globals
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      globals: browserGlobals,
    },
  },

  // 全局规则调整
  {
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-empty': 'off',
      'no-useless-assignment': 'off',
      'no-prototype-builtins': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'preserve-caught-error': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // 低代码平台为外部导入的遗留项目，放宽部分类型规则
  {
    files: ['src/lowcode/**'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        location: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-empty': 'off',
      'no-undef': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-reserved-component-names': 'off',
    },
  },

  // Volt 主题包装组件 — 空接口用于声明 props 类型，无需新增成员
  {
    files: ['src/components/volt/**'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // Prettier 兼容（必须最后，关闭与 Prettier 冲突的规则）
  prettierConfig,
)
