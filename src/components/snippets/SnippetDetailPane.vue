<script setup lang="ts">
/**
 * 片段详情侧栏（SnippetWorkspace 的 #detail 插槽内容）：
 * 头部元信息 + 多文件 tab 代码区 + 标签/操作底栏。
 * 移动端由外层 Bottom Sheet 承载，本组件只负责内容。
 */
import { computed, ref, watch } from 'vue'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import { useIsMobile } from '@/composables/useIsMobile'
import MonacoCodeEditor from '@/components/common/code/MonacoCodeEditor.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'

interface Props {
  /** 面板是否处于激活状态（移动端 Bottom Sheet 展开态） */
  active?: boolean
  /** 当前选中的片段；为空时展示空态占位 */
  snippet?: KnowledgeSnippet | null
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  snippet: null,
})

const emit = defineEmits<{
  close: []
  copy: [snippet: KnowledgeSnippet, code: string]
  'toggle-favorite': [snippet: KnowledgeSnippet]
  edit: [snippet: KnowledgeSnippet]
  delete: [snippet: KnowledgeSnippet]
}>()

const { isCompact } = useIsMobile()

const snippetFiles = computed(() => props.snippet?.displayAttrs?.files ?? [])
const hasFiles = computed(() => snippetFiles.value.length > 0)

const activeFileIndex = ref(0)
watch(
  () => props.snippet?.id,
  () => {
    activeFileIndex.value = 0
  }
)

const activeFile = computed(() => snippetFiles.value[activeFileIndex.value] ?? null)
const activeCode = computed(() =>
  hasFiles.value ? activeFile.value?.code ?? '' : props.snippet?.content ?? ''
)
const activeLanguage = computed(() =>
  hasFiles.value ? activeFile.value?.language ?? 'text' : props.snippet?.language ?? 'text'
)

const lineCount = computed(() => activeCode.value.split('\n').length)

/** 仅 HTML 片段可新标签页打开独立预览（blob URL，同源隔离由 sandbox 承担） */
const isHtml = computed(() => activeLanguage.value === 'html')

function openPreviewWindow() {
  const blob = new Blob([activeCode.value], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <aside class="detail-pane">
    <div v-if="snippet" class="detail-pane__body">
      <div class="snippet-detail-drawer__head">
        <div class="snippet-detail-drawer__head-main">
          <div class="snippet-detail-drawer__title-row">
            <el-tag size="small" effect="plain" class="snippet-detail-drawer__lang">{{ snippet.language }}</el-tag>
            <h2 class="snippet-detail-drawer__name">{{ snippet.name }}</h2>
            <button
              type="button"
              class="snippet-detail-drawer__close"
              aria-label="关闭详情"
              @click="emit('close')"
            >
              <AppIcon icon="ms:close" :size="16" />
            </button>
          </div>
          <p v-if="snippet.description" class="snippet-detail-drawer__desc">
            {{ snippet.description }}
          </p>
        </div>
      </div>

      <div class="snippet-detail-drawer__code">
        <div v-if="hasFiles" class="snippet-detail-drawer__tabs">
          <button
            v-for="(file, index) in snippetFiles"
            :key="file.name"
            type="button"
            class="snippet-detail-drawer__tab"
            :class="{ 'is-active': index === activeFileIndex }"
            @click="activeFileIndex = index"
          >
            {{ file.name }}
          </button>
        </div>
        <div class="snippet-detail-drawer__code-body">
          <MonacoCodeEditor
            :model-value="activeCode"
            :language="activeLanguage"
            read-only
            :show-line-numbers="snippet.displayAttrs.lineNumbers"
            :word-wrap="isCompact ? true : snippet.displayAttrs.wrap"
            min-height="100%"
            max-height="100%"
          />
        </div>
        <div class="snippet-detail-drawer__code-info">
          <span
            >{{ lineCount }} 行<span v-if="hasFiles"> · {{ activeFile?.name }}</span></span
          >
        </div>
      </div>

      <div class="snippet-detail-drawer__footer">
        <div class="snippet-detail-drawer__footer-left">
          <div v-if="snippet.tags.length > 0" class="snippet-detail-drawer__tags">
            <el-tag v-for="tag in snippet.tags" :key="tag" size="small" effect="plain" class="snippet-detail-drawer__tag">
              #{{ tag }}
            </el-tag>
          </div>
          <AppButton variant="primary" size="small" @click="emit('copy', snippet, activeCode)">
            <AppIcon icon="ms:content_copy" :size="15" />
            复制代码
          </AppButton>
          <AppButton
            v-if="isHtml"
            variant="glass"
            size="small"
            @click="openPreviewWindow"
          >
            <AppIcon icon="ms:open_in_new" :size="15" />
            预览
          </AppButton>
        </div>
        <span class="snippet-detail-drawer__updated">
          <AppIcon icon="ms:schedule" :size="12" />
          更新 {{ formatDateTime(snippet.updatedAt) }}
        </span>
      </div>
    </div>

    <div v-else class="detail-pane__empty">
      <AppIcon icon="ms:description" :size="28" />
      <p>从左侧列表选择片段以查看详情</p>
    </div>
  </aside>
</template>

<style scoped>
.detail-pane {
  display: flex;
  height: 100%;
  min-height: 0;
  width: 100%;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border-glass);
}

.detail-pane__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.detail-pane__empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgb(var(--color-text-secondary-rgb));
  font-size: 13px;
}

.snippet-detail-drawer__head {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--color-border-glass);
}

.snippet-detail-drawer__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.snippet-detail-drawer__lang {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgb(var(--color-primary-rgb) / 0.12);
  color: rgb(var(--color-primary-rgb));
  font-size: 12px;
}

.snippet-detail-drawer__name {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 600;
}

.snippet-detail-drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
}

.snippet-detail-drawer__close:hover {
  background: rgb(var(--color-surface-glass-rgb) / 0.6);
  color: rgb(var(--color-text-rgb));
}

.snippet-detail-drawer__desc {
  margin-top: 6px;
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
}

.snippet-detail-drawer__code {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.snippet-detail-drawer__tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px 0;
}

.snippet-detail-drawer__tab {
  padding: 5px 12px;
  border: 1px solid var(--color-border-glass);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  background: rgb(var(--color-surface-rgb) / 0.5);
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
}

.snippet-detail-drawer__tab.is-active {
  background: rgb(var(--color-primary-rgb) / 0.1);
  color: rgb(var(--color-primary-rgb));
}

.snippet-detail-drawer__code-body {
  flex: 1;
  min-height: 0;
}

.snippet-detail-drawer__code-info {
  padding: 6px 12px;
  border-top: 1px solid var(--color-border-glass);
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
}

.snippet-detail-drawer__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 16px;
  border-top: 1px solid var(--color-border-glass);
}

.snippet-detail-drawer__footer-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.snippet-detail-drawer__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.snippet-detail-drawer__tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgb(var(--color-surface-glass-rgb) / 0.7);
  font-size: 11px;
  color: rgb(var(--color-text-secondary-rgb));
}

.snippet-detail-drawer__updated {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  font-size: 12px;
  color: rgb(var(--color-text-secondary-rgb));
}
</style>
