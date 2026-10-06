<script setup lang="ts">
/**
 * 片段列表的「更多操作」菜单：承载导出 / 导入 / 批量三个低频操作。
 *
 * 此前这三个按钮平铺在工具栏与列表之间独占一行（页面 .data-actions），低频操作却
 * 占据了与「新建片段」同级的视觉权重，且与主工具栏割裂。收进菜单后工具栏回归
 * 「标题 + 搜索 + 筛选 + 新建」的操作主线。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'

const props = defineProps<{
  /** 当前是否在批量模式（决定菜单项文案） */
  batchMode: boolean
  /** 列表为空时禁用导出（无数据可导） */
  disableExport: boolean
  /** 导入进行中：禁用并展示进度 */
  importing: boolean
  importProgress?: { done: number; total: number } | null
}>()

const emit = defineEmits<{
  export: []
  import: []
  'toggle-batch': []
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const toggle = () => {
  open.value = !open.value
}

const close = () => {
  open.value = false
}

/** 点外部关闭：用 pointerdown 而非 click，避免菜单项 click 前就被关掉 */
const onPointerDown = (e: PointerEvent) => {
  if (open.value && root.value && !root.value.contains(e.target as Node)) close()
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})

/** 执行菜单项：先关闭菜单再触发，避免菜单遮挡后续弹窗 */
const run = (fn: () => void) => {
  close()
  fn()
}
</script>

<template>
  <div ref="root" class="more-menu">
    <AppButton
      variant="text"
      size="small"
      class="more-menu__trigger"
      :class="{ 'is-active': open }"
      :aria-expanded="open"
      aria-haspopup="menu"
      :title="props.batchMode ? '更多操作（批量中）' : '更多操作'"
      @click="toggle"
    >
      <AppIcon icon="material-symbols:more-horiz" :size="16" />
    </AppButton>

    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="open" class="more-menu__panel" role="menu">
        <button
          type="button"
          class="more-menu__item"
          role="menuitem"
          :disabled="props.disableExport"
          @click="run(() => emit('export'))"
        >
          <AppIcon icon="material-symbols:file-download" :size="14" />
          导出
        </button>

        <button
          type="button"
          class="more-menu__item"
          role="menuitem"
          :disabled="props.importing"
          @click="run(() => emit('import'))"
        >
          <AppIcon icon="material-symbols:file-upload" :size="14" />
          {{
            props.importing && props.importProgress
              ? `导入中 ${props.importProgress.done}/${props.importProgress.total}`
              : '导入'
          }}
        </button>

        <div class="more-menu__divider" />

        <button
          type="button"
          class="more-menu__item"
          role="menuitem"
          :class="{ 'is-active': props.batchMode }"
          :disabled="props.disableExport && !props.batchMode"
          @click="run(() => emit('toggle-batch'))"
        >
          <AppIcon
            :icon="props.batchMode ? 'material-symbols:close' : 'material-symbols:checklist'"
            :size="14"
          />
          {{ props.batchMode ? '退出批量' : '批量选择' }}
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.more-menu {
  position: relative;
  flex: none;
}

.more-menu__trigger {
  color: var(--color-text-secondary);
}

.more-menu__trigger.is-active {
  color: var(--color-primary);
  background: var(--color-surface-variant);
}

.more-menu__panel {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 60;
  min-width: 148px;
  padding: 4px;
  border: 1px solid var(--color-border-glass);
  border-radius: 10px;
  background: var(--color-surface);
  box-shadow: 0 8px 24px rgb(var(--color-shadow-rgb) / 0.18);
}

.more-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  transition:
    background 150ms ease,
    color 150ms ease;
}

.more-menu__item:hover:not(:disabled) {
  background: var(--color-surface-variant);
  color: var(--color-text);
}

.more-menu__item.is-active {
  color: var(--color-primary);
  font-weight: 600;
}

.more-menu__item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.more-menu__divider {
  height: 1px;
  margin: 4px 6px;
  background: var(--color-border-glass);
}
</style>
