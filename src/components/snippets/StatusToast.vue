<script setup lang="ts">
/** 状态提示组件，负责片段页面操作反馈展示。 */
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

interface Props {
  show: boolean
  message: string
  type?: 'success' | 'error' | 'info'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'success',
})

const toastMeta = computed(() => {
  if (props.type === 'error') {
    return {
      shellClass: 'border-error/40 bg-error/10 text-error',
      iconClass: 'bg-error/20 text-error',
      label: '错误',
      icon: 'material-symbols:error',
    }
  }

  if (props.type === 'info') {
    return {
      shellClass: 'border-m3-outline bg-m3-surface-container-high text-text-secondary',
      iconClass: 'bg-surface-variant text-text-secondary',
      label: '提示',
      icon: 'material-symbols:info',
    }
  }

  return {
    shellClass: 'border-success/40 bg-success/10 text-success',
    iconClass: 'bg-success/20 text-success',
    label: '成功',
    icon: 'material-symbols:check-circle',
  }
})
</script>

<template>
  <transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="translate-y-2 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-2 opacity-0"
  >
    <div
      v-if="props.show && props.message"
      class="fixed right-6 top-6 z-[240] min-w-60 max-w-95 rounded-lg border px-4 py-3.5 shadow-xl backdrop-blur-md"
      :class="toastMeta.shellClass"
    >
      <div class="flex items-start gap-3">
        <span
          class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          :class="toastMeta.iconClass"
        >
          <AppIcon :icon="toastMeta.icon" :size="18" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-label-caps uppercase opacity-60">
            {{ toastMeta.label }}
          </p>
          <div class="mt-1 min-w-0 text-body-sm font-medium">
            {{ props.message }}
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
