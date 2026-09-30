<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import { getExampleById } from '@/api/examples'
import { ApiError } from '@/api/client'
import type { CodeExample, CodeTab, ExampleSnippet } from '@/types'
import type { Snippet } from '@/utils/sandbox'
import PreviewPane from '@/components/examples/PreviewPane.vue'
import SourcePane from '@/components/examples/SourcePane.vue'
import ShareButton from '@/components/common/ShareButton.vue'
import FavoriteButton from '@/components/common/FavoriteButton.vue'
import DownloadButton from '@/components/common/DownloadButton.vue'
import EmptyState from '@/components/layout/EmptyState.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import { useResourceFetch } from '@/composables/useResourceFetch'
import { useRecentExamples } from '@/composables/useRecentExamples'
import { useToast } from '@/composables/useToast'
import { createKnowledgeSnippet } from '@/api/knowledge-snippets'
import { isTypingTarget } from '@/utils/keyboard'

const route = useRoute()
const router = useRouter()
const { addRecentExample } = useRecentExamples()

const previewPaneRef = ref<InstanceType<typeof PreviewPane> | null>(null)

const liveExample = ref<CodeExample | null>(null)

const exampleId = computed(() => route.params.id as string)

// useResourceFetch 内置 AbortController + requestId 竞态保护，替代手写 loadRequestId
const {
 data: example,
 loading,
 error,
 refresh,
} = useResourceFetch<CodeExample | null>(
 async () => {
   try {
     return await getExampleById(exampleId.value)
   } catch (e) {
     // 404 视为 not-found（data=null），其他错误向上抛出由 error 接收
     if (e instanceof ApiError && e.status === 404) return null
     throw e
   }
 },
 {
   onSuccess: (data) => {
     liveExample.value = data ? { ...data } : null
     if (data) addRecentExample(exampleId.value)
   },
   watch: () => exampleId.value,
 }
)

// 合并变体：通过片段选择器切换查看同一示例的不同变体（snippets）
const activeSnippetIndex = ref(0)
const snippets = computed<ExampleSnippet[]>(() => example.value?.snippets ?? [])
const activeSnippet = computed<Snippet | undefined>(() =>
 snippets.value.length ? snippets.value[activeSnippetIndex.value] : undefined
)

function selectSnippet(index: number) {
 activeSnippetIndex.value = index
}

function handleCodeChange(tab: CodeTab, code: string) {
 if (!liveExample.value) return
 // unified 模式下编辑的是合并后的完整文档，需清空独立的 css/js 避免预览重复渲染
 if (tab === 'html' && (liveExample.value.css || liveExample.value.js)) {
   liveExample.value = {
     ...liveExample.value,
     html: code,
     css: undefined,
     js: undefined,
   }
   return
 }
 liveExample.value = {
   ...liveExample.value,
   [tab]: code,
 }
}

function handleSave(updated: CodeExample) {
 example.value = updated
 liveExample.value = { ...updated }
}

function goBack() {
 if (window.history.length > 1) {
   router.back()
 } else {
   const ex = example.value
   if (ex?.sourceGroup) {
     router.push({ name: 'example-library', query: { search: ex.sourceGroup ?? undefined } })
   } else {
     router.push({ name: 'dashboard' })
   }
 }
}

function goExamples() {
 const ex = example.value
 if (ex?.sourceGroup) {
   router.push({ name: 'example-library', query: { search: ex.sourceGroup ?? undefined } })
 } else {
   router.push({ name: 'example-library' })
 }
}

// 将当前示例导入为代码片段：优先取 js，否则 html，再否则 css
const importDialogOpen = ref(false)
const importName = ref('')
const importing = ref(false)
const { toast } = useToast()

const importableCode = computed(() => {
 const ex = liveExample.value
 if (!ex) return ''
 return ex.js?.trim() || ex.html?.trim() || ex.css?.trim() || ''
})
const importLanguage = computed(() => {
 const ex = liveExample.value
 if (!ex) return 'javascript'
 if (ex.js?.trim()) return 'javascript'
 if (ex.html?.trim()) return 'html'
 if (ex.css?.trim()) return 'css'
 return 'javascript'
})

function openImport() {
 if (!example.value) return
 importName.value = example.value.title
 importDialogOpen.value = true
}

async function confirmImport() {
 const code = importableCode.value
 if (!importName.value.trim() || !code) return
 importing.value = true
 try {
   const created = await createKnowledgeSnippet({
     name: importName.value.trim(),
     description: example.value?.description || '',
     language: importLanguage.value,
     content: code,
     collectionId: null,
   })
   importDialogOpen.value = false
   toast.success(`已导入为片段「${created.name}」`)
   // 跳转到代码块页并聚焦新建片段
   router.push(`/snippets?focus=${encodeURIComponent(created.id)}`)
 } catch (err) {
   toast.error(err instanceof Error ? err.message : '导入失败')
 } finally {
   importing.value = false
 }
}

function handleKeyDown(e: KeyboardEvent) {
 if (isTypingTarget(e)) return

 if (e.key === 'f' || e.key === 'F') {
   e.preventDefault()
   previewPaneRef.value?.toggleFullscreen()
 }
}

useEventListener(window, 'keydown', handleKeyDown)
</script>

<template>
 <div>
   <!-- ============================== Loading State ============================== -->
   <EmptyState v-if="loading && !example" type="loading" compact />

   <!-- ============================== Error State ============================== -->
   <EmptyState v-else-if="error" type="error" compact show-retry @retry="refresh" />

   <!-- ============================== 404 Not Found State ============================== -->
   <EmptyState
     v-else-if="!example"
     type="not-found"
     compact
     title="未找到示例"
     :description-html="`示例 <code>${exampleId}</code> 不存在或已被移除。`"
   >
     <template #action>
       <AppButton @click="goBack">
         <AppIcon icon="material-symbols:arrow-back" :size="16" />
         返回列表
       </AppButton>
     </template>
   </EmptyState>

   <!-- ============================== Detail Page ============================== -->
   <div v-else class="detail-page" >
     <!-- ============ 桌面 Header ============ -->
     <header class="detail-header">
       <nav class="detail-breadcrumb" aria-label="面包屑">
         <router-link to="/" class="detail-breadcrumb__link" aria-label="概览" @click.prevent="goBack">
           <AppIcon icon="material-symbols:home" :size="14" />
         </router-link>
         <span class="detail-breadcrumb__sep">/</span>
         <router-link to="/example" class="detail-breadcrumb__link" @click.prevent="goExamples">示例库</router-link>
         <span class="detail-breadcrumb__sep">/</span>
         <span class="detail-breadcrumb__current">{{ example.title }}</span>
       </nav>
       <div class="detail-actions">
         <FavoriteButton :example="example" />
         <ShareButton :example="example" />
         <DownloadButton :example="example" />
         <AppButton variant="glass" size="small" @click="openImport">
           <AppIcon icon="material-symbols:note-add" :size="16" />
           导入为片段
         </AppButton>
       </div>
     </header>

     <!-- ============ 桌面 Main Split ============ -->
     <section class="main-split">
       <div class="split-preview">
         <!-- 合并变体片段选择器：同一示例的多版本切换 -->
         <div v-if="snippets.length" class="snippet-tabs">
           <span class="snippet-tabs__label">变体</span>
           <button
             v-for="(snip, i) in snippets"
             :key="i"
             class="snippet-tabs__tab"
             :class="{ 'is-active': activeSnippetIndex === i }"
             @click="selectSnippet(i)"
           >
             {{ snip.label || '变体 ' + (i + 1) }}
           </button>
         </div>
         <PreviewPane
           ref="previewPaneRef"
           :example="liveExample ?? example"
           :active-snippet="activeSnippet"
         />
       </div>
       <div class="split-source">
         <SourcePane
           :example="example"
           :active-snippet="activeSnippet"
           unified
           @code-change="handleCodeChange"
           @save="handleSave"
         />
       </div>
     </section>

   </div>
 </div>

 <!-- 导入为片段确认弹窗 -->
 <AppModal v-model:open="importDialogOpen" title="导入为片段">
   <div class="import-form">
     <label class="import-form__field">
       <span class="import-form__label">名称</span>
       <input v-model="importName" class="import-form__input" type="text" />
     </label>
     <div class="import-form__field">
       <span class="import-form__label">语言</span>
       <span class="import-form__static">{{ importLanguage }}</span>
     </div>
     <div class="import-form__field">
       <span class="import-form__label">代码预览</span>
       <pre class="import-form__code">{{ importableCode }}</pre>
     </div>
   </div>
   <template #footer>
     <AppButton variant="text" @click="importDialogOpen = false">取消</AppButton>
     <AppButton variant="primary" :loading="importing" @click="confirmImport">导入</AppButton>
   </template>
 </AppModal>
</template>

<style scoped>
.snippet-tabs {
 display: flex;
 align-items: center;
 gap: var(--space-2);
 margin-bottom: var(--space-3);
 flex-wrap: wrap;
}

.snippet-tabs__label {
 font-family: var(--font-mono);
 font-size: 0.6875rem;
 font-weight: 600;
 letter-spacing: 0.04em;
 color: rgb(var(--color-text-secondary-rgb) / 0.6);
}

.snippet-tabs__tab {
 font-family: var(--font-heading);
 font-size: 0.75rem;
 font-weight: 500;
 color: rgb(var(--color-text-secondary-rgb));
 background: rgb(var(--color-surface-dim-rgb));
 border: 1px solid rgb(var(--color-border-rgb) / 0.6);
 border-radius: 100px;
 padding: 4px 12px;
 cursor: pointer;
 transition: all 0.18s ease;
}

.snippet-tabs__tab:hover {
 border-color: rgb(var(--color-primary-rgb) / 0.5);
 color: rgb(var(--color-text-rgb));
}

.snippet-tabs__tab.is-active {
 background: rgb(var(--color-primary-rgb) / 0.14);
 border-color: rgb(var(--color-primary-rgb) / 0.6);
 color: rgb(var(--color-primary-rgb));
}

.detail-page {
 padding: var(--space-6) var(--page-padding-x) var(--space-12);
 display: flex;
 flex-direction: column;
 height: calc(100vh - var(--header-height));
 box-sizing: border-box;
}

.detail-header {
 display: flex;
 flex-direction: row;
 align-items: flex-start;
 justify-content: space-between;
 margin-bottom: var(--space-6);
 flex-shrink: 0;
 gap: var(--space-4);
}

.detail-breadcrumb {
 margin-bottom: 0;
 flex: 1;
 display: inline-flex;
 align-items: center;
 gap: 8px;
 font-size: var(--text-xs);
 min-width: 0;
}

.detail-breadcrumb__link {
 display: inline-flex;
 align-items: center;
 color: rgb(var(--color-text-secondary-rgb));
 text-decoration: none;
 border-radius: 6px;
 transition: color 150ms ease;
}

.detail-breadcrumb__link:hover {
 color: rgb(var(--color-primary-rgb));
}

.detail-breadcrumb__sep {
 color: rgb(var(--color-text-secondary-rgb) / 0.5);
}

.detail-breadcrumb__current {
 overflow: hidden;
 white-space: nowrap;
 text-overflow: ellipsis;
 color: rgb(var(--color-text-rgb));
}

.detail-actions {
 display: flex;
 align-items: center;
 gap: var(--space-2);
 flex-shrink: 0;
}

.main-split {
 display: grid;
 grid-template-columns: 1fr 1fr;
 grid-template-rows: 1fr;
 gap: var(--space-5);
 flex: 1;
 min-height: 0;
}

.split-preview,
.split-source {
 min-width: 0;
 min-height: 0;
}
</style>
