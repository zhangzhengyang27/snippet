import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// 开发期代理到已有 NestJS 后端（默认 http://localhost:3000）
const API_TARGET = process.env.API_TARGET || 'http://localhost:3000'

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
              name: 'vendor-libs',
              test: /node_modules[\\/](?:axios|dompurify|diff|vuedraggable)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
    // 当前最大 chunk 为 ExampleDetailPage（约 949KB，含 SFC 编译器与 Prettier）。
    // 阈值取 1000 以便真实暴露后续体积回归，而非掩盖它。
    chunkSizeWarningLimit: 1000,
  },
})
