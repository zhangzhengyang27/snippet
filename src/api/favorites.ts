import { post, del } from './client'

/**
 * 收藏接口（按用户，收藏对象为代码块 / knowledge snippet）。
 *
 * 只有「增 / 删」两个动作 —— 收藏**列表**不走这里，而是复用片段列表
 * `GET /api/knowledge/snippets?favorite=true`，这样分页、可见性与排序
 * 与代码块列表保持一致，无需维护两套查询。
 *
 * 用户身份通过 JWT Bearer Token 自动识别。
 */

/** 添加收藏。幂等：重复收藏后端返回现有记录而非报错。 */
export function addFavorite(snippetId: string): Promise<void> {
  return post<void>('/favorites', { snippetId })
}

/** 取消收藏。重复取消后端返回 404，便于区分「真的删掉了」与「本来就没有」。 */
export function removeFavorite(snippetId: string): Promise<void> {
  return del<void>(`/favorites/${encodeURIComponent(snippetId)}`)
}
