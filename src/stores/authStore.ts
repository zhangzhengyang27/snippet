import { defineStore } from 'pinia'
import type { AuthUser, LoginUser } from '@/api/auth'
import { checkMe, logout as apiLogout } from '@/api/auth'
import { setAuthFailureHandler } from '@/api/client'
import { clearFavorites } from '@/composables/useFavorites'
import { resetSnippetListState } from '@/composables/useSnippetListState'

/**
 * 认证会话 store。
 *
 * 会话唯一来源是后端下发的 httpOnly cookie（auth-token）：
 * 登录成功后 setAuth 写入用户信息；initialize 时用 POST /auth/me（checkMe）校验会话。
 * 旧 token 持久化/自动刷新链路已随外部注册门户方案一并废弃（后端无 /auth/refresh、
 * 无 GET /auth/me），client 层的 token provider/refresh 钩子保留但不再注册。
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as (LoginUser | AuthUser) | null,
    initialized: false,
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.user),
  },

  actions: {
    /**
     * 设置当前用户（登录成功后由登录页调用）。
     */
    setAuth(user: LoginUser | AuthUser) {
      this.user = user
    },

    /**
     * 清空用户状态（登出与会话失效共用；cookie 由后端登出接口清除）。
     */
    clearAuth() {
      this.user = null
    },

    /**
     * 清理**按用户隔离**的前端缓存。
     *
     * 登出与会话失效都必须调用，否则下一个登录用户会看到上一个用户的数据。
     * 这些缓存是模块级单例（不随组件卸载清理），且都是带用户上下文的接口结果：
     * - 收藏的示例（`useFavorites`）
     * - 片段列表 / 筛选 / 总数 / 选中项（`useSnippetListState`）
     *
     * 新增此类缓存时请一并加到这里 —— 散落在各处的 `clearXxx()` 很容易漏。
     */
    resetUserScopedState() {
      clearFavorites()
      resetSnippetListState()
    },

    async logout() {
      try {
        await apiLogout()
      } catch {
        // cookie 清除失败也继续清理本地状态
      }
      this.clearAuth()
      this.resetUserScopedState()
    },

    async initialize() {
      if (this.initialized) return

      // 注册认证失败处理器：受保护接口返回 401 时清空会话并跳转登录页，
      // 携带 redirect 参数以便登录成功后回到原页面。
      setAuthFailureHandler(() => {
        if (typeof window === 'undefined') return
        const { pathname, search } = window.location
        if (pathname.startsWith('/login')) return

        this.clearAuth()
        this.resetUserScopedState()

        const redirect = encodeURIComponent(pathname + search)
        window.location.href = `/login?redirect=${redirect}`
      })

      try {
        // 用 cookie 会话校验登录态；401（未登录/过期）走 catch 清理
        const result = await checkMe()
        if (result.user) {
          this.user = result.user
        } else {
          this.clearAuth()
        }
      } catch (error) {
        // 网络异常 / 服务端 5xx：会话可能仍有效，保留状态避免"静默登出"；
        // 401/403 等认证类失败：清空用户状态。
        this.clearAuth()
        void error
      } finally {
        this.initialized = true
      }
    },
  },
})
