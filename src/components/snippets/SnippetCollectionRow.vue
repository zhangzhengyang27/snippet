<script setup lang="ts">
/** 行组件，负责片段集合单项展示与行内操作。
 * 拖拽改用 vuedraggable（SortableJS / 原生 HTML5 拖放）：整棵集合树由外层
 * <draggable> 递归包裹，本组件始终渲染一层嵌套 <draggable>（对齐官方嵌套示例，
 * 保证空集合/收起集合也存在可投放容器），通过同一 group="collections" 实现平级
 * 重排与跨父级嵌套；收起态默认隐藏子容器，拖拽进行中（is-drag-target）展开为
 * 最小投放区，松手后由顶层 provide 的 handlers.persist 把最新树结构落库。
 * 视觉风格对齐 ToolsSidebar 的子菜单：32px 高、6px 圆角、inset 选中态、左侧缩进竖线，操作入口改为右键菜单。
 */
import { computed, inject, onUnmounted, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import AppIcon from '@/components/common/AppIcon.vue'
import {
  SNIPPET_COLLECTION_HANDLERS,
  SNIPPET_COLLECTION_DRAGGING,
  SNIPPET_COLLECTION_DRAG_OVER,
  computeCollectionHoverPath,
  type SnippetCollectionRowHandlers,
} from './snippetCollectionHandlers'
import type { KnowledgeSnippetCollection } from '@/types/knowledge-snippet'

defineOptions({
  name: 'SnippetCollectionRow',
})

const props = defineProps<{
  item: KnowledgeSnippetCollection
  /** 当前层级深度，仅用于语义与潜在逻辑，缩进由嵌套容器负责 */
  depth: number
  selectedCollectionId: string | null
  expandedCollectionIds: Set<string>
}>()

type MenuSeparator = { separator: true }
type MenuAction = {
  label: string
  icon: string
  danger?: boolean
  action: () => void
}
type MenuItem = MenuSeparator | MenuAction

const handlers = inject(SNIPPET_COLLECTION_HANDLERS) as SnippetCollectionRowHandlers
const draggingRef = inject(SNIPPET_COLLECTION_DRAGGING)
const dragOverIds = inject(SNIPPET_COLLECTION_DRAG_OVER)

const isSelected = computed(() => props.selectedCollectionId === props.item.id)
const isExpanded = computed(() => props.expandedCollectionIds.has(props.item.id))
const hasChildren = computed(
  () => Array.isArray(props.item.children) && props.item.children.length > 0
)
const folderIcon = computed(() =>
  hasChildren.value && isExpanded.value ? 'material-symbols:folder-open' : 'material-symbols:folder'
)

const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)

const menuItems = computed<MenuItem[]>(() => [
  {
    label: '新建子集合',
    icon: 'material-symbols:create-new-folder',
    action: () => handlers.createChild(props.item.id),
  },
  { separator: true },
  {
    label: '重命名',
    icon: 'material-symbols:edit',
    action: () => handlers.edit(props.item.id),
  },
  {
    label: '删除集合',
    icon: 'material-symbols:delete',
    danger: true,
    action: () => handlers.remove(props.item.id),
  },
])

const handleContextMenu = (event: MouseEvent) => {
  if (props.item.isPublic) return
  event.preventDefault()
  menuX.value = event.clientX
  menuY.value = event.clientY
  menuVisible.value = true
}

const handleMenuItemClick = (item: MenuAction) => {
  item.action()
  menuVisible.value = false
}

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target?.closest('.snippet-collection-row__context-menu')) {
    menuVisible.value = false
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    menuVisible.value = false
  }
}

watch(menuVisible, (visible) => {
  if (visible) {
    document.addEventListener('click', handleDocumentClick, true)
    document.addEventListener('keydown', handleKeyDown)
  } else {
    document.removeEventListener('click', handleDocumentClick, true)
    document.removeEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick, true)
  document.removeEventListener('keydown', handleKeyDown)
})

/** 本集合是否在拖拽悬停展开路径上（由 move 回调写入 dragOverIds）：
 * 悬停某行时撑开该行及其祖先的子容器，避免拖拽时整棵树同时撑开。 */
const isDragOver = computed(() => dragOverIds?.value.has(props.item.id) ?? false)

/** 嵌套拖拽开始：标记全局拖拽态（用于显示根目录投放区）。 */
const onChildDragStart = () => {
  if (draggingRef) {
    draggingRef.value = true
  }
}

/** 嵌套拖拽结束：清除拖拽态并把最新树结构落库。
 * 只有被拖拽项所在的源列表会派发 @end，因此 persist 全局只会触发一次。
 */
const onChildDragEnd = () => {
  if (draggingRef) {
    draggingRef.value = false
  }
  if (dragOverIds) {
    dragOverIds.value = new Set()
  }
  handlers.persist()
}

/** 本集合子容器的 move 回调：指针悬停进入本子容器时，把悬停路径设为
 * “悬停的子行（若有）及其祖先”，否则为本集合（悬停空区域），仅撑开该路径。
 * 公共集合不接受投放：个人集合不能被移动到公共集合之下（后端也会拒绝）。 */
const onChildMove = (evt: { to: HTMLElement; related?: HTMLElement | null }) => {
  if (!dragOverIds || !evt.to.classList.contains('collection-row__children')) return
  const targetRow = evt.to.closest('.collection-row')
  if (targetRow?.classList.contains('is-public')) {
    return false
  }
  const relatedRow = evt.related?.closest('.collection-row') ?? null
  dragOverIds.value = relatedRow
    ? computeCollectionHoverPath(relatedRow)
    : computeCollectionHoverPath(evt.to.closest('.collection-row'))
}
</script>

<template>
  <div
    class="collection-row"
    :class="{ 'is-public': props.item.isPublic, 'is-root': props.depth === 0 }"
    :data-collection-id="props.item.id"
  >
    <button
      type="button"
      class="collection-row__item"
      :class="{
        'is-active': isSelected,
        'has-children': hasChildren,
        'is-public': props.item.isPublic,
      }"
      :aria-current="isSelected ? 'true' : undefined"
      @click="handlers.select(props.item.id)"
      @contextmenu="handleContextMenu"
    >
      <span
        v-if="hasChildren"
        class="collection-row__toggle"
        :class="{ 'is-expanded': isExpanded }"
        @click.stop="handlers.toggleExpand(props.item.id)"
      >
        <AppIcon icon="material-symbols:chevron-right" :size="12" />
      </span>
      <span v-else class="collection-row__spacer" aria-hidden="true" />

      <AppIcon :icon="folderIcon" :size="14" class="collection-row__folder" aria-hidden="true" />

      <span class="collection-row__label">{{ props.item.name }}</span>

      <!-- 公共集合徽章：放在按钮内部作为最后一个 flex 项。
           之前挂在 button 外面用 absolute 定位父级 .collection-row，
           子菜单展开后父级高度被撑高，top:50% 跟着沉到子菜单中段造成错位。 -->
      <span
        v-if="props.item.isPublic && props.depth === 0"
        class="collection-row__public-badge"
        title="公共集合：只读，不可编辑/拖拽"
      >
        公共
      </span>
    </button>

    <!-- 右键菜单：替代 hover 操作按钮；通过 Teleport 挂载到 body，避免被 sidebar 裁剪 -->
    <Teleport to="body">
      <div
        v-if="menuVisible"
        class="snippet-collection-row__context-menu"
        :style="{ left: `${menuX}px`, top: `${menuY}px` }"
        @click.stop
      >
        <ul class="snippet-collection-row__context-menu-list" role="menu">
          <template v-for="(item, index) in menuItems" :key="index">
            <li
              v-if="'separator' in item"
              class="snippet-collection-row__context-menu-separator"
              role="separator"
            />
            <li
              v-else
              class="snippet-collection-row__context-menu-item"
              :class="{ 'is-danger': item.danger }"
              role="menuitem"
              @click="handleMenuItemClick(item)"
            >
              <AppIcon
                v-if="item.icon"
                :icon="item.icon"
                :size="14"
                class="snippet-collection-row__context-menu-icon"
              />
              <span class="snippet-collection-row__context-menu-label">{{ item.label }}</span>
            </li>
          </template>
        </ul>
      </div>
    </Teleport>

    <!-- 子集合容器：始终渲染（保证空集合/收起集合也可作为投放目标），左侧竖线缩进。
         收起态（is-collapsed）默认隐藏；仅当指针悬停进入本容器（is-drag-target）时
         才撑开为最小投放区，避免拖拽时整棵树同时撑开。 -->
    <draggable
      :list="props.item.children"
      :group="{ name: 'collections' }"
      item-key="id"
      :animation="180"
      ghost-class="collection-row--ghost"
      :draggable="'.collection-row:not(.is-public)'"
      class="collection-row__children"
      :class="{ 'is-collapsed': !isExpanded, 'is-drag-target': isDragOver }"
      :move="onChildMove"
      @start="onChildDragStart"
      @end="onChildDragEnd"
    >
      <template #item="{ element }">
        <SnippetCollectionRow
          :item="element"
          :depth="props.depth + 1"
          :selected-collection-id="props.selectedCollectionId"
          :expanded-collection-ids="props.expandedCollectionIds"
        />
      </template>
    </draggable>
  </div>
</template>

<style scoped>
.collection-row {
  --sb-transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --sb-text: rgb(var(--color-text-rgb));
  --sb-text-muted: rgb(var(--color-text-secondary-rgb));
  --sb-text-faint: rgb(var(--color-text-secondary-rgb) / 0.5);
  --sb-accent: rgb(var(--color-primary-rgb));
  --sb-accent-bg: rgb(var(--color-primary-rgb) / 0.1);
  --sb-hover: rgb(var(--color-surface-variant-rgb) / 0.5);
  --sb-border: rgb(var(--color-border-glass-rgb) / 0.08);

  position: relative;
}

/* 主项 */
.collection-row__item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  /* 私有集合右侧不需要预留空间；公共集合需留出 badge 位置 */
  padding-right: 12px;
  padding-left: 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--sb-text-muted);
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 400;
  cursor: grab;
  text-align: left;
  transition:
    background var(--sb-transition),
    color var(--sb-transition),
    box-shadow var(--sb-transition),
    opacity var(--sb-transition);
}

.collection-row__item:active {
  cursor: grabbing;
}

/* 公共集合为只读：不可拖拽，光标为普通指针 */
.collection-row__item.is-public,
.collection-row__item.is-public:active {
  cursor: pointer;
}

/* 公共集合徽章：作为按钮内最后一个 flex 子项，label 共享剩余空间后徽章自然右贴。
   不再用 absolute 定位（之前绝对定位锚点是父级 .collection-row，当子菜单展开撑高
   父级高度时，top:50% 跟着下沉，导致徽章跑到子项中段位置造成错位）。 */
.collection-row__public-badge {
  flex-shrink: 0;
  margin-left: 8px;
  padding: 0 6px;
  border: 1px solid rgb(var(--color-primary-rgb) / 0.3);
  border-radius: 4px;
  background: rgb(var(--color-primary-rgb) / 0.1);
  color: var(--sb-accent);
  font-size: 0.625rem;
  line-height: 16px;
  pointer-events: none;
}

.collection-row__item:hover {
  background: var(--sb-hover);
  color: var(--sb-text);
}

.collection-row__item.is-active {
  background: var(--sb-accent-bg);
  color: var(--sb-text);
  font-weight: 500;
  box-shadow: inset 0 0 0 1px rgb(var(--color-primary-rgb) / 0.15);
}

/* 展开/收起箭头 */
.collection-row__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--sb-text-faint);
  border-radius: 4px;
  cursor: pointer;
  transition:
    transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
    color var(--sb-transition),
    background var(--sb-transition);
}

.collection-row__toggle:hover {
  background: rgb(var(--color-text-rgb) / 0.06);
  color: var(--sb-text);
}

.collection-row__toggle.is-expanded {
  transform: rotate(90deg);
  color: var(--sb-accent);
}

/* 无子项时的占位区（与展开箭头同宽，保持文件夹图标对齐） */
.collection-row__spacer {
  display: inline-block;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 集合分类图标 */
.collection-row__folder {
  flex-shrink: 0;
  color: currentColor;
  opacity: 0.85;
}

/* 标签 */
.collection-row__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 右键菜单：通过 Teleport 挂载到 body，使用固定定位避免被 sidebar 裁剪 */
.snippet-collection-row__context-menu {
  position: fixed;
  z-index: var(--z-toast);
  min-width: 140px;
  padding: 4px;
  border: 1px solid var(--color-border-glass);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
  animation: snippet-collection-row-menu-in var(--duration-fast) ease-out;
}

@keyframes snippet-collection-row-menu-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.snippet-collection-row__context-menu-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.snippet-collection-row__context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--text-body-sm, 0.875rem);
  cursor: pointer;
  transition:
    background 150ms ease,
    color 150ms ease;
}

.snippet-collection-row__context-menu-item:hover {
  background: rgb(var(--color-surface-variant-rgb) / 0.5);
}

.snippet-collection-row__context-menu-item.is-danger {
  color: rgb(var(--color-error-rgb));
}

.snippet-collection-row__context-menu-item.is-danger:hover {
  background: rgb(var(--color-error-rgb) / 0.1);
}

.snippet-collection-row__context-menu-icon {
  flex-shrink: 0;
  opacity: 0.8;
}

.snippet-collection-row__context-menu-separator {
  height: 1px;
  margin: 2px 0;
  background: rgb(var(--color-border-glass-rgb) / 0.08);
}

/* 子集合容器：左侧竖线（视觉对齐 ToolsSidebar 的子菜单），缩进由嵌套叠加形成。
   始终渲染（不再 v-if），收起态与拖拽态通过以下类控制显隐。 */
.collection-row__children {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 14px;
  padding-left: 6px;
  border-left: 1px solid var(--sb-border);
}

/* 收起且未被悬停：隐藏子容器，不占额外空间（保持菜单紧凑） */
.collection-row__children.is-collapsed:not(.is-drag-target) {
  display: none;
}

/* 指针悬停进入本容器：撑开为最小投放区（空集合也能接收拖放）。
   收起态被悬停时会同时展开显示已有子行，便于精确投放到子级之间。 */
.collection-row__children.is-drag-target {
  min-height: 28px;
}

/* 拖拽占位（SortableJS ghost） */
.collection-row--ghost .collection-row__item {
  opacity: 0.4;
  background: var(--sb-accent-bg);
  box-shadow: inset 0 0 0 1px rgb(var(--color-primary-rgb) / 0.3);
}

@media (prefers-reduced-motion: reduce) {
  .collection-row {
    --sb-transition: 0ms;
  }

  .collection-row__toggle {
    transition: none;
  }
}
</style>
