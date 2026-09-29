import { defineStore } from 'pinia'
import type { AuthResult, AuthUser, LoginUser } from '@/api/auth'
import { checkMe, getMe, logout as apiLogout, refreshTokens } from '@/api/auth'
import { ApiError, setAuthTokenProvider, setAuthFailureHandler, setAuthRefreshHandler } from '@/api/client'
import { clearFavorites } from '@/composables/useFavorites'

/** 本地持久化会话的存储键。 */
const SESSION_STORAGE_KEY = 'html5-examples-auth-session'

/** 提前刷新 token 的时间（秒）。 */
const REFRESH_AHEAD_SECONDS = 300

/**
 * 描述持久化到 localStorage 的会话数据。
 */
interface PersistedSession {
  accessToken: string
  refreshToken?: string
  tokenExpiresAt: number
  user: AuthUser
}

/** 模块级刷新定时器（非响应式，避免放入 Pinia state）。 */
let refreshTimer: ReturnType<typeof setTimeout> | null = null

/** 模块级进行中的刷新 Promise：并发 401 触发多次刷新时共享同一次请求。 */
let refreshInFlight: Promise<boolean> | null = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as (LoginUser | AuthUser) | null,
    initialized: false,
    /** 访问令牌（Bearer）。为空时请求回退到 cookie 认证。 */
    accessToken: null as string | null,
    /** 刷新令牌（仅用于换取新 access token）。 */
    refreshToken: null as string | null,
    /** access token 过期时间戳（毫秒）。 */
    tokenExpiresAt: 0,
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.user),
  },

  actions: {
    /**
     * 设置当前用户（兼容既有 cookie 登录流程）。
     */
    setAuth(user: LoginUser | AuthUser) {
      this.user = user
    },

    /**
     * 应用一次完整的认证结果（登录 / 注册 / 刷新）：
     * 写入用户与 token、持久化会话并调度自动刷新。
     */
    applyAuthResult(result: AuthResult) {
      this.user = result.user
      this.accessToken = result.accessToken
      this.refreshToken = result.refreshToken
      this.tokenExpiresAt = Date.now() + result.expiresIn * 1000
      this.persistSession()
      if (this.refreshToken) {
        this.scheduleTokenRefresh(this.tokenExpiresAt)
      }
    },

    /**
     * 清空用户与 token 状态（不清理持久化存储，由调用方决定）。
     */
    clearAuth() {
      this.user = null
      this.accessToken = null
      this.refreshToken = null
      this.tokenExpiresAt = 0
    },

    /**
     * 将当前会话持久化到 localStorage；无有效会话时移除。
     * 允许缺少 refreshToken：部分后端可能只返回 accessToken，此时仍能维持到 accessToken 过期。
     */
    persistSession() {
      if (!this.accessToken || !this.user) {
        localStorage.removeItem(SESSION_STORAGE_KEY)
        return
      }

      const session: PersistedSession = {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken ?? undefined,
        tokenExpiresAt: this.tokenExpiresAt,
        user: this.user as AuthUser,
      }

      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
      } catch {
        // 存储不可用（隐私模式等）时静默降级为内存会话
      }
    },

    /**
     * 幂等地从 localStorage 恢复会话（仅首次生效）。
     */
    ensureHydrated() {
      if (this.accessToken) return

      let raw: string | null = null
      try {
        raw = localStorage.getItem(SESSION_STORAGE_KEY)
      } catch {
        return
      }

      if (!raw) return

      try {
        const session = JSON.parse(raw) as PersistedSession
        if (session.accessToken && session.user) {
          this.accessToken = session.accessToken
          this.refreshToken = session.refreshToken ?? null
          this.tokenExpiresAt = session.tokenExpiresAt ?? 0
          this.user = session.user
          // 恢复会话后必须重新调度自动刷新，否则刷新页面后定时器会丢失
          if (this.refreshToken) {
            this.scheduleTokenRefresh(this.tokenExpiresAt)
          }
        }
      } catch {
        localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    },

    /**
     * 调度 access token 自动刷新（过期前 REFRESH_AHEAD_SECONDS 触发）。
     * @param expiresAtMs access token 过期时间戳（毫秒）
     */
    scheduleTokenRefresh(expiresAtMs: number) {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = null
      }

      const delayMs = Math.max(expiresAtMs - Date.now() - REFRESH_AHEAD_SECONDS * 1000, 0)
      refreshTimer = setTimeout(() => {
        void this.refreshAuth()
      }, delayMs)
    },

    /**
     * 使用 refresh token 换取新 token 对；成功返回 true，失败清空会话并返回 false。
     * 并发调用共享同一次在途刷新，避免多个 401 同时触发多次刷新请求。
     */
    async refreshAuth(): Promise<boolean> {
      if (!this.refreshToken) return false
      if (refreshInFlight) return refreshInFlight

      const refreshToken = this.refreshToken
      refreshInFlight = (async () => {
        try {
          const result = await refreshTokens(refreshToken)
          this.applyAuthResult(result)
          return true
        } catch {
          this.handleRefreshFailure(refreshToken)
          return false
        } finally {
          refreshInFlight = null
        }
      })()
      return refreshInFlight
    },

    /**
     * 刷新失败的处理：区分「本标签页的 token 已失效」与「多标签页竞态」。
     * 另一标签页可能已用同一 refreshToken 完成轮换并把新会话写入 localStorage，
     * 此时采纳新会话而不是清空，避免误删其他标签页刚刷新的登录态；
     * 仅当本地持久化的 refreshToken 仍是本次失败的这条时才真正登出。
     */
    handleRefreshFailure(failedRefreshToken: string) {
      try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY)
        if (raw) {
          const session = JSON.parse(raw) as PersistedSession
          if (
            session.accessToken &&
            session.user &&
            session.refreshToken &&
            session.refreshToken !== failedRefreshToken
          ) {
            this.accessToken = session.accessToken
            this.refreshToken = session.refreshToken
            this.tokenExpiresAt = session.tokenExpiresAt ?? 0
            this.user = session.user
            this.scheduleTokenRefresh(this.tokenExpiresAt)
            return
          }
        }
      } catch {
        // 解析失败则按常规路径清空
      }
      this.clearAuth()
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY)
      } catch {
        // 忽略存储异常
      }
    },

    async logout() {
      try {
        await apiLogout()
      } catch {
        // cookie 清除失败也继续清理本地状态
      }
      this.clearAuth()
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY)
      } catch {
        // 忽略存储异常
      }
      // 清空收藏状态，避免下一个登录用户看到上一个用户的收藏
      clearFavorites()
    },

    async initialize() {
      if (this.initialized) return

      // 注册令牌提供者，使所有 API 请求在存在 token 时自动携带 Authorization 头
      setAuthTokenProvider(() => this.accessToken)

      // 注册认证失败处理器：当 API 返回 401 且刷新不可用/失败时清空会话并跳转登录页。
      // 仅对受保护接口触发（公开接口不会返回 401），且单次失败即跳转，避免用户体验断裂。
      setAuthFailureHandler(() => {
        // 防止重复跳转：若已经在登录页则不处理
        if (typeof window === 'undefined') return
        const { pathname, search } = window.location
        if (pathname.startsWith('/login')) return

        this.clearAuth()
        try {
          localStorage.removeItem(SESSION_STORAGE_KEY)
        } catch {
          // 忽略存储异常
        }
        clearFavorites()

        // 跳转登录页并携带 redirect 参数，登录成功后可回到原页面
        const redirect = encodeURIComponent(pathname + search)
        window.location.href = `/login?redirect=${redirect}`
      })

      // 注册刷新处理器：请求 401 时 client 调用它做一次「刷新后重放」，
      // 返回新 token 表示成功；无 refreshToken 时返回 null 直接走登出流程。
      setAuthRefreshHandler(async () => {
        const ok = await this.refreshAuth()
        return ok ? this.accessToken : null
      })

      // 幂等恢复本地 token 会话
      this.ensureHydrated()

      try {
        if (this.accessToken) {
          const now = Date.now()
          const shouldRefresh =
            this.refreshToken && this.tokenExpiresAt - now <= REFRESH_AHEAD_SECONDS * 1000
          if (shouldRefresh) {
            // access token 已过期或即将过期：直接用 refresh token 换新的 token 对
            await this.refreshAuth()
          } else {
            // 存在有效 token 会话：用 GET /auth/me 校验并获取完整用户信息
            const user = await getMe()
            this.user = user
          }
        } else {
          // 无 token：回退到既有 cookie 会话检查
          const result = await checkMe()
          if (result.user) {
            this.user = result.user
          }
        }
      } catch (error) {
        // 区分失败原因：
        // - 网络异常 / 服务端 5xx：会话本身可能仍有效，保留本地会话与 token，
        //   避免后端短暂抖动导致用户被"静默登出"；下次路由进入时重新校验。
        // - 认证类失败（401/403/4xx）：清空用户状态并移除持久化会话，
        //   避免每次刷新都重复尝试无效 token。用户主动登录时通过 applyAuthResult 重设。
        const status = error instanceof ApiError ? error.status : 0
        if (status === 0 || status >= 500) {
          // 保留会话，不做清理
        } else {
          this.clearAuth()
          try {
            localStorage.removeItem(SESSION_STORAGE_KEY)
          } catch {
            // 忽略存储异常
          }
        }
      } finally {
        this.initialized = true
      }
    },
  },
})
