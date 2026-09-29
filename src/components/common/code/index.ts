/**
 * 代码块相关组件统一出口（恢复重建）。
 *
 * SourcePane 等调用方以具名方式导入：
 *   import { MonacoCodeEditor } from '@/components/common/code'
 *
 * 注意：暂不在此导出 CodeBlock.vue（该文件恢复后内容不完整，
 * 稳定后再补充导出），避免把损坏文件暴露进主包。
 */

// 统一的 Monaco 编辑器（可读写），SourcePane / 片段编辑器均使用
export { default as MonacoCodeEditor } from './MonacoCodeEditor.vue'

// 课程示例通用的只读代码块（Monaco 只读封装）
export { default as CommonCodeBlock } from './CommonCodeBlock.vue'
