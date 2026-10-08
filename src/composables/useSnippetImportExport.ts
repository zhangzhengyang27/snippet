/**
 * 片段导出 / 导入（纯客户端逻辑）。
 *
 * 从 `KnowledgeSnippetsPage.vue` 下沉 —— 该页原本同时承担布局、交互与导入导出业务
 * 逻辑，单文件 800+ 行。这里**只搬移逻辑，不改行为**。
 */
import { ref, type Ref } from 'vue'
import { createKnowledgeSnippet, listKnowledgeSnippetsByIds } from '@/api/knowledge-snippets'
import { getApiErrorMessage } from '@/api/client'
import { toast } from '@/composables/useToast'
import type { KnowledgeSnippet, KnowledgeSnippetCollection } from '@/types/knowledge-snippet'
import {
  exportSnippetsJson,
  exportSnippetsMarkdown,
  parseSnippetsJson,
  planSnippetImport,
  readFileAsText,
  SNIPPET_IMPORT_MAX_ITEMS,
  type SnippetImportPlan,
} from '@/utils/snippet-export-import'

export type ExportFormat = 'json' | 'markdown'

export interface UseSnippetImportExportOptions {
  /** 当前列表，作为导出源 */
  snippets: Ref<KnowledgeSnippet[]>
  /** 集合树，导入时用于判断集合是否属于当前账号 */
  collections: Ref<KnowledgeSnippetCollection[]>
  /** 收集全部集合 id（含子孙） */
  collectAllCollectionIds: (items: KnowledgeSnippetCollection[]) => string[]
  /** 导入成功后刷新列表 */
  refresh: () => Promise<void> | void
}

export function useSnippetImportExport(options: UseSnippetImportExportOptions) {
  const { snippets, collections, collectAllCollectionIds, refresh } = options

  const exportOpen = ref(false)
  const exporting = ref(false)
  const importFileInput = ref<HTMLInputElement | null>(null)
  /** 导入进行中：禁用按钮防止重复触发，并展示逐条进度 */
  const importing = ref(false)
  const importProgress = ref<{ done: number; total: number } | null>(null)

  async function handleExportConfirm(format: ExportFormat) {
    if (!snippets.value.length) return
    exporting.value = true
    try {
      // 列表接口为瘦身不回传正文（P0-3）→ 导出前按 id **批量**取回完整片段再落盘
      // （列表项已带正文时，如详情 / 最近浏览来源，则跳过这一步）。
      let source = snippets.value
      if (source.some((snippet) => snippet.content === undefined)) {
        const full = await listKnowledgeSnippetsByIds(source.map((snippet) => snippet.id))
        // 全部 id 都取不到（如均已删除）时退回原列表，避免导出一个空文件
        if (full.length) source = full
      }
      if (format === 'json') exportSnippetsJson(source)
      else exportSnippetsMarkdown(source)
      exportOpen.value = false
      toast.success(`已导出 ${source.length} 条片段`)
    } catch (err) {
      toast.error(getApiErrorMessage(err, '导出失败，请稍后重试'))
    } finally {
      exporting.value = false
    }
  }

  async function handleImportFile(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    // 先解析并规划落位：文件本身不可读/格式错误时整批不开始
    let planned: SnippetImportPlan[] = []
    let skipped = 0
    let overflow = 0
    try {
      const text = await readFileAsText(file)
      const knownIds = new Set(collectAllCollectionIds(collections.value))
      const plan = planSnippetImport(parseSnippetsJson(text), knownIds)
      planned = plan.planned
      skipped = plan.skipped
      overflow = plan.overflow
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败')
      return
    }

    // 超上限整批拒绝：截断导入的话，用户重试同一文件会把已导入部分重复创建
    if (overflow > 0) {
      toast.error(
        `文件含 ${planned.length + overflow} 条可导入片段，超过单次导入上限 ` +
          `${SNIPPET_IMPORT_MAX_ITEMS} 条，请拆分文件后分批导入`
      )
      return
    }

    if (!planned.length) {
      toast.error('文件内没有可导入的片段')
      return
    }

    // 逐条容错：单条失败（正文超限、字段被后端拒绝等）不影响其余条目
    let created = 0
    let relocated = 0
    let failed = 0
    let firstError = ''
    importing.value = true
    importProgress.value = { done: 0, total: planned.length }
    try {
      for (const entry of planned) {
        try {
          await createKnowledgeSnippet({
            name: entry.item.name,
            description: entry.item.description,
            language: entry.item.language,
            content: entry.item.code,
            collectionId: entry.collectionId,
            tags: entry.item.tags,
            favorite: entry.item.favorite,
            displayAttrs: entry.item.displayAttrs,
          })
          created += 1
          if (entry.relocated) relocated += 1
        } catch (err) {
          failed += 1
          if (!firstError) firstError = getApiErrorMessage(err, '创建失败')
        } finally {
          importProgress.value = { done: created + failed, total: planned.length }
        }
      }
    } finally {
      importing.value = false
      importProgress.value = null
    }

    const notes: string[] = []
    if (relocated) notes.push(`${relocated} 条的集合不属于当前账号，已放入未分组`)
    if (skipped) notes.push(`跳过 ${skipped} 条名称或内容为空`)
    if (failed) notes.push(`${failed} 条失败：${firstError}`)

    if (created) {
      toast.success(
        notes.length ? `已导入 ${created} 条（${notes.join('；')}）` : `已导入 ${created} 条片段`
      )
    } else {
      toast.error(notes.length ? `未导入任何片段：${notes.join('；')}` : '文件内没有可导入的片段')
    }

    if (created) await refresh()
  }

  return {
    exportOpen,
    exporting,
    importFileInput,
    importing,
    importProgress,
    handleExportConfirm,
    handleImportFile,
  }
}
