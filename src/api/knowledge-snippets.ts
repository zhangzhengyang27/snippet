/** 封装知识片段相关接口请求。 */

import { get, post, patch, del } from './client'
import type { RequestOptions } from './client'
import type {
 KnowledgeSnippet,
 KnowledgeSnippetCollection,
 KnowledgeSnippetCollectionReorderItem,
 KnowledgeSnippetListResult,
 KnowledgeSnippetTagListResult,
 ModerationQueueItem,
 SnippetModerationStatus,
 SnippetScope,
 SnippetSortOption,
} from '@/types/knowledge-snippet'
import type { EnhancedCodeBlockAttrs } from '@/types/code-block'
import type { SnippetVersionDetail, SnippetVersionListResult } from '@/types/snippet-version'

/**
* 获取片段集合列表（树形）。
*
* @param scope 数据作用域：`mine` 个人工作区，`public` 公共代码块库。
*              不传则由后端按 `all`（个人 + 公共）返回，兼容旧调用方。
*/
export function listKnowledgeSnippetCollections(
 scope?: SnippetScope
): Promise<KnowledgeSnippetCollection[]> {
 return get<KnowledgeSnippetCollection[]>('/knowledge/snippets/collections/tree', {
  scope,
 })
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
*
* @param scope 拖拽完成后返回的树按哪个作用域构建。个人工作区必须传 `mine`，
*              否则回来的「个人 + 公共」混合树会让侧栏凭空多出公共集合分支。
*/
export function reorderKnowledgeSnippetCollections(
 items: KnowledgeSnippetCollectionReorderItem[],
 scope?: SnippetScope
): Promise<KnowledgeSnippetCollection[]> {
 return post<KnowledgeSnippetCollection[]>('/knowledge/snippets/collections/reorder', {
  items,
  scope,
 })
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
*
* @param options.signal 取消信号，须透传给底层 `get`（见 client.ts 的 RequestOptions 说明）。
*/
export function listKnowledgeSnippets(
 params?: {
  q?: string
  collectionId?: string
  tag?: string
  language?: string
  favorite?: boolean
  sort?: SnippetSortOption
  /**
   * 数据作用域：`mine` 个人工作区、`public` 公共代码块库。
   * 不传则由后端按 `all`（个人 + 公共）返回，兼容收藏夹 / 最近浏览等旧调用方。
   */
  scope?: SnippetScope
  page?: number
  pageSize?: number
  /**
   * 按 id 批量取详情（「最近浏览」等先有 id 列表的场景）。
   * 一次请求取代 N 次回查；传 ids 时后端**不套分页**。
   */
  ids?: string[]
 },
 options?: RequestOptions
): Promise<KnowledgeSnippetListResult> {
  return get<KnowledgeSnippetListResult>(
    '/knowledge/snippets',
    {
      q: params?.q,
      collectionId: params?.collectionId,
      tag: params?.tag,
      language: params?.language,
      favorite: params?.favorite,
      sort: params?.sort,
      scope: params?.scope,
      page: params?.page,
      pageSize: params?.pageSize,
      // 显式 join 成逗号分隔（后端按 `ids` 参数解析）
      ids: params?.ids?.length ? params.ids.join(',') : undefined,
    },
    options
  )
}
/**
* 获取片段详情。
*
* @param options.signal 取消信号，须透传给底层 `get`。
*/
export function getKnowledgeSnippet(id: string, options?: RequestOptions): Promise<KnowledgeSnippet> {
 return get<KnowledgeSnippet>(`/knowledge/snippets/${id}`, undefined, options)
}

/**
 * 按 id 列表批量取片段详情，**并保持传入的 id 顺序**。
 *
 * 为什么需要这个包装而不是直接调 `listKnowledgeSnippets({ ids })`：
 *  - **顺序**：后端按自己的规则排序（favorite / lastUsedAt / updatedAt）返回，
 *    而调用方（「最近浏览」）要的是**访问顺序**，必须按 id 列表回排；
 *  - **容错**：已删除或无权访问的 id 不会出现在返回里，回排时自然被跳过，
 *    等价于原先逐条 `catch(() => null)` 再过滤的行为；
 *  - **收敛**：把「N 次回查」压成 1 次请求。
 */
export async function listKnowledgeSnippetsByIds(
  ids: string[],
  options?: RequestOptions
): Promise<KnowledgeSnippet[]> {
  if (!ids.length) return []
  const res = await listKnowledgeSnippets({ ids }, options)
  const byId = new Map((res.items ?? []).map((item) => [item.id, item]))
  return ids
    .map((id) => byId.get(id))
    .filter((item): item is KnowledgeSnippet => item != null)
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
* 获取片段的版本历史（分页，按时间倒序）。
*
* 列表项**不含正文**（省流量）；需要正文做 diff 时再调 `getSnippetVersion`。
*
* @param options.signal 取消信号，须透传给底层 `get`（见 client.ts 的 RequestOptions 说明）。
*/
export function listSnippetVersions(
 snippetId: string,
 params?: { page?: number; pageSize?: number },
 options?: RequestOptions
): Promise<SnippetVersionListResult> {
 return get<SnippetVersionListResult>(
   `/knowledge/snippets/${snippetId}/versions`,
   { page: params?.page, pageSize: params?.pageSize },
   options
 )
}

/**
* 获取单个版本快照的完整内容（含正文与 displayAttrs）。
*
* @param options.signal 取消信号，须透传给底层 `get`。
*/
export function getSnippetVersion(
 snippetId: string,
 versionId: string,
 options?: RequestOptions
): Promise<SnippetVersionDetail> {
 return get<SnippetVersionDetail>(
   `/knowledge/snippets/${snippetId}/versions/${versionId}`,
   undefined,
   options
 )
}

/**
* 删除单个版本快照（不影响片段正文）。
*/
export function deleteSnippetVersion(
 snippetId: string,
 versionId: string
): Promise<{ ok: boolean; deleted: number }> {
 return del<{ ok: boolean; deleted: number }>(
   `/knowledge/snippets/${snippetId}/versions/${versionId}`
 )
}

/**
* 回滚到指定版本。
*
* 后端语义：把该版本的**正文**覆盖回片段，并**追加**一条 `rollback:<版本 id>`
* 的快照（只追加、不原地回退，因此回滚这个动作本身也可以再被回滚）。
* 返回的 `restoredFrom` 即来源版本 id。
*/
export function rollbackSnippetVersion(
 snippetId: string,
 versionId: string
): Promise<{ ok: boolean; restoredFrom: string }> {
 return post<{ ok: boolean; restoredFrom: string }>(
   `/knowledge/snippets/${snippetId}/versions/${versionId}/rollback`
 )
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

// ── 发布到公共代码块库（作者侧） ──

/**
 * 提交发布：把自己的片段送审。管理员通过后才真正进入公共代码块库，
 * 提交后 `isPublic` 仍为 false、`moderationStatus` 变为 `pending`。
 */
export function submitSnippetPublication(id: string): Promise<KnowledgeSnippet> {
 return post<KnowledgeSnippet>(`/knowledge/snippets/${id}/publication`)
}

/**
 * 取消发布：撤回待审（pending）或下架已发布（approved），一律回到私有。
 */
export function withdrawSnippetPublication(id: string): Promise<KnowledgeSnippet> {
 return del<KnowledgeSnippet>(`/knowledge/snippets/${id}/publication`)
}

// ── 审核队列（管理员） ──

/** 审核队列返回结构。 */
export interface ModerationQueueResult {
 items: ModerationQueueItem[]
 total: number
 page: number
 pageSize: number
}

/**
 * 拉取审核队列（仅管理员可访问，非管理员返回 403）。
 * 不传 status 时后端默认返回 `pending`（待审）。
 */
export function listModerationQueue(
 params?: { status?: SnippetModerationStatus; page?: number; pageSize?: number },
 options?: RequestOptions
): Promise<ModerationQueueResult> {
 return get<ModerationQueueResult>(
   '/knowledge/snippets/moderation/queue',
   {
     status: params?.status,
     page: params?.page,
     pageSize: params?.pageSize,
   },
   options
 )
}

/**
 * 裁决一条待审片段（仅管理员）。
 * approve → 进入公共库；reject → 保持私有，`note` 作为未通过原因回传给作者。
 */
export function moderateKnowledgeSnippet(
 id: string,
 payload: { action: 'approve' | 'reject'; note?: string }
): Promise<KnowledgeSnippet> {
 return post<KnowledgeSnippet>(`/knowledge/snippets/${id}/moderation`, payload)
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
