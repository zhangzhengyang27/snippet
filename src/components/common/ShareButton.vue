<script setup lang="ts">
/**
 * ShareButton - 分享按钮（恢复重建）
 *
 * 复制当前页面链接完成分享，复制成功后短暂切换为「已复制」状态
 * （useCopy 的 copied 会在 2s 后自动重置）。
 *
 * 用法：
 *   <ShareButton :example="example" />
 */
import { computed } from 'vue'
import { useCopy } from '@/composables/useCopy'
import type { CodeExample } from '@/types'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'

interface Props {
  /** 目标示例（用于无障碍标注） */
  example: CodeExample
}

const props = defineProps<Props>()

const { copy, copied } = useCopy()

const shareLabel = computed(() => (copied.value ? '已复制' : '分享'))

/** 复制当前示例页地址作为分享链接 */
async function handleShare() {
  await copy(window.location.href)
  // copied 状态由 useCopy 自动维护，无需额外处理
}
</script>

<template>
  <AppButton
    variant="glass"
    size="small"
    class="share-button"
    :title="`分享「${props.example.title}」`"
    @click="handleShare"
  >
    <AppIcon :icon="copied ? 'material-symbols:check' : 'material-symbols:share'" :size="16" />
    {{ shareLabel }}
  </AppButton>
</template>
