<script setup lang="ts">
/** 左侧边栏组件：快速筛选 + 文件夹 + 标签。
 * 拖拽基于 vuedraggable（SortableJS / 原生 HTML5 拖放）：整棵集合树由外层
 * <draggable> 递归包裹（见 SnippetCollectionRow），同一 group="collections"
 * 同时支持平级重排与跨父级嵌套；松手后 emit('persist-collections') 由顶层落库。
 * 根目录放置区（SnippetRootDropzone）拖拽中显示，松手即移动到根。
 * 视觉风格对齐 ToolsSidebar（扁平菜单、渐变 header、inset 选中态、子菜单竖线缩进）。
 */
import { computed, provide, ref } from 'vue'
import draggable from 'vuedraggable'
import AppIcon from '@/components/common/AppIcon.vue'
import SnippetCollectionRow from '@/components/snippets/SnippetCollectionRow.vue'
import SnippetRootDropzone from '@/components/snippets/SnippetRootDropzone.vue'
import {
  SNIPPET_COLLECTION_HANDLERS,
  SNIPPET_COLLECTION_DRAGGING,
  SNIPPET_COLLECTION_DRAG_OVER,
  computeCollectionHoverPath,
  type SnippetCollectionRowHandlers,
} from '@/components/snippets/snippetCollectionHandlers'
import type { KnowledgeSnippetCollection } from '@/types/knowledge-snippet'
import type { KnowledgeSnippetTagItem } from '@/types/knowledge-snippet'

const props = defineProps<{
  snippetCount: number
  collectionError: string
  loadingCollections: boolean
  expandedCollectionIds: Set<string>
  selectedCollectionId: string | null
  /** 集合树（真实层级结构，vuedraggable 直接在此数组上做结构变更） */
  collections: KnowledgeSnippetCollection[]
  tags: KnowledgeSnippetTagItem[]
  loadingTags: boolean
  tagError: string
  selectedTag: string
  favoritesOnly: boolean
  /** 是否已登录：未登录时隐藏新建集合、仅看收藏、标签等个人功能 */
  isLoggedIn: boolean
  /** 详情视图模式：page（独立页） | split（分屏） */
  detailLayout: 'page' | 'split'
}>()

const emit = defineEmits<{
  'select-collection': [id: string | null]
  'toggle-collection-expanded': [id: string]
  'create-collection': [parentId: string | null]
  'edit-collection': [id: string]
  'delete-collection': [id: string]
  'persist-collections': []
  'update:selected-tag': [value: string]
  'update:favorites-only': [value: boolean]
  'update:detail-layout': [value: 'page' | 'split']
}>()


// 拖拽进行中标记：根 <draggable> 与递归行内的 <draggable> 都会切换它，
// 用于显示根目录放置区。provide 给行内组件，避免逐层透传事件。
const dragging = ref(false)
provide(SNIPPET_COLLECTION_DRAGGING, dragging)

// 拖拽悬停目标集合 id 集合：由 move 回调根据 evt.related 实时写入，
// 悬停某行时撑开该行及其祖先的子容器（避免整棵树同时撑开）。provide 给递归行。
const dragOverIds = ref<Set<string>>(new Set())
provide(SNIPPET_COLLECTION_DRAG_OVER, dragOverIds)

const handlers: SnippetCollectionRowHandlers = {
  select: (id) => emit('select-collection', id),
  toggleExpand: (id) => emit('toggle-collection-expanded', id),
  createChild: (id) => emit('create-collection', id),
  edit: (id) => emit('edit-collection', id),
  remove: (id) => emit('delete-collection', id),
  persist: () => emit('persist-collections'),
}
provide(SNIPPET_COLLECTION_HANDLERS, handlers)

const isAllActive = computed(
  () => props.selectedCollectionId === null && props.selectedTag === '' && !props.favoritesOnly
)

const isFavoritesActive = computed(
  () => props.selectedCollectionId === null && props.selectedTag === '' && props.favoritesOnly
)

const selectAll = () => {
  emit('select-collection', null)
  emit('update:selected-tag', '')
  emit('update:favorites-only', false)
}

const selectFavorites = () => {
  emit('select-collection', null)
  emit('update:selected-tag', '')
  emit('update:favorites-only', true)
}

const onRootDragStart = () => {
  dragging.value = true
}

const onRootDragEnd = () => {
  dragging.value = false
  dragOverIds.value = new Set()
  emit('persist-collections')
}

/** 根 <draggable> 的 move 回调：指针悬停某个根集合行时，撑开该行（及其祖先）的
 * 子容器为投放区；悬停根列表空区域时清空（此时根投放区由 dragging 控制显示）。 */
const onRootMove = (evt: { to: HTMLElement; related?: HTMLElement | null }) => {
  if (!evt.to.classList.contains('snippet-sidebar__list')) return
  const relatedRow = evt.related?.closest('.collection-row') ?? null
  dragOverIds.value = computeCollectionHoverPath(relatedRow)
}
</script>

<template>
  <aside class="snippet-sidebar"  aria-label="代码片段导航">
    <!-- 快速筛选 -->
    <section class="snippet-sidebar__section">
      <div class="snippet-sidebar__header">
        <AppIcon icon="material-symbols:bookmarks" :size="14" class="snippet-sidebar__header-icon" />
        <span class="snippet-sidebar__header-title">快速筛选</span>
      </div>

      <div class="snippet-sidebar__body">
        <button
          type="button"
          class="snippet-sidebar__item"
          :class="{ 'is-active': isAllActive }"
          @click="selectAll"
        >
          <AppIcon icon="material-symbols:folder-copy" :size="15" class="snippet-sidebar__item-icon" />
          <span class="snippet-sidebar__item-label">所有 Snippet</span>
          <span class="snippet-sidebar__item-count">{{ props.snippetCount }}</span>
        </button>

        <button
          v-if="props.isLoggedIn"
          type="button"
          class="snippet-sidebar__item"
          :class="{ 'is-active': isFavoritesActive, 'is-favorites': isFavoritesActive }"
          @click="selectFavorites"
        >
          <AppIcon
            :icon="isFavoritesActive ? 'material-symbols:star' : 'material-symbols:star-outline'"
            :size="15"
            class="snippet-sidebar__item-icon"
          />
          <span class="snippet-sidebar__item-label">仅看收藏</span>
        </button>
      </div>
    </section>

    <!-- 文件夹 -->
    <section class="snippet-sidebar__section snippet-sidebar__section--flex">
      <div class="snippet-sidebar__header snippet-sidebar__header--with-action">
        <AppIcon icon="material-symbols:folder" :size="14" class="snippet-sidebar__header-icon" />
        <span class="snippet-sidebar__header-title">文件夹</span>
        <button
          v-if="props.isLoggedIn"
          type="button"
          class="snippet-sidebar__header-action"
          title="新建集合"
          @click="emit('create-collection', null)"
        >
          <AppIcon icon="material-symbols:add" :size="14" />
        </button>
      </div>

      <div class="snippet-sidebar__body snippet-sidebar__body--scroll">
        <div v-if="props.collectionError" class="snippet-sidebar__error">
          <AppIcon icon="material-symbols:error" :size="14" class="snippet-sidebar__error-icon" />
          <span>{{ props.collectionError }}</span>
        </div>

        <div v-else-if="props.loadingCollections" class="snippet-sidebar__skeleton">
          <div
            v-for="index in 4"
            :key="index"
            class="snippet-sidebar__skeleton-item"
            :style="{ animationDelay: `${index * 80}ms` }"
          />
        </div>

        <draggable
          v-else
          :list="props.collections"
          :group="{ name: 'collections' }"
          item-key="id"
          :animation="180"
          ghost-class="collection-row--ghost"
          :draggable="'.collection-row:not(.is-public)'"
          class="snippet-sidebar__list"
          :class="{ 'is-drag-active': dragging }"
          :move="onRootMove"
          @start="onRootDragStart"
          @end="onRootDragEnd"
        >
          <template #item="{ element }">
            <SnippetCollectionRow
              :item="element"
              :depth="0"
              :selected-collection-id="props.selectedCollectionId"
              :expanded-collection-ids="props.expandedCollectionIds"
            />
          </template>

          <!-- 拖拽进行中显示的根目录放置区（位于根可投放区内，松手即移动到根）。
               必须放在 #footer 插槽：vuedraggable 4.x 只渲染 item/header/footer 插槽，
               默认插槽内容会被忽略（之前放默认插槽导致放置区从未渲染）。 -->
          <template #footer>
            <SnippetRootDropzone v-show="dragging" />
          </template>
        </draggable>
      </div>
    </section>

    <!-- 标签：仅登录用户可见（公共片段无标签，标签面板只服务个人片段） -->
    <section v-if="props.isLoggedIn" class="snippet-sidebar__section">
      <div class="snippet-sidebar__header">
        <AppIcon icon="material-symbols:label" :size="14" class="snippet-sidebar__header-icon" />
        <span class="snippet-sidebar__header-title">标签</span>
      </div>

      <div class="snippet-sidebar__body">
        <div v-if="props.tagError" class="snippet-sidebar__error">
          <AppIcon icon="material-symbols:error" :size="14" class="snippet-sidebar__error-icon" />
          <span>{{ props.tagError }}</span>
        </div>

        <div v-else-if="props.loadingTags" class="snippet-sidebar__tag-skeleton">
          <div
            v-for="index in 4"
            :key="index"
            class="snippet-sidebar__tag-skeleton-item"
            :style="{ animationDelay: `${index * 80}ms` }"
          />
        </div>

        <div v-else class="snippet-sidebar__tags">
          <button
            type="button"
            class="snippet-sidebar__tag"
            :class="{ 'is-active': props.selectedTag === '' }"
            @click="emit('update:selected-tag', '')"
          >
            <span class="snippet-sidebar__tag-dot" />
            全部
          </button>

          <button
            v-for="tag in props.tags"
            :key="tag.id"
            type="button"
            class="snippet-sidebar__tag"
            :class="{ 'is-active': props.selectedTag === tag.name }"
            @click="emit('update:selected-tag', tag.name)"
          >
            <span class="snippet-sidebar__tag-dot" />
            #{{ tag.name }}
            <span class="snippet-sidebar__tag-count">{{ tag.count }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 详情视图切换（桌面专属，移动端 Bottom Sheet 无需切换） -->
    <section class="snippet-sidebar__section">
      <div class="snippet-sidebar__header">
        <AppIcon icon="material-symbols:view-agenda" :size="14" class="snippet-sidebar__header-icon" />
        <span class="snippet-sidebar__header-title">详情视图</span>
      </div>
      <div class="snippet-sidebar__viewgroup" role="group" aria-label="详情视图切换">
        <button
          type="button"
          class="snippet-sidebar__viewbtn"
          :class="{ 'is-active': props.detailLayout === 'split' }"
          @click="emit('update:detail-layout', 'split')"
        >
          <AppIcon icon="material-symbols:view-column" :size="14" />
          分屏
        </button>
        <button
          type="button"
          class="snippet-sidebar__viewbtn"
          :class="{ 'is-active': props.detailLayout === 'page' }"
          @click="emit('update:detail-layout', 'page')"
        >
          <AppIcon icon="material-symbols:open-in-full" :size="14" />
          独立页
        </button>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.snippet-sidebar {
  --sb-transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --sb-text: rgb(var(--color-text-rgb));
  --sb-text-muted: rgb(var(--color-text-secondary-rgb));
  --sb-text-faint: rgb(var(--color-text-tertiary-rgb));
  --sb-accent: rgb(var(--color-primary-rgb));
  --sb-accent-bg: rgb(var(--color-primary-rgb) / 0.1);
  --sb-surface: rgb(var(--color-surface-rgb));
  --sb-hover: rgb(var(--color-surface-variant-rgb) / 0.5);
  --sb-border: rgb(var(--color-border-glass-rgb) / 0.08);

  display: flex;
  flex-direction: column;
  gap: 18px;
  /* 固定宽度：原 --sidebar-width-knowledge 变量从未定义，宽度实际由内容撑开，
     展开子集合时侧栏会随长名变宽。收缩链见下方 min-width: 0 一组规则。 */
  width: 236px;
  min-width: 236px;
  flex: none;
  height: 100%;
  padding: 12px;
  border-right: 1px solid rgb(var(--color-border-glass-rgb) / 0.1);
  background: var(--sb-surface);
  overflow: hidden;
}

/* ─── 分区 ──────────────────────────────────────────────────────────────── */
.snippet-sidebar__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.snippet-sidebar__section--flex {
  flex: 1;
  min-height: 0;
}

/* ─── 详情视图切换 ────────────────────────────────────────────────────────── */
.snippet-sidebar__viewgroup {
  display: flex;
  gap: 3px;
  margin: 0 8px;
  padding: 3px;
  border-radius: 10px;
  background: rgb(var(--color-surface-variant-rgb) / 0.6);
}

.snippet-sidebar__viewbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  height: 32px;
  padding: 0 8px;
  white-space: nowrap;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--sb-text-muted);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--sb-transition),
    color var(--sb-transition),
    box-shadow var(--sb-transition);
}

.snippet-sidebar__viewbtn:hover {
  background: var(--sb-hover);
  color: var(--sb-text);
}

.snippet-sidebar__viewbtn.is-active {
  background: rgb(var(--color-surface-rgb));
  color: var(--sb-accent);
  font-weight: 600;
  box-shadow: 0 1px 4px rgb(var(--color-shadow-rgb) / 0.12);
}

/* ─── Header ────────────────────────────────────────────────────────────── */
.snippet-sidebar__header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  margin: 0 2px;
  background: transparent;
  border: none;
}

.snippet-sidebar__header-icon {
  opacity: 0.55;
}

.snippet-sidebar__header--with-action {
  padding-right: 6px;
}

.snippet-sidebar__header-title {
  flex: 1;
  font-size: 0.71875rem;
  font-weight: 650;
  color: var(--sb-text-faint);
  letter-spacing: 0.08em;
}

.snippet-sidebar__header-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--sb-text-faint);
  cursor: pointer;
  transition:
    background var(--sb-transition),
    color var(--sb-transition);
}

.snippet-sidebar__header-action:hover {
  background: var(--sb-hover);
  color: var(--sb-accent);
}

/* ─── Body ──────────────────────────────────────────────────────────────── */
.snippet-sidebar__body {
  min-width: 0;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.snippet-sidebar__body--scroll {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.snippet-sidebar__body--scroll::-webkit-scrollbar {
  width: 4px;
}

.snippet-sidebar__body--scroll::-webkit-scrollbar-track {
  background: transparent;
}

.snippet-sidebar__body--scroll::-webkit-scrollbar-thumb {
  background: var(--sb-border);
  border-radius: 2px;
}

.snippet-sidebar__body--scroll::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--color-border-glass-rgb) / 0.2);
}

/* ─── 菜单项 ────────────────────────────────────────────────────────────── */
.snippet-sidebar__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--sb-text-muted);
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 400;
  cursor: pointer;
  text-align: left;
  transition:
    background var(--sb-transition),
    color var(--sb-transition),
    box-shadow var(--sb-transition);
}

.snippet-sidebar__item:hover {
  background: var(--sb-hover);
  color: var(--sb-text);
}

.snippet-sidebar__item.is-active {
  background: var(--sb-accent-bg);
  color: var(--sb-text);
  font-weight: 500;
  box-shadow: inset 0 0 0 1px rgb(var(--color-primary-rgb) / 0.15);
}

.snippet-sidebar__item.is-favorites {
  background: rgb(var(--color-warning-rgb) / 0.1);
  color: var(--sb-text);
  font-weight: 500;
  box-shadow: inset 0 0 0 1px rgb(var(--color-warning-rgb) / 0.2);
}

.snippet-sidebar__item.is-favorites .snippet-sidebar__item-icon {
  color: rgb(var(--color-warning-rgb));
  opacity: 1;
}

.snippet-sidebar__item-icon {
  flex-shrink: 0;
  opacity: 0.6;
  transition:
    opacity var(--sb-transition),
    color var(--sb-transition);
}

.snippet-sidebar__item:hover .snippet-sidebar__item-icon {
  opacity: 0.8;
}

.snippet-sidebar__item.is-active .snippet-sidebar__item-icon {
  color: var(--sb-accent);
  opacity: 1;
}

.snippet-sidebar__item-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snippet-sidebar__item-count {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sb-text-faint);
  background: rgb(var(--color-text-rgb) / 0.06);
  padding: 2px 7px;
  border-radius: var(--radius-sm);
}

.snippet-sidebar__item.is-active .snippet-sidebar__item-count {
  color: var(--sb-accent);
  background: rgb(var(--color-primary-rgb) / 0.18);
  box-shadow: inset 0 0 0 1px rgb(var(--color-primary-rgb) / 0.3);
}

/* ─── 错误提示 ──────────────────────────────────────────────────────────── */
.snippet-sidebar__error {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgb(var(--color-error-rgb) / 0.1);
  color: rgb(var(--color-error-rgb));
  font-size: 0.75rem;
  line-height: 1.4;
}

.snippet-sidebar__error-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

/* ─── 骨架屏 ────────────────────────────────────────────────────────────── */
.snippet-sidebar__skeleton {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.snippet-sidebar__skeleton-item {
  height: 32px;
  border-radius: 6px;
  background: rgb(var(--color-surface-variant-rgb) / 0.6);
  animation: snippet-sidebar-pulse 1.5s ease-in-out infinite;
}

.snippet-sidebar__tag-skeleton {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.snippet-sidebar__tag-skeleton-item {
  height: 22px;
  width: 56px;
  border-radius: 11px;
  background: rgb(var(--color-surface-variant-rgb) / 0.6);
  animation: snippet-sidebar-pulse 1.5s ease-in-out infinite;
}

@keyframes snippet-sidebar-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ─── 标签 ──────────────────────────────────────────────────────────────── */
.snippet-sidebar__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.snippet-sidebar__tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 8px;
  border: 1px solid var(--sb-border);
  border-radius: 11px;
  background: transparent;
  color: var(--sb-text-muted);
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--sb-transition),
    color var(--sb-transition),
    border-color var(--sb-transition);
}

.snippet-sidebar__tag:hover {
  background: var(--sb-hover);
  color: var(--sb-text);
  border-color: rgb(var(--color-border-glass-rgb) / 0.2);
}

.snippet-sidebar__tag.is-active {
  background: var(--sb-accent-bg);
  color: var(--sb-accent);
  border-color: rgb(var(--color-primary-rgb) / 0.2);
  box-shadow: inset 0 0 0 1px rgb(var(--color-primary-rgb) / 0.1);
}

.snippet-sidebar__tag-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
  flex-shrink: 0;
}

.snippet-sidebar__tag-count {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  opacity: 0.6;
  margin-left: 2px;
}

/* ─── 列表容器（根可投放区） ────────────────────────────────────────────── */
.snippet-sidebar__list {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 32px;
  border-radius: 6px;
  transition: box-shadow var(--sb-transition);
}

.snippet-sidebar__list.is-drag-active {
  box-shadow: inset 0 0 0 1px rgb(var(--color-primary-rgb) / 0.25);
}

/* ─── 减少动画 ──────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .snippet-sidebar {
    --sb-transition: 0ms;
  }

  .snippet-sidebar__skeleton-item,
  .snippet-sidebar__tag-skeleton-item {
    animation: none;
  }
}
</style>

