/**
 * 片段版本相关类型。
 *
 * 历史上存在版本列表 / 回滚 API（对接 /knowledge/snippets/:id/versions
 * 系列接口），UI 侧未接入后已裁剪，幸存的 composables/useSnippetVersions.ts
 * 仅保留纯函数 computeVersionDiff。本文件为未来恢复版本历史 UI 预留形状；
 * 除 Diff 相关类型与 computeVersionDiff 返回结构严格对齐外，
 * 其余接口字段均为恢复推断。
 */

/** 版本差异中的单行（computeVersionDiff 返回元素的结构）。 */
export interface SnippetVersionDiffLine {
  /** 该行在合并视图中的全局行号（从 1 开始递增） */
  lineNum: number
  /** 行文本 */
  text: string
}

/** 版本差异结果：新增 / 删除 / 未变更三类行。 */
export interface SnippetVersionDiff {
  added: SnippetVersionDiffLine[]
  removed: SnippetVersionDiffLine[]
  unchanged: SnippetVersionDiffLine[]
}

/**
 * 单个历史版本（恢复推断）。
 * 对应历史接口 GET /knowledge/snippets/:id/versions 的列表项。
 */
export interface SnippetVersion {
  id: string
  /** 所属片段 id */
  snippetId: string
  /** 递增版本号 */
  version: number
  /** 该版本保存时的片段正文 */
  content: string
  /** 版本备注（可空） */
  note?: string | null
  /** 创建人用户 id（可空） */
  createdBy?: string | null
  createdAt: string
}

/** 版本列表接口的返回结果（恢复推断）。 */
export interface SnippetVersionListResult {
  items: SnippetVersion[]
}

/** 回滚到指定版本的请求负载（恢复推断）。 */
export interface SnippetVersionRollbackPayload {
  versionId: string
}
