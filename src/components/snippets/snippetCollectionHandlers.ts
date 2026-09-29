/** 片段集合树行的交互回调，通过 provide/inject 下发给递归的 SnippetCollectionRow。
 * 这样递归组件无需逐层透传事件，直接调用顶层 Sidebar 注入的回调即可。
 */
import type { InjectionKey, Ref } from 'vue'

export interface SnippetCollectionRowHandlers {
  /** 选中集合（切换右侧列表筛选） */
  select: (id: string) => void
  /** 展开/收起集合的子项 */
  toggleExpand: (id: string) => void
  /** 在指定集合下新建子集合 */
  createChild: (id: string) => void
  /** 重命名集合 */
  edit: (id: string) => void
  /** 删除集合 */
  remove: (id: string) => void
  /** 拖拽结束后把最新树结构落库 */
  persist: () => void
}

export const SNIPPET_COLLECTION_HANDLERS: InjectionKey<SnippetCollectionRowHandlers> = Symbol(
  'snippetCollectionHandlers'
)

/** 拖拽进行中标记，供递归行与根投放区共享，用于显示"拖到此处移动到根目录"提示。 */
export const SNIPPET_COLLECTION_DRAGGING: InjectionKey<Ref<boolean>> = Symbol(
  'snippetCollectionDragging'
)

/** 拖拽悬停目标集合 id 集合（由 <draggable> 的 move 回调根据 evt.related 实时写入）。
 * 悬停某行时，该行及其所有祖先集合的子容器都会撑开为投放区（保证深层可投放），
 * 而非拖拽时整棵树同时撑开。空集合表示指针悬停在根列表空区域。 */
export const SNIPPET_COLLECTION_DRAG_OVER: InjectionKey<Ref<Set<string>>> = Symbol(
  'snippetCollectionDragOver'
)

/** 从集合行 DOM 元素向上追溯，收集该行及其所有祖先集合的 id（悬停展开路径）。
 * 行元素需带 data-collection-id 属性；逐层查找父级 .collection-row__children 容器
 * 及其所属 .collection-row，直到根列表为止。 */
export function computeCollectionHoverPath(rowEl: Element | null | undefined): Set<string> {
  const path = new Set<string>()
  let row: Element | null = rowEl ?? null

  while (row) {
    const id = row.getAttribute('data-collection-id')
    if (id) path.add(id)
    const container = row.parentElement
    row =
      container && container.classList.contains('collection-row__children')
        ? container.closest('.collection-row')
        : null
  }

  return path
}
