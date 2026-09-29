/** 封装片段集合 State 相关组合式状态与交互逻辑。 */

import { computed, ref } from 'vue'
import {
  createKnowledgeSnippetCollection,
  listKnowledgeSnippetCollections,
  reorderKnowledgeSnippetCollections,
  updateKnowledgeSnippetCollection,
} from '@/api/knowledge-snippets'
import { getApiErrorMessage } from '@/api/client'
import type {
  KnowledgeSnippetCollection,
  KnowledgeSnippetCollectionReorderItem,
} from '@/types/knowledge-snippet'

/**
 * 描述片段集合弹窗状态。
 */
export type SnippetCollectionDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  id: string | null
  name: string
  parentId: string | null
}

/**
 * 描述可展示的片段集合项。
 */
export interface VisibleSnippetCollectionItem {
  id: string
  name: string
  depth: number
  hasChildren: boolean
  parentId: string | null
}

const countCollections = (items: KnowledgeSnippetCollection[]): number => {
  return items.reduce((totalCount, item) => totalCount + 1 + countCollections(item.children), 0)
}

const collectAllCollectionIds = (items: KnowledgeSnippetCollection[]): string[] => {
  return items.flatMap((item) => [item.id, ...collectAllCollectionIds(item.children)])
}

const flattenVisibleCollections = (
  items: KnowledgeSnippetCollection[],
  expandedIds: Set<string>,
  depth = 0
): VisibleSnippetCollectionItem[] => {
  return items.flatMap((item) => {
    const current: VisibleSnippetCollectionItem = {
      id: item.id,
      name: item.name,
      depth,
      hasChildren: item.children.length > 0,
      parentId: item.parentId,
    }

    if (!expandedIds.has(item.id)) {
      return [current]
    }

    return [current, ...flattenVisibleCollections(item.children, expandedIds, depth + 1)]
  })
}

const cloneCollectionTree = (items: KnowledgeSnippetCollection[]): KnowledgeSnippetCollection[] => {
  // 手写递归深拷贝：collections.value 为 Vue deep reactive proxy，
  // structuredClone 无法克隆 Proxy（抛 DataCloneError），故用 spread + map
  // 从 proxy 读取底层纯值生成新树，等价于不可变更新所需的克隆。
  const cloneNode = (node: KnowledgeSnippetCollection): KnowledgeSnippetCollection => ({
    ...node,
    children: Array.isArray(node.children) ? node.children.map(cloneNode) : [],
  })
  return items.map(cloneNode)
}

const containsCollection = (node: KnowledgeSnippetCollection, targetId: string): boolean => {
  if (node.id === targetId) {
    return true
  }

  return node.children.some((child) => containsCollection(child, targetId))
}

const removeCollectionFromTree = (
  items: KnowledgeSnippetCollection[],
  targetId: string
): { tree: KnowledgeSnippetCollection[]; removed: KnowledgeSnippetCollection | null } => {
  const nextItems: KnowledgeSnippetCollection[] = []
  let removed: KnowledgeSnippetCollection | null = null

  for (const item of items) {
    if (item.id === targetId) {
      removed = item
      continue
    }

    const childResult = removeCollectionFromTree(item.children, targetId)

    if (childResult.removed) {
      removed = childResult.removed
      nextItems.push({
        ...item,
        children: childResult.tree,
      })
      continue
    }

    nextItems.push(item)
  }

  return {
    tree: nextItems,
    removed,
  }
}

const appendCollectionToParent = (
  items: KnowledgeSnippetCollection[],
  parentId: string | null,
  target: KnowledgeSnippetCollection
): KnowledgeSnippetCollection[] => {
  if (parentId === null) {
    return [...items, target]
  }

  return items.map((item) => {
    if (item.id === parentId) {
      return {
        ...item,
        children: [...item.children, target],
      }
    }

    return {
      ...item,
      children: appendCollectionToParent(item.children, parentId, target),
    }
  })
}

const normalizeCollectionTree = (
  items: KnowledgeSnippetCollection[],
  parentId: string | null = null
): KnowledgeSnippetCollection[] => {
  return items.map((item, index) => ({
    ...item,
    parentId,
    order: index,
    children: normalizeCollectionTree(item.children, item.id),
  }))
}

const flattenCollectionReorderItems = (
  items: KnowledgeSnippetCollection[]
): KnowledgeSnippetCollectionReorderItem[] => {
  return items.flatMap((item) => {
    // 公共集合（及其子树）不参与个人重排序：
    // 后端 reorder 仅接受个人集合 ID，提交公共集合会导致整个请求被拒绝。
    if (item.isPublic) {
      return []
    }

    return [
      {
        id: item.id,
        parentId: item.parentId,
        order: item.order,
      },
      ...flattenCollectionReorderItems(item.children),
    ]
  })
}

const findSiblingsAndIndices = (
  items: KnowledgeSnippetCollection[],
  sourceId: string,
  targetId: string,
  parentId: string | null = null
): {
  siblings: KnowledgeSnippetCollection[]
  sourceIndex: number
  targetIndex: number
  parentId: string | null
} | null => {
  const sourceIndex = items.findIndex((item) => item.id === sourceId)
  const targetIndex = items.findIndex((item) => item.id === targetId)

  if (sourceIndex >= 0 && targetIndex >= 0) {
    return { siblings: items, sourceIndex, targetIndex, parentId }
  }

  for (const item of items) {
    const found = findSiblingsAndIndices(item.children, sourceId, targetId, item.id)
    if (found) {
      return found
    }
  }

  return null
}

/** 检测集合树是否存在环（某节点出现在自身子树中）。
 * vuedraggable 嵌套拖拽在极端情况下可能把父节点拖入自身子节点，
 * 落库前必须拦截，否则会写坏 parentId 层级关系。
 */
const hasCycle = (items: KnowledgeSnippetCollection[], seen: Set<string> = new Set()): boolean => {
  for (const item of items) {
    if (seen.has(item.id)) {
      return true
    }
    if (hasCycle(item.children, new Set(seen).add(item.id))) {
      return true
    }
  }
  return false
}

/**
 * 管理片段集合列表与编辑弹窗状态。
 */
export const useSnippetCollectionsState = () => {
  const collections = ref<KnowledgeSnippetCollection[]>([])
  const loadingCollections = ref(false)
  const collectionError = ref('')
  const expandedCollectionIds = ref<Set<string>>(new Set())
  const draggedCollectionId = ref('')
  const collectionDialogSaving = ref(false)
  const collectionDialog = ref<SnippetCollectionDialogState>({
    open: false,
    mode: 'create',
    id: null,
    name: '',
    parentId: null,
  })

  /**
   * 请求序号：每次发起 loadCollections 递增，响应回来时若不等于最新序号则丢弃，
   * 防止拖拽/创建过程中旧响应覆盖新响应。
   */
  let collectionLoadSeq = 0

  const visibleCollections = computed(() =>
    flattenVisibleCollections(collections.value, expandedCollectionIds.value)
  )

  const updateExpandedCollectionIds = (items: KnowledgeSnippetCollection[]) => {
    const nextIds = new Set(collectAllCollectionIds(items))
    expandedCollectionIds.value = new Set(
      Array.from(expandedCollectionIds.value).filter((id) => nextIds.has(id))
    )

    // 默认不展开任何集合；用户可手动点击根集合展开子分类。
    // 如需恢复默认展开根集合，取消下面注释即可。
    // if (expandedCollectionIds.value.size === 0) {
    //   expandedCollectionIds.value = new Set(items.map((item) => item.id))
    // }
  }

  const loadCollections = async () => {
    // 递增请求序号；响应回来时若不匹配则丢弃，避免旧响应覆盖新响应
    const seq = ++collectionLoadSeq
    loadingCollections.value = true
    collectionError.value = ''

    try {
      const result = await listKnowledgeSnippetCollections()
      // 丢弃过期响应：期间已发起新请求
      if (seq !== collectionLoadSeq) return result
      collections.value = result
      updateExpandedCollectionIds(result)
      return result
    } catch (error) {
      if (seq !== collectionLoadSeq) throw error
      collectionError.value = getApiErrorMessage(error, '加载集合树失败。')
      throw error
    } finally {
      // 仅当本次请求是最新请求时才清空 loading
      if (seq === collectionLoadSeq) {
        loadingCollections.value = false
      }
    }
  }

  const toggleCollectionExpanded = (id: string) => {
    const next = new Set(expandedCollectionIds.value)

    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }

    expandedCollectionIds.value = next
  }

  const openCreateCollectionDialog = (parentId: string | null = null) => {
    collectionDialog.value = {
      open: true,
      mode: 'create',
      id: null,
      name: '',
      parentId,
    }
  }

  const openEditCollectionDialog = (collectionId: string) => {
    const stack = [...collections.value]

    while (stack.length > 0) {
      const current = stack.shift()

      if (!current) {
        continue
      }

      if (current.id === collectionId) {
        collectionDialog.value = {
          open: true,
          mode: 'edit',
          id: current.id,
          name: current.name,
          parentId: current.parentId,
        }
        return
      }

      stack.push(...current.children)
    }
  }

  const submitCollectionDialog = async () => {
    const name = collectionDialog.value.name.trim()

    if (!name) {
      throw new Error('集合名称不能为空。')
    }

    collectionDialogSaving.value = true

    try {
      if (collectionDialog.value.mode === 'create') {
        await createKnowledgeSnippetCollection({
          name,
          parentId: collectionDialog.value.parentId,
        })
      } else if (collectionDialog.value.id) {
        await updateKnowledgeSnippetCollection(collectionDialog.value.id, {
          name,
        })
      }

      collectionDialog.value.open = false
      await loadCollections()
    } finally {
      collectionDialogSaving.value = false
    }
  }

  const moveCollection = async (targetParentId: string | null, sourceId?: string) => {
    const currentId = sourceId ?? draggedCollectionId.value
    if (!currentId) {
      return { status: 'idle' as const }
    }

    const nextTree = cloneCollectionTree(collections.value)
    const removal = removeCollectionFromTree(nextTree, currentId)
    const removedNode = removal.removed
    if (!removedNode) {
      draggedCollectionId.value = ''
      return { status: 'idle' as const }
    }

    if (targetParentId && containsCollection(removedNode, targetParentId)) {
      draggedCollectionId.value = ''
      return { status: 'invalid-target' as const }
    }

    const appendedTree = appendCollectionToParent(removal.tree, targetParentId, removedNode)
    const normalizedTree = normalizeCollectionTree(appendedTree)
    const reorderItems = flattenCollectionReorderItems(normalizedTree)

    collections.value = normalizedTree
    draggedCollectionId.value = ''

    try {
      const result = await reorderKnowledgeSnippetCollections(reorderItems)
      collections.value = result
      updateExpandedCollectionIds(result)
      return { status: 'success' as const }
    } catch (error) {
      await loadCollections().catch(() => undefined)
      throw error
    }
  }

  /** 平级排序：source 与 target 必须为同一父级下的兄弟。
   * 在前端树中按 target 位置做 arrayMove，再 normalize(order) + 全量 reorder 持久化。
   * 与 moveCollection 的区别：parentId 不变，只调整同级内的先后顺序。
   */
  const reorderCollectionSiblings = async (sourceId: string, targetId: string) => {
    const nextTree = cloneCollectionTree(collections.value)
    const found = findSiblingsAndIndices(nextTree, sourceId, targetId)
    if (!found) {
      return { status: 'idle' as const }
    }

    const { siblings, sourceIndex, targetIndex } = found
    const [moved] = siblings.splice(sourceIndex, 1)
    siblings.splice(targetIndex, 0, moved)

    const normalizedTree = normalizeCollectionTree(nextTree)
    const reorderItems = flattenCollectionReorderItems(normalizedTree)

    collections.value = normalizedTree

    try {
      const result = await reorderKnowledgeSnippetCollections(reorderItems)
      collections.value = result
      updateExpandedCollectionIds(result)
      return { status: 'success' as const }
    } catch (error) {
      await loadCollections().catch(() => undefined)
      throw error
    }
  }

  /** 持久化当前集合树的完整顺序与层级。
   * vuedraggable 的 :list 已在前端树（collections.value）上完成结构变更，
   * 这里只负责把最新结构 normalize（写 parentId/order）并全量 reorder 落库。
   */
  const persistCollectionTree = async () => {
    // 防环：vuedraggable 嵌套拖拽可能把父节点拖入自身子树，先拦截并回滚。
    if (hasCycle(collections.value)) {
      await loadCollections().catch(() => undefined)
      return { status: 'invalid-target' as const }
    }

    try {
      const normalizedTree = normalizeCollectionTree(cloneCollectionTree(collections.value))
      const reorderItems = flattenCollectionReorderItems(normalizedTree)
      const result = await reorderKnowledgeSnippetCollections(reorderItems)
      collections.value = result
      updateExpandedCollectionIds(result)
      return { status: 'success' as const }
    } catch (error) {
      // 持久化失败：优先从后端重新拉取以回滚到一致状态；
      // 但如果重新拉取本身也失败（如后端宕机），不能让其设置的阻塞性
      // collectionError 吞掉整棵树的展示——恢复本地树快照并清除错误，
      // 保证侧边栏集合树始终可见（错误由调用方以 toast 形式提示）。
      const snapshot = cloneCollectionTree(collections.value)
      await loadCollections().catch(() => {
        collections.value = snapshot
        collectionError.value = ''
      })
      throw error
    }
  }

  return {
    collections,
    loadingCollections,
    collectionError,
    expandedCollectionIds,
    draggedCollectionId,
    collectionDialog,
    collectionDialogSaving,
    visibleCollections,
    countCollections,
    collectAllCollectionIds,
    flattenVisibleCollections,
    cloneCollectionTree,
    containsCollection,
    removeCollectionFromTree,
    appendCollectionToParent,
    normalizeCollectionTree,
    flattenCollectionReorderItems,
    updateExpandedCollectionIds,
    loadCollections,
    toggleCollectionExpanded,
    openCreateCollectionDialog,
    openEditCollectionDialog,
    submitCollectionDialog,
    moveCollection,
    reorderCollectionSiblings,
    persistCollectionTree,
  }
}
