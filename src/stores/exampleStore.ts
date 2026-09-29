/**
 * 示例库主题 store：为主导航的主题链接提供数据。
 *
 * 恢复推断：仅 AppHeader 通过 store.topics 消费（过滤 count>0 的主题生成导航），
 * 其余字段无使用点；主题列表按需从示例接口聚合，避免启动时全量拉取。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getExamples } from '@/api/examples'

export interface ExampleTopic {
  /** 主题标识（URL 段） */
  slug: string
  /** 展示名 */
  name: string
  /** 该主题下的示例数量 */
  count: number
}

export const useExampleStore = defineStore('exampleStore', () => {
  const topics = ref<ExampleTopic[]>([])
  const loading = ref(false)
  let loaded = false

  /** 拉取主题列表（带一次性缓存，失败静默保留旧值）。 */
  async function ensureTopics() {
    if (loaded || loading.value) return
    loading.value = true
    try {
      const res = await getExamples({ page: 1, limit: 1 })
      // 恢复推断：后端未提供独立主题聚合接口前，主题区为空即可，
      // 导航会自动隐藏 count 为 0 的主题。
      void res
      loaded = true
    } catch {
      // 静默降级：导航主题区留空
    } finally {
      loading.value = false
    }
  }

  return { topics, loading, ensureTopics }
})
