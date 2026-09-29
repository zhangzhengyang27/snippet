/** 通用分页组件（基于 xiaoye-ui Pagination，样式使用项目设计 token） */
<script setup lang="ts">
import { computed } from 'vue'
import { Pagination as XyPagination } from 'xiaoye-ui'

export interface PaginationProps {
  page: number
  totalPages: number
  total?: number
  pageSize?: number
  pageSizeOptions?: (string | number)[]
  showTotal?: boolean
  showJumper?: boolean
  /** 是否显示每页条数下拉，默认 true */
  showSizeChanger?: boolean
  /** 只有一页时是否隐藏，默认 true */
  hideOnSinglePage?: boolean
  /** 紧凑模式：隐藏页码/每页条数/跳转，仅显示上/下一页 + 当前/总页数（用于三栏窄列表） */
  compact?: boolean
}

const props = withDefaults(defineProps<PaginationProps>(), {
  total: 0,
  pageSize: 24,
  showTotal: true,
  showJumper: true,
  showSizeChanger: true,
  hideOnSinglePage: true,
  compact: false,
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  change: [page: number]
  pageSizeChange: [pageSize: number]
}>()

const totalRecords = computed(() => props.totalPages * props.pageSize)

const totalText = computed(() => {
  if (!props.showTotal) {
    return undefined
  }
  if (props.total) {
    return () => `共 ${props.total} 条 · 第 ${props.page} / ${props.totalPages} 页`
  }
  return () => `第 ${props.page} / ${props.totalPages} 页`
})

function handleChange(page: number) {
  emit('update:page', page)
  emit('change', page)
}

function handleShowSizeChange(_current: number, size: number) {
  emit('update:pageSize', size)
  emit('pageSizeChange', size)
}
</script>

<template>
  <!-- 紧凑模式：仅上/下一页 + 当前/总页数 -->
  <div
    v-if="compact && (!hideOnSinglePage || totalPages > 1)"
    class="pagination-bar pagination-bar--compact"
  >
    <button
      type="button"
      class="pagination-compact__btn"
      :disabled="page <= 1"
      title="上一页"
      @click="handleChange(page - 1)"
    >
      <span aria-hidden="true">‹</span>
    </button>
    <span class="pagination-compact__info">{{ page }} / {{ totalPages }}</span>
    <button
      type="button"
      class="pagination-compact__btn"
      :disabled="page >= totalPages"
      title="下一页"
      @click="handleChange(page + 1)"
    >
      <span aria-hidden="true">›</span>
    </button>
  </div>

  <!-- 完整模式 -->
  <div v-else-if="!hideOnSinglePage || totalPages > 1" class="pagination-bar">
    <XyPagination
      :current="page"
      :total="totalRecords"
      :page-size="pageSize"
      :show-total="totalText"
      :show-quick-jumper="showJumper && totalPages > 1"
      :show-size-changer="showSizeChanger"
      :page-size-options="pageSizeOptions"
      :hide-on-single-page="false"
      size="small"
      @update:current="handleChange"
      @change="handleChange"
      @showSizeChange="handleShowSizeChange"
    />
  </div>
</template>

<style scoped>
.pagination-bar {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 16px 0;
}

.pagination-bar :deep(.xy-pagination) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-code-sm, 0.75rem);
}

.pagination-bar :deep(.xy-pagination-total-text) {
  color: var(--color-text-secondary);
  white-space: nowrap;
  margin-inline-end: 8px;
}

.pagination-bar :deep(.xy-pagination-item),
.pagination-bar :deep(.xy-pagination-prev),
.pagination-bar :deep(.xy-pagination-next),
.pagination-bar :deep(.xy-pagination-jump-prev),
.pagination-bar :deep(.xy-pagination-jump-next) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 4px);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    background 150ms ease,
    color 150ms ease,
    border-color 150ms ease;
}

/* xiaoye-ui 把文字色设在 <a> 上，必须同时覆盖 a 选择器（特异性需 ≥ 组件的 :where(...).xy-pagination .xy-pagination-item a） */
.pagination-bar :deep(.xy-pagination-item a),
.pagination-bar :deep(.xy-pagination-prev a),
.pagination-bar :deep(.xy-pagination-next a),
.pagination-bar :deep(.xy-pagination-jump-prev a),
.pagination-bar :deep(.xy-pagination-jump-next a) {
  color: inherit;
}

.pagination-bar :deep(.xy-pagination-item-ellipsis) {
  color: var(--color-text-tertiary);
}

.pagination-bar :deep(.xy-pagination-item:not(.xy-pagination-item-active):hover),
.pagination-bar :deep(.xy-pagination-prev:not(.xy-pagination-disabled):hover),
.pagination-bar :deep(.xy-pagination-next:not(.xy-pagination-disabled):hover) {
  background: var(--color-surface-variant);
  color: var(--color-text);
}

.pagination-bar :deep(.xy-pagination-item-active) {
  background: var(--color-surface-variant);
  border-color: var(--color-border-glass);
  color: var(--color-primary);
  font-weight: 600;
}

.pagination-bar :deep(.xy-pagination-item-active a) {
  color: var(--color-primary);
}

.pagination-bar :deep(.xy-pagination-disabled) {
  opacity: 0.35;
  cursor: not-allowed;
}

.pagination-bar :deep(.xy-pagination-disabled .xy-pagination-item-link) {
  color: var(--color-text-secondary);
}

.pagination-bar :deep(.xy-pagination-options) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-inline-start: 8px;
}

.pagination-bar :deep(.xy-pagination-options-size-changer) {
  min-width: 90px;
}

.pagination-bar :deep(.xy-pagination-options-size-changer .xy-select-selector) {
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--color-border-glass);
  border-radius: var(--radius-sm, 4px);
  background: var(--color-surface);
  color: var(--color-text);
}

.pagination-bar :deep(.xy-pagination-options-size-changer .xy-select-selection-item) {
  line-height: 26px;
}

.pagination-bar :deep(.xy-pagination-options-size-changer .xy-select-arrow) {
  color: var(--color-text-secondary);
}

.pagination-bar :deep(.xy-pagination-options-quick-jumper) {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
}

.pagination-bar :deep(.xy-pagination-options-quick-jumper input) {
  width: 44px;
  height: 28px;
  padding: 0 4px;
  border: 1px solid var(--color-border-glass);
  border-radius: var(--radius-sm, 4px);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: var(--text-code-sm, 0.75rem);
  text-align: center;
  outline: none;
  transition: border-color 150ms ease;
}

.pagination-bar :deep(.xy-pagination-options-quick-jumper input:focus) {
  border-color: var(--color-primary);
}

@media (max-width: 640px) {
  .pagination-bar :deep(.xy-pagination) {
    flex-wrap: wrap;
    justify-content: center;
  }

  .pagination-bar :deep(.xy-pagination-total-text) {
    width: 100%;
    text-align: center;
    margin-inline-end: 0;
    margin-bottom: 4px;
  }
}

/* 紧凑分页 */
.pagination-bar--compact {
  display: inline-flex;
  justify-content: center;
  padding: 12px 0;
}

.pagination-compact__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid rgb(var(--color-border-rgb));
  border-radius: var(--radius-sm, 4px);
  background: rgb(var(--color-surface-rgb));
  color: rgb(var(--color-text-secondary-rgb));
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
}

.pagination-compact__btn:hover:not(:disabled) {
  background: rgb(var(--color-surface-variant-rgb));
  border-color: rgb(var(--color-brand-rgb) / 0.4);
  color: rgb(var(--color-brand-rgb));
}

.pagination-compact__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pagination-compact__info {
  display: inline-flex;
  align-items: center;
  min-width: 52px;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-text-secondary-rgb));
  padding: 0 6px;
}

@media (prefers-reduced-motion: reduce) {
  .pagination-bar :deep(.xy-pagination-item),
  .pagination-bar :deep(.xy-pagination-prev),
  .pagination-bar :deep(.xy-pagination-next),
  .pagination-bar :deep(.xy-pagination-options-quick-jumper input) {
    transition: none;
  }
}
</style>
