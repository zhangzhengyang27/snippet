<script setup lang="ts">
/** 代码片段详情抽屉：右侧滑出，展示片段详情与快捷操作。 */
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import MonacoCodeEditor from '@/components/common/code/MonacoCodeEditor.vue'
import type { KnowledgeSnippet, SnippetFile } from '@/types/knowledge-snippet'
import { snippetDifficultyLabel, type SnippetDifficulty } from '@/types/code-block'

const props = defineProps<{
  open: boolean
  snippet: KnowledgeSnippet | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  copy: [snippet: KnowledgeSnippet, text?: string]
  toggleFavorite: [snippet: KnowledgeSnippet]
  edit: [snippet: KnowledgeSnippet]
  delete: [snippet: KnowledgeSnippet]
}>()

// 多文件片段：以 tab 形式切换展示，默认停留在首个文件
const activeFileIndex = ref(0)
const snippetFiles = computed<SnippetFile[]>(() => props.snippet?.displayAttrs?.files ?? [])
const hasFiles = computed(() => snippetFiles.value.length > 0)
const activeFile = computed<SnippetFile | null>(
  () => snippetFiles.value[activeFileIndex.value] ?? null
)
const activeCode = computed(() =>
  hasFiles.value ? (activeFile.value?.code ?? '') : (props.snippet?.content ?? '')
)
const activeLanguage = computed(() =>
  hasFiles.value ? (activeFile.value?.language ?? 'text') : (props.snippet?.language ?? 'text')
)
const lineCount = computed(() => activeCode.value.split('\n').length)

// 难度档位：未标注时 difficultyValue 为空串，模板据此省略徽章
const difficultyValue = computed<SnippetDifficulty | ''>(
  () => props.snippet?.displayAttrs?.difficulty ?? ''
)
const difficultyText = computed(() => snippetDifficultyLabel(difficultyValue.value))

const selectTab = (index: number) => {
  activeFileIndex.value = index
}

// 切换不同片段时重置 tab，避免上一个片段的选中下标越界
watch(
  () => props.snippet?.id,
  () => {
    activeFileIndex.value = 0
  }
)

const formatDateTime = (value: string | null) => {
  if (!value) return '暂无'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

const handleClose = () => {
  emit('update:open', false)
}
</script>

<template>
  <el-drawer
    :model-value="props.open"
    direction="rtl"
    :size="720"
    :destroy-on-close="true"
    :close-on-click-modal="true"
    :show-close="false"
    class="snippet-detail-drawer-root"
    @update:model-value="handleClose"
  >
    <div v-if="props.snippet" class="snippet-detail-drawer">
      <!-- 头部信息区 -->
      <div class="snippet-detail-drawer__header">
        <div class="snippet-detail-drawer__title-row">
          <div class="snippet-detail-drawer__title-area">
            <h2 class="snippet-detail-drawer__title">{{ props.snippet.name }}</h2>
            <p v-if="props.snippet.description" class="snippet-detail-drawer__description">
              {{ props.snippet.description }}
            </p>
          </div>
          <button
            type="button"
            class="snippet-detail-drawer__close"
            aria-label="关闭"
            @click="handleClose"
          >
            <AppIcon icon="ms:close" :size="20" />
          </button>
        </div>

        <div class="snippet-detail-drawer__meta-row">
          <span class="snippet-detail-drawer__meta snippet-detail-drawer__meta--lang">
            <span class="snippet-detail-drawer__lang-dot" />
            {{ props.snippet.language }}
          </span>
          <span v-if="difficultyValue" class="snippet-diff-badge" :class="`is-${difficultyValue}`">
            {{ difficultyText }}
          </span>
          <span v-if="props.snippet.collectionName" class="snippet-detail-drawer__meta">
            <AppIcon icon="ms:folder" :size="12" />
            {{ props.snippet.collectionName }}
          </span>
          <span v-if="props.snippet.isPublic" class="snippet-detail-drawer__meta">
            <AppIcon icon="ms:public" :size="12" />
            公共
          </span>
          <span class="snippet-detail-drawer__meta">
            <AppIcon icon="ms:play_arrow" :size="12" />
            使用 {{ props.snippet.usageCount }} 次
          </span>
        </div>

        <div v-if="!props.snippet.isPublic" class="snippet-detail-drawer__actions">
          <AppButton
            variant="glass"
            size="small"
            :class="props.snippet.favorite ? 'text-warning' : ''"
            @click="emit('toggleFavorite', props.snippet)"
          >
            <AppIcon :icon="props.snippet.favorite ? 'ms:star' : 'ms:star_outline'" :size="15" />
            {{ props.snippet.favorite ? '取消收藏' : '收藏' }}
          </AppButton>
          <AppButton variant="glass" size="small" @click="emit('edit', props.snippet)">
            <AppIcon icon="ms:edit" :size="15" />
            编辑
          </AppButton>
          <AppButton variant="glass" size="small" danger @click="emit('delete', props.snippet)">
            <AppIcon icon="ms:delete" :size="15" />
            删除
          </AppButton>
        </div>
      </div>

      <!-- 代码内容区 -->
      <div class="snippet-detail-drawer__code">
        <div v-if="hasFiles" class="snippet-detail-drawer__tabs">
          <button
            v-for="(file, index) in snippetFiles"
            :key="file.name"
            type="button"
            class="snippet-detail-drawer__tab"
            :class="{ 'is-active': index === activeFileIndex }"
            @click="selectTab(index)"
          >
            {{ file.name }}
          </button>
        </div>
        <div class="snippet-detail-drawer__code-body">
          <MonacoCodeEditor
            :model-value="activeCode"
            :language="activeLanguage"
            read-only
            :show-line-numbers="props.snippet.displayAttrs.lineNumbers"
            :word-wrap="props.snippet.displayAttrs.wrap"
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

      <!-- 底部元数据 -->
      <div class="snippet-detail-drawer__footer">
        <div class="snippet-detail-drawer__footer-left">
          <div v-if="props.snippet.tags.length > 0" class="snippet-detail-drawer__tags">
            <span v-for="tag in props.snippet.tags" :key="tag" class="snippet-detail-drawer__tag">
              #{{ tag }}
            </span>
          </div>
          <AppButton
            variant="primary"
            size="small"
            @click="emit('copy', props.snippet, activeCode)"
          >
            <AppIcon icon="ms:content_copy" :size="15" />
            复制代码
          </AppButton>
        </div>
        <span class="snippet-detail-drawer__updated">
          <AppIcon icon="ms:schedule" :size="12" />
          更新 {{ formatDateTime(props.snippet.updatedAt) }}
        </span>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.snippet-detail-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface);
}

/* ─── 头部 ─────────────────────────────────────────────────────────────── */
.snippet-detail-drawer__header {
  flex-shrink: 0;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--color-border-glass);
}

.snippet-detail-drawer__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.snippet-detail-drawer__title-area {
  flex: 1;
  min-width: 0;
}

.snippet-detail-drawer__title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: var(--text-headline-sm, 1.5rem);
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.25;
}

.snippet-detail-drawer__description {
  margin: 8px 0 0;
  font-size: var(--text-body-sm, 0.8125rem);
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.snippet-detail-drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    background 150ms ease,
    color 150ms ease;
  flex-shrink: 0;
}

.snippet-detail-drawer__close:hover {
  background: var(--color-surface-variant);
  color: var(--color-text);
}

.snippet-detail-drawer__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border-glass);
}

.snippet-detail-drawer__meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-code-sm, 0.75rem);
  color: var(--color-text-secondary);
}

.snippet-detail-drawer__meta--lang {
  color: var(--color-text);
  font-weight: 500;
}

.snippet-detail-drawer__lang-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
}

.snippet-detail-drawer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

/* ─── 代码区 ───────────────────────────────────────────────────────────── */
.snippet-detail-drawer__code {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.snippet-detail-drawer__code-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.snippet-detail-drawer__code-info {
  position: absolute;
  right: 16px;
  bottom: 8px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border-glass);
  font-family: var(--font-mono);
  font-size: var(--text-code-sm, 0.75rem);
  color: var(--color-text-secondary);
  pointer-events: none;
}

/* ─── 多文件 tab ──────────────────────────────────────────────────────── */
.snippet-detail-drawer__tabs {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px 16px 0;
  border-bottom: 1px solid var(--color-border-glass);
  background: var(--color-surface-variant);
}

.snippet-detail-drawer__tab {
  appearance: none;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-code-sm, 0.75rem);
  cursor: pointer;
  transition:
    background 150ms ease,
    color 150ms ease,
    border-color 150ms ease;
}

.snippet-detail-drawer__tab:hover {
  color: var(--color-text);
  background: var(--color-surface);
}

.snippet-detail-drawer__tab.is-active {
  color: var(--color-text);
  background: var(--color-surface);
  border-color: var(--color-border-glass);
  font-weight: 600;
}

/* ─── 底部 ─────────────────────────────────────────────────────────────── */
.snippet-detail-drawer__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  padding: 12px 24px;
  border-top: 1px solid var(--color-border-glass);
  background: var(--color-surface-variant);
}

.snippet-detail-drawer__footer-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  min-width: 0;
}

.snippet-detail-drawer__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.snippet-detail-drawer__tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border: 1px solid var(--color-border-glass);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--text-code-sm, 0.75rem);
  font-weight: 500;
}

.snippet-detail-drawer__updated {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: var(--text-code-sm, 0.75rem);
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .snippet-detail-drawer__header,
  .snippet-detail-drawer__footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .snippet-detail-drawer__footer,
  .snippet-detail-drawer__footer-left {
    flex-direction: column;
    align-items: flex-start;
  }

  .snippet-detail-drawer__code-info {
    right: 8px;
    bottom: 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .snippet-detail-drawer__close,
  .snippet-detail-drawer__tag {
    transition: none;
  }
}
</style>

<style>
/* el-drawer 全局样式覆盖（Drawer 挂载到 body，scoped 无法穿透） */
.snippet-detail-drawer-root .xy-drawer-content-wrapper {
  box-shadow: -8px 0 32px var(--color-shadow);
}

.snippet-detail-drawer-root .xy-drawer-content {
  background: var(--color-surface);
}

.snippet-detail-drawer-root .xy-drawer-body {
  padding: 0;
  height: 100%;
}

.snippet-detail-drawer-root .xy-drawer-wrapper-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 移动端：抽屉占满屏幕宽度 */
@media (max-width: 767px) {
  .snippet-detail-drawer-root .xy-drawer-content-wrapper {
    width: 100vw !important;
    max-width: 100vw !important;
  }
}
</style>
