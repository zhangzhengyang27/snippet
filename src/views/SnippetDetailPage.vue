<script setup lang="ts">
/**
 * 独立代码详情页（/snippets/:id）——「代码为王」布局。
 *
 * 设计取向：
 * - **代码区全宽占满**，是页面唯一的主体；元信息不再常驻侧栏，改为右侧
 *   可收起的浮层抽屉（默认收起），保证代码始终拿到最大宽度；
 * - 顶部条只承载「导航 + 操作」，标题在抽屉里完整呈现（页面顶部仅面包屑），
 *   避免与代码区争夺视觉起点；
 * - 操作分主次：**复制**是唯一的主按钮（primary），收藏/编辑/版本/预览/删除
 *   收为图标按钮，删除走 danger 色单独收尾；
 * - 代码区工具条下沉高频工具：复制当前文件 / 下载 / 自动换行 / 行号；
 *   刻意不提供全屏——本页主体就是代码，铺满整屏反而失去容器感与留白。
 * - 加载态用骨架屏，错误态给出明确引导（重试 / 返回列表）。
 *
 * 与列表页分屏面板（SnippetDetailPane）的分工：本页是全屏沉浸式阅读，
 * 面板是列表上下文里的快速预览。
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import AppModal from '@/components/common/AppModal.vue'
import ShikiCodeBlock from '@/components/common/code/ShikiCodeBlock.vue'
import SnippetPreviewPane from '@/components/common/SnippetPreviewPane.vue'
import SnippetEditorDialog from '@/components/snippets/SnippetEditorDialog.vue'
import SnippetVersionDialog from '@/components/snippets/SnippetVersionDialog.vue'
import { useToast } from '@/composables/useToast'
import { useCopy } from '@/composables/useCopy'
import { useFavorites } from '@/composables/useFavorites'
import { useRecentSnippets } from '@/composables/useRecentSnippets'
import { useResourceFetch } from '@/composables/useResourceFetch'
import { getApiErrorMessage } from '@/api/client'
import {
  copyKnowledgeSnippet,
  getKnowledgeSnippet,
  deleteKnowledgeSnippet,
  listKnowledgeSnippetCollections,
  listKnowledgeSnippets,
  submitSnippetPublication,
  updateKnowledgeSnippet,
  withdrawSnippetPublication,
} from '@/api/knowledge-snippets'
import type {
  KnowledgeSnippet,
  KnowledgeSnippetCollection,
  SnippetFile,
} from '@/types/knowledge-snippet'
import { snippetDifficultyLabel, type SnippetDifficulty, type CodeBlockFile } from '@/types/code-block'
import { languageLabel, languageColor } from '@/utils/snippet-languages'
import { openSnippetPreviewWindow } from '@/utils/sandbox'
import { formatDateTime } from '@/utils/date-format'
import type { SnippetEditorSubmitPayload } from '@/composables/useSnippetEditorForm'

const route = useRoute()
const router = useRouter()
const { toast } = useToast()
const { copy } = useCopy()
const { pushRecent } = useRecentSnippets()

// 文件 tab 索引。必须在 useResourceFetch 之前声明 —— 其 fetcher 会在 setup 期间
// 同步执行（immediate 默认 true），其中会重置这个索引。
const activeFileIndex = ref(0)

// 内嵌预览是否展开。同样需早于 useResourceFetch 声明：切换片段时 fetcher 会复位它。
const previewOpen = ref(false)

/**
 * 片段详情。走 useResourceFetch 以获得三件事：
 * - **竞态保护**：快速切换片段时，慢响应不会覆盖新片段的数据
 * - **卸载中止**：离开页面时中止在途请求
 * - **参数变化自动重载**：watch route.params.id
 */
const {
  data: snippet,
  loading,
  error: loadError,
  execute: loadSnippet,
} = useResourceFetch<KnowledgeSnippet>(async (signal) => {
  const id = String(route.params.id ?? '')
  if (!id) throw new Error('缺少片段 id')
  // 切换片段时重置文件 tab，避免沿用上一条的索引
  activeFileIndex.value = 0
  previewOpen.value = false
  const data = await getKnowledgeSnippet(id, { signal })
  pushRecent(id)
  return data
}, {
  watch: () => route.params.id,
})

/** 模板消费的是字符串错误，这里统一转成可读文案 */
const error = computed(() =>
  loadError.value ? getApiErrorMessage(loadError.value, '加载片段失败') : ''
)

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
const charCount = computed(() => activeCode.value.length)

// 难度档位：未标注时 difficultyValue 为空串，元数据区显示「未标注」
const difficultyValue = computed<SnippetDifficulty | ''>(
  () => snippet.value?.displayAttrs?.difficulty ?? ''
)
const difficultyText = computed(() => snippetDifficultyLabel(difficultyValue.value))

const langColor = computed(() =>
  snippet.value ? languageColor(snippet.value.language) : '#9e9e9e'
)

/* ─── 视图开关：信息抽屉 / 全屏 / 代码显示偏好 ──────────────────────────── */

/** 元信息抽屉（默认收起）：代码区保持全宽，需要看元信息时才浮出 */
const infoOpen = ref(false)

/** 自动换行 / 行号：初值取自片段自带展示属性，之后由用户在工具条上覆盖 */
const wrap = ref(true)
const showLineNumbers = ref(true)

watch(
  () => snippet.value?.id,
  () => {
    wrap.value = snippet.value?.displayAttrs?.wrap ?? true
    showLineNumbers.value = snippet.value?.displayAttrs?.lineNumbers ?? true
  }
)

/** 收藏按用户，走 favorites 接口；busy 由 composable 统一维护，避免重复点击 */
const { busy: favoriteBusy, toggleFavorite: toggleFavoriteApi } = useFavorites()

/**
 * 本详情页的来源列表路径。
 *
 * `/library/:id`（公共代码块库）与 `/snippets/:id`（个人工作区）复用本组件，
 * 返回 / 面包屑 / 相关片段跳转都必须跟随来源，否则从公共库点进详情后
 * 一按返回就被送回个人工作区（导航高亮也会跟着错位）。
 */
const listPath = computed(() => (route.path.startsWith('/library') ? '/library' : '/snippets'))
const listLabel = computed(() => (listPath.value === '/library' ? '公共代码块库' : '代码块'))

/**
 * 是否处于公共代码块库视图。
 *
 * ⚠️ 不能再用 `snippet.isPublic` 当「只读」判据：作者**自己发布的**片段
 * isPublic 也是 true，但它出现在 `/snippets/:id` 时应仍然可编辑、可下架。
 * 只读与否取决于**从哪个列表进来**（视图语义），而不是片段自身的公开状态。
 */
const isPublicView = computed(() => listPath.value === '/library')

/** 发布流程状态（缺省视为私有未提交） */
const publicationStatus = computed(() => snippet.value?.moderationStatus ?? 'none')
const publicationBusy = ref(false)

/** 发布按钮的图标 / 文案随状态变化：未提交 → 审核中 → 已发布 / 未通过 */
const publicationActionIcon = computed(() => {
  switch (publicationStatus.value) {
    case 'pending':
      return 'material-symbols:hourglass-top'
    case 'approved':
      return 'material-symbols:public'
    case 'rejected':
      return 'material-symbols:error-outline'
    default:
      return 'material-symbols:cloud-upload'
  }
})

const publicationActionTitle = computed(() => {
  switch (publicationStatus.value) {
    case 'pending':
      return '审核中，点击撤回发布申请'
    case 'approved':
      return '已发布到公共代码块库，点击下架'
    case 'rejected':
      return '审核未通过，点击重新提交'
    default:
      return '发布到公共代码块库'
  }
})

/** 信息抽屉里的审核状态标签 */
const publicationStatusLabel = computed(() => {
  switch (publicationStatus.value) {
    case 'pending':
      return '审核中'
    case 'approved':
      return '已发布'
    case 'rejected':
      return '审核未通过'
    default:
      return '未发布'
  }
})

/** 可见性文案：把「公开与否」和「审核流程状态」合成一句人话 */
const visibilityText = computed(() => {
  const current = snippet.value
  if (!current) return ''

  if (current.isPublic) return '公共（只读）'

  switch (current.moderationStatus) {
    case 'pending':
      return '私有 · 审核中'
    case 'rejected':
      return current.moderationNote
        ? `私有 · 审核未通过（${current.moderationNote}）`
        : '私有 · 审核未通过'
    default:
      return '私有'
  }
})

/**
 * 发布 / 撤回二合一：未提交与未通过都走「提交」，审核中与已发布都走「取消发布」。
 */
async function handlePublicationAction() {
  const current = snippet.value
  if (!current) return

  const previousStatus = publicationStatus.value
  publicationBusy.value = true

  try {
    if (previousStatus === 'none' || previousStatus === 'rejected') {
      snippet.value = await submitSnippetPublication(current.id)
      toast.success('已提交审核，通过后将出现在公共代码块库')
    } else {
      snippet.value = await withdrawSnippetPublication(current.id)
      toast.success(previousStatus === 'approved' ? '已从公共代码块库下架' : '已撤回发布申请')
    }
  } catch (err) {
    toast.error(getApiErrorMessage(err, '发布操作失败'))
  } finally {
    publicationBusy.value = false
  }
}

/** 公共片段的写操作只有一个：复制一份进自己的代码块库 */
const copyToMineBusy = ref(false)
async function copyToMine() {
  const current = snippet.value
  if (!current) return
  copyToMineBusy.value = true
  try {
    await copyKnowledgeSnippet(current.id)
    toast.success(`已复制「${current.name}」到我的代码块`)
  } catch (err) {
    toast.error(getApiErrorMessage(err, '复制到我的代码块失败'))
  } finally {
    copyToMineBusy.value = false
  }
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push(listPath.value)
}

function goList() {
  router.push(listPath.value)
}

/**
 * 收藏 / 取消收藏（按用户，写 favorites 表）。
 *
 * 不再用 `PATCH /snippets/:id { favorite }` —— 收藏若走片段自身的更新接口，就会
 * 落到 `ensureSnippetOwned`，而公共片段归属托管账号 admin，非归属者一律 404。
 * 这正是审查报告 B1「公共片段收藏必然失败」的根因。
 */
async function toggleFavorite() {
  const s = snippet.value
  if (!s) return
  const next = await toggleFavoriteApi(s.id, !!s.favorite)
  snippet.value = { ...s, favorite: next }
}

/** 复制当前视图里的代码（多文件片段=当前激活文件） */
async function copyActiveCode() {
  const text = activeCode.value
  if (!text) return
  const ok = await copy(text)
  if (!ok) return
  toast.success(hasFiles.value ? `已复制 ${activeFile.value?.name ?? '当前文件'}` : '已复制代码')
}

/**
 * 复制整个片段：多文件按 `// 文件名` 分隔拼接，单文件即正文。
 * 与工具条上的「复制当前文件」区分开 —— 多文件场景下两者结果不同。
 */
function buildFullText(): string {
  const s = snippet.value
  if (!s) return ''
  if (hasFiles.value) {
    return snippetFiles.value.map((file) => `// ${file.name}\n${file.code ?? ''}`).join('\n\n')
  }
  return s.content ?? ''
}

async function copyAllCode() {
  const text = buildFullText()
  if (!text) return
  const ok = await copy(text)
  if (ok) toast.success(hasFiles.value ? '已复制全部文件' : '已复制代码')
}

/** 下载当前激活文件（多文件片段按单文件下载，避免打包依赖） */
function downloadActiveFile() {
  const s = snippet.value
  if (!s) return
  const name = hasFiles.value
    ? (activeFile.value?.name || 'snippet.txt')
    : `${s.name || 'snippet'}.${activeLanguage.value || 'txt'}`
  const blob = new Blob([activeCode.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* 预览：仅 HTML 片段可预览，提供两种打开方式 ——
   1. 内嵌预览：在代码区内用 iframe 直接渲染（DeviceFrame + 沙箱代理，严格隔离）；
   2. 新窗口预览：blob URL 打开同等隔离强度的独立文档。
   多文件片段预览当前激活的 HTML tab；激活非 HTML tab 时不可预览。 */
const canPreview = computed(() => {
  if (snippet.value?.language !== 'html') return false
  if (!hasFiles.value) return true
  return activeFile.value?.language === 'html'
})

/** 内嵌预览的正文：多文件取激活 HTML 文件，单文件取 content */
const previewHtml = computed(() =>
  hasFiles.value ? (activeFile.value?.code ?? '') : (snippet.value?.content ?? '')
)

/**
 * 内嵌预览附带的同片段文件，供 sandbox 把 `<script src="./xxx.js">` 内联，
 * 使预览脱离外部文件独立运行：
 *  - 多文件片段：取激活 HTML 之外的同级文件；
 *  - 单文件片段：取 displayAttrs.files。
 */
const previewFiles = computed<CodeBlockFile[]>(() =>
  hasFiles.value
    ? snippetFiles.value.filter((file) => file !== activeFile.value)
    : (snippet.value?.displayAttrs?.files ?? [])
)

function openPreview() {
  if (!canPreview.value) return
  const ok = openSnippetPreviewWindow(previewHtml.value, previewFiles.value)
  if (!ok) toast.error('新窗口被浏览器拦截，请检查弹窗拦截设置')
}

/* ─── 就地编辑：不再跳回列表页开弹窗 ──────────────────────────────────── */

const editorOpen = ref(false)
const editorSaving = ref(false)
const collections = ref<KnowledgeSnippetCollection[]>([])
const collectionsLoading = ref(false)

async function ensureCollections() {
  if (collections.value.length || collectionsLoading.value) return
  collectionsLoading.value = true
  try {
    collections.value = await listKnowledgeSnippetCollections()
  } catch (err) {
    // 集合只用于下拉选择，加载失败也让编辑继续（可保持原集合不动）
    toast.error(getApiErrorMessage(err, '集合列表加载失败'))
  } finally {
    collectionsLoading.value = false
  }
}

function editSnippet() {
  if (!snippet.value) return
  void ensureCollections()
  editorOpen.value = true
}

async function handleEditorSubmit(payload: SnippetEditorSubmitPayload) {
  const s = snippet.value
  if (!s) return
  editorSaving.value = true
  try {
    await updateKnowledgeSnippet(s.id, payload)
    editorOpen.value = false
    toast.success('片段已更新')
    // 重新拉取：多文件、标签、占位符等派生字段以后端为准
    void loadSnippet()
  } catch (err) {
    toast.error(getApiErrorMessage(err, '保存失败'))
  } finally {
    editorSaving.value = false
  }
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
    router.replace(listPath.value)
  } catch (err) {
    toast.error(getApiErrorMessage(err, '删除失败'))
  } finally {
    deleting.value = false
  }
}

/* 版本历史面板。与「编辑/删除」一样只对自有片段开放 —— 公共片段挂在托管账号（admin）名下，
   普通用户调用时后端 ensureSnippetOwned 会直接 404，因此不该把入口露给用户。 */
const versionOpen = ref(false)

/* ─── 相关片段：同标签优先，其次同集合 ────────────────────────────────── */

const relatedSnippets = ref<KnowledgeSnippet[]>([])
let relatedRequestId = 0

async function loadRelated() {
  const s = snippet.value
  if (!s) {
    relatedSnippets.value = []
    return
  }
  const tag = s.tags?.find(Boolean)
  // 同标签最能体现「相关」；没有标签时退到同集合
  const params = tag
    ? { tag, pageSize: 6 }
    : s.collectionId
      ? { collectionId: s.collectionId, pageSize: 6 }
      : null
  if (!params) {
    relatedSnippets.value = []
    return
  }
  const requestId = ++relatedRequestId
  try {
    const result = await listKnowledgeSnippets(params)
    if (requestId !== relatedRequestId) return
    relatedSnippets.value = result.items.filter((item) => item.id !== s.id).slice(0, 5)
  } catch {
    // 相关片段是锦上添花，失败就整块不展示，不打扰阅读
    if (requestId === relatedRequestId) relatedSnippets.value = []
  }
}

// 抽屉按需加载：只在打开时请求，避免每个详情页都多打一次接口
watch(
  () => [infoOpen.value, snippet.value?.id] as const,
  () => {
    if (infoOpen.value) void loadRelated()
  }
)

function openRelated(id: string) {
  infoOpen.value = false
  router.push(`${listPath.value}/${encodeURIComponent(id)}`)
}
</script>

<template>
  <div class="snippet-detail">
    <!-- 顶部条：导航 + 操作（标题不在此处，交给抽屉） -->
    <header class="sd-topbar">
      <div class="sd-topbar__inner">
        <div class="sd-crumb">
          <button class="sd-icon-btn" type="button" title="返回" aria-label="返回" @click="goBack">
            <AppIcon icon="material-symbols:arrow-back" :size="18" />
          </button>
          <button class="sd-crumb__link" type="button" @click="goList">{{ listLabel }}</button>
          <AppIcon icon="material-symbols:chevron-right" :size="14" class="sd-crumb__sep" />
          <span class="sd-crumb__current" :title="snippet?.name ?? ''">
            {{ snippet?.name ?? '详情' }}
          </span>
        </div>

        <div v-if="snippet" class="sd-actions">
        <AppButton variant="primary" size="small" @click="copyAllCode">
          <AppIcon icon="material-symbols:content-copy" :size="15" />
          复制
        </AppButton>

        <div class="sd-actions__group">
          <button
            class="sd-icon-btn"
            type="button"
            :class="{ 'is-on': snippet.favorite }"
            :title="snippet.favorite ? '取消收藏' : '收藏'"
            :aria-label="snippet.favorite ? '取消收藏' : '收藏'"
            :aria-pressed="snippet.favorite"
            :disabled="favoriteBusy"
            @click="toggleFavorite"
          >
            <AppIcon
              :icon="snippet.favorite ? 'material-symbols:star' : 'material-symbols:star-outline'"
              :size="17"
            />
          </button>
          <!-- 公共库视图：唯一可用的写操作是复制一份进自己的代码块库 -->
          <button
            v-if="isPublicView"
            class="sd-icon-btn"
            type="button"
            title="复制到我的代码块"
            aria-label="复制到我的代码块"
            :disabled="copyToMineBusy"
            @click="copyToMine"
          >
            <AppIcon icon="material-symbols:library-add" :size="17" />
          </button>
          <!-- 个人工作区：发布 / 撤回二合一（图标与提示随审核状态变化） -->
          <button
            v-if="!isPublicView"
            class="sd-icon-btn"
            type="button"
            :class="{ 'is-on': publicationStatus === 'approved' }"
            :title="publicationActionTitle"
            :aria-label="publicationActionTitle"
            :disabled="publicationBusy"
            @click="handlePublicationAction"
          >
            <AppIcon :icon="publicationActionIcon" :size="17" />
          </button>
          <button
            v-if="!isPublicView"
            class="sd-icon-btn"
            type="button"
            title="编辑"
            aria-label="编辑"
            @click="editSnippet"
          >
            <AppIcon icon="material-symbols:edit" :size="17" />
          </button>
          <button
            v-if="!isPublicView"
            class="sd-icon-btn"
            type="button"
            title="版本历史"
            aria-label="版本历史"
            @click="versionOpen = true"
          >
            <AppIcon icon="material-symbols:history" :size="17" />
          </button>
          <button
            v-if="canPreview"
            class="sd-icon-btn"
            type="button"
            title="新窗口预览"
            aria-label="新窗口预览"
            @click="openPreview"
          >
            <AppIcon icon="material-symbols:open-in-new" :size="17" />
          </button>
          <button
            v-if="!isPublicView"
            class="sd-icon-btn is-danger"
            type="button"
            title="删除"
            aria-label="删除"
            @click="askDelete"
          >
            <AppIcon icon="material-symbols:delete" :size="17" />
          </button>
        </div>

        <span class="sd-actions__divider" aria-hidden="true" />

        <button
          class="sd-icon-btn"
          type="button"
          :class="{ 'is-on': infoOpen }"
          title="片段信息"
          aria-label="片段信息"
          :aria-pressed="infoOpen"
          @click="infoOpen = !infoOpen"
        >
          <AppIcon
            :icon="infoOpen ? 'material-symbols:info' : 'material-symbols:info-outline'"
            :size="17"
          />
        </button>
        </div>
      </div>
    </header>

    <div class="sd-body">
      <!-- 骨架屏 -->
      <div v-if="loading" class="sd-skeleton">
        <div class="sd-skeleton__bar">
          <span class="sd-skeleton__block sd-skeleton__block--tab" />
          <span class="sd-skeleton__block sd-skeleton__block--tab" />
          <span class="sd-skeleton__block sd-skeleton__block--tool" />
        </div>
        <div class="sd-skeleton__code">
          <span
            v-for="width in [62, 84, 45, 73, 56, 90, 38, 68, 50, 80, 44, 66]"
            :key="width"
            class="sd-skeleton__line"
            :style="{ width: `${width}%` }"
          />
        </div>
      </div>

      <!-- 错误态 -->
      <div v-else-if="error" class="sd-state">
        <AppIcon icon="material-symbols:error-outline" :size="34" class="sd-state__icon" />
        <p class="sd-state__title">没能加载这个片段</p>
        <p class="sd-state__desc">{{ error }}</p>
        <div class="sd-state__actions">
          <AppButton variant="primary" size="small" @click="loadSnippet()">重试</AppButton>
          <AppButton variant="glass" size="small" @click="goList">返回列表</AppButton>
        </div>
      </div>

      <!-- 代码区：全宽主体 -->
      <section v-else-if="snippet" class="sd-code">
        <div class="sd-code__bar">
          <div v-if="hasFiles" class="sd-tabs">
            <button
              v-for="(file, index) in snippetFiles"
              :key="file.name"
              type="button"
              class="sd-tabs__item"
              :class="{ 'is-active': index === activeFileIndex }"
              @click="activeFileIndex = index"
            >
              {{ file.name }}
            </button>
          </div>
          <div v-else class="sd-tabs__single">
            <i class="sd-dot" :style="{ background: langColor }" />
            {{ languageLabel(snippet.language) }}
          </div>

          <div class="sd-code__tools">
            <button
              v-if="canPreview"
              class="sd-icon-btn"
              type="button"
              :class="{ 'is-on': previewOpen }"
              :title="previewOpen ? '返回代码' : '内嵌预览'"
              :aria-label="previewOpen ? '返回代码' : '内嵌预览'"
              :aria-pressed="previewOpen"
              @click="previewOpen = !previewOpen"
            >
              <AppIcon
                :icon="previewOpen ? 'material-symbols:code' : 'material-symbols:visibility'"
                :size="16"
              />
            </button>
            <button
              class="sd-icon-btn"
              type="button"
              title="复制当前文件"
              aria-label="复制当前文件"
              @click="copyActiveCode"
            >
              <AppIcon icon="material-symbols:content-copy" :size="16" />
            </button>
            <button
              class="sd-icon-btn"
              type="button"
              title="下载当前文件"
              aria-label="下载当前文件"
              @click="downloadActiveFile"
            >
              <AppIcon icon="material-symbols:download" :size="16" />
            </button>
            <button
              class="sd-icon-btn"
              type="button"
              :class="{ 'is-on': wrap }"
              title="自动换行"
              aria-label="自动换行"
              :aria-pressed="wrap"
              @click="wrap = !wrap"
            >
              <AppIcon icon="material-symbols:wrap-text" :size="16" />
            </button>
            <button
              class="sd-icon-btn"
              type="button"
              :class="{ 'is-on': showLineNumbers }"
              title="显示行号"
              aria-label="显示行号"
              :aria-pressed="showLineNumbers"
              @click="showLineNumbers = !showLineNumbers"
            >
              <AppIcon icon="material-symbols:format-list-numbered" :size="16" />
            </button>
          </div>
        </div>

        <div class="sd-code__editor">
          <!-- 内嵌预览（仅 HTML 片段）：iframe 严格隔离渲染，工具条提供刷新 / 新窗口 / 全屏 -->
          <SnippetPreviewPane
            v-if="previewOpen && canPreview"
            :html="previewHtml"
            :files="previewFiles"
          />
          <ShikiCodeBlock
            v-else
            :code="activeCode"
            :language="activeLanguage"
            :show-line-numbers="showLineNumbers"
            :word-wrap="wrap"
            min-height="100%"
            max-height="100%"
            :font-size="13"
          />
        </div>

        <div class="sd-code__status">
          <span>{{ lineCount }} 行</span>
          <span>{{ charCount }} 字符</span>
          <span v-if="hasFiles && activeFile">· {{ activeFile.name }}</span>
          <span>· {{ languageLabel(activeLanguage) }}</span>
        </div>
      </section>

      <!-- 元信息抽屉：默认收起，浮在代码区之上，不抢占代码宽度 -->
      <aside
        v-if="snippet && !loading && !error"
        class="sd-info"
        :class="{ 'is-open': infoOpen }"
        :aria-hidden="!infoOpen"
      >
        <div class="sd-info__head">
          <div class="sd-info__head-main">
            <h1 class="sd-info__name">{{ snippet.name }}</h1>
            <button
              class="sd-icon-btn"
              type="button"
              title="收起信息"
              aria-label="收起信息"
              @click="infoOpen = false"
            >
              <AppIcon icon="material-symbols:close" :size="16" />
            </button>
          </div>
          <p v-if="snippet.description" class="sd-info__desc">{{ snippet.description }}</p>
          <div class="sd-info__chips">
            <span class="sd-chip">
              <i class="sd-dot" :style="{ background: langColor }" />
              {{ languageLabel(snippet.language) }}
            </span>
            <span v-if="difficultyValue" class="sd-chip" :class="`is-${difficultyValue}`">
              {{ difficultyText }}
            </span>
            <span class="sd-chip">{{ snippet.isPublic ? '公共' : '私有' }}</span>
            <span
              v-if="!isPublicView && publicationStatus !== 'none'"
              class="sd-chip"
              :class="`is-${publicationStatus}`"
            >
              {{ publicationStatusLabel }}
            </span>
          </div>
        </div>

        <div class="sd-info__body">
          <section class="sd-info__group">
            <h2 class="sd-info__group-title">归类</h2>
            <dl class="sd-meta">
              <div class="sd-meta__row">
                <dt>集合</dt>
                <dd>{{ snippet.collectionName || '未分组' }}</dd>
              </div>
              <div class="sd-meta__row">
                <dt>可见性</dt>
                <dd>{{ visibilityText }}</dd>
              </div>
            </dl>
          </section>

          <section v-if="snippet.tags.length" class="sd-info__group">
            <h2 class="sd-info__group-title">标签</h2>
            <div class="sd-tags">
              <span v-for="tag in snippet.tags" :key="tag" class="sd-tag">#{{ tag }}</span>
            </div>
          </section>

          <section class="sd-info__group">
            <h2 class="sd-info__group-title">统计</h2>
            <dl class="sd-meta">
              <div class="sd-meta__row">
                <dt>使用次数</dt>
                <dd>{{ snippet.usageCount }} 次</dd>
              </div>
              <div class="sd-meta__row">
                <dt>收藏</dt>
                <dd>{{ snippet.favorite ? '已收藏' : '未收藏' }}</dd>
              </div>
            </dl>
          </section>

          <section class="sd-info__group">
            <h2 class="sd-info__group-title">时间</h2>
            <dl class="sd-meta">
              <div class="sd-meta__row">
                <dt>创建</dt>
                <dd>{{ formatDateTime(snippet.createdAt) }}</dd>
              </div>
              <div class="sd-meta__row">
                <dt>更新</dt>
                <dd>{{ formatDateTime(snippet.updatedAt) }}</dd>
              </div>
              <div class="sd-meta__row">
                <dt>上次使用</dt>
                <dd>{{ formatDateTime(snippet.lastUsedAt) }}</dd>
              </div>
            </dl>
          </section>

          <section v-if="relatedSnippets.length" class="sd-info__group">
            <h2 class="sd-info__group-title">相关片段</h2>
            <ul class="sd-related">
              <li v-for="item in relatedSnippets" :key="item.id">
                <button type="button" class="sd-related__item" @click="openRelated(item.id)">
                  <i class="sd-dot" :style="{ background: languageColor(item.language) }" />
                  <span class="sd-related__name">{{ item.name }}</span>
                  <AppIcon icon="material-symbols:chevron-right" :size="14" />
                </button>
              </li>
            </ul>
          </section>
        </div>
      </aside>
    </div>

    <!-- 删除确认 -->
    <AppModal v-model:open="deleteOpen" title="删除片段" :width="420" :footer="null">
      <p class="sd-delete-text">确认删除「{{ snippet?.name }}」？该操作不可恢复。</p>
      <template #footer>
        <div class="sd-delete-actions">
          <AppButton variant="glass" @click="deleteOpen = false">取消</AppButton>
          <AppButton variant="primary" danger :loading="deleting" @click="confirmDelete">
            删除
          </AppButton>
        </div>
      </template>
    </AppModal>

    <!-- 就地编辑：保存后原地刷新，不再跳回列表页 -->
    <SnippetEditorDialog
      :open="editorOpen"
      mode="edit"
      :snippet="snippet"
      :collections="collections"
      :saving="editorSaving"
      @update:open="editorOpen = $event"
      @submit="handleEditorSubmit"
    />

    <!-- 版本历史（仅自有片段；判据是视图而非 isPublic —— 作者自己发布的片段仍归本人） -->
    <SnippetVersionDialog
      v-if="snippet && !isPublicView"
      v-model:open="versionOpen"
      :snippet="snippet"
      @rolled-back="loadSnippet()"
    />
  </div>
</template>

<style scoped>
.snippet-detail {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 100%;
  background: rgb(var(--color-bg-rgb));
}

/* ─── 顶部条 ─────────────────────────────────────────────────────────── */
.sd-topbar {
  flex-shrink: 0;
  padding: 10px 24px;
  border-bottom: 1px solid rgb(var(--color-border-rgb));
  background: rgb(var(--color-bg-rgb) / 0.85);
  backdrop-filter: blur(12px);
}

/* 内容与代码区同宽居中对齐（同 --content-max-width 上限，两侧留白随视口同步增大） */
.sd-topbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  max-width: var(--content-max-width);
  margin: 0 auto;
}

.sd-crumb {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.sd-crumb__link {
  appearance: none;
  border: none;
  background: transparent;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  color: rgb(var(--color-text-secondary-rgb));
  font-size: var(--text-xs);
  cursor: pointer;
}

.sd-crumb__link:hover {
  color: rgb(var(--color-brand-rgb));
  background: rgb(var(--color-brand-rgb) / 0.08);
}

.sd-crumb__sep {
  color: rgb(var(--color-text-tertiary-rgb));
  flex-shrink: 0;
}

.sd-crumb__current {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}

.sd-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sd-actions__group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.sd-actions__divider {
  width: 1px;
  height: 18px;
  background: rgb(var(--color-border-rgb));
}

/* 统一样式的图标按钮（顶部条与代码工具条共用） */
.sd-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard);
}

.sd-icon-btn:hover:not(:disabled) {
  background: rgb(var(--color-surface-hover-rgb));
  color: rgb(var(--color-text-rgb));
}

.sd-icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sd-icon-btn.is-on {
  color: rgb(var(--color-brand-rgb));
  background: rgb(var(--color-brand-rgb) / 0.12);
}

.sd-icon-btn.is-danger:hover:not(:disabled) {
  color: rgb(var(--color-error-rgb));
  background: rgb(var(--color-error-rgb) / 0.1);
}

/* ─── 主体 ───────────────────────────────────────────────────────────── */
.sd-body {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  /* 留白 + 水平居中：代码区不再糊满整屏，超宽屏下也不至于拉成长行 */
  padding: var(--content-padding);
  justify-content: center;
}

/**
 * 主体内容统一限宽居中（代码区 / 骨架屏 / 错误态共用一条规则）。
 * 上限 --content-max-width（约 120 字符代码宽度），超过后两侧留白自然增大。
 */
.sd-code,
.sd-skeleton,
.sd-state {
  flex: 0 1 var(--content-max-width);
  width: 100%;
  max-width: var(--content-max-width);
  border-radius: 12px;
}

/* 骨架屏 */
.sd-skeleton {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: rgb(var(--color-surface-bright-rgb));
}

.sd-skeleton__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  height: 40px;
  padding: 0 16px;
  border-bottom: 1px solid rgb(var(--color-border-rgb));
  background: rgb(var(--color-surface-rgb));
}

.sd-skeleton__block {
  height: 12px;
  border-radius: 4px;
  background: rgb(var(--color-surface-hover-rgb));
  animation: sd-pulse 1.4s var(--ease-standard) infinite;
}

.sd-skeleton__block--tab {
  width: 72px;
}

.sd-skeleton__block--tool {
  width: 24px;
  margin-left: auto;
}

.sd-skeleton__code {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 20px;
  overflow: hidden;
}

.sd-skeleton__line {
  height: 10px;
  border-radius: 4px;
  background: rgb(var(--color-surface-hover-rgb));
  animation: sd-pulse 1.4s var(--ease-standard) infinite;
}

@keyframes sd-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 0.85;
  }
}

/* 错误态 */
.sd-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  text-align: center;
}

.sd-state__icon {
  color: rgb(var(--color-error-rgb));
}

.sd-state__title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgb(var(--color-text-rgb));
}

.sd-state__desc {
  margin: 0;
  max-width: 420px;
  font-size: var(--text-xs);
  line-height: 1.7;
  color: rgb(var(--color-text-secondary-rgb));
}

.sd-state__actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

/* ─── 代码区 ─────────────────────────────────────────────────────────── */
.sd-code {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: rgb(var(--color-surface-bright-rgb));
}

.sd-code__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  height: 40px;
  padding: 0 12px;
  border-bottom: 1px solid rgb(var(--color-border-rgb));
  background: rgb(var(--color-surface-rgb));
}

.sd-tabs {
  display: flex;
  align-items: stretch;
  gap: 2px;
  height: 100%;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.sd-tabs::-webkit-scrollbar {
  display: none;
}

.sd-tabs__item {
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

.sd-tabs__item:hover {
  color: rgb(var(--color-text-rgb));
}

.sd-tabs__item.is-active {
  color: rgb(var(--color-brand-rgb));
  border-bottom-color: rgb(var(--color-brand-rgb));
  font-weight: 600;
}

.sd-tabs__single {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(var(--color-text-secondary-rgb));
}

.sd-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sd-code__tools {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
}

.sd-code__editor {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sd-code__status {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 4px 16px;
  border-top: 1px solid rgb(var(--color-border-rgb));
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: rgb(var(--color-text-tertiary-rgb));
}

/* ─── 元信息抽屉（浮层，默认收起） ────────────────────────────────────── */
.sd-info {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  width: 340px;
  max-width: 100%;
  background: rgb(var(--color-bg-elevated-rgb));
  border-left: 1px solid rgb(var(--color-border-rgb));
  box-shadow: -12px 0 32px rgb(0 0 0 / 0.12);
  transform: translateX(100%);
  transition: transform 0.24s var(--ease-standard);
}

.sd-info.is-open {
  transform: translateX(0);
}

.sd-info__head {
  flex-shrink: 0;
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgb(var(--color-border-rgb));
}

.sd-info__head-main {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.sd-info__name {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(--font-heading);
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.4;
  color: rgb(var(--color-text-rgb));
  word-break: break-word;
}

.sd-info__desc {
  margin: 8px 0 0;
  font-size: var(--text-xs);
  line-height: 1.7;
  color: rgb(var(--color-text-secondary-rgb));
  word-break: break-word;
}

.sd-info__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.sd-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-variant);
  color: rgb(var(--color-text-secondary-rgb));
  font-size: 0.6875rem;
  font-weight: 500;
}

/* 发布流程状态标签（仅个人工作区出现）：四态各一套语义色 */
.sd-chip.is-pending {
  background: rgb(var(--color-warning-rgb) / 0.14);
  color: rgb(var(--color-warning-rgb));
}

.sd-chip.is-approved {
  background: rgb(var(--color-success-rgb) / 0.14);
  color: rgb(var(--color-success-rgb));
}

.sd-chip.is-rejected {
  background: rgb(var(--color-error-rgb) / 0.14);
  color: rgb(var(--color-error-rgb));
}

.sd-info__body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px 24px;
}

.sd-info__group-title {
  margin: 0 0 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgb(var(--color-text-tertiary-rgb));
}

.sd-meta {
  margin: 0;
}

.sd-meta__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed rgb(var(--color-border-rgb));
}

.sd-meta__row:last-child {
  border-bottom: none;
}

.sd-meta__row dt {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: rgb(var(--color-text-tertiary-rgb));
}

.sd-meta__row dd {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(var(--color-text-rgb));
  text-align: right;
  word-break: break-word;
}

.sd-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sd-tag {
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

/* 相关片段 */
.sd-related {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sd-related__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: rgb(var(--color-text-secondary-rgb));
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard);
}

.sd-related__item:hover {
  background: rgb(var(--color-surface-hover-rgb));
  color: rgb(var(--color-text-rgb));
}

.sd-related__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── 删除弹窗 ───────────────────────────────────────────────────────── */
.sd-delete-text {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: rgb(var(--color-text-secondary-rgb));
}

.sd-delete-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

/* 窄屏：抽屉铺满，顶部条允许换行，留白收窄避免挤掉代码宽度 */
@media (max-width: 900px) {
  .sd-info {
    width: 100%;
  }

  .sd-topbar {
    padding-left: 12px;
    padding-right: 12px;
  }

  .sd-topbar__inner {
    flex-wrap: wrap;
    gap: 10px;
  }

  .sd-body {
    padding: var(--content-padding);
  }
}
</style>
