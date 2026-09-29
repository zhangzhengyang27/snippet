<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import CommandPalette from '@/components/common/CommandPalette.vue'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/composables/useTheme'
import { isTypingTarget } from '@/utils/keyboard'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const { reapplyTheme } = useTheme()

// 主题：useTheme 在 html 上切换 .dark/.light；Element Plus 暗色由 dark/css-vars.css 联动

const router = useRouter()
const route = useRoute()

const commandPalette = ref<{ open: () => void; close: () => void } | null>(null)
const openCommandPalette = () => commandPalette.value?.open()

// 供无 props 通道的深层页面（如概览快捷卡）通过 window 事件唤起命令面板
window.addEventListener('snippet:open-command-palette', () => openCommandPalette())

/** 登录页不展示 App Shell（顶栏 + 内容），保持沉浸式居中布局 */
const isAuthPage = computed(() => route.name === 'login')

// 应用启动即校验 cookie 会话（登录态/用户菜单依赖它；早于任何页面的数据请求）
useAuthStore().initialize()

// 全局快捷键：G H（代码块）/ G E（示例库）/ C（新建片段）
// 采用 "g" 前缀序列，避免与单键冲突；输入态与组合态下不触发
let pendingG = false
let gTimer: number | null = null

const onGlobalKeydown = (e: KeyboardEvent) => {
  if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return
  if (isTypingTarget(e)) return
  // 移动端不响应全局快捷键（无实体键盘，且避免与输入法/系统手势冲突）
  const key = e.key.toLowerCase()
  if (pendingG) {
    if (gTimer !== null) window.clearTimeout(gTimer)
    gTimer = null
    pendingG = false
    if (key === 'd') {
      e.preventDefault()
      router.push('/')
    } else if (key === 'h') {
      e.preventDefault()
      router.push('/snippets')
    } else if (key === 'e') {
      e.preventDefault()
      router.push('/example')
    } else if (key === 'f') {
      e.preventDefault()
      router.push('/favorites')
    } else if (key === 'r') {
      e.preventDefault()
      router.push('/recent')
    }
    return
  }
  if (key === 'g') {
    pendingG = true
    gTimer = window.setTimeout(() => {
      pendingG = false
      gTimer = null
    }, 800)
  } else if (key === 'c') {
    e.preventDefault()
    router.push('/snippets?new=1')
  }
}

onMounted(() => {
  reapplyTheme()
  document.addEventListener('keydown', onGlobalKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onGlobalKeydown)
  if (gTimer !== null) window.clearTimeout(gTimer)
})
</script>

<template>
  <ElConfigProvider :locale="zhCn">
    <div class="xy-app">
      <div class="app-root">
        <!-- 登录页：沉浸式，不渲染 App Shell -->
        <div v-if="isAuthPage" class="app-auth">
          <router-view />
        </div>

        <!-- 常规页面：横向顶栏 + 内容 -->
        <div v-else class="app-shell">
          <AppHeader @open-command="openCommandPalette" />
          <main class="app-main">
            <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </main>
        </div>

        <CommandPalette ref="commandPalette" />
      </div>
    </div>
  </ElConfigProvider>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
  background-color: rgb(var(--color-bg-rgb));
  color: rgb(var(--color-text-rgb));
}

.app-auth {
  min-height: 100vh;
}

.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  padding-top: var(--header-height);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  min-width: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
