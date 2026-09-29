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
  /** 是否展示标签/语言筛选下拉（独立页卡片布局时展示；三栏列表布局时隐藏） */
  showFilters?: boolean
  /** 紧凑模式：三栏窄列表时隐藏排序/搜索/收藏/刷新，仅保留标题计数 + 新建 */
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
        class="text-brand drop-shadow-[0_0_12px_rgb(139_92_246/0.45)]"
      />
      <h2 class="font-heading text-[1.375rem] font-bold tracking-[-0.02em] text-(--color-text)">
        片段列表
      </h2>
      <span class="text-code-sm text-(--color-text-tertiary)">{{ props.total }}</span>
    </div>

    <div class="flex-1" />

    <!-- 右侧：标签 / 语言筛选（仅独立页卡片布局时展示）+ 排序 + 搜索 + 操作按钮 -->
    <AppSelect
      v-if="props.showFilters"
      :value="props.selectedTag"
      class="toolbar-select shrink-0"
      :options="tagOptions"
      @update:value="emit('update:selectedTag', String($event ?? ''))"
    />

    <AppSelect
      v-if="props.showFilters"
      :value="props.selectedLanguage"
      class="toolbar-select shrink-0"
      :options="languageOptions"
      @update:value="emit('update:selectedLanguage', String($event ?? ''))"
    />

    <AppSelect
      v-if="!props.compact"
      :value="props.sort"
      class="toolbar-select shrink-0"
      :options="props.sortOptions"
      @update:value="emit('update:sort', $event as SnippetSortOption)"
    />

    <div v-if="!props.compact" class="group relative w-64 min-w-0 shrink-0">
      <AppIcon
        icon="material-symbols:search"
        :size="14"
        class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary transition-colors group-focus-within:text-primary"
      />
      <AppInput
        :value="props.keyword"
        type="text"
        placeholder="搜索片段"
        class="w-full pl-8"
        allow-clear
        @update:value="emit('update:keyword', String($event ?? ''))"
      />
    </div>

    <AppButton variant="glass" class="h-8" @click="handleCreateClick">
      <AppIcon icon="material-symbols:add" :size="14" />
      新建片段
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
</style>
