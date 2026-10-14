<script setup lang="ts">
/** 代码片段编辑弹窗：以对话框形式承载片段创建与编辑表单。 */
import { computed, defineAsyncComponent } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSelect from '@/components/common/AppSelect.vue'
// Monaco 体积大（2–3MB），通过异步组件把它拆成独立 chunk，仅在打开编辑对话框时才加载，
// 从而把 Monaco 移出首屏与详情页主包。
const MonacoCodeEditor = defineAsyncComponent(
  () => import('@/components/common/code/MonacoCodeEditor.vue'),
)
import SnippetPlaceholderInspector from '@/components/snippets/SnippetPlaceholderInspector.vue'
import SnippetTagInput from '@/components/snippets/SnippetTagInput.vue'
import {
  useSnippetEditorForm,
  type SnippetEditorSubmitPayload,
} from '@/composables/useSnippetEditorForm'
import { codeBlockLanguages, codeBlockThemes, snippetDifficultyOptions } from '@/types/code-block'
import type { KnowledgeSnippet, KnowledgeSnippetCollection } from '@/types/knowledge-snippet'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  snippet?: KnowledgeSnippet | null
  collections: KnowledgeSnippetCollection[]
  suggestedCollectionId?: string | null
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: SnippetEditorSubmitPayload]
}>()

const {
  form,
  validationMessage,
  collectionOptions,
  placeholderState,
  nameHint,
  nameHintIsError,
  descriptionHint,
  descriptionHintIsError,
  descriptionPlaceholder,
  markTouched,
  validate,
  buildSubmitPayload,
} = useSnippetEditorForm({
  open: () => props.open,
  snippet: () => props.snippet,
  collections: () => props.collections,
  suggestedCollectionId: () => props.suggestedCollectionId,
})

const languageOptions = computed(() =>
  codeBlockLanguages.map((language) => ({ label: language.label, value: language.value }))
)

const themeOptions = computed(() =>
  codeBlockThemes.map((theme) => ({ label: theme.label, value: theme.value }))
)

const difficultyOptions = computed(() =>
  snippetDifficultyOptions.map((item) => ({ label: item.label, value: item.value }))
)

const handleSubmit = () => {
  if (!validate()) return
  emit('submit', buildSubmitPayload())
}

const handleCancel = () => {
  emit('update:open', false)
}

/** 名称输入：同步表单并标记「已改动」——此后该字段才允许报红。 */
const handleNameInput = (value: unknown) => {
  Object.assign(form, { name: String(value ?? '') })
  markTouched('name')
}

/** 描述输入：同上。 */
const handleDescriptionInput = (value: unknown) => {
  Object.assign(form, { description: String(value ?? '') })
  markTouched('description')
}

const titleText = computed(() => (props.mode === 'create' ? '新建片段' : '编辑片段'))
const titleIcon = computed(() => (props.mode === 'create' ? 'material-symbols:note-add' : 'material-symbols:edit-note'))
</script>

<template>
  <AppModal
    :open="props.open"
    :width="720"
    :footer="null"
    :destroy-on-close="true"
    :body-style="{ maxHeight: '85vh', overflowY: 'auto', padding: '0' }"
    @update:open="emit('update:open', $event)"
  >
    <template #title>
      <div class="snippet-editor-dialog__title">
        <AppIcon :icon="titleIcon" :size="18" />
        <span>{{ titleText }}</span>
      </div>
    </template>

    <div class="snippet-editor-dialog">
      <div class="snippet-editor-dialog__body">
        <!-- 元信息 -->
        <!-- eslint-disable vuejs-accessibility/label-has-for -->
        <!-- 说明：以下 <label> 包裹的都是自定义组件（AppInput / AppSelect / SnippetTagInput），
             vuejs-accessibility 规则无法穿透组件边界识别其内部渲染的原生表单控件，
             因而误判为「label 未关联控件」。关联由这些组件自身负责，故本区块禁用该规则。 -->
        <div class="snippet-editor-dialog__meta">
          <div class="snippet-editor-dialog__row snippet-editor-dialog__row--2">
            <label class="snippet-editor-dialog__field snippet-editor-dialog__field--stacked">
              <span class="snippet-editor-dialog__label">名称</span>
              <AppInput
                :value="form.name"
                placeholder="例如：Vue 数据加载状态"
                @update:value="handleNameInput"
              />
              <!-- 实时校验：未改动只显示字数，改动过 / 点过创建才把原因写在字段下面（后端 30 字上限会 400） -->
              <p
                class="snippet-editor-dialog__hint"
                :class="{ 'snippet-editor-dialog__hint--error': nameHintIsError }"
              >
                {{ nameHint }}
              </p>
            </label>

            <label class="snippet-editor-dialog__field">
              <span class="snippet-editor-dialog__label">集合</span>
              <AppSelect
                class="flex-1 min-w-0"
                :value="form.collectionId"
                :options="collectionOptions"
                @update:value="
                  Object.assign(form, { collectionId: ($event as string | null) ?? null })
                "
              />
            </label>
          </div>

          <label class="snippet-editor-dialog__field snippet-editor-dialog__field--top">
            <span class="snippet-editor-dialog__label">描述</span>
            <div class="snippet-editor-dialog__description">
              <AppInput
                :value="form.description"
                :rows="2"
                :placeholder="descriptionPlaceholder"
                @update:value="handleDescriptionInput"
              />
              <!-- 实时校验：未改动只显示字数，改动过 / 点过创建才把原因写在字段下面（别让用户点保存才吃 400） -->
              <p
                class="snippet-editor-dialog__hint"
                :class="{ 'snippet-editor-dialog__hint--error': descriptionHintIsError }"
              >
                {{ descriptionHint }}
              </p>
            </div>
          </label>

          <label class="snippet-editor-dialog__field">
            <span class="snippet-editor-dialog__label">标签</span>
            <SnippetTagInput
              :model-value="form.tagsText"
              :available-tags="[]"
              @update:model-value="Object.assign(form, { tagsText: $event })"
            />
          </label>
        </div>
        <!-- eslint-enable vuejs-accessibility/label-has-for -->

        <div class="snippet-editor-dialog__divider" />

        <!-- 代码区 -->
        <div class="snippet-editor-dialog__editor">
          <div class="snippet-editor-dialog__editor-toolbar">
            <span class="snippet-editor-dialog__editor-title">
              <AppIcon icon="material-symbols:code" :size="14" />
              代码内容
            </span>
            <div class="snippet-editor-dialog__editor-options">
              <AppSelect
                class="snippet-editor-dialog__select--sm flex-1 min-w-0"
                :value="form.language"
                :options="languageOptions"
                @update:value="Object.assign(form, { language: String($event ?? 'text') })"
              />
              <AppSelect
                class="snippet-editor-dialog__select--sm flex-1 min-w-0"
                :value="form.theme"
                :options="themeOptions"
                @update:value="Object.assign(form, { theme: $event as typeof form.theme })"
              />
              <AppSelect
                class="snippet-editor-dialog__select--sm flex-1 min-w-0"
                :value="form.difficulty"
                :options="difficultyOptions"
                @update:value="
                  Object.assign(form, {
                    difficulty: ($event as '' | 'beginner' | 'intermediate' | 'advanced') ?? '',
                  })
                "
              />
            </div>
          </div>
          <div class="snippet-editor-dialog__code">
            <MonacoCodeEditor
              v-model="form.content"
              :language="form.language"
              :show-line-numbers="form.lineNumbers"
              :word-wrap="form.wrap"
              min-height="100%"
              max-height="100%"
            />
          </div>
        </div>

        <SnippetPlaceholderInspector
          v-if="placeholderState.defs.length > 0 || placeholderState.error"
          :defs="placeholderState.defs"
          :error="placeholderState.error"
        />

        <div v-if="validationMessage" class="snippet-editor-dialog__error">
          <AppIcon icon="material-symbols:error" :size="14" />
          <span>{{ validationMessage }}</span>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="snippet-editor-dialog__footer">
        <AppButton variant="glass" @click="handleCancel">取消</AppButton>
        <AppButton variant="primary" :loading="props.saving" @click="handleSubmit">
          <AppIcon icon="material-symbols:save" :size="16" />
          {{ props.mode === 'create' ? '创建' : '保存' }}
        </AppButton>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.snippet-editor-dialog {
  display: flex;
  flex-direction: column;
}

.snippet-editor-dialog__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}

.snippet-editor-dialog__title .app-icon {
  color: rgb(var(--color-primary-rgb));
}

/* ─── 表单内容 ──────────────────────────────────────────────────────────── */
.snippet-editor-dialog__body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.snippet-editor-dialog__meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.snippet-editor-dialog__row {
  display: grid;
  gap: 20px;
}

.snippet-editor-dialog__row--2 {
  grid-template-columns: 1fr 1fr;
}

.snippet-editor-dialog__field {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.snippet-editor-dialog__field--top {
  align-items: flex-start;
}

/* 控件下方带实时校验提示的字段（如「名称」）：
 * 提示原本是 flex 行的第三个子项，会跟输入框抢横向空间、把输入框压窄，
 * 故改用 grid —— 标签占第 1 列，控件与提示都落在第 2 列（提示排在控件下一行）。 */
.snippet-editor-dialog__field--stacked {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: center;
  gap: 4px 12px;
}

.snippet-editor-dialog__field--stacked .snippet-editor-dialog__hint {
  grid-column: 2;
  margin: 0;
}

.snippet-editor-dialog__label {
  flex: 0 0 auto;
  width: 56px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: rgb(var(--color-text-secondary-rgb) / 0.85);
  text-align: right;
  line-height: 1.25;
}

.snippet-editor-dialog__field > .app-input,
.snippet-editor-dialog__field > .app-select,
.snippet-editor-dialog__field > .snippet-tag-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
}

.snippet-editor-dialog__divider {
  height: 1px;
  background: rgb(var(--color-border-glass-rgb) / 0.1);
}

/* ─── 代码编辑器 ────────────────────────────────────────────────────────── */
.snippet-editor-dialog__editor {
  display: flex;
  flex-direction: column;
  border: 1px solid rgb(var(--color-border-glass-rgb) / 0.12);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.snippet-editor-dialog__editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: rgb(var(--color-surface-variant-rgb) / 0.35);
  border-bottom: 1px solid rgb(var(--color-border-glass-rgb) / 0.1);
}

.snippet-editor-dialog__editor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-heading);
  font-size: var(--text-body-sm, 0.875rem);
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}

.snippet-editor-dialog__editor-title .app-icon {
  color: rgb(var(--color-primary-rgb));
  opacity: 0.9;
}

.snippet-editor-dialog__editor-options {
  display: flex;
  align-items: center;
  gap: 12px;
}

.snippet-editor-dialog__select--sm {
  width: 130px;
}

.snippet-editor-dialog__code {
  flex: 1 1 auto;
  /* 必须给**确定高度**：MonacoCodeEditor 内部靠 height:100% 撑开，
   * 父级只写 min-height 时百分比高度会失效（曾导致代码区整片空白、编辑器只有 5px）。 */
  height: 320px;
  max-height: 50vh;
  overflow: hidden;
  background: rgb(var(--color-surface-rgb));
}

/* ─── 错误提示 ──────────────────────────────────────────────────────────── */
.snippet-editor-dialog__error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid rgb(var(--color-error-rgb) / 0.35);
  border-radius: var(--radius);
  background: rgb(var(--color-error-rgb) / 0.08);
  color: rgb(var(--color-error-rgb));
  font-size: var(--text-xs);
  line-height: 1.5;
}

.snippet-editor-dialog__error > svg {
  flex-shrink: 0;
  margin-top: 1px;
}

/* ─── 描述字段（必填 + 实时字数/校验提示） ─────────────────────────────── */
.snippet-editor-dialog__description {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.snippet-editor-dialog__hint {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.5;
  color: rgb(var(--color-text-secondary-rgb) / 0.7);
}

.snippet-editor-dialog__hint--error {
  color: rgb(var(--color-error-rgb));
}

/* ─── 底部 ──────────────────────────────────────────────────────────────── */
.snippet-editor-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 24px;
  border-top: 1px solid rgb(var(--color-border-glass-rgb) / 0.1);
}

</style>
