import { fileURLToPath, URL } from 'node:url'
import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// 开发期代理到已有 NestJS 后端（默认 http://localhost:3000）
const API_TARGET = process.env.API_TARGET || 'http://localhost:3000'

const require = createRequire(import.meta.url)

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
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
