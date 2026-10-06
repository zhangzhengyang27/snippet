<script setup lang="ts">
/** 工作区布局壳：桌面三栏分屏（侧边栏 | 列表 | 可选详情栏）。PC 端专用，无响应式分支。 */
const props = withDefaults(
  defineProps<{
    /** 是否展示右侧详情栏（桌面三栏分屏模式为 true，独立页模式为 false） */
    showDetail?: boolean
  }>(),
  { showDetail: false }
)
</script>

<template>
  <!-- 高度严格等于「视口 - 固定头部」，min-h-0 让内部列表面板自己滚动。
       此前这里带 min-h-160（640px）：窄/矮视口下 640 + 头部 64 超出一屏，整页被迫
       滚动，三栏外壳被切掉一截（底部列表与分页够不着）。头部本来就是 fixed，
       不需要靠最小高度去顶开布局。 -->
  <section
    class="relative flex h-[calc(100vh-var(--header-height))] min-h-0 overflow-hidden bg-(--color-bg)"
  >
    <!-- 品牌氛围光晕（克制，青蓝 radial） -->
    <div
      class="pointer-events-none absolute inset-0 opacity-50 mask-[radial-gradient(ellipse_at_top,black_0%,transparent_60%)]"
      aria-hidden="true"
    >
      <div class="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
      <div class="absolute -top-16 right-1/3 h-80 w-80 rounded-full bg-brand-indigo/15 blur-3xl" />
    </div>

    <!-- 左侧边栏 -->
    <div class="relative z-10 flex h-full shrink-0">
      <slot name="sidebar" />
    </div>

    <!-- 中间列表区：有详情时保持紧凑（不侵占主体），无详情时弹性占据 -->
    <div
      class="relative z-10 flex min-w-0 flex-col overflow-hidden"
      :class="props.showDetail ? 'w-(--list-width) shrink-0' : 'flex-1'"
    >
      <slot name="list" />
    </div>

    <!-- 可选右侧详情栏（分屏模式）：弹性占据主体宽度 -->
    <div
      v-if="props.showDetail"
      class="relative z-10 flex h-full min-w-0 flex-1 flex-col overflow-hidden"
    >
      <slot name="detail" />
    </div>
  </section>
</template>
