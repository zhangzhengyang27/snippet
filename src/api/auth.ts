import { get, post, put } from './client'

export interface LoginCredentials {
  username: string
  password: string
}

/**
 * 基础登录用户信息（cookie 会话 /auth/me 返回的最小结构）。
 */
export interface LoginUser {
  id: string
  username: string
  role: string
}

/**
 * 完整用户信息（token 会话 GET /auth/me 返回）。
 */
export interface AuthUser extends LoginUser {
  email: string | null
  phone: string | null
  displayName: string | null
  avatar: string | null
  createdAt: string
}

/**
 * 登录 / 注册 / 刷新统一的认证结果。
 */
export interface AuthResult {
  accessToken: string
  refreshToken: string
  /** access token 过期时间（秒） */
  expiresIn: number
  user: AuthUser
}

export type LoginResult = AuthResult

export interface MeResult {
  user: LoginUser | null
}

/**
 * 验证码载荷。
 */
export interface CaptchaResult {
  captchaId: string
  imageData: string
  expiresAt: string
}

/**
 * 用户登录（账号可为用户名 / 邮箱 / 手机号）。
 * 后端同时设置 httpOnly cookie 并返回 token 对。
 */
export function login(credentials: LoginCredentials): Promise<LoginResult> {
  return post<LoginResult>('/auth/login', credentials)
}

/**
 * 账号登录（等价于 login，语义更明确）。
 */
export function loginByAccount(account: string, password: string): Promise<AuthResult> {
  return post<AuthResult>('/auth/login', { account, password })
}

/**
 * 注册（需要验证码）。
 */
export function register(payload: {
  account: string
  password: string
  displayName?: string
  captchaId: string
  captchaCode: string
}): Promise<AuthResult> {
  return post<AuthResult>('/auth/register', payload)
}

/**
 * 手机号一键登录 / 注册（需要验证码）。
 */
export function phoneAuth(payload: {
  phone: string
  captchaId: string
  captchaCode: string
}): Promise<AuthResult> {
  return post<AuthResult>('/auth/phone-auth', payload)
}

/**
 * 获取图形验证码。
 */
export function getCaptcha(): Promise<CaptchaResult> {
  return get<CaptchaResult>('/auth/captcha')
}

/**
 * 使用 refresh token 换取新的 token 对。
 */
export function refreshTokens(refreshToken: string): Promise<AuthResult> {
  return post<AuthResult>('/auth/refresh', { refreshToken })
}

/**
 * 检查当前登录状态（通过 cookie 中的 JWT）。
 */
export function checkMe(): Promise<MeResult> {
  return post<MeResult>('/auth/me')
}

/**
 * 获取当前用户完整信息（通过 Bearer token）。
 */
export function getMe(): Promise<AuthUser> {
  return get<AuthUser>('/auth/me')
}

/**
 * 修改密码。
 */
export function changePassword(payload: {
  oldPassword: string
  newPassword: string
}): Promise<{ success: boolean }> {
  return put<{ success: boolean }>('/auth/password', payload)
}

/**
 * 退出登录（清除 cookie 并吊销 refresh token）。
 */
export function logout(): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/logout')
}
