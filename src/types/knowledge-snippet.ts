/** 汇总知识片段与片段集合的类型约束。 */

import type { EnhancedCodeBlockAttrs, CodeBlockFile } from './code-block'

/** 多文件片段中的单个文件（与 EnhancedCodeBlockAttrs.files 元素一致）。 */
export type SnippetFile = CodeBlockFile

/** 约束片段列表可使用的排序方式。 */
export type SnippetSortOption = 'default' | 'updatedAt' | 'name' | 'lastUsedAt' | 'difficulty'
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

/** 描述知识片段的完整内容与展示配置。 */
export interface KnowledgeSnippet {
  id: string
  name: string
  description: string | null
  language: string
  content: string
  /** 是否为公共片段：公共片段对未登录用户只读可见，登录用户可复制到自己的集合 */
  isPublic?: boolean
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
