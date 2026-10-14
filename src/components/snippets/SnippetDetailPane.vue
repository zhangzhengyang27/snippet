<script setup lang="ts">
/**
 * 片段详情侧栏（SnippetWorkspace 的 #detail 插槽内容）：
 * 头部元信息 + 多文件 tab 代码区 + 标签/操作底栏。
 * 移动端由外层 Bottom Sheet 承载，本组件只负责内容。
 */
import { computed, ref, watch } from 'vue'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'
import ShikiCodeBlock from '@/components/common/code/ShikiCodeBlock.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { formatDateTime } from '@/utils/date-format'
import { languageLabel } from '@/utils/snippet-languages'

interface Props {
  /** 面板是否处于激活状态（移动端 Bottom Sheet 展开态） */
  active?: boolean
  /** 当前选中的片段；为空时展示空态占位 */
  snippet?: KnowledgeSnippet | null
  /**
   * 只读浏览模式（公共代码块库 `/library`）。
   *
   * ⚠️ 不能用 `snippet.isPublic` 代替：作者**自己发布的**片段 isPublic 也是 true，
   * 但它在个人工作区里应当仍然可编辑 / 可下架。视图语义来自路由（页面作用域），
   * 与片段自身的公开状态是两件事。
   */
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  snippet: null,
  readonly: false,
})

const emit = defineEmits<{
  close: []
  copy: [snippet: KnowledgeSnippet, code: string]
  'toggle-favorite': [snippet: KnowledgeSnippet]
  edit: [snippet: KnowledgeSnippet]
  delete: [snippet: KnowledgeSnippet]
  /** 公共代码块库：把该片段复制进当前用户的代码块库 */
  copyToMine: [snippet: KnowledgeSnippet]
  /** 提交发布到公共代码块库（个人工作区，作者侧） */
  publish: [snippet: KnowledgeSnippet]
  /** 撤回待审 / 下架已发布 */
  'withdraw-publication': [snippet: KnowledgeSnippet]
}>()

/** 发布流程状态（缺省视为私有未提交） */
const moderationStatus = computed(() => props.snippet?.moderationStatus ?? 'none')


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

</script>

<template>
  <aside class="detail-pane">
    <div v-if="snippet" class="detail-pane__body">
      <div class="snippet-detail-drawer__head">
        <div class="snippet-detail-drawer__head-main">
          <div class="snippet-detail-drawer__title-row">
            <span class="snippet-detail-drawer__lang">{{ languageLabel(snippet.language) }}</span>
            <h2 class="snippet-detail-drawer__name" :title="snippet.name">{{ snippet.name }}</h2>
            <!--
              操作组：收藏 / 编辑 / 删除。
              这三个 emit 此前一直存在、父组件也绑了 handler，但模板里没有任何触发点，
              导致默认分屏视图下片段完全无法编辑（只能切到独立页）。与 SnippetDetailPage
              保持一致：收藏对所有片段开放，编辑/删除只对自有（非公共）片段开放。
            -->
            <div class="snippet-detail-drawer__actions">
              <button
                type="button"
                class="snippet-detail-drawer__action"
                :class="{ 'is-active': snippet.favorite }"
                :title="snippet.favorite ? '取消收藏' : '收藏'"
                :aria-label="snippet.favorite ? '取消收藏' : '收藏'"
                @click="emit('toggle-favorite', snippet)"
              >
                <AppIcon
                  :icon="snippet.favorite ? 'material-symbols:star' : 'material-symbols:star-outline'"
                  :size="15"
                />
              </button>
              <button
                v-if="!readonly"
                type="button"
                class="snippet-detail-drawer__action"
                title="编辑"
                aria-label="编辑"
                @click="emit('edit', snippet)"
              >
                <AppIcon icon="material-symbols:edit" :size="15" />
              </button>
              <button
                v-if="!readonly"
                type="button"
                class="snippet-detail-drawer__action snippet-detail-drawer__action--danger"
                title="删除"
                aria-label="删除"
                @click="emit('delete', snippet)"
              >
                <AppIcon icon="material-symbols:delete" :size="15" />
              </button>
              <!-- 公共代码块库里的唯一写操作：复制一份进自己的代码块库（公共片段本身只读） -->
              <button
                v-if="readonly"
                type="button"
                class="snippet-detail-drawer__action"
                title="复制到我的代码块"
                aria-label="复制到我的代码块"
                @click="emit('copyToMine', snippet)"
              >
                <AppIcon icon="material-symbols:library-add" :size="15" />
              </button>
              <button
                type="button"
                class="snippet-detail-drawer__close"
                aria-label="关闭详情"
                @click="emit('close')"
              >
                <AppIcon icon="material-symbols:close" :size="16" />
              </button>
            </div>
          </div>
          <p v-if="snippet.description" class="snippet-detail-drawer__desc">
            {{ snippet.description }}
          </p>
          <!--
            发布状态条（仅个人工作区展示）。
            让作者一眼看到自己的片段处于发布流程的哪一步 —— 未提交 / 审核中 / 已发布 / 未通过，
            并在同一处给出下一步动作，避免去别处找入口。
          -->
          <div
            v-if="!readonly"
            class="snippet-detail-drawer__publication"
            :class="`is-${moderationStatus}`"
          >
            <template v-if="moderationStatus === 'pending'">
              <AppIcon icon="material-symbols:hourglass-top" :size="14" />
              <span class="snippet-detail-drawer__pub-text">审核中 · 通过后将出现在公共代码块库</span>
              <button
                type="button"
                class="snippet-detail-drawer__pub-btn"
                @click="emit('withdraw-publication', snippet)"
              >
                撤回
              </button>
            </template>
            <template v-else-if="moderationStatus === 'approved'">
              <AppIcon icon="material-symbols:public" :size="14" />
              <span class="snippet-detail-drawer__pub-text">已发布到公共代码块库</span>
              <button
                type="button"
                class="snippet-detail-drawer__pub-btn"
                @click="emit('withdraw-publication', snippet)"
              >
                下架
              </button>
            </template>
            <template v-else-if="moderationStatus === 'rejected'">
              <AppIcon icon="material-symbols:error-outline" :size="14" />
              <span class="snippet-detail-drawer__pub-text" :title="snippet.moderationNote ?? ''">
                审核未通过{{ snippet.moderationNote ? `：${snippet.moderationNote}` : '' }}
              </span>
              <button
                type="button"
                class="snippet-detail-drawer__pub-btn"
                @click="emit('publish', snippet)"
              >
                重新提交
              </button>
            </template>
            <template v-else>
              <AppIcon icon="material-symbols:cloud-upload" :size="14" />
              <span class="snippet-detail-drawer__pub-text">仅自己可见</span>
              <button
                type="button"
                class="snippet-detail-drawer__pub-btn"
                @click="emit('publish', snippet)"
              >
                发布到公共库
              </button>
            </template>
          </div>
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
          <ShikiCodeBlock
            :code="activeCode"
            :language="activeLanguage"
            :show-line-numbers="snippet.displayAttrs.lineNumbers"
            :word-wrap="snippet.displayAttrs.wrap"
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
            <AppIcon icon="material-symbols:content-copy" :size="15" />
            复制代码
          </AppButton>
          <AppButton
            v-if="isHtml"
            variant="glass"
            size="small"
            @click="openPreviewWindow"
          >
            <AppIcon icon="material-symbols:open-in-new" :size="15" />
            预览
          </AppButton>
        </div>
        <span class="snippet-detail-drawer__updated">
          <AppIcon icon="material-symbols:schedule" :size="12" />
          更新 {{ formatDateTime(snippet.updatedAt) }}
        </span>
      </div>
    </div>

    <div v-else class="detail-pane__empty">
      <AppIcon icon="material-symbols:description" :size="28" />
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
  gap: 12px;
  color: rgb(var(--color-text-secondary-rgb));
  font-size: var(--text-xs);
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

/* 操作组：收藏 / 编辑 / 删除 / 关闭 */
.snippet-detail-drawer__actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: none;
}

.snippet-detail-drawer__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
  transition:
    background 150ms ease,
    color 150ms ease;
}

.snippet-detail-drawer__action:hover {
  background: rgb(var(--color-surface-glass-rgb) / 0.6);
  color: rgb(var(--color-text-rgb));
}

.snippet-detail-drawer__action.is-active {
  color: rgb(var(--color-warning-rgb));
}

.snippet-detail-drawer__action--danger:hover {
  background: rgb(var(--color-error-rgb) / 0.12);
  color: rgb(var(--color-error-rgb));
}

/* 发布状态条：未提交 / 审核中 / 已发布 / 未通过 四态各用一套语义色 */
.snippet-detail-drawer__publication {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: var(--text-xs);
  background: rgb(var(--color-surface-glass-rgb) / 0.6);
  color: rgb(var(--color-text-secondary-rgb));
}

.snippet-detail-drawer__publication.is-pending {
  background: rgb(var(--color-warning-rgb) / 0.12);
  color: rgb(var(--color-warning-rgb));
}

.snippet-detail-drawer__publication.is-approved {
  background: rgb(var(--color-success-rgb) / 0.12);
  color: rgb(var(--color-success-rgb));
}

.snippet-detail-drawer__publication.is-rejected {
  background: rgb(var(--color-error-rgb) / 0.12);
  color: rgb(var(--color-error-rgb));
}

.snippet-detail-drawer__pub-text {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.snippet-detail-drawer__pub-btn {
  flex: none;
  padding: 2px 10px;
  border: 1px solid currentColor;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font-size: inherit;
  line-height: 1.6;
  cursor: pointer;
  transition: background 150ms ease;
}

.snippet-detail-drawer__pub-btn:hover {
  background: rgb(var(--color-surface-glass-rgb) / 0.5);
}

.snippet-detail-drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
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
  gap: 12px;
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
