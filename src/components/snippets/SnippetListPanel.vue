<script setup lang="ts">
/** 面板组件，负责片段列表以卡片网格或条状列表形式展示与交互操作。 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'
import Pagination from '@/components/layout/Pagination.vue'
import SnippetListRow from '@/components/snippets/SnippetListRow.vue'
import {
  snippetMaxAppendedItems,
  snippetPageSizeOptions,
} from '@/composables/useSnippetListState'
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

/**
 * 追加加载的触发点。
 *
 * ⚠️ 只服务条状（list）视图：列表视图走「滚动追加」，卡片（grid）视图走「分页器跳页」，
 * 两套机制不能同时挂在同一份 `page` 上——此前二者并存，滚动追加会让页码自动上涨、
 * 分页器当前页跟着跑，用户点页码又把累积的数据整页替换掉。
 */
const loadMoreSentinel = ref<HTMLElement | null>(null)
let scrollObserver: IntersectionObserver | null = null

/** 当前视图是否走滚动追加 */
const isAppendMode = computed(() => props.viewMode === 'list')

/** 追加已停止（达到 DOM 数量上限）→ 需要把分页器放出来兜底 */
const appendExhausted = computed(() => props.snippets.length >= snippetMaxAppendedItems)

/** 是否渲染分页器：卡片视图恒显示；滚动追加视图仅在追加被上限截断后兜底显示 */
const showPagination = computed(() => {
  if (props.totalPages <= 1) return false
  return isAppendMode.value ? appendExhausted.value : true
})

function teardownScrollObserver() {
  scrollObserver?.disconnect()
  scrollObserver = null
}

/**
 * 建立/重建哨兵观察器。
 *
 * 用 IntersectionObserver 而非 scroll 事件：scroll 回调在高频滚动下开销大，还要自己
 * 计算「距底还剩多少像素」；观察器由浏览器在合成线程判定，代价低得多。
 * 预取边距 200px —— 用户滑到底之前就开始加载下一页。
 */
function setupScrollObserver() {
  teardownScrollObserver()

  // 卡片视图走分页器，不挂追加观察器
  if (!isAppendMode.value) return

  const root = scrollContainer.value
  const target = loadMoreSentinel.value
  if (!root || !target) return

  scrollObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      // 加载中、或已到最后一页 → 不再请求（重复触发由这两条挡住）
      if (props.loading || props.page >= props.totalPages) return
      // 结果不足一屏时哨兵始终可见：此时总量已被全部取回，再请求只会拉回一个空页
      // （实测搜索「WAL」命中 7 条，滚不动却会把 page 顶到 2 并多发一次请求）
      if (props.total > 0 && props.snippets.length >= props.total) return
      emit('loadMore')
    },
    { root, rootMargin: '200px 0px', threshold: 0 }
  )

  scrollObserver.observe(target)
}

// 容器与哨兵会被 v-if 重建（切换视图模式、空态与列表互切），refs 变化时重挂
onMounted(setupScrollObserver)
watch([scrollContainer, loadMoreSentinel], setupScrollObserver, { flush: 'post' })
onBeforeUnmount(teardownScrollObserver)
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

    <!-- 空状态：图标 + 文案 + 操作引导（参照 Notion 空状态）。
         注意 `!props.error`：加载失败时只保留上方的错误横幅 —— 否则会同时出现
         「暂无匹配的代码片段」与「新建片段」，让用户以为是「真的没有数据」。 -->
    <div
      v-else-if="!props.error && props.snippets.length === 0"
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
      <!-- 追加加载指示（仅滚动追加视图） -->
      <div
        v-if="isAppendMode && props.loading"
        class="flex shrink-0 items-center justify-center gap-2 py-3 text-[0.6875rem] text-[var(--color-text-tertiary)]"
      >
        <AppIcon icon="material-symbols:sync" :size="14" class="animate-spin" />
        正在加载更多…
      </div>
      <!-- 无限滚动哨兵：滚到这里即请求追加下一页（本次加载中/已到末页时忽略） -->
      <div ref="loadMoreSentinel" class="col-span-full h-px w-full shrink-0" aria-hidden="true" />
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
      <!-- 无限滚动哨兵：滚到这里即请求追加下一页（本次加载中/已到末页时忽略） -->
      <div ref="loadMoreSentinel" class="col-span-full h-px w-full shrink-0" aria-hidden="true" />
    </div>

    <!-- 分页：卡片视图始终显示（该视图不做滚动追加）；
         条状滚动追加视图只在追加到 DOM 保护上限时才放出分页兜底，避免两套翻页并存 -->
    <div v-if="showPagination" class="flex items-center justify-end px-4 py-2.5">
      <Pagination
        :page="props.page"
        :total-pages="props.totalPages"
        :total="props.total"
        :page-size="props.pageSize"
        :page-size-options="snippetPageSizeOptions"
        :show-total="true"
        :show-jumper="true"
        :compact="props.compact"
        @update:page="emit('update:page', $event)"
        @update:page-size="emit('update:pageSize', $event)"
      />
    </div>
  </div>
</template>
