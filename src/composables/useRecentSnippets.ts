/**
 * 最近浏览的代码片段（localStorage 持久化）。
 * 供命令面板"最近"分组与快速回访使用。仅保存 id，名称等信息在读取时由调用方再取。
 */
import { useStorage } from '@vueuse/core'
import { computed } from 'vue'

const STORAGE_KEY = 'recent-snippets'
const MAX_RECENT = 8

const recentIds = useStorage<string[]>(STORAGE_KEY, [])

export function useRecentSnippets() {
  const recent = computed(() => recentIds.value)

  const pushRecent = (id: string) => {
    const next = [id, ...recentIds.value.filter((x) => x !== id)].slice(0, MAX_RECENT)
    recentIds.value = next
  }

  const clearRecent = () => {
    recentIds.value = []
  }

  return { recent, pushRecent, clearRecent }
}
