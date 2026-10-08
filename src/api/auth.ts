import { post, put } from './client'

/**
 * 登录凭据。
 * `username` 实为**登录标识** —— 用户名或邮箱均可（后端 AuthService.validateUser）。
 */
export interface LoginCredentials {
  username: string
  password: string
}

/**
 * 对外用户信息。
 * 后端 `/auth/login`、`/auth/register`、`/auth/me` 统一返回该结构（永不含 password）。
 */
export interface AuthUser {
  id: string
  username: string
  role: string
  email: string | null
  displayName: string | null
  createdAt: string
}

export interface AuthResult {
  user: AuthUser
}

export interface MeResult {
  user: AuthUser | null
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  displayName?: string
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

/**
 * 登录（用户名或邮箱 + 密码）。
 * 后端同时下发 httpOnly cookie（auth-token）并返回用户信息。
 */
export function login(credentials: LoginCredentials): Promise<AuthResult> {
  return post<AuthResult>('/auth/login', credentials)
}

/**
 * 注册。注册成功即建立会话（后端同样下发 cookie），前端无需再登录一次。
 */
export function register(payload: RegisterPayload): Promise<AuthResult> {
  return post<AuthResult>('/auth/register', payload)
}

/**
 * 检查当前登录状态（依赖 cookie 中的 JWT）。
 */
export function checkMe(): Promise<MeResult> {
  return post<MeResult>('/auth/me')
}

/**
 * 修改当前用户密码（需登录）。
 */
export function changePassword(payload: ChangePasswordPayload): Promise<{ ok: boolean }> {
  return put<{ ok: boolean }>('/auth/password', payload)
}

/**
 * 退出登录（清除 cookie）。
 */
export function logout(): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/logout')
}
