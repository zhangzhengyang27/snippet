<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface Props {
  /** Iconify icon name, e.g. 'lucide:search' */
  icon: string
  /** Icon size in pixels (default: 20) */
  size?: number | string
  /** Additional CSS class（字符串或对象式绑定） */
  class?: string | Record<string, boolean>
}

const props = withDefaults(defineProps<Props>(), {
  size: 20,
})

const sizeValue = typeof props.size === 'number' ? props.size : parseInt(props.size, 10)
</script>

<template>
  <Icon :icon="icon" :width="sizeValue" :height="sizeValue" :class="$props.class" />
</template>
