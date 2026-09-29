import { get, post, del } from './client'
import type { CodeExample } from '@/types'

/**
 * 获取用户收藏列表（返回完整示例数据）
 * 用户身份通过 JWT Bearer Token 自动识别
 */
export function getFavorites(): Promise<CodeExample[]> {
  return get<CodeExample[]>('/favorites')
}

/**
 * 添加收藏
 */
export function addFavorite(exampleId: string): Promise<void> {
  return post<void>('/favorites', { exampleId })
}

/**
 * 取消收藏
 */
export function removeFavorite(exampleId: string): Promise<void> {
  return del<void>(`/favorites/${encodeURIComponent(exampleId)}`)
}
