import { computed, watch } from 'vue'
import { useStorage, usePreferredColorScheme } from '@vueuse/core'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'devcanvas-theme'

const stored = useStorage<Theme | 'system'>(STORAGE_KEY, 'dark')
const preferred = usePreferredColorScheme()

export const theme = computed<Theme>(() => {
  if (stored.value === 'dark' || stored.value === 'light') {
    return stored.value
  }
  return preferred.value === 'light' ? 'light' : 'dark'
})

function applyTheme(value: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  // 同步切换 .dark/.light class（驱动项目自有 --color-*-rgb 变量）
  // 与 data-theme 属性（xiaoye-ui useDarkMode 初始化读取的标记）
  if (value === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
    root.setAttribute('data-theme', 'dark')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
    root.setAttribute('data-theme', 'light')
  }
}

// 主题 watch 注册标志：保证全局只注册一次，避免模块顶层副作用
let themeWatchInitialized = false

export type ThemeSetting = Theme | 'system'

export function useTheme() {
  // 首次调用时注册主题 watch 并立即应用，避免模块 import 时的全局副作用（SSR 友好）
  if (!themeWatchInitialized) {
    themeWatchInitialized = true
    watch(theme, applyTheme, { immediate: true })
  }

  function toggleTheme() {
    stored.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(value: Theme) {
    stored.value = value
  }

  /** 设置主题偏好（支持 'system' 跟随系统） */
  function setThemeSetting(value: ThemeSetting) {
    stored.value = value
  }

  /** 重新同步当前主题到 DOM（用于外部清理后恢复主题状态） */
  function reapplyTheme() {
    applyTheme(theme.value)
  }

  return {
    theme,
    themeSetting: stored,
    isDark: () => theme.value === 'dark',
    isLight: () => theme.value === 'light',
    toggleTheme,
    setTheme,
    setThemeSetting,
    reapplyTheme,
  }
}
