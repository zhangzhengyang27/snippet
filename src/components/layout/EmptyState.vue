<script setup lang="ts">
/**
 * EmptyState - 空状态 / 状态占位组件（恢复重建）
 *
 * 统一展示空列表、加载中、出错、未找到等占位场景，
 * 图标随 type 变化，支持重试按钮与自定义操作插槽。
 *
 * 用法：
 *   <EmptyState type="loading" compact />
 *   <EmptyState type="error" compact show-retry @retry="refresh" />
 *   <EmptyState title="暂无收藏" description="去内容页收藏吧。">
 *     <template #action><AppButton>去看看</AppButton></template>
 *   </EmptyState>
 */
import { computed } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'

type EmptyStateType = 'empty' | 'loading' | 'error' | 'not-found'

interface Props {
  /** 状态类型：empty 空列表 / loading 加载中 / error 出错 / not-found 未找到 */
  type?: EmptyStateType
  /** 标题（缺省按 type 给默认文案） */
  title?: string
  /** 纯文本描述 */
  description?: string
  /** HTML 描述（调用方需自行转义，如配合 escapeHtml 使用） */
  descriptionHtml?: string
  /** 紧凑模式（详情页等窄空间） */
  compact?: boolean
  /** 是否展示「重试」按钮（配合 @retry） */
  showRetry?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'empty',
  title: '',
  description: '',
  descriptionHtml: '',
  compact: false,
  showRetry: false,
})

const emit = defineEmits<{
  retry: []
}>()

/** 各状态对应的图标与默认文案 */
const typeMeta = computed(() => {
  switch (props.type) {
    case 'loading':
      return {
        icon: 'ms:progress_activity',
        title: '加载中…',
        description: '正在获取数据，请稍候。',
        isLoading: true,
      }
    case 'error':
      return {
        icon: 'ms:error',
        title: '加载失败',
        description: '网络似乎出了问题，请稍后重试。',
        isLoading: false,
      }
    case 'not-found':
      return {
        icon: 'ms:search_off',
        title: '未找到内容',
        description: '内容不存在或已被移除。',
        isLoading: false,
      }
    default:
      return {
        icon: 'ms:folder_open',
        title: '暂无内容',
        description: '这里还没有任何内容。',
        isLoading: false,
      }
  }
})

const displayTitle = computed(() => props.title || typeMeta.value.title)
const displayDescription = computed(() => props.description || typeMeta.value.description)

/** 是否展示描述：显式传了描述，或完全未自定义标题时给默认描述 */
const showDescription = computed(
  () => !!props.descriptionHtml || !!props.description || !props.title
)
</script>

<template>
  <div class="empty-state" :class="[`empty-state--${props.type}`, { 'is-compact': props.compact }]">
    <!-- 图标区：加载态旋转，其余状态带主色光晕底 -->
    <div class="empty-state__icon" aria-hidden="true">
      <!-- 旋转类挂在外层 span：AppIcon 的 class prop 仅接受字符串 -->
      <span class="empty-state__spinner" :class="{ 'is-spinning': typeMeta.isLoading }">
        <AppIcon :icon="typeMeta.icon" :size="props.compact ? 28 : 40" />
      </span>
    </div>

    <!-- 文案区 -->
    <p class="empty-state__title">{{ displayTitle }}</p>
    <p v-if="props.descriptionHtml" class="empty-state__description">
      <!-- eslint-disable-next-line vue/no-v-html -- 调用方已通过 escapeHtml 转义 -->
      <span v-html="props.descriptionHtml"></span>
    </p>
    <p v-else-if="showDescription && displayDescription" class="empty-state__description">
      {{ displayDescription }}
    </p>

    <!-- 操作区：重试按钮或自定义插槽 -->
    <div v-if="props.showRetry || $slots.action" class="empty-state__action">
      <AppButton v-if="props.showRetry" variant="glass" size="small" @click="emit('retry')">
        <AppIcon icon="ms:refresh" :size="14" />
        重试
      </AppButton>
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 56px 24px;
  text-align: center;
}

.empty-state.is-compact {
  padding: 36px 16px;
  gap: 6px;
}

/* ─── 图标 ─────────────────────────────────────────────────────────────── */
.empty-state__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 8px;
  border-radius: 50%;
  background: rgb(var(--color-primary-rgb) / 0.08);
  color: rgb(var(--color-primary-rgb));
  box-shadow: 0 0 24px rgb(var(--color-primary-rgb) / 0.12);
}

.is-compact .empty-state__icon {
  width: 48px;
  height: 48px;
  margin-bottom: 4px;
}

.empty-state--error .empty-state__icon {
  background: rgb(var(--color-error-rgb) / 0.08);
  color: rgb(var(--color-error-rgb));
  box-shadow: 0 0 24px rgb(var(--color-error-rgb) / 0.12);
}

.empty-state__spinner {
  display: inline-flex;
}

.empty-state__spinner.is-spinning {
  animation: empty-state-spin 1.1s linear infinite;
}

@keyframes empty-state-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ─── 文案 ─────────────────────────────────────────────────────────────── */
.empty-state__title {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}

.is-compact .empty-state__title {
  font-size: 0.9375rem;
}

.empty-state__description {
  max-width: 420px;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(var(--color-text-secondary-rgb) / 0.85);
}

.empty-state__description :deep(code) {
  padding: 1px 6px;
  border-radius: 6px;
  background: rgb(var(--color-surface-variant-rgb));
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-text-rgb));
}

/* ─── 操作 ─────────────────────────────────────────────────────────────── */
.empty-state__action {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

@media (prefers-reduced-motion: reduce) {
  .empty-state__spinner {
    animation: none;
  }
}
</style>
