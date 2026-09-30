<script setup lang="ts">
/**
 * EmptyState - 空状态 / 状态占位组件（Element Plus el-empty + el-skeleton）
 *
 * 统一展示空列表、加载中、出错、未找到等占位场景，
 * 支持重试按钮与自定义操作插槽。
 *
 * 用法：
 *   <EmptyState type="loading" compact />
 *   <EmptyState type="error" compact show-retry @retry="refresh" />
 *   <EmptyState title="暂无收藏" description="去内容页收藏吧。">
 *     <template #action><AppButton>去看看</AppButton></template>
 *   </EmptyState>
 */
import { computed } from 'vue'
import { ElEmpty, ElSkeleton, ElSkeletonItem } from 'element-plus'
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

/** 各状态对应的默认文案 */
const typeMeta = computed(() => {
  switch (props.type) {
    case 'loading':
      return { title: '加载中…', description: '正在获取数据，请稍候。' }
    case 'error':
      return { title: '加载失败', description: '网络似乎出了问题，请稍后重试。' }
    case 'not-found':
      return { title: '未找到内容', description: '内容不存在或已被移除。' }
    default:
      return { title: '暂无内容', description: '这里还没有任何内容。' }
  }
})

const displayTitle = computed(() => props.title || typeMeta.value.title)
const displayDescription = computed(() => props.description || typeMeta.value.description)

/** 是否展示描述：显式传了描述，或完全未自定义标题时给默认描述 */
const showDescription = computed(
  () => !!props.descriptionHtml || !!props.description || !props.title
)

/**
 * 各状态对应的图标。
 *
 * ⚠️ 必须走 el-empty 的 `#image` 插槽，**不能**用 `:image` prop ——
 * 后者是「图片 URL」，传 'error' 这类字符串会被当成路径去请求，渲染成破图；
 * 而且一旦传了 image，EP 就不再渲染 `#image` 插槽，自定义图标会整个消失。
 */
const stateIcon = computed(() => {
  switch (props.type) {
    case 'error':
      return 'material-symbols:error'
    case 'not-found':
      return 'material-symbols:search-off'
    default:
      return 'material-symbols:folder-open'
  }
})
</script>

<template>
  <div class="empty-state" :class="[`empty-state--${props.type}`, { 'is-compact': props.compact }]">
    <!-- 加载态：EP 骨架屏 -->
    <div v-if="props.type === 'loading'" class="empty-state__skeleton" aria-label="加载中">
      <el-skeleton animated :rows="props.compact ? 2 : 3">
        <template #template>
          <el-skeleton-item variant="circle" style="width: 48px; height: 48px" />
          <el-skeleton-item variant="text" style="width: 60%; margin-top: 12px" />
          <el-skeleton-item variant="text" style="width: 40%" />
        </template>
      </el-skeleton>
      <p class="empty-state__title">{{ displayTitle }}</p>
    </div>

    <!-- 空态 / 未找到 / 错误：统一走 #image 插槽自绘图标，不用 el-empty 的 :image -->
    <template v-else>
      <el-empty :image-size="props.compact ? 72 : 96">
        <template #image>
          <div class="empty-state__icon" aria-hidden="true">
            <AppIcon :icon="stateIcon" :size="props.compact ? 26 : 34" />
          </div>
        </template>
      </el-empty>

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
          <AppIcon icon="material-symbols:refresh" :size="14" />
          重试
        </AppButton>
        <slot name="action" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 32px 24px 40px;
  text-align: center;
}

.empty-state.is-compact {
  padding: 20px 16px 28px;
}

.empty-state :deep(.el-empty) {
  padding: 0;
}

/* 隐藏 el-empty 自带的描述文案。
   注意要同时覆盖 __bottom 与 __description —— 不同 EP 版本把描述放在不同层级，
   只隐藏 __bottom 会让「暂无数据」这个 i18n 默认值漏出来（:description 传空串
   也会被 EP 回落到该默认值，所以只能靠 CSS 隐藏）。 */
.empty-state :deep(.el-empty__bottom),
.empty-state :deep(.el-empty__description) {
  display: none;
}

/* ─── 图标 ─────────────────────────────────────────────────────────────── */
.empty-state__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgb(var(--color-primary-rgb) / 0.08);
  color: rgb(var(--color-primary-rgb));
  box-shadow: 0 0 24px rgb(var(--color-primary-rgb) / 0.12);
}

.empty-state--error .empty-state__icon {
  background: rgb(var(--color-error-rgb) / 0.08);
  color: rgb(var(--color-error-rgb));
  box-shadow: 0 0 24px rgb(var(--color-error-rgb) / 0.12);
}

.is-compact .empty-state__icon {
  width: 48px;
  height: 48px;
}

/* ─── 加载骨架 ─────────────────────────────────────────────────────────── */
.empty-state__skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  max-width: 320px;
}

.empty-state__skeleton :deep(.el-skeleton) {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 8px;
  --el-skeleton-color: rgb(var(--color-surface-variant-rgb));
  --el-skeleton-to-color: rgb(var(--color-border-rgb) / 0.5);
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
</style>
