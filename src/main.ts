import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/assets/main.css'
// 图标离线化：把项目用到的 Iconify 图标注入本地存储，使 <Icon> 不再请求
// api.iconify.design（离线/内网可用，且消除首屏图标闪烁）。
// 该文件由 scripts/build-iconify-offline.mjs 生成，新增图标后跑 npm run icons:build。
import '@/generated/iconify-offline'
import { initToast } from '@/composables/useToast'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 传入完整的 app._context（AppContext 类型），而非 app.config
// AppContext.config.globalProperties 才能正确解析到 $message
initToast(app._context)

app.mount('#app')
