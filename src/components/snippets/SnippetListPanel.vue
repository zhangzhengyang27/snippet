<script setup lang="ts">
/** 面板组件，负责片段列表以卡片网格或条状列表形式展示与交互操作。 */
import { ref, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'
import Pagination from '@/components/layout/Pagination.vue'
import SnippetListRow from '@/components/snippets/SnippetListRow.vue'
import { snippetPageSizeOptions } from '@/composables/useSnippetListState'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'


const props = defineProps<{
  snippets: KnowledgeSnippet[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  loading: boolean
  error: string
  selectedSnippetId: string
  /** 空状态时是否展示"新建片段"按钮（已登录才展示） */
  canCreate: boolean
  /** 是否存在可清除的筛选条件（控制"清除筛选"按钮显隐） */
  hasActiveFilters: boolean
  /** 展示模式：grid（卡片网格） | list（条状列表） */
  viewMode?: 'grid' | 'list'
  /** 紧凑分页：三栏列表时仅显示上/下一页（避免超长分页） */
  compact?: boolean
  /** 是否启用多选模式 */
  selectable?: boolean
  /** 已选中的片段 id 集合 */
  selectedIds?: string[]
}>()

const emit = defineEmits<{
  selectSnippet: [id: string]
  copySnippet: [id: string]
  toggleCheck: [id: string]
  'update:page': [value: number]
  'update:pageSize': [value: number]
  clearFilters: []
  createSnippet: []
  loadMore: []
}>()

const isChecked = (id: string) => props.selectedIds?.includes(id) ?? false

/** 列表滚动容器引用（翻页/筛选替换数据时归顶） */
const scrollContainer = ref<HTMLElement | null>(null)


// 列表首项 id 变化 = 换页/筛选导致的数据替换（而非 loadMore 追加——追加时首项不变），
// 此时把滚动容器归位到顶部；追加加载保持滚动位置，避免用户被甩回列表开头。
watch(
  () => props.snippets[0]?.id,
  () => {
    scrollContainer.value?.scrollTo({ top: 0 })
  }
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col @container">
    <!-- 错误 -->
    <div
      v-if="props.error"
      class="mx-4 my-3 flex items-start gap-2 rounded-md bg-error/10 px-3 py-2 text-body-sm text-error"
    >
      <AppIcon icon="material-symbols:error" :size="14" class="mt-0.5 shrink-0" />
      <span>{{ props.error }}</span>
    </div>

    <!-- 骨架屏：仅首次加载（列表尚无数据）时展示。
         已有数据时保持列表挂载，只做轻微变暗提示刷新——否则每次 loading 列表都会被
         骨架屏整体替换再重建，引发"闪一下、滚动位置归零"的跳动（尤其移动端追加加载）。 -->
    <div
      v-if="props.loading && props.snippets.length === 0 && props.viewMode !== 'list'"
      class="grid w-full flex-1 grid-cols-1 items-start content-start gap-x-[14px] gap-y-[12px] overflow-auto p-2 @min-[480px]:grid-cols-2 @min-[720px]:grid-cols-3 @min-[960px]:grid-cols-4 @min-[1200px]:grid-cols-5"
    >
      <div
        v-for="index in 10"
        :key="index"
        class="flex h-[108px] flex-col gap-2 rounded-lg border border-[var(--color-border-glass)] bg-[var(--color-surface-variant)] p-3"
      >
        <div class="flex items-start gap-2">
          <div class="h-3.5 w-2/3 animate-pulse rounded bg-[var(--color-surface-variant-high)]" />
          <div class="flex-1" />
          <div class="h-5 w-5 animate-pulse rounded bg-[var(--color-surface-variant-high)]" />
        </div>
        <div class="h-2.5 w-full animate-pulse rounded bg-[var(--color-surface-variant-high)]/70" />
        <div class="h-2.5 w-5/6 animate-pulse rounded bg-[var(--color-surface-variant-high)]/70" />
        <div
          class="mt-auto h-4 w-14 animate-pulse rounded-full bg-[var(--color-surface-variant-high)]/60"
        />
      </div>
    </div>

    <!-- 骨架屏：条状行模拟（仅首次加载） -->
    <div v-else-if="props.loading && props.snippets.length === 0" class="flex flex-1 flex-col gap-[1px] overflow-auto p-1">
      <div
        v-for="index in 12"
        :key="index"
        class="flex h-[44px] items-center gap-3 rounded-md px-3"
      >
        <div class="h-3.5 w-2/5 animate-pulse rounded bg-[var(--color-surface-variant-high)]/60" />
        <div class="h-2.5 flex-1 animate-pulse rounded bg-[var(--color-surface-variant-high)]/40" />
        <div
          class="h-3 w-14 animate-pulse rounded-full bg-[var(--color-surface-variant-high)]/40"
        />
      </div>
    </div>

    <!-- 空状态：图标 + 文案 + 操作引导（参照 Notion 空状态） -->
    <div
      v-else-if="props.snippets.length === 0"
      class="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
    >
      <AppIcon
        icon="material-symbols:code-off"
        :size="28"
        class="mb-3 text-[var(--color-text-tertiary)] opacity-50"
      />
      <p class="text-body-sm text-[var(--color-text-secondary)]">暂无匹配的代码片段</p>
      <div class="mt-4 flex items-center gap-2">
        <AppButton
          v-if="props.hasActiveFilters"
          variant="glass"
          size="small"
          @click="emit('clearFilters')"
        >
          <AppIcon icon="material-symbols:filter-alt-off" :size="14" />
          清除筛选
        </AppButton>
        <AppButton
          v-if="props.canCreate"
          variant="primary"
          size="small"
          @click="emit('createSnippet')"
        >
          <AppIcon icon="material-symbols:add" :size="14" />
          新建片段
        </AppButton>
      </div>
    </div>

    <!-- 列表：条状（单列）。桌面端刷新中轻微变暗并禁点，移动端追加加载保持原位 -->
    <div
      v-else-if="props.viewMode === 'list'"
      ref="scrollContainer"
      class="flex flex-1 flex-col gap-[1px] overflow-auto p-1 transition-opacity duration-150"
      :class="{ 'pointer-events-none opacity-55': props.loading }"
     
    >
      <SnippetListRow
        v-for="item in props.snippets"
        :key="item.id"
        :snippet="item"
        variant="list"
        :selected="props.selectedSnippetId === item.id"
        :checkable="props.selectable"
        :checked="isChecked(item.id)"
        @select="emit('selectSnippet', item.id)"
        @copy="emit('copySnippet', item.id)"
        @toggle-check="emit('toggleCheck', $event)"
      />
    </div>

    <!-- 列表：卡片（基于面板宽度的容器查询：每列舒适宽度≈240px，最多 5 列）。刷新态同条状列表 -->
    <div
      v-else
      ref="scrollContainer"
      class="grid w-full flex-1 grid-cols-1 items-start content-start gap-x-[14px] gap-y-[12px] overflow-auto p-2 transition-opacity duration-150 @min-[480px]:grid-cols-2 @min-[720px]:grid-cols-3 @min-[960px]:grid-cols-4 @min-[1200px]:grid-cols-5"
      :class="{ 'pointer-events-none opacity-55': props.loading }"
     
    >
      <SnippetListRow
        v-for="item in props.snippets"
        :key="item.id"
        :snippet="item"
        variant="grid"
        :selected="props.selectedSnippetId === item.id"
        :checkable="props.selectable"
        :checked="isChecked(item.id)"
        @select="emit('selectSnippet', item.id)"
        @copy="emit('copySnippet', item.id)"
        @toggle-check="emit('toggleCheck', $event)"
      />
    </div>

    <!-- 分页 -->
    <div
      v-if="props.totalPages > 1"
      class="flex items-center justify-end px-4 py-2.5"
    >
      <Pagination
        :page="props.page"
        :total-pages="props.totalPages"
        :total="props.total"
        :page-size="props.pageSize"
        :page-size-options="snippetPageSizeOptions"
        :show-total="false"
        :show-jumper="true"
        :compact="props.compact"
        @update:page="emit('update:page', $event)"
        @update:page-size="emit('update:pageSize', $event)"
      />
    </div>
  </div>
</template>
