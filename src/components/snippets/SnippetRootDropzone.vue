<script setup lang="ts">
/** 根目录放置区：拖拽进行中（由父级 SnippetSidebar 的 v-show="dragging" 控制显隐）
 * 显示，提示用户把集合松手到此处即可移动到根目录。
 * 实际投放逻辑由父级根 <draggable>（group="collections"）承载——放置区位于根
 * 可投放区内部，松手即成为根级集合；本组件只负责视觉提示，不绑定任何拖拽行为。
 */
import AppIcon from '@/components/common/AppIcon.vue'
</script>

<template>
  <div class="snippet-sidebar__dropzone">
    <AppIcon icon="ms:drive_file_move" :size="13" class="snippet-sidebar__dropzone-icon" />
    <span>拖到这里移动到根目录</span>
  </div>
</template>

<style scoped>
.snippet-sidebar__dropzone {
  --sb-border: rgb(var(--color-border-glass-rgb) / 0.08);
  --sb-accent: rgb(var(--color-primary-rgb));
  --sb-accent-bg: rgb(var(--color-primary-rgb) / 0.1);
  --sb-surface-variant: rgb(var(--color-surface-variant-rgb));
  --sb-text-faint: rgb(var(--color-text-secondary-rgb) / 0.5);

  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  height: 28px;
  border: 1px dashed var(--sb-accent);
  border-radius: 6px;
  background: var(--sb-accent-bg);
  color: var(--sb-accent);
  font-size: 0.75rem;
  margin-bottom: 4px;
}

.snippet-sidebar__dropzone-icon {
  flex-shrink: 0;
  opacity: 0.9;
}
</style>
