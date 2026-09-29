<script setup lang="ts">
/**
 * FavoriteButton - 示例收藏按钮（恢复重建）
 *
 * 通过 useFavorites 全局状态联动：点击切换收藏，图标与文案随状态变化。
 *
 * 用法：
 *   <FavoriteButton :example="example" />
 */
import { computed } from 'vue'
import { useFavorites } from '@/composables/useFavorites'
import type { CodeExample } from '@/types'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'

interface Props {
  /** 目标示例 */
  example: CodeExample
}

const props = defineProps<Props>()

const { isFavorite, toggleFavorite } = useFavorites()

const favorited = computed(() => isFavorite(props.example.id))

function handleClick() {
  void toggleFavorite(props.example.id, props.example)
}
</script>

<template>
  <AppButton
    variant="glass"
    size="small"
    class="favorite-button"
    :class="{ 'is-active': favorited }"
    :title="favorited ? '取消收藏' : '收藏该示例'"
    :aria-pressed="favorited"
    @click="handleClick"
  >
    <AppIcon :icon="favorited ? 'material-symbols:star' : 'material-symbols:star-outline'" :size="16" />
    {{ favorited ? '已收藏' : '收藏' }}
  </AppButton>
</template>

<style scoped>
/* 收藏态：主色高亮，与列表收藏筛选按钮一致 */
.favorite-button.is-active {
  color: rgb(var(--color-primary-rgb));
  border-color: rgb(var(--color-primary-rgb) / 0.5);
  background: rgb(var(--color-primary-rgb) / 0.1);
}
</style>
