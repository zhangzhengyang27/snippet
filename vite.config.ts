import { fileURLToPath, URL } from 'node:url'
import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// 开发期代理到已有 NestJS 后端（默认 http://localhost:3000）
const API_TARGET = process.env.API_TARGET || 'http://localhost:3000'

const require = createRequire(import.meta.url)

// dayjs 的插件（dayjs/plugin/*）为 UMD/CJS 格式且包未声明 exports 字段，vite 8 + rolldown
// 会将其当作 ESM 解析导致 `does not provide an export named 'default'`。dayjs 同时提供
// `esm/plugin/*/index.js` 的真实 ESM 版本（含 export default），此处重定向解析路径。
// 匹配形式：dayjs/plugin/X、/.../dayjs/plugin/X.js、/.../dayjs/plugin/X.js?v=...
const DAYJS_PLUGIN_NAMES = [
  'advancedFormat',
  'customParseFormat',
  'weekday',
  'localeData',
  'weekOfYear',
  'weekYear',
  'quarterOfYear',
]

const dayjsPluginAliases = Object.fromEntries(
  DAYJS_PLUGIN_NAMES.map((name) => [
    `dayjs/plugin/${name}`,
    require.resolve(`dayjs/esm/plugin/${name}/index.js`),
  ])
)

// vite 8 对 optimizeDeps.exclude 的依赖，其内部 import 不会进入 resolveId/alias 管线。
// xiaoye-ui 内部 `dayjs.mjs` 以默认导入方式引用 dayjs 主包及其 UMD 插件，浏览器端会
// 解析为 dayjs.min.js（UMD，无 ESM default 导出）从而报错。dayjs 同时提供完整 ESM 构建
// （dayjs/esm/index.js、dayjs/esm/plugin/X/index.js），此处把 xiaoye-ui 内部所有
// `dayjs` 与 `dayjs/plugin/X` 引用重写为 ESM 路径，从根本上解决 interop 报错。
function dayjsEsmPlugin() {
  return {
    name: 'snippet-dayjs-esm',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (
        !id.includes('dayjs.mjs') &&
        !code.includes("from 'dayjs") &&
        !code.includes('from "dayjs')
      ) {
        return null
      }
      let transformed = code
      // dayjs 主包：from "dayjs" -> from "dayjs/esm/index.js"
      transformed = transformed.replace(/from\s+(["'])dayjs\1/g, 'from "dayjs/esm/index.js"')
      // dayjs 插件：from "dayjs/plugin/X" -> from "dayjs/esm/plugin/X/index.js"
      transformed = transformed.replace(
        /from\s+(["'])dayjs\/plugin\/([^"']+)\1/g,
        'from "dayjs/esm/plugin/$2/index.js"'
      )
      if (transformed !== code) {
        return { code: transformed, map: null }
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [dayjsEsmPlugin(), vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      ...dayjsPluginAliases,
      // xiaoye-ui 的 markdown-editor 传递依赖（协同编辑/yjs 链）项目未使用，
      // 原环境由 pnpm patch 处理；此处置换为空模块避免构建期解析失败。
      '@tiptap/extension-collaboration': fileURLToPath(
        new URL('./patches/stub-empty.js', import.meta.url)
      ),
      '@tiptap/y-tiptap': fileURLToPath(new URL('./patches/stub-empty.js', import.meta.url)),
      '@tiptap/extension-node-range': fileURLToPath(
        new URL('./patches/stub-tiptap-node-range.js', import.meta.url)
      ),
    },
  },
  server: {
    port: 5556,
    fs: {
      allow: [
        fileURLToPath(new URL('.', import.meta.url)),
        fileURLToPath(new URL('./node_modules/.pnpm', import.meta.url)),
      ],
    },
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  // xiaoye-ui / vditor 排除预构建：xiaoye-ui 主入口无条件加载 markdown-editor，
  // 其内部以 `?url` 引入 vditor 的 lute.min.js，vite 8 + rolldown 无法解析该 `?url`
  // 字面路径。已通过 pnpm patch 将 MarkdownEditor 的 `?url` 导入改为占位字符串
  // （见 patches/xiaoye-ui.patch），本项目不使用 markdown 编辑器，故排除预构建。
  optimizeDeps: {
    exclude: ['xiaoye-ui', 'vditor'],
  },
  build: {
    rolldownOptions: {
      output: {
        // rolldown 代码分割：核心框架与常用第三方库拆为独立 vendor chunk，
        // 减小主包体积并利用长期 HTTP 缓存（库版本固定，chunk hash 不变）。
        // 注意：monaco/shiki/compiler-sfc 等动态按需大块不列入分组，避免破坏懒加载。
        codeSplitting: {
          groups: [
            {
              name: 'vendor-vue',
              test: /node_modules[\\/](?:@vue|vue|pinia|vue-router|@vueuse)[\\/]/,
              priority: 20,
            },
            {
              // xiaoye-ui 为全量打包（未提供 tree-shaking 友好的按需导出），
              // 独立成组以获得稳定缓存；体积大属预期，见下方 chunkSizeWarningLimit 说明
              name: 'vendor-ui',
              test: /node_modules[\\/]xiaoye-ui[\\/]/,
              priority: 15,
            },
            {
              name: 'vendor-libs',
              test: /node_modules[\\/](?:axios|dompurify|diff|vuedraggable|material-symbols)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
    // Monaco / Shiki / SFC 浏览器端编译器等功能性大块已按需拆分并按组打包，
    // xiaoye-ui 全量包（vendor-ui ≈2.5MB）为库特性，单块体积属预期，上调阈值避免噪声。
    chunkSizeWarningLimit: 3200,
  },
})
