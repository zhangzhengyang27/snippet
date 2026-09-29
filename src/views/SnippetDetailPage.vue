<script setup lang="ts">
/**
* 独立代码详情页（布局 2）
* 左侧文件树 + 中间卡片列表，点击后进入本页。
* 全屏展示片段代码，含返回导航、信息面板、收藏/复制/编辑/删除操作。
*/
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppModal from '@/components/common/AppModal.vue'
import MonacoCodeEditor from '@/components/common/code/MonacoCodeEditor.vue'
import { useToast } from '@/composables/useToast'
import { useRecentSnippets } from '@/composables/useRecentSnippets'
import {
 getKnowledgeSnippet,
 updateKnowledgeSnippet,
 deleteKnowledgeSnippet,
} from '@/api/knowledge-snippets'
import type { KnowledgeSnippet, SnippetFile } from '@/types/knowledge-snippet'
import { snippetDifficultyLabel, type SnippetDifficulty } from '@/types/code-block'
import { languageLabel, languageColor } from '@/utils/snippet-languages'
import { openSnippetPreviewWindow } from '@/utils/sandbox'

const route = useRoute()
const router = useRouter()
const { toast } = useToast()
const { pushRecent } = useRecentSnippets()

const snippet = ref<KnowledgeSnippet | null>(null)
const loading = ref(true)
const error = ref('')

const activeFileIndex = ref(0)
const snippetFiles = computed<SnippetFile[]>(() => snippet.value?.displayAttrs?.files ?? [])
const hasFiles = computed(() => snippetFiles.value.length > 0)
const activeFile = computed<SnippetFile | null>(
 () => snippetFiles.value[activeFileIndex.value] ?? null
)
const activeCode = computed(() =>
 hasFiles.value ? (activeFile.value?.code ?? '') : (snippet.value?.content ?? '')
)
const activeLanguage = computed(() =>
 hasFiles.value ? (activeFile.value?.language ?? 'text') : (snippet.value?.language ?? 'text')
)
const lineCount = computed(() => activeCode.value.split('\n').length)

// 难度档位：未标注时 difficultyValue 为空串，元数据区显示「未标注」
const difficultyValue = computed<SnippetDifficulty | ''>(
 () => snippet.value?.displayAttrs?.difficulty ?? ''
)
const difficultyText = computed(() => snippetDifficultyLabel(difficultyValue.value))

const favoriteBusy = ref(false)

function load(id: string) {
 loading.value = true
 error.value = ''
 snippet.value = null
 activeFileIndex.value = 0
 getKnowledgeSnippet(id)
   .then((data) => {
     snippet.value = data
     pushRecent(id)
   })
   .catch((err) => {
     error.value = err instanceof Error ? err.message : '加载片段失败'
   })
   .finally(() => {
     loading.value = false
   })
}

function goBack() {
 if (window.history.length > 1) router.back()
 else router.push('/snippets')
}

function goList() {
 router.push('/snippets')
}

function toggleFavorite() {
 const s = snippet.value
 if (!s || favoriteBusy.value) return
 favoriteBusy.value = true
 updateKnowledgeSnippet(s.id, { favorite: !s.favorite })
   .then(() => {
     snippet.value = { ...s, favorite: !s.favorite }
     toast.success(s.favorite ? '已取消收藏' : '已加入收藏')
   })
   .catch((err) => toast.error(err instanceof Error ? err.message : '操作失败'))
   .finally(() => {
     favoriteBusy.value = false
   })
}

function copyCode() {
 const s = snippet.value
 if (!s) return
 const text = activeCode.value || s.content || ''
 navigator.clipboard
   .writeText(text)
   .then(() => toast.success('已复制到剪贴板'))
   .catch(() => toast.error('复制失败'))
}

/* 预览：仅 HTML 片段可新标签页打开独立预览（blob URL，同示例库效果）。
  多文件片段预览当前激活 tab：HTML tab 直接预览该文件；非 HTML tab 不可预览。 */
const canPreview = computed(() => {
 if (snippet.value?.language !== 'html') return false
 if (!hasFiles.value) return true
 return activeFile.value?.language === 'html'
})
function openPreview() {
 const s = snippet.value
 if (!s || s.language !== 'html') return
 if (hasFiles.value && activeFile.value?.language !== 'html') return
 // 多文件片段：预览激活 tab 的 HTML 内容；单文件片段：预览 content
 const html = hasFiles.value ? (activeFile.value?.code ?? '') : s.content
 const files = hasFiles.value ? [] : (s.displayAttrs?.files ?? [])
 const ok = openSnippetPreviewWindow(html, files)
 if (!ok) toast.error('新窗口被浏览器拦截，请检查弹窗拦截设置')
}

/* 编辑：跳转到列表页打开编辑弹窗，通过 query 传递片段 id */
function editSnippet() {
 const s = snippet.value
 if (!s) return
 router.push({ path: '/snippets', query: { edit: s.id } })
}

/* 删除确认 */
const deleteOpen = ref(false)
const deleting = ref(false)
const askDelete = () => {
 deleteOpen.value = true
}
async function confirmDelete() {
 const s = snippet.value
 if (!s) return
 deleting.value = true
 try {
   await deleteKnowledgeSnippet(s.id)
   deleteOpen.value = false
   toast.success('片段已删除')
   router.replace('/snippets')
 } catch (err) {
   toast.error(err instanceof Error ? err.message : '删除失败')
 } finally {
   deleting.value = false
 }
}

const formatDateTime = (value: string | null) => {
 if (!value) return '—'
 return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

const langColor = computed(() =>
 snippet.value ? languageColor(snippet.value.language) : '#9e9e9e'
)

watch(
 () => route.params.id,
 (id) => {
   if (typeof id === 'string') load(id)
 },
 { immediate: true }
)
</script>

<template>
 <div class="snippet-detail">
   <!-- 顶部导航 -->
   <div class="snippet-detail__topbar">
     <div class="snippet-detail__crumb">
       <button class="snippet-detail__back" type="button" @click="goBack">
         <AppIcon icon="ms:arrow_back" :size="18" />
       </button>
       <button class="snippet-detail__crumb-link" type="button" @click="goList">代码块</button>
       <AppIcon icon="ms:chevron_right" :size="14" class="snippet-detail__crumb-sep" />
       <span v-if="snippet" class="snippet-detail__crumb-current">{{ snippet.name }}</span>
       <span v-else class="snippet-detail__crumb-current">详情</span>
     </div>

     <div v-if="snippet" class="snippet-detail__top-actions">
       <AppButton variant="glass" size="small" :loading="favoriteBusy" @click="toggleFavorite">
         <AppIcon :icon="snippet.favorite ? 'ms:star' : 'ms:star_outline'" :size="15" />
         {{ snippet.favorite ? '已收藏' : '收藏' }}
       </AppButton>
       <AppButton variant="glass" size="small" @click="copyCode">
         <AppIcon icon="ms:content_copy" :size="15" />
         复制
       </AppButton>
       <AppButton v-if="!snippet.isPublic" variant="glass" size="small" @click="editSnippet">
         <AppIcon icon="ms:edit" :size="15" />
         编辑
       </AppButton>
       <AppButton v-if="canPreview" variant="glass" size="small" @click="openPreview">
         <AppIcon icon="ms:open_in_new" :size="15" />
         预览
       </AppButton>
       <AppButton v-if="!snippet.isPublic" variant="glass" size="small" danger @click="askDelete">
         <AppIcon icon="ms:delete" :size="15" />
         删除
       </AppButton>
     </div>
   </div>

   <div v-if="loading" class="snippet-detail__state">
     <span class="snippet-detail__spinner" />
     加载中…
   </div>

   <div v-else-if="error" class="snippet-detail__state">
     <AppIcon icon="ms:error" :size="28" class="snippet-detail__state-icon" />
     <p>{{ error }}</p>
     <AppButton variant="primary" size="small" @click="goList">返回列表</AppButton>
   </div>

   <template v-else-if="snippet">
     <!-- 主体：代码区 + 信息面板 -->
     <div class="snippet-detail__main">
       <!-- 代码区 -->
       <section class="snippet-detail__code">
         <div class="snippet-detail__code-header">
           <div v-if="hasFiles" class="snippet-detail__file-tabs">
             <button
               v-for="(file, index) in snippetFiles"
               :key="file.name"
               type="button"
               class="snippet-detail__file-tab"
               :class="{ 'is-active': index === activeFileIndex }"
               @click="activeFileIndex = index"
             >
               {{ file.name }}
             </button>
           </div>
           <div v-else class="snippet-detail__file-title">
             <i class="snippet-detail__file-dot" :style="{ background: langColor }" />
             {{ languageLabel(snippet.language) }}
           </div>
         </div>

         <div class="snippet-detail__code-body">
           <MonacoCodeEditor
             :model-value="activeCode"
             :language="activeLanguage"
             read-only
             :show-line-numbers="snippet.displayAttrs.lineNumbers"
             :word-wrap="snippet.displayAttrs.wrap"
             min-height="100%"
             max-height="100%"
             :font-size="13"
           />
         </div>

         <div class="snippet-detail__code-status">
           <span>{{ lineCount }} 行</span>
           <span v-if="hasFiles && activeFile">· {{ activeFile.name }}</span>
         </div>
       </section>

       <!-- 信息面板 -->
       <aside class="snippet-detail__info">
         <div class="snippet-detail__info-header">
           <h1 class="snippet-detail__name">{{ snippet.name }}</h1>
           <p v-if="snippet.description" class="snippet-detail__desc">{{ snippet.description }}</p>
         </div>

         <!-- 元数据 -->
         <dl class="snippet-detail__meta">
           <div class="snippet-detail__meta-row">
             <dt>语言</dt>
             <dd>
               <i class="snippet-detail__lang-dot" :style="{ background: langColor }" />
               {{ languageLabel(snippet.language) }}
             </dd>
           </div>
           <div class="snippet-detail__meta-row">
             <dt>难度</dt>
             <dd>
               <span
                 v-if="difficultyValue"
                 class="snippet-diff-badge"
                 :class="`is-${difficultyValue}`"
               >
                 {{ difficultyText }}
               </span>
               <span v-else>未标注</span>
             </dd>
           </div>
           <div class="snippet-detail__meta-row">
             <dt>集合</dt>
             <dd>{{ snippet.collectionName || '未分组' }}</dd>
           </div>
           <div class="snippet-detail__meta-row">
             <dt>使用次数</dt>
             <dd>{{ snippet.usageCount }} 次</dd>
           </div>
           <div class="snippet-detail__meta-row">
             <dt>可见性</dt>
             <dd>{{ snippet.isPublic ? '公共' : '私有' }}</dd>
           </div>
           <div class="snippet-detail__meta-row">
             <dt>创建时间</dt>
             <dd>{{ formatDateTime(snippet.createdAt) }}</dd>
           </div>
           <div class="snippet-detail__meta-row">
             <dt>更新时间</dt>
             <dd>{{ formatDateTime(snippet.updatedAt) }}</dd>
           </div>
           <div class="snippet-detail__meta-row">
             <dt>上次使用</dt>
             <dd>{{ formatDateTime(snippet.lastUsedAt) }}</dd>
           </div>
         </dl>

         <!-- 标签 -->
         <div v-if="snippet.tags.length" class="snippet-detail__tags">
           <span class="snippet-detail__tags-label">标签</span>
           <div class="snippet-detail__tags-list">
             <span v-for="tag in snippet.tags" :key="tag" class="snippet-detail__tag">
               #{{ tag }}
             </span>
           </div>
         </div>

         <!-- 复制按钮 -->
         <AppButton variant="primary" class="snippet-detail__copy" @click="copyCode">
           <AppIcon icon="ms:content_copy" :size="16" />
           复制全部代码
         </AppButton>
       </aside>
     </div>
   </template>

   <!-- 删除确认 -->
   <AppModal v-model:open="deleteOpen" title="删除片段" :width="420" :footer="null">
     <p class="snippet-detail__delete-text">确认删除「{{ snippet?.name }}」？该操作不可恢复。</p>
     <template #footer>
       <div class="snippet-detail__delete-actions">
         <AppButton variant="glass" @click="deleteOpen = false">取消</AppButton>
         <AppButton variant="primary" danger :loading="deleting" @click="confirmDelete">
           删除
         </AppButton>
       </div>
     </template>
   </AppModal>
 </div>
</template>

<style scoped>
.snippet-detail {
 display: flex;
 flex-direction: column;
 min-height: 0;
 width: 100%;
 flex: 1;
 min-width: 0;
}

/* 顶部导航 */
.snippet-detail__topbar {
 display: flex;
 align-items: center;
 justify-content: space-between;
 gap: 16px;
 flex-wrap: wrap;
 padding: 12px 20px;
 border-bottom: 1px solid rgb(var(--color-border-rgb));
 background: rgb(var(--color-bg-rgb) / 0.7);
 backdrop-filter: blur(12px);
}

.snippet-detail__crumb {
 display: flex;
 align-items: center;
 gap: 4px;
 min-width: 0;
}

.snippet-detail__back {
 display: inline-flex;
 align-items: center;
 justify-content: center;
 width: 30px;
 height: 30px;
 margin-right: 4px;
 border: none;
 border-radius: var(--radius-sm);
 background: transparent;
 color: rgb(var(--color-text-secondary-rgb));
 cursor: pointer;
 transition:
   background var(--duration-fast) var(--ease-standard),
   color var(--duration-fast) var(--ease-standard);
}

.snippet-detail__back:hover {
 background: rgb(var(--color-surface-hover-rgb));
 color: rgb(var(--color-text-rgb));
}

.snippet-detail__crumb-link {
 appearance: none;
 border: none;
 background: transparent;
 padding: 4px 6px;
 border-radius: var(--radius-sm);
 color: rgb(var(--color-text-secondary-rgb));
 font-size: 0.8125rem;
 cursor: pointer;
}

.snippet-detail__crumb-link:hover {
 color: rgb(var(--color-brand-rgb));
 background: rgb(var(--color-brand-rgb) / 0.08);
}

.snippet-detail__crumb-sep {
 color: rgb(var(--color-text-tertiary-rgb));
}

.snippet-detail__crumb-current {
 font-size: 0.8125rem;
 font-weight: 600;
 color: rgb(var(--color-text-rgb));
 white-space: nowrap;
 overflow: hidden;
 text-overflow: ellipsis;
 max-width: 320px;
}

.snippet-detail__top-actions {
 display: flex;
 align-items: center;
 gap: 8px;
 flex-shrink: 0;
}

/* 加载 / 错误状态 */
.snippet-detail__state {
 display: flex;
 flex-direction: column;
 align-items: center;
 justify-content: center;
 gap: 12px;
 padding: 60px 20px;
 color: rgb(var(--color-text-secondary-rgb));
 font-size: 0.875rem;
}

.snippet-detail__state p {
 margin: 0;
}

.snippet-detail__state-icon {
 color: rgb(var(--color-error-rgb));
}

.snippet-detail__spinner {
 width: 20px;
 height: 20px;
 border-radius: 50%;
 border: 2px solid rgb(var(--color-brand-rgb) / 0.2);
 border-top-color: rgb(var(--color-brand-rgb));
 animation: sd-spin 0.8s linear infinite;
}

@keyframes sd-spin {
 to {
   transform: rotate(360deg);
 }
}

/* 主体 */
.snippet-detail__main {
 display: flex;
 flex: 1;
 min-height: 0;
 width: 100%;
}

/* 代码区 */
.snippet-detail__code {
 display: flex;
 flex-direction: column;
 flex: 1;
 min-width: 0;
 min-height: 0;
 background: rgb(var(--color-surface-bright-rgb));
}

.snippet-detail__code-header {
 flex-shrink: 0;
 display: flex;
 align-items: center;
 gap: 12px;
 padding: 0 16px;
 height: 40px;
 border-bottom: 1px solid rgb(var(--color-border-rgb));
 background: rgb(var(--color-surface-rgb));
 overflow-x: auto;
 scrollbar-width: none;
}

.snippet-detail__code-header::-webkit-scrollbar {
 display: none;
}

.snippet-detail__file-tabs {
 display: flex;
 align-items: stretch;
 gap: 2px;
 height: 100%;
}

.snippet-detail__file-tab {
 appearance: none;
 display: inline-flex;
 align-items: center;
 padding: 0 14px;
 border: none;
 border-bottom: 2px solid transparent;
 background: transparent;
 color: rgb(var(--color-text-secondary-rgb));
 font-family: var(--font-mono);
 font-size: 0.75rem;
 cursor: pointer;
 white-space: nowrap;
 transition: color var(--duration-fast) var(--ease-standard);
}

.snippet-detail__file-tab:hover {
 color: rgb(var(--color-text-rgb));
}

.snippet-detail__file-tab.is-active {
 color: rgb(var(--color-brand-rgb));
 border-bottom-color: rgb(var(--color-brand-rgb));
 font-weight: 600;
}

.snippet-detail__file-title {
 display: inline-flex;
 align-items: center;
 gap: 7px;
 font-size: 0.75rem;
 font-weight: 600;
 color: rgb(var(--color-text-secondary-rgb));
}

.snippet-detail__file-dot,
.snippet-detail__lang-dot {
 width: 8px;
 height: 8px;
 border-radius: 50%;
 flex-shrink: 0;
}

.snippet-detail__code-body {
 flex: 1;
 min-height: 0;
 overflow: hidden;
}

.snippet-detail__code-status {
 flex-shrink: 0;
 display: flex;
 align-items: center;
 gap: 6px;
 padding: 4px 16px;
 font-family: var(--font-mono);
 font-size: 0.7rem;
 color: rgb(var(--color-text-tertiary-rgb));
 border-top: 1px solid rgb(var(--color-border-rgb));
}

/* 信息面板 */
.snippet-detail__info {
 display: flex;
 flex-direction: column;
 gap: 24px;
 width: 300px;
 flex-shrink: 0;
 min-height: 0;
 overflow-y: auto;
 padding: 24px;
 border-left: 1px solid rgb(var(--color-border-rgb));
 background: rgb(var(--color-bg-elevated-rgb));
}

.snippet-detail__info-header {
 padding-bottom: 20px;
 border-bottom: 1px solid rgb(var(--color-border-rgb));
}

.snippet-detail__name {
 margin: 0;
 font-family: var(--font-heading);
 font-size: 1.375rem;
 font-weight: 700;
 letter-spacing: -0.02em;
 color: rgb(var(--color-text-rgb));
 line-height: 1.35;
 word-break: break-word;
}

.snippet-detail__desc {
 margin: 10px 0 0;
 font-size: 0.8125rem;
 line-height: 1.7;
 color: rgb(var(--color-text-secondary-rgb));
 word-break: break-word;
}

.snippet-detail__meta {
 margin: 0;
}

.snippet-detail__meta-row {
 display: flex;
 align-items: flex-start;
 justify-content: space-between;
 gap: 12px;
 padding: 8px 0;
 border-bottom: 1px dashed rgb(var(--color-border-rgb));
}

.snippet-detail__meta-row dt {
 flex-shrink: 0;
 font-size: 0.75rem;
 color: rgb(var(--color-text-tertiary-rgb));
}

.snippet-detail__meta-row dd {
 margin: 0;
 font-size: 0.75rem;
 color: rgb(var(--color-text-rgb));
 text-align: right;
 word-break: break-word;
}

.snippet-detail__tags {
 display: flex;
 flex-direction: column;
 gap: 8px;
}

.snippet-detail__tags-label {
 font-size: 0.75rem;
 color: rgb(var(--color-text-tertiary-rgb));
}

.snippet-detail__tags-list {
 display: flex;
 flex-wrap: wrap;
 gap: 6px;
}

.snippet-detail__tag {
 display: inline-flex;
 align-items: center;
 padding: 3px 9px;
 border: 1px solid rgb(var(--color-border-rgb));
 border-radius: var(--radius-sm);
 background: rgb(var(--color-surface-rgb));
 color: rgb(var(--color-text-secondary-rgb));
 font-size: 0.75rem;
 font-weight: 500;
}

.snippet-detail__copy {
 width: 100%;
}

.snippet-detail__delete-text {
 margin: 0;
 font-size: 0.875rem;
 line-height: 1.6;
 color: rgb(var(--color-text-secondary-rgb));
}

.snippet-detail__delete-actions {
 display: flex;
 justify-content: flex-end;
 gap: 10px;
 width: 100%;
}

@media (max-width: 900px) {
 .snippet-detail__main {
   flex-direction: column;
 }

 .snippet-detail__info {
   width: 100%;
   max-height: 40vh;
   border-left: none;
   border-top: 1px solid rgb(var(--color-border-rgb));
 }
}

@media (max-width: 640px) {
 .snippet-detail__topbar {
   padding: 10px 12px;
   gap: 10px;
 }
}
</style>
