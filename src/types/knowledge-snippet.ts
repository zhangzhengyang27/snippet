/** 汇总知识片段与片段集合的类型约束。 */

import type { EnhancedCodeBlockAttrs, CodeBlockFile } from './code-block'

/** 多文件片段中的单个文件（与 EnhancedCodeBlockAttrs.files 元素一致）。 */
export type SnippetFile = CodeBlockFile

/** 约束片段列表可使用的排序方式。 */
export type SnippetSortOption = 'default' | 'updatedAt' | 'name' | 'lastUsedAt' | 'difficulty'

/**
 * 片段 / 集合的数据作用域。
 *
 * - `mine`：仅当前用户自己的数据（未登录 → 空集），个人工作区 `/snippets` 用
 * - `public`：仅公共数据，公共代码块库 `/library` 用
 * - `all`（默认）：登录为「个人 + 公共」，未登录仅公共
 *
 * 默认值是 `all`，收藏夹 / 最近浏览 / 首页等既有调用方不传即保持原语义。
 */
export type SnippetScope = 'mine' | 'public' | 'all'

/** 约束片段占位符的输入形态。 */
export type SnippetPlaceholderKind = 'text' | 'choice'

/** 描述片段模板中可替换占位符的定义。 */
export interface SnippetPlaceholderDef {
  name: string
  kind: SnippetPlaceholderKind
  defaultValue: string | null
  options: string[]
}

/** 描述片段集合在树状目录中的基础信息。 */
export interface KnowledgeSnippetCollection {
  id: string
  name: string
  parentId: string | null
  order: number
  /** 是否为公共集合：公共集合对未登录用户只读可见，不可编辑/拖拽 */
  isPublic?: boolean
  createdAt: string
  updatedAt: string
  children: KnowledgeSnippetCollection[]
}

/** 描述标签统计面板中的单个标签条目。 */
export interface KnowledgeSnippetTagItem {
  id: string
  name: string
  count: number
  updatedAt: string
}

/**
 * 片段的发布审核状态。
 *
 * - `none`：私有（未提交 / 已撤回 / 已下架）
 * - `pending`：已提交，等待管理员审核 —— 此时 `isPublic` 仍为 false，尚未上架
 * - `approved`：审核通过，已进入公共代码块库
 * - `rejected`：审核未通过，`moderationNote` 记录原因，作者可修改后重新提交
 */
export type SnippetModerationStatus = 'none' | 'pending' | 'approved' | 'rejected'

/** 描述知识片段的完整内容与展示配置。 */
export interface KnowledgeSnippet {
  id: string
  name: string
  description: string | null
  language: string
  /**
   * 代码正文。
   *
   * ⚠️ **列表接口刻意不返回它**（占单条载荷约 73%，而列表 UI 只用标题/描述/标签）。
   * 因此从列表拿到的片段该字段为 `undefined`；仅在**选中预览 / 复制 / 导出**等
   * 真正需要正文时按需回查详情接口（或 `listKnowledgeSnippetsByIds`）补齐。
   * 详情接口、by-ids、审核队列返回的片段**始终带 content**。
   */
  content?: string
  /** 是否为公共片段：公共片段对未登录用户只读可见，登录用户可复制到自己的集合 */
  isPublic?: boolean
  /** 发布审核状态，见 `SnippetModerationStatus` */
  moderationStatus?: SnippetModerationStatus
  /** 审核备注：被拒绝时是管理员填写的原因 */
  moderationNote?: string | null
  /** 最近一次审核动作的时间（通过 / 拒绝） */
  moderatedAt?: string | null
  displayAttrs: EnhancedCodeBlockAttrs
  placeholderDefs: SnippetPlaceholderDef[]
  favorite: boolean
  usageCount: number
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
  collectionId: string | null
  collectionName: string | null
  tags: string[]
}

/** 审核队列条目：片段本体 + 提交者标识（管理员裁决时需要知道是谁提交的）。 */
export interface ModerationQueueItem extends KnowledgeSnippet {
  authorName: string | null
  authorUsername: string | null
}

/** 描述知识片段分页列表接口的返回结果。 */
export interface KnowledgeSnippetListResult {
  items: KnowledgeSnippet[]
  total: number
  page: number
  pageSize: number
}

/** 描述知识片段标签列表接口的返回结果。 */
export interface KnowledgeSnippetTagListResult {
  items: KnowledgeSnippetTagItem[]
}

/** 描述片段集合重排序时提交的单条位置信息。 */
export interface KnowledgeSnippetCollectionReorderItem {
  id: string
  parentId?: string | null
  order: number
}
