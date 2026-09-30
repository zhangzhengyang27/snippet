import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
// Element Plus 已改按需引入（见 vite.config.ts 的 unplugin 插件）：
// 组件由模板自动导入、样式按需注入，不再全量加载 element-plus/dist/index.css。
// 但暗色 css-vars 必须全局引入 —— 它只是一组 CSS 变量定义，不绑定任何组件。
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/assets/main.css'
// 图标离线化：把项目用到的 Iconify 图标注入本地存储，使 <Icon> 不再请求
// api.iconify.design（离线/内网可用，且消除首屏图标闪烁）。
// 该文件由 scripts/build-iconify-offline.mjs 生成，新增图标后跑 npm run icons:build。
import '@/generated/iconify-offline'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
