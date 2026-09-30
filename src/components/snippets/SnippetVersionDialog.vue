<script setup lang="ts">
/**
 * SnippetVersionDialog - 片段版本历史面板
 *
 * 左列版本时间线、右列「选中版本 → 当前正文」的统一 diff。
 * 支持回滚与删除版本，两者都走二次确认。
 *
 * 设计上刻意说明了两件事，避免用户误解：
 *   1. 快照只记录**正文**（名称/描述/语言/正文/多文件代码），
 *      不含集合、标签、收藏、公开状态 —— 回滚不会把这些一并改回去；
 *   2. 回滚是**追加式**的：它会新写一条 `rollback:<源版本>` 快照，
 *      所以回滚本身也能再被回滚（历史只增不减）。
 */
import { computed, ref } from 'vue'
import AppModal from '@/components/common/AppModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import EmptyState from '@/components/layout/EmptyState.vue'
import Pagination from '@/components/layout/Pagination.vue'
import { useToast } from '@/composables/useToast'
import { useSnippetVersions, versionMessageLabel } from '@/composables/useSnippetVersions'
import { getApiErrorMessage } from '@/api/client'
import { formatDateTime, formatRelativeTime } from '@/utils/date-format'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'

interface Props {
  open: boolean
  snippet: KnowledgeSnippet | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  /** 回滚成功：详情页需要重新拉取片段正文 */
  'rolled-back': []
}>()

const { toast } = useToast()

const versions = useSnippetVersions({
  snippetId: () => props.snippet?.id ?? '',
  isActive: () => props.open,
  currentSource: () => props.snippet,
  onRolledBack: () => emit('rolled-back'),
})

const {
  items,
  total,
  totalPages,
  page,
  pageSize,
  listLoading,
  listError,
  reload,
  setPage,
  selectedId,
  selected,
  detailLoading,
  detailError,
  reloadDetail,
  diffLines,
  diffIdentical,
  busy,
  rollback,
  removeVersion,
} = versions

/** 单次最多渲染的 diff 行数：超大 diff 会拖慢弹窗，超出部分折叠并明确告知 */
const DIFF_RENDER_LIMIT = 400
const visibleDiffLines = computed(() => diffLines.value.slice(0, DIFF_RENDER_LIMIT))
const diffTruncated = computed(() => diffLines.value.length > DIFF_RENDER_LIMIT)

/** diff 统计：让用户一眼看出改了多少行，不必自己数颜色 */
const addedCount = computed(() => diffLines.value.filter((l) => l.kind === 'added').length)
const removedCount = computed(() => diffLines.value.filter((l) => l.kind === 'removed').length)

function signOf(kind: string): string {
  if (kind === 'added') return '+'
  if (kind === 'removed') return '-'
  return ' '
}

/** 悬停提示用的完整时间 */
function fullTime(value: string): string {
  return formatDateTime(value)
}

/**
 * 版本来源分类。不能直接拿 message 当 class 名 —— 用户备注是自由文本，
 * 可能含空格/斜杠，生成出无效或互相覆盖的类名。
 */
function kindOf(message: string): 'create' | 'update' | 'rollback' | 'note' {
  if (message === 'create') return 'create'
  if (message === 'update') return 'update'
  if (message.startsWith('rollback:')) return 'rollback'
  return 'note'
}

/* ── 二次确认（回滚 / 删除共用一个弹窗） ── */
const pending = ref<{ kind: 'rollback' | 'delete'; id: string } | null>(null)

const pendingText = computed(() => {
  if (!pending.value) return ''
  return pending.value.kind === 'rollback'
    ? '回滚只会把该版本的正文覆盖回当前片段（不影响集合、标签、收藏与公开状态），并追加一条新的回滚记录。'
    : '删除后该版本快照将不可恢复，但片段当前正文不受影响。'
})

function askRollback(id: string) {
  pending.value = { kind: 'rollback', id }
}

function askDelete(id: string) {
  pending.value = { kind: 'delete', id }
}

async function confirmPending() {
  const action = pending.value
  if (!action) return
  try {
    if (action.kind === 'rollback') {
      await rollback(action.id)
      toast.success('已回滚到该版本')
    } else {
      await removeVersion(action.id)
      toast.success('版本已删除')
    }
    pending.value = null
  } catch (err) {
    toast.error(getApiErrorMessage(err, action.kind === 'rollback' ? '回滚失败' : '删除失败'))
  }
}

function closePending() {
  pending.value = null
}
</script>

<template>
  <AppModal
    :open="props.open"
    title="版本历史"
    :width="920"
    :footer="null"
    :body-style="{ padding: '0', maxHeight: '74vh', overflow: 'hidden' }"
    @update:open="emit('update:open', $event)"
  >
    <div class="svd">
      <!-- 左：版本时间线 -->
      <aside class="svd__list">
        <div class="svd__list-head">
          <span>共 {{ total }} 个版本</span>
          <button
            type="button"
            class="svd__refresh"
            aria-label="刷新版本列表"
            :disabled="listLoading"
            @click="reload()"
          >
            <AppIcon icon="material-symbols:refresh" :size="14" />
          </button>
        </div>

        <div class="svd__list-body">
          <EmptyState v-if="listLoading" type="loading" compact />
          <EmptyState v-else-if="listError" type="error" compact show-retry @retry="reload()" />
          <EmptyState
            v-else-if="!items.length"
            type="empty"
            compact
            title="暂无版本记录"
            description="该片段还没有历史快照。"
          />
          <ul v-else class="svd__items">
            <li v-for="item in items" :key="item.id">
              <button
                type="button"
                class="svd__item"
                :class="{ 'is-active': item.id === selectedId }"
                :aria-current="item.id === selectedId ? 'true' : undefined"
                @click="selectedId = item.id"
              >
                <span class="svd__item-tag" :class="`is-${kindOf(item.message)}`">
                  {{ versionMessageLabel(item.message) }}
                </span>
                <span class="svd__item-time" :title="fullTime(item.createdAt)">
                  {{ formatRelativeTime(item.createdAt, '时间未知') }}
                </span>
              </button>
            </li>
          </ul>
        </div>

        <div v-if="totalPages > 1" class="svd__pager">
          <Pagination
            compact
            :page="page"
            :total-pages="totalPages"
            :total="total"
            :page-size="pageSize"
            @update:page="setPage"
          />
        </div>
      </aside>

      <!-- 右：选中版本的 diff -->
      <section class="svd__detail">
        <EmptyState
          v-if="!selectedId"
          type="empty"
          compact
          title="选择一个版本"
          description="左侧选择版本后即可查看它和当前正文的差异。"
        />
        <EmptyState v-else-if="detailLoading" type="loading" compact />
        <EmptyState
          v-else-if="detailError"
          type="error"
          compact
          show-retry
          @retry="reloadDetail()"
        />
        <template v-else>
          <div class="svd__detail-head">
            <div class="svd__detail-meta">
              <!-- 必须显式标出「正在看哪一版」：翻页后左列不再高亮当前选中项，
                   没有这行用户会不知道右边的 diff 和「删除该版本」针对的是谁 -->
              <span v-if="selected" class="svd__detail-version">
                {{ versionMessageLabel(selected.message) }} ·
                <time :datetime="selected.createdAt">{{ fullTime(selected.createdAt) }}</time>
              </span>
              <span v-if="diffIdentical" class="svd__badge is-same">与当前正文一致</span>
              <span v-else class="svd__badge is-diff">
                +{{ addedCount }} / -{{ removedCount }} 行
              </span>
            </div>
            <div class="svd__detail-actions">
              <AppButton
                variant="primary"
                size="small"
                :loading="busy"
                :disabled="diffIdentical"
                @click="askRollback(selectedId)"
              >
                <AppIcon icon="material-symbols:settings-backup-restore" :size="14" />
                {{ diffIdentical ? '已是当前内容' : '回滚到此版本' }}
              </AppButton>
              <AppButton
                variant="glass"
                size="small"
                danger
                :disabled="busy"
                @click="askDelete(selectedId)"
              >
                <AppIcon icon="material-symbols:delete" :size="14" />
                删除该版本
              </AppButton>
            </div>
          </div>

          <p class="svd__notice">
            快照只记录正文（名称、描述、语言、代码）。回滚<strong>不会</strong>修改集合、标签、收藏与公开状态，
            也不会删除任何历史版本 —— 它会追加一条新的回滚记录。
          </p>

          <p v-if="!diffIdentical" class="svd__diff-legend">
            <span class="svd__diff-no">旧</span>
            <span class="svd__diff-no">新</span>
            <span>左侧为选中版本，右侧为当前正文</span>
          </p>

          <div class="svd__diff">
            <div v-if="diffIdentical" class="svd__diff-same">
              <AppIcon icon="material-symbols:check-circle" :size="16" />
              该版本与当前正文完全一致，无需回滚。
            </div>
            <template v-else>
              <div
                v-for="(line, index) in visibleDiffLines"
                :key="index"
                class="svd__diff-row"
                :class="`is-${line.kind}`"
              >
                <span class="svd__diff-no">{{ line.oldLine ?? '' }}</span>
                <span class="svd__diff-no">{{ line.newLine ?? '' }}</span>
                <span class="svd__diff-sign">{{ signOf(line.kind) }}</span>
                <code class="svd__diff-text">{{ line.text || ' ' }}</code>
              </div>
              <p v-if="diffTruncated" class="svd__diff-more">
                差异过大，仅显示前 {{ DIFF_RENDER_LIMIT }} 行（共 {{ diffLines.length }} 行）
              </p>
            </template>
          </div>
        </template>
      </section>
    </div>
  </AppModal>

  <!-- 二次确认 -->
  <AppModal
    :open="pending !== null"
    :title="pending?.kind === 'rollback' ? '回滚到此版本' : '删除该版本'"
    :width="440"
    :footer="null"
    @update:open="closePending"
  >
    <p class="svd__confirm-text">{{ pendingText }}</p>
    <template #footer>
      <div class="svd__confirm-actions">
        <AppButton variant="glass" @click="closePending">取消</AppButton>
        <AppButton
          variant="primary"
          :danger="pending?.kind === 'delete'"
          :loading="busy"
          @click="confirmPending"
        >
          {{ pending?.kind === 'rollback' ? '确认回滚' : '确认删除' }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.svd {
  display: flex;
  height: 70vh;
  min-height: 360px;
}

/* 左列 */
.svd__list {
  display: flex;
  flex-direction: column;
  width: 244px;
  flex-shrink: 0;
  border-right: 1px solid rgb(var(--color-border-rgb));
  background: rgb(var(--color-bg-elevated-rgb));
}

.svd__list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  font-size: 0.75rem;
  color: rgb(var(--color-text-tertiary-rgb));
  border-bottom: 1px solid rgb(var(--color-border-rgb));
}

.svd__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
}

.svd__refresh:hover:not(:disabled) {
  background: rgb(var(--color-surface-hover-rgb));
  color: rgb(var(--color-brand-rgb));
}

.svd__refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.svd__list-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.svd__items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.svd__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: rgb(var(--color-text-rgb));
  font-size: 0.8125rem;
  cursor: pointer;
  text-align: left;
  transition:
    background var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}

.svd__item:hover {
  background: rgb(var(--color-surface-hover-rgb));
}

.svd__item.is-active {
  border-color: rgb(var(--color-brand-rgb) / 0.5);
  background: rgb(var(--color-brand-rgb) / 0.08);
}

.svd__item-tag {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgb(var(--color-border-rgb));
  background: rgb(var(--color-surface-rgb));
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgb(var(--color-text-secondary-rgb));
}

.svd__item-tag.is-create {
  color: rgb(var(--color-success-rgb));
  border-color: rgb(var(--color-success-rgb) / 0.4);
}

.svd__item-tag.is-rollback {
  color: rgb(var(--color-warning-rgb));
  border-color: rgb(var(--color-warning-rgb) / 0.4);
}

.svd__item-time {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  color: rgb(var(--color-text-tertiary-rgb));
}

.svd__pager {
  flex-shrink: 0;
  padding: 6px 8px;
  border-top: 1px solid rgb(var(--color-border-rgb));
}

/* 右列 */
.svd__detail {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 14px 16px;
  gap: 10px;
}

.svd__detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.svd__detail-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.svd__badge {
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.svd__badge.is-diff {
  background: rgb(var(--color-brand-rgb) / 0.1);
  color: rgb(var(--color-brand-rgb));
}

.svd__badge.is-same {
  background: rgb(var(--color-success-rgb) / 0.12);
  color: rgb(var(--color-success-rgb));
}

.svd__detail-version {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(var(--color-text-secondary-rgb));
  white-space: nowrap;
}

.svd__detail-version time {
  font-weight: 400;
  color: rgb(var(--color-text-tertiary-rgb));
}

.svd__detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.svd__notice {
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid rgb(var(--color-border-rgb));
  background: rgb(var(--color-surface-rgb));
  font-size: 0.75rem;
  line-height: 1.65;
  color: rgb(var(--color-text-secondary-rgb));
}

.svd__notice strong {
  color: rgb(var(--color-text-rgb));
  font-weight: 600;
}

.svd__diff-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 0.75rem;
  color: rgb(var(--color-text-tertiary-rgb));
}

.svd__diff-legend .svd__diff-no {
  width: auto;
  padding: 0 4px;
  border-right: none;
  border: 1px solid rgb(var(--color-border-rgb));
  border-radius: 4px;
  font-size: 0.6875rem;
}

.svd__diff {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid rgb(var(--color-border-rgb));
  border-radius: var(--radius-sm);
  background: rgb(var(--color-surface-bright-rgb));
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.6;
}

.svd__diff-same {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: rgb(var(--color-success-rgb));
  font-family: inherit;
}

.svd__diff-row {
  display: flex;
  align-items: flex-start;
  /* 长行横向滚动而不是折行：折行会破坏「一行一号」的对齐关系 */
  min-width: max-content;
}

.svd__diff-no {
  flex-shrink: 0;
  width: 38px;
  padding: 0 6px;
  text-align: right;
  color: rgb(var(--color-text-tertiary-rgb));
  user-select: none;
  border-right: 1px solid rgb(var(--color-border-rgb) / 0.6);
}

.svd__diff-sign {
  flex-shrink: 0;
  width: 18px;
  text-align: center;
  user-select: none;
}

.svd__diff-text {
  padding-right: 12px;
  white-space: pre;
  color: rgb(var(--color-text-rgb));
}

.svd__diff-row.is-added {
  background: rgb(var(--color-success-rgb) / 0.1);
}

.svd__diff-row.is-added .svd__diff-sign {
  color: rgb(var(--color-success-rgb));
}

.svd__diff-row.is-removed {
  background: rgb(var(--color-error-rgb) / 0.1);
}

.svd__diff-row.is-removed .svd__diff-sign {
  color: rgb(var(--color-error-rgb));
}

.svd__diff-more {
  margin: 0;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 0.75rem;
  color: rgb(var(--color-text-tertiary-rgb));
}

.svd__confirm-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.7;
  color: rgb(var(--color-text-secondary-rgb));
}

.svd__confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
}
</style>
