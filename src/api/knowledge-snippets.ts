/** 封装知识片段相关接口请求。 */

import { get, post, patch, del } from './client'
import type {
 KnowledgeSnippet,
 KnowledgeSnippetCollection,
 KnowledgeSnippetCollectionReorderItem,
 KnowledgeSnippetListResult,
 KnowledgeSnippetTagListResult,
 SnippetSortOption,
} from '@/types/knowledge-snippet'
import type { EnhancedCodeBlockAttrs } from '@/types/code-block'

/**
* 获取片段集合列表（树形）。
*/
export function listKnowledgeSnippetCollections(): Promise<KnowledgeSnippetCollection[]> {
 return get<KnowledgeSnippetCollection[]>('/knowledge/snippets/collections/tree')
}

/**
* 创建片段集合。
*/
export function createKnowledgeSnippetCollection(payload: {
 name: string
 parentId?: string | null
}): Promise<KnowledgeSnippetCollection> {
 return post<KnowledgeSnippetCollection>('/knowledge/snippets/collections', payload)
}

/**
* 更新片段集合。
*/
export function updateKnowledgeSnippetCollection(
 id: string,
 payload: { name?: string }
): Promise<KnowledgeSnippetCollection> {
 return patch<KnowledgeSnippetCollection>(`/knowledge/snippets/collections/${id}`, payload)
}

/**
* 更新片段集合排序。
*/
export function reorderKnowledgeSnippetCollections(
 items: KnowledgeSnippetCollectionReorderItem[]
): Promise<KnowledgeSnippetCollection[]> {
 return post<KnowledgeSnippetCollection[]>('/knowledge/snippets/collections/reorder', { items })
}

/**
* 删除片段集合。
*/
export function deleteKnowledgeSnippetCollection(id: string): Promise<{ ok: boolean }> {
 return del<{ ok: boolean }>(`/knowledge/snippets/collections/${id}`)
}

/**
* 获取片段标签列表。
*/
export function listKnowledgeSnippetTags(): Promise<KnowledgeSnippetTagListResult> {
 return get<KnowledgeSnippetTagListResult>('/knowledge/snippets/tags')
}

/**
* 获取片段列表。
*/
export function listKnowledgeSnippets(params?: {
 q?: string
 collectionId?: string
 tag?: string
 language?: string
 favorite?: boolean
 sort?: SnippetSortOption
 page?: number
 pageSize?: number
}): Promise<KnowledgeSnippetListResult> {
 return get<KnowledgeSnippetListResult>('/knowledge/snippets', params)
}

/**
* 获取片段详情。
*/
export function getKnowledgeSnippet(id: string): Promise<KnowledgeSnippet> {
 return get<KnowledgeSnippet>(`/knowledge/snippets/${id}`)
}

/**
* 创建片段。
*
* 注意：切勿提交 placeholderDefs —— 后端由 content 推导（normalizePlaceholderDefs），
* 且 DTO 未声明该字段，全局 ValidationPipe 的 forbidNonWhitelisted 会直接返回
* 400「property placeholderDefs should not exist」。
*/
export function createKnowledgeSnippet(payload: {
 name: string
 description?: string | null
 collectionId?: string | null
 language?: string
 content: string
 displayAttrs?: Partial<EnhancedCodeBlockAttrs>
 tags?: string[]
 favorite?: boolean
}): Promise<KnowledgeSnippet> {
 return post<KnowledgeSnippet>('/knowledge/snippets', payload)
}

/**
* 更新片段。同样不得提交 placeholderDefs（见 createKnowledgeSnippet 说明）。
*/
export function updateKnowledgeSnippet(
 id: string,
 payload: Partial<{
   name: string
   description: string | null
   collectionId: string | null
   language: string
   content: string
   displayAttrs: Partial<EnhancedCodeBlockAttrs>
   tags: string[]
   favorite: boolean
 }>
): Promise<KnowledgeSnippet> {
 return patch<KnowledgeSnippet>(`/knowledge/snippets/${id}`, payload)
}

/**
* 删除片段。
*/
export function deleteKnowledgeSnippet(id: string): Promise<{ ok: boolean }> {
 return del<{ ok: boolean }>(`/knowledge/snippets/${id}`)
}

/**
* 记录片段使用行为。
*/
export function recordKnowledgeSnippetUse(id: string): Promise<{ ok: boolean }> {
 return post<{ ok: boolean }>(`/knowledge/snippets/${id}/use`)
}

/**
* 将公共片段复制到我的个人片段库（需登录）。
* collectionId 为空时复制到未分组。
*/
export function copyKnowledgeSnippet(
 id: string,
 collectionId?: string | null
): Promise<KnowledgeSnippet> {
 return post<KnowledgeSnippet>(`/knowledge/snippets/${id}/copy`, {
   collectionId: collectionId ?? null,
 })
}

/**
 * 批量为片段添加标签。
 * 返回实际更新数与不存在/无权操作的 id 列表。
 */
export function batchAddKnowledgeSnippetTag(
 ids: string[],
 tag: string
): Promise<{ updated: number; missing: string[] }> {
 return post<{ updated: number; missing: string[] }>('/knowledge/snippets/batch/tag', {
   ids,
   tag,
 })
}

/**
 * 批量删除片段。
 * 返回实际删除数（不存在/无权操作的 id 不计入）。
 */
export function batchDeleteKnowledgeSnippets(ids: string[]): Promise<{ deleted: number }> {
 return post<{ deleted: number }>('/knowledge/snippets/batch/delete', { ids })
}
