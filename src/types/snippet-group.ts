/**
 * 片段分组相关类型（恢复推断）。
 *
 * 当前唯一可追溯的使用点在 components/snippets/ 下：侧边栏（SnippetSidebar）、
 * 集合行（SnippetCollectionRow）与根投放区（SnippetRootDropzone）通过
 * vuedraggable 的同名 group（'collections'）实现集合树与根区域之间
 * 集合 / 片段的跨容器拖拽。
 */

/** 片段集合拖拽容器的固定分组名。 */
export const SNIPPET_COLLECTION_DRAG_GROUP = 'collections'

/** 拖拽容器分组名（与 SNIPPET_COLLECTION_DRAG_GROUP 一致）。 */
export type SnippetCollectionDragGroup = typeof SNIPPET_COLLECTION_DRAG_GROUP

/** vuedraggable group 属性的对象形式（本项目用到的常用子集）。 */
export interface SnippetDragGroupOptions {
  name: string
}
