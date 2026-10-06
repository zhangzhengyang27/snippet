<script setup lang="ts">
/** 工具栏组件：左侧标题计数，右侧排序/搜索/筛选/操作按钮。 */
import { computed } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import type { SnippetSortOption } from '@/types/knowledge-snippet'

const props = defineProps<{
  keyword: string
  sort: SnippetSortOption
  sortOptions: Array<{ label: string; value: SnippetSortOption }>
  loading: boolean
  total: number
  /** 当前用户是否已登录（未登录时点击“新建片段”提示去登录） */
  canCreate: boolean
  /** 标签筛选选项（来自服务端标签列表） */
  tags: Array<{ label: string; value: string }>
  selectedTag: string
  /** 语言筛选选项（当前列表去重后的语言） */
  languages: string[]
  selectedLanguage: string
  /** 是否仅显示收藏（服务端 favorite 筛选） */
  favoritesOnly: boolean
  /** 是否存在可清除的筛选条件（控制清除按钮显隐） */
  hasActiveFilters: boolean
  /**
   * 紧凑模式：三栏窄列表时缩小控件尺寸并允许换行。
   *
   * ⚠️ 曾经这里把搜索 / 排序 / 筛选整组隐藏掉，结果默认的分屏视图没有搜索框，
   * 3399 条数据只能靠顶栏全局搜索或切到独立页才筛得动。筛选能力不该随布局消失，
   * compact 现在只影响尺寸。
   */
  compact?: boolean
}>()

const emit = defineEmits<{
  'update:keyword': [value: string]
  'update:sort': [value: SnippetSortOption]
  'update:selectedTag': [value: string]
  'update:selectedLanguage': [value: string]
  'update:favoritesOnly': [value: boolean]
  clearFilters: []
  createSnippet: []
  requireLogin: []
  refresh: []
}>()

/** 点击新建：登录则直接新建，未登录则提示去登录 */
const handleCreateClick = () => {
  if (props.canCreate) {
    emit('createSnippet')
  } else {
    emit('requireLogin')
  }
}

const languageOptions = computed(() => [
  { label: '全部语言', value: '' },
  ...props.languages.map((l) => ({ label: l, value: l })),
])

const tagOptions = computed(() => [{ label: '全部标签', value: '' }, ...props.tags])
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 px-4 py-3">
    <!-- 左侧：标题 + 计数（对齐 BaseGenerator 页面标题风格） -->
    <div class="flex items-center gap-2.5 shrink-0">
      <AppIcon
        icon="material-symbols:list-alt"
        :size="24"
        class="text-brand drop-shadow-[0_0_12px_rgb(113_112_255/0.45)]"
      />
      <h2 class="font-heading text-[1.375rem] font-bold tracking-[-0.02em] text-(--color-text)">
        代码块
      </h2>
      <span class="text-code-sm text-(--color-text-tertiary)">{{ props.total }}</span>
      <AppIcon
        v-if="props.loading"
        icon="material-symbols:sync"
        :size="13"
        class="animate-spin text-(--color-text-tertiary)"
        aria-label="加载中"
      />
    </div>

    <!-- group 是必需的：图标靠 group-focus-within 变色，少一个类整段交互就静默失效 -->
    <div
      class="group relative min-w-32 flex-1 basis-40"
      :class="props.compact ? '' : 'min-w-40'"
    >
      <AppIcon
        icon="material-symbols:search"
        :size="14"
        class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary transition-colors group-focus-within:text-primary"
      />
      <AppInput
        :value="props.keyword"
        type="text"
        placeholder="搜索代码块"
        class="w-full pl-8"
        allow-clear
        @update:value="emit('update:keyword', String($event ?? ''))"
      />
    </div>

    <AppButton variant="glass" class="h-8 shrink-0" @click="handleCreateClick">
      <AppIcon icon="material-symbols:add" :size="14" />
      新建片段
    </AppButton>

    <!-- 低频操作（导出 / 导入 / 批量）由调用方注入，避免与主操作平铺抢视觉权重 -->
    <slot name="actions" />

    <!-- 筛选维度：标签 / 语言 / 排序。窄列表下自然换行到第二行，不再整组隐藏 -->
    <AppSelect
      :value="props.selectedTag"
      class="toolbar-select shrink-0"
      :class="{ 'toolbar-select--compact': props.compact }"
      placeholder="全部标签"
      :options="tagOptions"
      @update:value="emit('update:selectedTag', String($event ?? ''))"
    />

    <AppSelect
      :value="props.selectedLanguage"
      class="toolbar-select shrink-0"
      :class="{ 'toolbar-select--compact': props.compact }"
      placeholder="全部语言"
      :options="languageOptions"
      @update:value="emit('update:selectedLanguage', String($event ?? ''))"
    />

    <AppSelect
      :value="props.sort"
      class="toolbar-select shrink-0"
      :class="{ 'toolbar-select--compact': props.compact }"
      :options="props.sortOptions"
      @update:value="emit('update:sort', $event as SnippetSortOption)"
    />

    <!-- 有筛选时给一键清除的出口：此前 hasActiveFilters / clearFilters 这两个
         prop/emit 一直存在却没有渲染出口，用户只能去侧栏点「所有 Snippet」 -->
    <AppButton
      v-if="props.hasActiveFilters"
      variant="text"
      size="small"
      class="shrink-0"
      title="清除筛选"
      @click="emit('clearFilters')"
    >
      <AppIcon icon="material-symbols:filter-alt-off" :size="14" />
      清除筛选
    </AppButton>
  </div>
</template>

<style scoped>
:deep(.app-btn.is-active) {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* 筛选下拉统一宽度：scoped 未分层规则可确定性压过 EP 的 .el-select{width:128px} */
.toolbar-select {
  width: 148px;
}

/* 紧凑（三栏窄列表）：收窄但仍可见——隐藏筛选会让默认视图无法搜索/排序 */
.toolbar-select--compact {
  width: 104px;
}
</style>
