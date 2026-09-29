/**
 * 类型桶文件：统一收敛到 `import type { X } from '@/types'`。
 *
 * 领域类型按主题拆分在同级模块中，此处直接再导出：
 * - code-block          代码块展示配置（EnhancedCodeBlockAttrs / 难度 / 主题等）
 * - knowledge-snippet   知识片段与片段集合
 * - refactor            重构辅助类型（useListFilter / useResourceFetch）
 * - snippet-group       片段分组（拖拽容器分组）
 * - snippet-version     片段版本与差异
 * 示例（examples hub）相关类型直接定义在本文件。
 */

export * from './code-block'
export * from './knowledge-snippet'
export * from './refactor'
export * from './snippet-group'
export * from './snippet-version'

/** 示例预览的视口模式（设备尺寸切换）。 */
export type ViewMode = 'desktop' | 'tablet' | 'mobile'

/** 示例源码面板的代码页签。 */
export type CodeTab = 'html' | 'css' | 'js'

/**
 * 示例的多版本变体（合并变体切换 / 沙箱片段共用）。
 * 结构与 utils/sandbox 的 Snippet 兼容（label 必填，代码段可选）。
 */
export interface ExampleSnippet {
  /** 变体名称（变体选择器与移动端标题展示） */
  label: string
  html?: string
  css?: string
  js?: string
}

/**
 * 代码示例（examples hub 的核心实体），字段与服务端 Example 实体对齐。
 * html / css / js 为预览与源码面板消费的正文，可空；其余字段见各注释。
 */
export interface CodeExample {
  id: string
  title: string
  /** 描述（可空） */
  description: string | null
  /** 所属分类名（面包屑 / 搜索结果展示） */
  category: string
  /** 所属分类 slug */
  categorySlug: string
  /** 所属主题 slug */
  topicSlug: string
  tags: string[]
  /** 主语言（javascript / html / css 等） */
  language: string
  /** 原始来源文件路径（可空） */
  sourceFile: string | null
  /** 原始来源文件中的行号（可空） */
  sourceLine: number | null
  /** 来源分组（详情页返回分组导航用；列表接口可能缺省）恢复推断 */
  sourceGroup?: string | null
  /** 难度标记（可空）恢复推断 */
  difficulty: string | null
  /** 是否为交互式演示 */
  isInteractive: boolean
  /** 多版本变体（列表接口可能缺省） */
  snippets?: ExampleSnippet[]
  createdAt: string
  updatedAt: string
  /** 预览 / 源码面板使用的 HTML（可空） */
  html?: string
  /** 样式（可空） */
  css?: string
  /** 脚本（可空） */
  js?: string
}
