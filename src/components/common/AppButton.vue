<script setup lang="ts">
/**
 * AppButton - 项目级按钮封装（基于 Element Plus el-button）
 *
 * 内置 6.9 设计规范的三种视觉变体，页面无需重复写样式：
 *   - glass（默认）：玻璃拟态背景 + hover 主色光晕
 *   - primary：主色渐变 + 白色文字 + 阴影
 *   - text：极简文字按钮
 *
 * 透传 el-button 的所有 props / events / slots（size, disabled, loading, danger 等）。
 *
 * 用法：
 *   <AppButton @click="save">保存</AppButton>
 *   <AppButton variant="primary" :loading="saving">提交</AppButton>
 *   <AppButton variant="text" size="small">取消</AppButton>
 */
import { computed } from 'vue'

interface Props {
  /** 视觉变体 */
  variant?: 'glass' | 'primary' | 'text' | 'pill' | 'pill-muted'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'glass',
})

defineOptions({ inheritAttrs: false })

const variantClass = computed(() => `app-btn--${props.variant}`)
</script>

<template>
  <el-button v-bind="$attrs" class="app-btn" :class="variantClass" :text="variant === 'text'">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData ?? {}" />
    </template>
  </el-button>
</template>

<style scoped>
/* 基础重置 */
.app-btn.el-button {
  /* 仅做布局归一；背景/边框/内边距交给各变体覆盖 el-button 默认值 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--font-body);
  font-weight: 600;
  border-radius: 10px;
  transition:
    background var(--duration-base) var(--ease-out),
    color var(--duration-base) var(--ease-out),
    border-color var(--duration-base) var(--ease-out),
    box-shadow var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
}

/* Glass 变体（默认）：玻璃拟态操作按钮 */
.app-btn--glass {
  padding: 8px 16px;
  background: rgb(var(--color-surface-glass-rgb) / var(--color-surface-glass-alpha, 1));
  color: rgb(var(--color-text-secondary-rgb) / 0.9);
  border: 1px solid rgb(var(--color-border-glass-rgb) / var(--color-border-glass-alpha, 1));
  font-size: 0.875rem;
}

.app-btn--glass:hover {
  background: rgb(var(--color-primary-rgb) / 0.08);
  color: rgb(var(--color-primary-rgb));
  border-color: rgb(var(--color-primary-rgb) / 0.25);
  box-shadow: 0 0 16px rgb(var(--color-primary-rgb) / 0.1);
}

.app-btn--glass:active {
  transform: scale(0.97);
}

/* Primary 变体：主色渐变 CTA */
/*
 * Primary 变体：主色渐变 CTA
 */
.app-btn--primary {
  padding: 9px 20px;
  background: linear-gradient(
    135deg,
    rgb(var(--color-primary-rgb)),
    rgb(var(--color-primary-rgb) / 0.78)
  );
  color: #fff;
  border: 1px solid rgb(var(--color-primary-rgb) / 0.4);
  font-size: 0.875rem;
  box-shadow: 0 2px 12px rgb(var(--color-primary-rgb) / 0.28);
}

.app-btn--primary:hover {
  box-shadow: 0 4px 20px rgb(var(--color-primary-rgb) / 0.4);
  filter: brightness(1.06);
}

.app-btn--primary:active {
  transform: scale(0.97);
}

/* Text 变体：极简文字按钮 */
.app-btn--text {
  padding: 4px 8px;
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  border: none;
  font-size: 0.875rem;
}

.app-btn--text:hover {
  color: rgb(var(--color-primary-rgb));
}

/* Pill 变体：胶囊形导航按钮 */
.app-btn--pill {
  padding: 6px 16px;
  background: rgb(var(--color-surface-rgb) / 0.6);
  color: rgb(var(--color-text-secondary-rgb));
  border: 1px solid rgb(var(--color-border-rgb) / 0.6);
  border-radius: 999px;
  font-size: 0.8125rem;
}

.app-btn--pill:hover {
  border-color: rgb(var(--color-primary-rgb) / 0.4);
  color: rgb(var(--color-primary-rgb));
}

/* Pill-muted 变体：低强调胶囊（次级筛选等） */
.app-btn--pill-muted {
  padding: 6px 16px;
  background: rgb(var(--color-surface-rgb) / 0.35);
  color: rgb(var(--color-text-secondary-rgb) / 0.8);
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 0.8125rem;
}

.app-btn--pill-muted:hover {
  color: rgb(var(--color-text-rgb));
  background: rgb(var(--color-surface-rgb) / 0.7);
}
</style>
