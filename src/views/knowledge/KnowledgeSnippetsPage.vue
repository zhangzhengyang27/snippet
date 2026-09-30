<script setup lang="ts">
/** 页面组件，负责知识片段页面展示与交互流程（两栏布局 + 详情/编辑弹窗）。 */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
// 注意：本页直接使用 useRoute 处理命令面板深链
import AppModal from '@/components/common/AppModal.vue'
import SnippetCollectionDialog from '@/components/snippets/SnippetCollectionDialog.vue'
import SnippetEditorDialog from '@/components/snippets/SnippetEditorDialog.vue'
import SnippetListPanel from '@/components/snippets/SnippetListPanel.vue'
import SnippetSidebar from '@/components/snippets/SnippetSidebar.vue'
import SnippetWorkspace from '@/components/snippets/SnippetWorkspace.vue'
import SnippetDetailPane from '@/components/snippets/SnippetDetailPane.vue'
import SnippetsToolbar from '@/components/snippets/SnippetsToolbar.vue'
import StatusToast from '@/components/snippets/StatusToast.vue'
import { useToast } from '@/composables/useToast'
import { snippetSortOptions } from '@/composables/useSnippetListState'
import { useKnowledgeSnippetsPage } from '@/composables/useKnowledgeSnippetsPage'
import { useRecentSnippets } from '@/composables/useRecentSnippets'
import { useSnippetImportExport } from '@/composables/useSnippetImportExport'
import { useSnippetBatchOps } from '@/composables/useSnippetBatchOps'
import { getKnowledgeSnippet } from '@/api/knowledge-snippets'
import type { KnowledgeSnippet } from '@/types/knowledge-snippet'

const router = useRouter()
const route = useRoute()
const { toast } = useToast()
const { pushRecent } = useRecentSnippets()

const {
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
  openCreateCollectionDialog,
  openEditCollectionDialog,
  toggleCollectionExpanded,
  expandCollectionWithAncestors,
  isLoggedIn,
  setPageSize,
  loadMore,
} = useKnowledgeSnippetsPage()

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


/** 移动端：侧边栏抽屉开合 */


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
const handleSelectSnippet = (id: string) => {
  selectedSnippetId.value = id
  pushRecent(id)
  if (detailLayout.value === 'page') {
    router.push(`/snippets/${encodeURIComponent(id)}`)
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
  // new/edit/focus 是一次性深链参数：进入页面时由 route.query watcher 消费，
  // 后续任何 query 同步都要剔除，否则关掉弹窗后一次筛选变化就会把弹窗重新打开
  delete query['new']
  delete query['edit']
  delete query['focus']
  const setOrDel = (key: string, val: string | null | undefined) => {
    if (val) query[key] = val
    else delete query[key]
  }
  setOrDel('q', keyword.value.trim() || null)
  setOrDel('collection', selectedCollectionId.value || null)
  setOrDel('sort', sort.value === 'default' ? null : sort.value)
  if (favoritesOnly.value) query['fav'] = '1'
  else delete query['fav']
  if (page.value > 1) query['page'] = String(page.value)
  else delete query['page']
  return query
}

/** 真正执行 URL 更新的函数，供即时 watcher 与防抖后的关键词更新共用 */
function syncToUrl() {
  if (isApplyingFromUrl) return
  void router.push({ path: '/snippets', query: buildUrlQuery() })
}

/** 非关键词维度：集合 / 收藏 / 排序 / 页码，变化即同步（无防抖，保证操作反馈即时） */
watch(
  () => [
    selectedCollectionId.value,
    favoritesOnly.value,
    sort.value,
    page.value,
  ],
  () => syncToUrl()
)

/** 关键词：300ms 防抖后同步，避免每次按键都触发 router.push */
watch(
  () => keyword.value,
  () => {
    if (isApplyingFromUrl) return
    if (keywordTimer) clearTimeout(keywordTimer)
    keywordTimer = setTimeout(() => {
      keywordTimer = null
      void router.push({ path: '/snippets', query: buildUrlQuery() })
    }, 300)
  }
)

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
    if (q.edit && typeof q.edit === 'string') {
      const target = selectedSnippet.value ?? snippets.value.find((s) => s.id === q.edit)
      if (target) openEditSnippetDialog(target)
      else {
        getKnowledgeSnippet(q.edit)
          .then((s) => openEditSnippetDialog(s))
          .catch(() => toast.error('无法打开编辑'))
      }
    } else if (q.new === '1') {
      openCreateSnippetDialog()
    }
    // 一次性深链参数消费后立即从地址栏剔除（router.replace 不占历史栈），
    // 否则它们会一直留在 URL，后续任何 query 变化都会经本 watcher 重新触发弹窗/选中
    if (q.edit || q.new || q.focus) {
      const cleaned = { ...q }
      delete cleaned['edit']
      delete cleaned['new']
      delete cleaned['focus']
      void router.replace({ path: '/snippets', query: cleaned })
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
</script>

<template>
  <div class="snippet-page">
    <SnippetWorkspace :show-detail="detailLayout === 'split'">
      <template #sidebar>
        <SnippetSidebar
          :snippet-count="total"
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
            :tags="tagOptions"
            :selected-tag="selectedTag"
            :languages="languages"
            :selected-language="selectedLanguage"
            :favorites-only="favoritesOnly"
            :has-active-filters="hasActiveFilters"
            :show-filters="detailLayout === 'page'"
            :compact="detailLayout === 'split'"
            @update:keyword="keyword = $event"
            @update:sort="sort = $event"
            @update:selected-tag="selectedTag = $event"
            @update:selected-language="selectedLanguage = $event"
            @update:favorites-only="favoritesOnly = $event"
            @clear-filters="clearFilters"
            @create-snippet="handleCreateSnippet"
            @require-login="handleRequireLogin"
            @refresh="refreshAll"
          />

          <!-- 数据管理：导出 / 导入 -->
          <div class="data-actions">
            <AppButton
              variant="text"
              size="small"
              :disabled="!snippets.length"
              @click="exportOpen = true"
            >
              <AppIcon icon="material-symbols:file-download" :size="14" />
              导出
            </AppButton>
            <AppButton
              variant="text"
              size="small"
              :disabled="importing"
              @click="importFileInput?.click()"
            >
              <AppIcon icon="material-symbols:file-upload" :size="14" />
              {{
                importing && importProgress
                  ? `导入中 ${importProgress.done}/${importProgress.total}`
                  : '导入'
              }}
            </AppButton>
          </div>

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

          <!-- 导入文件输入（隐藏） -->
          <input
            ref="importFileInput"
            type="file"
            accept="application/json,.json"
            class="hidden"
            aria-label="选择要导入的 JSON 文件"
            @change="handleImportFile"
          />

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
            :can-create="isLoggedIn"
            :has-active-filters="hasActiveFilters"
            :selectable="batchMode"
            :selected-ids="selectedIds"
            @select-snippet="handleSelectSnippet"
            @copy-snippet="handleCopySnippet"
            @toggle-check="handleToggleCheck"
            @clear-filters="clearFilters"
            @create-snippet="handleCreateSnippet"
            @update:page="page = $event"
            @update:page-size="setPageSize"
            @load-more="loadMore"
          />
        </div>
      </template>
      <template #detail>
        <SnippetDetailPane
          :active="detailPaneActive"
          :snippet="detailSnippet"
          @close="handleCloseDetailPane"
          @copy="copySnippetCode"
          @toggle-favorite="toggleFavorite"
          @edit="handleEditFromDetail"
          @delete="handleDeleteFromDetail"
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
  gap: 0.625rem;
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
  font-size: 0.8125rem;
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
  font-size: 0.875rem;
  outline: none;
}

.batch-tag-input:focus {
  border-color: var(--color-primary);
}

</style>
