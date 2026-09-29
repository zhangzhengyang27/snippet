/** 通用分页组件（基于 Element Plus el-pagination，样式使用项目设计 token） */
<script setup lang="ts">
import { computed } from 'vue'

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

/** EP 分页布局：按组件开关拼装（total/sizes/jumper 可选） */
const paginationLayout = computed(() => {
  const parts = ['prev', 'pager', 'next']
  if (props.showTotal && props.total) parts.unshift('total')
  if (props.showSizeChanger) parts.push('sizes')
  if (props.showJumper && props.totalPages > 1) parts.push('jumper')
  return parts.join(', ')
})

function handleChange(page: number) {
  emit('update:page', page)
  emit('change', page)
}

function handleSizeChange(size: number) {
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
    <el-pagination
      :current-page="page"
      :total="totalRecords"
      :page-size="pageSize"
      :page-sizes="pageSizeOptions?.map(Number)"
      :layout="paginationLayout"
      size="small"
      :hide-on-single-page="false"
      @current-change="handleChange"
      @size-change="handleSizeChange"
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

.pagination-bar :deep(.el-pagination) {
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: rgb(var(--color-text-secondary-rgb));
  --el-pagination-button-color: rgb(var(--color-text-secondary-rgb));
  --el-pagination-hover-color: rgb(var(--color-primary-rgb));
  --el-pagination-button-height: 28px;
  --el-pagination-button-width: 28px;
  --el-pagination-font-size: var(--text-code-sm, 0.75rem);
  font-family: var(--font-mono);
  gap: 6px;
}

.pagination-bar :deep(.el-pagination .el-pager li) {
  min-width: 28px;
  height: 28px;
  border-radius: var(--radius-sm, 4px);
  background: transparent;
  border: 1px solid transparent;
  color: rgb(var(--color-text-secondary-rgb));
  font-family: var(--font-mono);
}

.pagination-bar :deep(.el-pagination .el-pager li.is-active) {
  background: rgb(var(--color-surface-variant-rgb));
  border-color: rgb(var(--color-border-rgb) / 0.6);
  color: rgb(var(--color-primary-rgb));
  font-weight: 600;
}

.pagination-bar :deep(.el-pagination .el-pager li:hover:not(.is-active)) {
  background: rgb(var(--color-surface-variant-rgb));
  color: rgb(var(--color-text-rgb));
}

.pagination-bar :deep(.el-pagination .el-select .el-input),
.pagination-bar :deep(.el-pagination .el-input__wrapper) {
  height: 28px;
  background: rgb(var(--color-surface-rgb));
  box-shadow: 0 0 0 1px rgb(var(--color-border-rgb) / 0.5) inset;
}

@media (max-width: 640px) {
  .pagination-bar :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
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
  .pagination-bar :deep(.el-pagination .el-pager li),
  .pagination-bar :deep(.el-input__wrapper) {
    transition: none;
  }
}
</style>
