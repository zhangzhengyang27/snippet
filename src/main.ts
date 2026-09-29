import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import '@/assets/main.css'
import 'material-symbols/outlined.css'
import { initToast } from '@/composables/useToast'
import XiaoyeUI from 'xiaoye-ui'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(XiaoyeUI)

// 传入完整的 app._context（AppContext 类型），而非 app.config
// AppContext.config.globalProperties 才能正确解析到 $message
initToast(app._context)

app.mount('#app')
