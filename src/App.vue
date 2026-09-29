<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import CommandPalette from '@/components/common/CommandPalette.vue'
import { useTheme } from '@/composables/useTheme'
import { useIsMobile } from '@/composables/useIsMobile'
import { isTypingTarget } from '@/utils/keyboard'
import { ConfigProvider, App as XyApp, theme as xyTheme } from 'xiaoye-ui'
import AppBridge from '@/components/common/AppBridge.vue'

const { theme: appTheme, reapplyTheme } = useTheme()
const { isCompact } = useIsMobile()

// xiaoye-ui 主题：随项目 .dark/.light 联动切换 dark/default 算法，
// token 对齐设计系统（品牌色青蓝 #0EA5E9，语义色按暗/浅主题取各自值）
const xyThemeConfig = computed(() => {
  const isDark = appTheme.value === 'dark'
  return {
    algorithm: isDark ? xyTheme.darkAlgorithm : xyTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#0EA5E9',
      colorInfo: '#0EA5E9',
      ...(isDark
        ? { colorSuccess: '#34C77B', colorWarning: '#F59E0B', colorError: '#F87171' }
        : { colorSuccess: '#16A34A', colorWarning: '#D97706', colorError: '#DC2626' }),
    },
  }
})
const router = useRouter()
const route = useRoute()

const commandPalette = ref<{ open: () => void; close: () => void } | null>(null)
const openCommandPalette = () => commandPalette.value?.open()

/** 登录页不展示 App Shell（顶栏 + 内容），保持沉浸式居中布局 */
const isAuthPage = computed(() => route.name === 'login')

// 全局快捷键：G H（代码块）/ G E（示例库）/ C（新建片段）
// 采用 "g" 前缀序列，避免与单键冲突；输入态与组合态下不触发
let pendingG = false
let gTimer: number | null = null

const onGlobalKeydown = (e: KeyboardEvent) => {
  if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return
  if (isTypingTarget(e)) return
  // 移动端不响应全局快捷键（无实体键盘，且避免与输入法/系统手势冲突）
  if (isCompact.value) return
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
  <ConfigProvider :theme="xyThemeConfig">
    <XyApp>
      <AppBridge />
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
    </XyApp>
  </ConfigProvider>
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
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
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
