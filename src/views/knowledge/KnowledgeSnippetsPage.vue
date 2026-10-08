<script setup lang="ts">
/** 页面组件，负责代码片段页面展示与交互流程（三栏布局：集合侧栏 | 列表 | 详情 + 各类弹窗）。 */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
// 注意：本页直接使用 useRoute 处理命令面板深链
import AppModal from '@/components/common/AppModal.vue'
import SnippetCollectionDialog from '@/components/snippets/SnippetCollectionDialog.vue'
import SnippetEditorDialog from '@/components/snippets/SnippetEditorDialog.vue'
import SnippetListPanel from '@/components/snippets/SnippetListPanel.vue'
import SnippetMoreMenu from '@/components/snippets/SnippetMoreMenu.vue'
import SnippetSidebar from '@/components/snippets/SnippetSidebar.vue'
import SnippetWorkspace from '@/components/snippets/SnippetWorkspace.vue'
import SnippetDetailPane from '@/components/snippets/SnippetDetailPane.vue'
import SnippetsToolbar from '@/components/snippets/SnippetsToolbar.vue'
import StatusToast from '@/components/snippets/StatusToast.vue'
import { useToast } from '@/composables/useToast'
import {
  ensureSnippetContent,
  snippetSortOptions,
  isAppendingMore,
} from '@/composables/useSnippetListState'
import { useKnowledgeSnippetsPage } from '@/composables/useKnowledgeSnippetsPage'
import { useRecentSnippets } from '@/composables/useRecentSnippets'
import { useSnippetImportExport } from '@/composables/useSnippetImportExport'
import { useSnippetBatchOps } from '@/composables/useSnippetBatchOps'
import { getKnowledgeSnippet } from '@/api/knowledge-snippets'
import type { KnowledgeSnippet, SnippetScope } from '@/types/knowledge-snippet'

const router = useRouter()
const route = useRoute()
const { toast } = useToast()
const { pushRecent } = useRecentSnippets()

/**
 * 本页面实例的作用域，由路由 meta 决定：
 * - `/snippets` → `mine`：个人工作区，只放当前用户自己的代码块，未登录为空态引导
 * - `/library`  → `public`：公共代码块库，只读浏览 + 复制到我的
 * 同一组件挂两个路由，故 scope 必须来自路由而非写死。
 */
const pageScope: SnippetScope = route.meta.scope === 'public' ? 'public' : 'mine'

const {
  isPublicScope,
  collections,
  collectAllCollectionIds,
  loadingCollections,
  collectionError,
  expandedCollectionIds,
  collectionDialog,
  collectionDialogSaving,
  keyword,
  selectedCollectionId,
  selectedTag,
  favoritesOnly,
  sort,
  page,
  pageSize,
  total,
  totalPages,
  snippets,
  selectedLanguage,
  languages,
  clearFilters,
  loadingSnippets,
  snippetError,
  selectedSnippetId,
  selectedSnippet,
  tags,
  loadingTags,
  tagError,
  snippetDialogOpen,
  snippetDialogMode,
  editingSnippet,
  snippetDialogSaving,
  confirmState,
  showToast,
  toastMessage,
  toastType,
  refreshAll,
  askDeleteCollection,
  handleSubmitCollectionDialog,
  handlePersistCollections,
  openCreateSnippetDialog,
  openEditSnippetDialog,
  saveSnippet,
  askDeleteSnippet,
  toggleFavorite,
  copySnippetCode,
  copySnippetToMine,
  submitSnippetPublication,
  withdrawSnippetPublication,
  openCreateCollectionDialog,
  openEditCollectionDialog,
  toggleCollectionExpanded,
  expandCollectionWithAncestors,
  isLoggedIn,
  setPageSize,
  loadMore,
} = useKnowledgeSnippetsPage({ scope: pageScope })

/** 本页面对应的路由前缀：个人工作区 `/snippets`、公共代码块库 `/library`。
 *  所有 URL 写入（筛选同步、详情跳转）都必须基于它，否则在公共库里操作会把
 *  用户带到个人工作区的 URL 上（导航高亮与 scope 语义同时错位）。 */
const basePath = computed(() => (isPublicScope ? '/library' : '/snippets'))

/** 深链 / 命令面板选中子集合时，自动展开其祖先链，否则选中行藏在折叠的父级里不可见。
 * 监听集合树本身：加载完成或树变化后，对当前选中集合再补一次祖先展开（幂等）。
 *
 * 必须注册在 setup 顶层。此前这段被误写在下方 route.query watcher 的回调体内，
 * 而该 watcher 带 immediate —— 每次 query 变化（搜索/翻页/切集合）都会新增一个
 * 永不停止的监听器，导致操作几十次后每次集合树变化触发几十次展开。 */
watch(
  [selectedCollectionId, () => collections.value.length],
  ([cid]) => {
    if (cid) expandCollectionWithAncestors(cid)
  },
  { immediate: true }
)

/** 标签下拉选项：基于服务端标签列表映射 */
const tagOptions = computed(() => tags.value.map((t) => ({ label: t.name, value: t.name })))

/** 是否存在激活的筛选条件（控制"清除筛选"按钮显隐） */
const hasActiveFilters = computed(
  () =>
    !!keyword.value ||
    !!selectedTag.value ||
    !!selectedLanguage.value ||
    !!selectedCollectionId.value ||
    favoritesOnly.value
)


/** 详情展示模式：page（独立详情页） | split（主从三栏分屏），持久化到本地 */
type DetailLayout = 'page' | 'split'
const detailLayout = ref<DetailLayout>(
  (localStorage.getItem('snippet-detail-layout') as DetailLayout) || 'split'
)
const setDetailLayout = (next: DetailLayout) => {
  detailLayout.value = next
  localStorage.setItem('snippet-detail-layout', next)
}

/** split 模式下详情面板是否处于激活（已选择片段） */
const detailPaneActive = computed(
  () =>
    detailLayout.value === 'split' && !!selectedSnippetId.value
)

/** 当前详情展示的片段（关闭后保留引用以避免 UI 闪烁） */
const detailSnippet = computed(() => selectedSnippet.value)

/** 列表项点击：page 模式跳转独立详情页，split 模式常驻右侧面板 */
/** 下一次选中变化跳过 URL 同步：page 模式点击后随即 push 到详情页，
 *  此时再 replace 回 列表页?focus= 会把用户从详情页拽回来 */
let skipFocusSync = false
const handleSelectSnippet = (id: string) => {
  selectedSnippetId.value = id
  pushRecent(id)
  if (detailLayout.value === 'page') {
    skipFocusSync = true
    // 公共库的详情也留在 /library 下（同一组件），避免 URL 与导航高亮跳到个人工作区
    router.push(`${basePath.value}/${encodeURIComponent(id)}`)
  }
}

/** 分屏模式：关闭右侧详情面板 */
const handleCloseDetailPane = () => {
  selectedSnippetId.value = ''
}

/** 从详情面板发起编辑 */
const handleEditFromDetail = (snippet: KnowledgeSnippet) => {
  openEditSnippetDialog(snippet)
}

/** 从详情面板发起删除 */
const handleDeleteFromDetail = (snippet: KnowledgeSnippet) => {
  askDeleteSnippet(snippet)
}

/** 新建片段：打开编辑弹窗 */
const handleCreateSnippet = () => {
  openCreateSnippetDialog()
}

/** 未登录点击新建：提示并跳转登录页（带 redirect 回到当前页面） */
const handleRequireLogin = () => {
  toast.warning('请登录后创建代码片段')
  const redirect = encodeURIComponent(window.location.pathname + window.location.search)
  router.push(`/login?redirect=${redirect}`)
}

/** 保存片段后关闭编辑弹窗 */
const handleSaveSnippet = async (payload: Parameters<typeof saveSnippet>[0]) => {
  await saveSnippet(payload)
  if (!snippetDialogSaving.value) {
    snippetDialogOpen.value = false
  }
}

const handleCopySnippet = (id: string) => {
  const snippet = snippets.value.find((item) => item.id === id)
  if (snippet) {
    copySnippetCode(snippet)
  }
}

/** 公共代码块库：把列表行对应的片段复制进自己的代码块库 */
const handleCopyToMine = (id: string) => {
  const snippet = snippets.value.find((item) => item.id === id)
  if (snippet) void copySnippetToMine(snippet)
}

/** 空态里的「登录」入口：带上回跳地址，登录后回到当前页（个人工作区或公共库） */
const goLogin = () => {
  const redirect = encodeURIComponent(window.location.pathname + window.location.search)
  router.push(`/login?redirect=${redirect}`)
}

/**
 * 列表空态文案。
 *
 * 此前只有一句写死的「暂无匹配的代码片段」—— 在「我还没建过任何代码块」和
 * 「筛选没命中」两种完全不同的处境下说同一句话，用户会以为数据丢了。
 */
const emptyStateText = computed(() => {
  if (hasActiveFilters.value) return '暂无匹配的代码片段'
  if (isPublicScope) return '没有找到公共代码块'
  if (!isLoggedIn.value) return '登录后即可创建并管理你自己的代码块'
  return '你还没有代码块，新建第一个吧'
})

const handleConfirmDialog = async () => {
  try {
    await confirmState.value.onConfirm()
  } finally {
    confirmState.value.open = false
  }
}

/** 筛选状态 → URL query 的同步（Notion 风格）。
 * - 用 router.push 让后退键可逆回每次筛选切换（会占用历史栈）
 * - 关键词 q 单独 300ms 防抖，避免输入时频繁写 URL
 * - tag/lang 保留为纯内部状态，不入 URL（不分享、刷新不保持） */
let isApplyingFromUrl = false
let keywordTimer: ReturnType<typeof setTimeout> | null = null

/** 从当前状态构建 /snippets 的 query 对象（保留命令面板深链参数，tag/lang 显式剔除） */
function buildUrlQuery(): Record<string, string> {
  const query: Record<string, string> = { ...(route.query as Record<string, string>) }
  delete query['tag']
  delete query['lang']
  // new/edit 是一次性深链参数：进入页面时由 route.query watcher 消费，
  // 后续任何 query 同步都要剔除，否则关掉弹窗后一次筛选变化就会把弹窗重新打开
  delete query['new']
  delete query['edit']
  const setOrDel = (key: string, val: string | null | undefined) => {
    if (val) query[key] = val
    else delete query[key]
  }
  setOrDel('q', keyword.value.trim() || null)
  setOrDel('collection', selectedCollectionId.value || null)
  setOrDel('sort', sort.value === 'default' ? null : sort.value)
  // focus = 当前查看的片段，随选中状态走（刷新/分享可恢复）
  setOrDel('focus', selectedSnippetId.value || null)
  if (favoritesOnly.value) query['fav'] = '1'
  else delete query['fav']
  if (page.value > 1) query['page'] = String(page.value)
  else delete query['page']
  return query
}

/**
 * 真正执行 URL 更新的函数，供即时 watcher 与防抖后的关键词更新共用。
 *
 * 何时 push / 何时 replace 的判定（这条踩过坑）：
 * - **push**：用户显式操作的结果（切集合、收藏筛选、排序、点分页）——保留在历史里，
 *   后退键能一步步撤销，这是「筛选可逆」的价值所在。
 * - **replace**：滚动导致的自动追加翻页。此前它和点分页共用 push，滚一页塞一条历史，
 *   3399 条滚到底能灌进 ~169 条记录，后退键直接作废。追加不是用户的翻页意图，不配占历史。
 * - **replace**：关键词输入。逐次按键（哪怕 300ms 防抖）产生的中间态也不该堆在历史里。
 */
function syncToUrl(mode: 'push' | 'replace' = 'push') {
  if (isApplyingFromUrl) return
  const target = { path: basePath.value, query: buildUrlQuery() }
  void (mode === 'replace' ? router.replace(target) : router.push(target))
}

/** 非关键词维度：集合 / 收藏 / 排序 / 页码，变化即同步（无防抖，保证操作反馈即时） */
watch(
  () => [
    selectedCollectionId.value,
    favoritesOnly.value,
    sort.value,
    page.value,
  ],
  () => syncToUrl(isAppendingMore.value ? 'replace' : 'push')
)

/** 关键词：300ms 防抖后同步，避免每次按键都触发路由写入；用 replace 不占历史栈 */
watch(
  () => keyword.value,
  () => {
    if (isApplyingFromUrl) return
    if (keywordTimer) clearTimeout(keywordTimer)
    keywordTimer = setTimeout(() => {
      keywordTimer = null
      syncToUrl('replace')
    }, 300)
  }
)

/** 选中项 → URL 的 focus 参数（replace，不占历史）：刷新 / 分享能回到当前查看的片段。
 *  此前选中态只存在于内存，刷新后回到列表首项，正在看的上下文丢失。 */
watch(selectedSnippetId, (id) => {
  // 列表接口不带正文（P0-3 瘦身）→ 选中即按需取回，供右侧预览与「编辑」弹窗使用。
  // 放在此处（而非渲染时）是为了先拿正文再渲染，避免预览先闪一下空态。
  if (id) void ensureSnippetContent(id)
  if (skipFocusSync) {
    skipFocusSync = false
    return
  }
  syncToUrl('replace')
})

/** URL query → 筛选状态：进入页面或用户手动改 URL / 后退时恢复视图。
 * 仅恢复会写入 URL 的维度（collection/q/fav/sort/page）；
 * tag/lang 不参与 URL，保持内部状态。 */
watch(
  () => route.query,
  (q) => {
    isApplyingFromUrl = true
    const read = (k: string): string =>
      typeof q[k] === 'string' ? (q[k] as string) : ''
    selectedCollectionId.value = read('collection') || null
    keyword.value = read('q')
    favoritesOnly.value = q.fav === '1'
    const sortVal = read('sort')
    sort.value = (snippetSortOptions.some((o) => o.value === sortVal) ? sortVal : 'default') as
      | 'default'
      | 'lastUsedAt'
      | 'updatedAt'
      | 'name'
    const pageNum = parseInt(read('page'), 10)
    page.value = Number.isFinite(pageNum) && pageNum > 1 ? pageNum : 1
    // 待下个宏任务清标志，确保状态 watcher 在本次应用后不反向写回
    setTimeout(() => {
      isApplyingFromUrl = false
    }, 0)

    if (q.focus && typeof q.focus === 'string') {
      selectedSnippetId.value = q.focus
    }
    if (q.edit && typeof q.edit === 'string' && !isPublicScope) {
      const target = selectedSnippet.value ?? snippets.value.find((s) => s.id === q.edit)
      // 列表已带正文（详情 / by-ids 已合并）才直接用；否则一律回查完整详情再打开。
      // 否则从「瘦身后的列表」深链编辑会拿到空 content，保存即覆盖成空 —— 数据丢失。
      if (target && target.content !== undefined) {
        openEditSnippetDialog(target)
      } else {
        getKnowledgeSnippet(q.edit)
          .then((s) => openEditSnippetDialog(s))
          .catch(() => toast.error('无法打开编辑'))
      }
    } else if (q.new === '1' && !isPublicScope) {
      openCreateSnippetDialog()
    }
    // edit/new 是一次性深链参数：消费后立即从地址栏剔除（router.replace 不占历史栈），
    // 否则它们会一直留在 URL，后续任何 query 变化都会经本 watcher 重新打开弹窗。
    // focus 不同——它是「当前查看的片段」的持久态，由下方 watch(selectedSnippetId) 维护，
    // 剔掉它会导致刷新后丢失选中。
    if (q.edit || q.new) {
      const cleaned = { ...q }
      delete cleaned['edit']
      delete cleaned['new']
      void router.replace({ path: basePath.value, query: cleaned })
    }
  },
  { immediate: true }
)

// 组件卸载时清掉关键词防抖 timer：回调里的 router.push 若在卸载后触发，
// 会把已离开本页的用户重新拉回 /snippets
onBeforeUnmount(() => {
  if (keywordTimer) clearTimeout(keywordTimer)
  keywordTimer = null
})

// 导出 / 导入（纯客户端）—— 逻辑下沉到 composables/useSnippetImportExport
const {
  exportOpen,
  exporting,
  importFileInput,
  importing,
  importProgress,
  handleExportConfirm,
  handleImportFile,
} = useSnippetImportExport({
  snippets,
  collections,
  collectAllCollectionIds,
  refresh: refreshAll,
})

// 批量操作（多选）—— 逻辑下沉到 composables/useSnippetBatchOps
const {
  batchMode,
  selectedIds,
  toggleBatchMode,
  exitBatchMode,
  handleToggleCheck,
  selectAllOnPage,
  clearSelection,
  batchTagOpen,
  batchTagValue,
  batchTagSaving,
  confirmBatchTag,
  batchDeleting,
  handleBatchDelete,
} = useSnippetBatchOps({ snippets, refresh: refreshAll })

/**
 * 切到分屏时强制退出批量模式。
 *
 * 分屏工具栏不渲染「更多」菜单（导出 / 导入 / 批量选择都在里面），而它正是批量模式的
 * **唯一出口**；`batchMode` 又与布局无联动、批量操作栏不受布局影响。若不做这一步，
 * 「独立页开批量 → 切回分屏」会把用户困在批量态：批量栏占着一行，却没有按钮可退出。
 */
watch(detailLayout, (next) => {
  if (next === 'split') exitBatchMode()
})
</script>

<template>
  <div class="snippet-page">
    <SnippetWorkspace :show-detail="detailLayout === 'split'">
      <template #sidebar>
        <SnippetSidebar
          :collection-error="collectionError"
          :loading-collections="loadingCollections"
          :expanded-collection-ids="expandedCollectionIds"
          :selected-collection-id="selectedCollectionId"
          :collections="collections"
          :tags="tags"
          :loading-tags="loadingTags"
          :tag-error="tagError"
          :selected-tag="selectedTag"
          :favorites-only="favoritesOnly"
          :is-logged-in="isLoggedIn"
          :readonly="isPublicScope"
          :detail-layout="detailLayout"
          @select-collection="selectedCollectionId = $event"
          @toggle-collection-expanded="toggleCollectionExpanded"
          @create-collection="openCreateCollectionDialog"
          @edit-collection="openEditCollectionDialog"
          @delete-collection="askDeleteCollection"
          @persist-collections="handlePersistCollections"
          @update:selected-tag="selectedTag = $event"
          @update:favorites-only="favoritesOnly = $event"
          @update:detail-layout="setDetailLayout"
        />
      </template>

      <template #list>
        <div class="flex min-h-0 flex-1 flex-col p-4">
          <!-- 工具栏：独立一行，不与列表共用面板 -->
          <SnippetsToolbar
            :keyword="keyword"
            :sort="sort"
            :sort-options="snippetSortOptions"
            :loading="loadingSnippets"
            :total="total"
            :can-create="isLoggedIn"
            :readonly="isPublicScope"
            :tags="tagOptions"
            :selected-tag="selectedTag"
            :languages="languages"
            :selected-language="selectedLanguage"
            :has-active-filters="hasActiveFilters"
            :compact="detailLayout === 'split'"
            @update:keyword="keyword = $event"
            @update:sort="sort = $event"
            @update:selected-tag="selectedTag = $event"
            @update:selected-language="selectedLanguage = $event"
            @clear-filters="clearFilters"
            @create-snippet="handleCreateSnippet"
            @require-login="handleRequireLogin"
            @refresh="refreshAll"
          >
            <template #actions>
              <!-- 导出 / 导入 / 批量：低频操作收进「更多」菜单（此前独占一行，与工具栏割裂）。
                   分屏下整个菜单不渲染（用户决策 2026-10-06）：分屏工具栏只留「标题 / 搜索 / 新建」，
                   这三项低频操作到独立页使用。
                   ⚠️ 该菜单同时是**批量模式的唯一出口**，故下面用 watch 在切到分屏时自动退出批量，
                   否则批量栏会滞留却无路可退。 -->
              <SnippetMoreMenu
                v-if="detailLayout !== 'split' && !isPublicScope"
                :batch-mode="batchMode"
                :disable-export="!snippets.length"
                :importing="importing"
                :import-progress="importProgress"
                @export="exportOpen = true"
                @import="importFileInput?.click()"
                @toggle-batch="toggleBatchMode"
              />
            </template>
          </SnippetsToolbar>

          <!-- 导入文件输入（隐藏） -->
          <input
            ref="importFileInput"
            type="file"
            accept="application/json,.json"
            class="hidden"
            aria-label="选择要导入的 JSON 文件"
            @change="handleImportFile"
          />

          <!-- 批量操作栏 -->
          <div v-if="batchMode" class="batch-bar">
            <span class="batch-bar__count">已选 {{ selectedIds.length }} 项</span>
            <AppButton variant="text" size="small" @click="selectAllOnPage">全选本页</AppButton>
            <AppButton variant="text" size="small" @click="clearSelection">取消选择</AppButton>
            <div class="flex-1" />
            <AppButton
              variant="glass"
              size="small"
              :disabled="!selectedIds.length"
              @click="batchTagOpen = true"
            >
              <AppIcon icon="material-symbols:sell" :size="14" />
              加标签
            </AppButton>
            <AppButton
              variant="glass"
              size="small"
              :danger="true"
              :loading="batchDeleting"
              :disabled="!selectedIds.length"
              @click="handleBatchDelete"
            >
              <AppIcon icon="material-symbols:delete" :size="14" />
              删除
            </AppButton>
          </div>

          <!-- 列表面板：无外层包裹，直接展示 -->
          <SnippetListPanel
            :snippets="snippets"
            :total="total"
            :page="page"
            :page-size="pageSize"
            :total-pages="totalPages"
            :loading="loadingSnippets"
            :error="snippetError"
            :selected-snippet-id="selectedSnippetId"
            :view-mode="detailLayout === 'split' ? 'list' : 'grid'"
            :compact="detailLayout === 'split'"
            :can-create="isLoggedIn && !isPublicScope"
            :has-active-filters="hasActiveFilters"
            :copyable="isPublicScope"
            :empty-text="emptyStateText"
            :selectable="batchMode"
            :selected-ids="selectedIds"
            @select-snippet="handleSelectSnippet"
            @copy-snippet="handleCopySnippet"
            @copy-to-mine="handleCopyToMine"
            @toggle-check="handleToggleCheck"
            @clear-filters="clearFilters"
            @create-snippet="handleCreateSnippet"
            @update:page="page = $event"
            @update:page-size="setPageSize"
            @load-more="loadMore"
          >
            <!-- 空态补充引导：个人工作区没内容时，把「登录」和「去公共库逛逛」摆在手边 -->
            <template #empty-actions>
              <AppButton
                v-if="!isPublicScope && !isLoggedIn"
                variant="primary"
                size="small"
                @click="goLogin"
              >
                <AppIcon icon="material-symbols:login" :size="14" />
                登录
              </AppButton>
              <AppButton
                v-if="!isPublicScope && !hasActiveFilters"
                variant="glass"
                size="small"
                @click="router.push('/library')"
              >
                <AppIcon icon="material-symbols:travel-explore" :size="14" />
                浏览公共代码块库
              </AppButton>
            </template>
          </SnippetListPanel>
        </div>
      </template>
      <template #detail>
        <SnippetDetailPane
          :active="detailPaneActive"
          :snippet="detailSnippet"
          :readonly="isPublicScope"
          @close="handleCloseDetailPane"
          @copy="copySnippetCode"
          @toggle-favorite="toggleFavorite"
          @copy-to-mine="copySnippetToMine"
          @edit="handleEditFromDetail"
          @delete="handleDeleteFromDetail"
          @publish="submitSnippetPublication"
          @withdraw-publication="withdrawSnippetPublication"
        />
      </template>
    </SnippetWorkspace>

    <!-- 编辑/新建弹窗 -->
    <SnippetEditorDialog
      :open="snippetDialogOpen"
      :mode="snippetDialogMode"
      :snippet="editingSnippet"
      :collections="collections"
      :suggested-collection-id="selectedCollectionId"
      :saving="snippetDialogSaving"
      @update:open="snippetDialogOpen = $event"
      @submit="handleSaveSnippet"
    />

    <SnippetCollectionDialog
      :open="collectionDialog.open"
      :mode="collectionDialog.mode"
      :name="collectionDialog.name"
      :saving="collectionDialogSaving"
      @update:open="collectionDialog.open = $event"
      @update:name="collectionDialog.name = $event"
      @submit="handleSubmitCollectionDialog"
    />

    <AppModal
      v-model:open="confirmState.open"
      :title="confirmState.title"
      :width="440"
      :footer="null"
    >
      <p class="text-sm leading-6 text-text-secondary">{{ confirmState.message }}</p>
      <template #footer>
        <div class="flex justify-end gap-3">
          <AppButton variant="glass" @click="confirmState.open = false">取消</AppButton>
          <AppButton variant="primary" :danger="confirmState.danger" @click="handleConfirmDialog">
            确认
          </AppButton>
        </div>
      </template>
    </AppModal>

    <StatusToast :show="showToast" :message="toastMessage" :type="toastType" />

    <!-- 导出格式选择弹窗 -->
    <AppModal v-model:open="exportOpen" title="导出代码片段" :footer="null" :width="420">
      <p class="text-sm text-text-secondary">
        将当前列表的 {{ snippets.length }} 条片段导出为文件。
      </p>
      <div class="export-options">
        <AppButton variant="glass" :loading="exporting" @click="handleExportConfirm('json')">
          JSON（含标签与集合）
        </AppButton>
        <AppButton variant="glass" :loading="exporting" @click="handleExportConfirm('markdown')">
          Markdown（按语言分节）
        </AppButton>
      </div>
    </AppModal>

    <!-- 批量加标签弹窗 -->
    <AppModal v-model:open="batchTagOpen" title="批量添加标签" :footer="null" :width="420">
      <p class="text-sm text-text-secondary">
        为选中的 {{ selectedIds.length }} 条片段添加统一标签。
      </p>
      <div class="batch-tag-form">
        <input
          v-model="batchTagValue"
          class="batch-tag-input"
          type="text"
          placeholder="输入标签名，回车确认"
          aria-label="标签名"
          @keydown.enter="confirmBatchTag"
        />
        <AppButton variant="primary" :loading="batchTagSaving" @click="confirmBatchTag">
          添加
        </AppButton>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.snippet-page {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: var(--color-surface-variant);
}

.batch-bar__count {
  font-size: var(--text-xs);
  color: var(--color-text);
  font-weight: 600;
}

.batch-tag-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.batch-tag-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-glass);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-sm);
  outline: none;
}

.batch-tag-input:focus {
  border-color: var(--color-primary);
}

</style>
