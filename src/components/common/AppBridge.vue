<script setup lang="ts">
/**
 * AppBridge - xy-app 上下文桥接组件
 *
 * <XyApp> 会在 ConfigProvider 子树内渲染 message/notification holder，
 * 因此其 useApp() 拿到的 message 实例是「主题感知」的（跟随暗黑/浅色 token）。
 * 本组件挂载时把该实例注册到全局 toast 模块，替代静态 $message
 * （其 holder 挂在 body 上，永远使用默认浅色主题，暗黑下会白底突兀）。
 */
import { App as XyApp } from 'xiaoye-ui'
import { registerToastApi } from '@/composables/useToast'

const xyApp = XyApp.useApp()
registerToastApi(xyApp.message)
</script>
