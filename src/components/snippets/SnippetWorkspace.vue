<script setup lang="ts">
/** 工作区布局壳：桌面三栏分屏；移动端侧边栏抽屉化 + 列表单栏 + 详情 Bottom Sheet。 */
import { computed, ref } from 'vue'
import { useIsMobile } from '@/composables/useIsMobile'
import AppIcon from '@/components/common/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    /** 是否展示右侧详情栏（桌面三栏分屏模式为 true，独立页模式为 false） */
    showDetail?: boolean
    /** 移动端：侧边栏抽屉是否打开 */
    sidebarOpen?: boolean
    /** 移动端：详情 Bottom Sheet 是否打开 */
    detailOpen?: boolean
  }>(),
  { showDetail: false, sidebarOpen: false, detailOpen: false }
)

const emit = defineEmits<{
  'update:sidebarOpen': [value: boolean]
  'update:detailOpen': [value: boolean]
}>()

const { isCompact } = useIsMobile()

/** 移动端是否展示侧边栏抽屉（含关闭动画前的渲染） */
const showSidebarDrawer = computed(() => isCompact.value && props.sidebarOpen)

/** 移动端是否展示详情 Bottom Sheet */
const showDetailSheet = computed(() => isCompact.value && props.detailOpen)

const closeSidebar = () => emit('update:sidebarOpen', false)
const closeDetail = () => emit('update:detailOpen', false)

/** Bottom Sheet 下滑关闭手势状态 */
const sheetStartY = ref(0)
const sheetTranslateY = ref(0)

const onSheetTouchStart = (e: TouchEvent) => {
  sheetStartY.value = e.touches[0]?.clientY ?? 0
  sheetTranslateY.value = 0
}

const onSheetTouchMove = (e: TouchEvent) => {
  const currentY = e.touches[0]?.clientY ?? 0
  const delta = currentY - sheetStartY.value
  // 仅允许向下拖拽（下滑关闭）
  if (delta > 0) {
    sheetTranslateY.value = delta
  }
}

const onSheetTouchEnd = () => {
  // 下滑超过 80px 视为关闭手势
  if (sheetTranslateY.value > 80) {
    closeDetail()
  }
  sheetTranslateY.value = 0
  sheetStartY.value = 0
}
</script>

<template>
  <section
    class="relative flex h-[calc(100vh-var(--header-height))] min-h-160 overflow-hidden bg-(--color-bg)"
  >
    <!-- 品牌氛围光晕（克制，青蓝 radial） -->
    <div
      class="pointer-events-none absolute inset-0 opacity-50 mask-[radial-gradient(ellipse_at_top,black_0%,transparent_60%)]"
      aria-hidden="true"
    >
      <div class="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
      <div class="absolute -top-16 right-1/3 h-80 w-80 rounded-full bg-brand-indigo/15 blur-3xl" />
    </div>

    <!-- ══ 桌面布局（>1024px）：三栏 flex ══ -->
    <template v-if="!isCompact">
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
    </template>

    <!-- ══ 移动端布局（≤1024px）：单栏列表 + 抽屉侧边栏 + 详情 Bottom Sheet ══ -->
    <template v-else>
      <!-- 列表区：占满全宽 -->
      <div class="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <slot name="list" />
      </div>

      <!-- 侧边栏抽屉 -->
      <Teleport to="body">
        <Transition name="ws-drawer">
          <div v-if="showSidebarDrawer" class="ws-drawer" @click.self="closeSidebar">
            <div class="ws-drawer__panel">
              <div class="ws-drawer__head">
                <span class="ws-drawer__title">筛选</span>
                <button
                  type="button"
                  class="ws-drawer__close"
                  aria-label="关闭筛选"
                  @click="closeSidebar"
                >
                  <AppIcon icon="material-symbols:close" :size="20" />
                </button>
              </div>
              <div class="ws-drawer__body">
                <slot name="sidebar" />
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- 详情 Bottom Sheet -->
      <Teleport to="body">
        <Transition name="ws-sheet">
          <div v-if="showDetailSheet" class="ws-sheet" @click.self="closeDetail">
            <div
              class="ws-sheet__panel"
              :style="
                sheetTranslateY > 0 ? { transform: `translateY(${sheetTranslateY}px)` } : undefined
              "
            >
              <div
                class="ws-sheet__grabber-area"
                @touchstart.passive="onSheetTouchStart"
                @touchmove.passive="onSheetTouchMove"
                @touchend="onSheetTouchEnd"
              >
                <div class="ws-sheet__grabber" aria-hidden="true" />
              </div>
              <div class="ws-sheet__body">
                <slot name="detail" />
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>
  </section>
</template>

<style>
/* ── 移动端抽屉侧边栏（Teleport 到 body，需全局样式） ── */
.ws-drawer {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgb(0 0 0 / 0.5);
  backdrop-filter: blur(2px);
}

.ws-drawer__panel {
  display: flex;
  flex-direction: column;
  width: min(85vw, 340px);
  height: 100%;
  background: rgb(var(--color-bg-elevated-rgb));
  border-right: 1px solid rgb(var(--color-border-rgb));
  box-shadow: 0 0 40px rgb(var(--color-shadow-rgb) / 0.3);
}

.ws-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(var(--color-border-rgb));
  flex-shrink: 0;
}

.ws-drawer__title {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}

.ws-drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: -6px -6px -6px 0;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.ws-drawer__close:hover {
  background: rgb(var(--color-surface-hover-rgb));
  color: rgb(var(--color-text-rgb));
}

.ws-drawer__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* 抽屉滑入滑出 */
.ws-drawer-enter-active,
.ws-drawer-leave-active {
  transition: opacity 0.24s ease;
}

.ws-drawer-enter-active .ws-drawer__panel,
.ws-drawer-leave-active .ws-drawer__panel {
  transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

.ws-drawer-enter-from,
.ws-drawer-leave-to {
  opacity: 0;
}

.ws-drawer-enter-from .ws-drawer__panel,
.ws-drawer-leave-to .ws-drawer__panel {
  transform: translateX(-100%);
}

/* ── 详情 Bottom Sheet（Teleport 到 body，需全局样式） ── */
.ws-sheet {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 0.5);
  backdrop-filter: blur(2px);
}

.ws-sheet__panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 85vh;
  max-height: 85vh;
  background: rgb(var(--color-bg-elevated-rgb));
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  border-top: 1px solid rgb(var(--color-border-rgb));
  box-shadow: 0 -12px 40px rgb(var(--color-shadow-rgb) / 0.3);
  overflow: hidden;
}

.ws-sheet__grabber-area {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  cursor: grab;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.ws-sheet__grabber {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgb(var(--color-text-tertiary-rgb) / 0.5);
}

.ws-sheet__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* Bottom Sheet 滑入滑出 */
.ws-sheet-enter-active,
.ws-sheet-leave-active {
  transition: opacity 0.28s ease;
}

.ws-sheet-enter-active .ws-sheet__panel,
.ws-sheet-leave-active .ws-sheet__panel {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.ws-sheet-enter-from,
.ws-sheet-leave-to {
  opacity: 0;
}

.ws-sheet-enter-from .ws-sheet__panel,
.ws-sheet-leave-to .ws-sheet__panel {
  transform: translateY(100%);
}
</style>
