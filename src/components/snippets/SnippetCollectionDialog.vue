<script setup lang="ts">
/** 对话框组件，负责片段集合的确认、输入与提交流程。 */
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  name: string
  saving: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:name': [value: string]
  submit: []
}>()
</script>

<template>
  <AppModal
    :open="props.open"
    :title="props.mode === 'create' ? '新建集合' : '重命名集合'"
    :width="480"
    :footer="null"
    @update:open="emit('update:open', $event)"
  >
    <p class="mb-4 text-code-sm text-text-secondary">
      {{
        props.mode === 'create'
          ? '集合用于组织个人全局片段。首版删除只允许空集合。'
          : '重命名不会影响其中的片段内容。'
      }}
    </p>

    <!-- 该 <label> 包裹的是自定义组件 AppInput，规则无法穿透组件边界识别其内部的原生 input -->
    <!-- eslint-disable-next-line vuejs-accessibility/label-has-for -->
    <label class="block space-y-2">
      <span class="text-body-sm font-medium text-text">集合名称</span>
      <AppInput
        :value="props.name"
        placeholder="例如：Vue / API / SQL"
        @update:value="emit('update:name', String($event ?? ''))"
      />
    </label>

    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="glass" @click="emit('update:open', false)">取消</AppButton>
        <AppButton variant="primary" :loading="props.saving" @click="emit('submit')">
          {{ props.mode === 'create' ? '创建集合' : '保存名称' }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
