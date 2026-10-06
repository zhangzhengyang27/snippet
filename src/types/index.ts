/**
 * 类型桶文件：统一收敛到 `import type { X } from '@/types'`。
 *
 * 领域类型按主题拆分在同级模块中，此处直接再导出：
 * - code-block          代码块展示配置（EnhancedCodeBlockAttrs / 难度 / 主题等）
 * - knowledge-snippet   知识片段与片段集合
 * - refactor            重构辅助类型（useListFilter / useResourceFetch）
 * - snippet-group       片段分组（拖拽容器分组）
 * - snippet-version     片段版本与差异
 */

export * from './code-block'
export * from './knowledge-snippet'
export * from './refactor'
export * from './snippet-group'
export * from './snippet-version'

/** 预览用的视口模式（设备尺寸切换）。iframe 预览（DeviceFrame）消费。 */
export type ViewMode = 'desktop' | 'tablet' | 'mobile'
