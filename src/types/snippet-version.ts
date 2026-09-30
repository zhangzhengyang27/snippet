/**
 * 片段版本相关类型。
 *
 * ## 与「恢复推断」版本的区别
 * 本文件早期是在**没有后端实现、也没有前端调用点**的情况下，按「恢复推断」写下的
 * 占位形状（含 `version` 递增号、`note` 备注、无分页的列表等）。这些字段与真实接口
 * 并不一致。第 N 轮补齐后端版本功能后，这里改为**按真实契约**声明：
 * 后端 `snippet_versions` 表记录的是整快照（name/description/language/content/
 * displayAttrs + message），列表按时间倒序分页，没有版本号字段。
 *
 * 类型消费者：`api/knowledge-snippets.ts`、`composables/useSnippetVersions.ts`、
 * `components/snippets/SnippetVersionDialog.vue`。
 */

import type { EnhancedCodeBlockAttrs } from './code-block'

/** 描述片段版本快照的基础信息（列表项，**不含正文**，正文由详情接口返回）。 */
export interface SnippetVersionSummary {
  id: string
  snippetId: string
  name: string
  description: string | null
  language: string
  /**
   * 变更说明。后端约定：
   *   - `create`             创建时写入的首个快照
   *   - `update`             每次更新写入的快照
   *   - `rollback:<版本 id>` 该快照是「回滚到某版本」这个动作产生的
   *   - 其它                 用户填写的备注原文
   */
  message: string
  createdAt: string
}

/**
 * 描述单个版本快照的完整内容（详情接口，供 diff 使用）。
 *
 * 快照只记录「正文」：name / description / language / content / displayAttrs。
 * **不含** collectionId / isPublic / favorite / 标签 —— 因此回滚只恢复内容，
 * 不会把片段挪回旧集合、也不会改变公开状态。
 */
export interface SnippetVersionDetail extends SnippetVersionSummary {
  content: string
  displayAttrs: Partial<EnhancedCodeBlockAttrs>
}

/** 描述片段版本列表接口的返回结果（按时间倒序分页）。 */
export interface SnippetVersionListResult {
  items: SnippetVersionSummary[]
  total: number
  page: number
  pageSize: number
}

/** diff 中单行的性质 */
export type DiffLineKind = 'context' | 'added' | 'removed'

/**
 * 可供渲染的单行 diff。
 *
 * 刻意采用**有序行序列**而不是「新增/删除/未变更三个数组」：
 * 三个数组排不出对齐的两列（两侧各按自己的顺序收集，插入/删除会让左右错位）。
 */
export interface DiffLine {
  kind: DiffLineKind
  /** 旧侧行号；纯新增行为 null */
  oldLine: number | null
  /** 新侧行号；纯删除行为 null */
  newLine: number | null
  text: string
}
