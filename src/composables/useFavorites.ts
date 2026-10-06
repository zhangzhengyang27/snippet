import { ref } from 'vue'
import { addFavorite, removeFavorite } from '@/api/favorites'
import { getApiErrorMessage } from '@/api/client'
import { toast } from '@/composables/useToast'

/**
 * 收藏（按用户，收藏对象为**代码块**）。
 *
 * 收藏态的真源在接口响应上 —— 后端按当前用户把结果写进
 * `KnowledgeSnippet.favorite`（列表与详情一致）。因此这里**不再维护一份
 * 全局收藏列表**（那是旧的「示例收藏」模型，示例库已整体下线），只负责：
 *  - 调用增 / 删接口；
 *  - 维护一个本地乐观集合，供跨组件即时反映刚发生的切换；
 *  - 登出时清空，避免上一个用户的痕迹残留到下一个用户。
 */

/** 本地乐观缓存：本次会话中被切换过收藏态的片段 id。 */
const favoriteIds = ref<Set<string>>(new Set())

/** 记录/清除某个片段的本地收藏态（详情页拿到接口数据后可调用以对齐）。 */
function syncFavorite(id: string, on: boolean): void {
  const next = new Set(favoriteIds.value)
  if (on) next.add(id)
  else next.delete(id)
  favoriteIds.value = next
}

function isFavorite(id: string): boolean {
  return favoriteIds.value.has(id)
}

/**
 * 清空收藏状态（登出时调用，避免跨用户数据泄露）。
 * 由 authStore 在登出流程里调用。
 */
export function clearFavorites(): void {
  favoriteIds.value = new Set()
}

export function useFavorites() {
  const busy = ref(false)

  /**
   * 切换收藏并返回**切换后的新态**。
   *
   * 调用方传入当前态（来自接口的 `snippet.favorite`），失败时返回原态，
   * 不抛错 —— 错误已在此处转成 toast，调用方只管用返回值更新本地显示。
   */
  async function toggleFavorite(snippetId: string, currentlyFavorite: boolean): Promise<boolean> {
    if (busy.value) return currentlyFavorite
    busy.value = true
    try {
      if (currentlyFavorite) {
        await removeFavorite(snippetId)
        syncFavorite(snippetId, false)
        toast.success('已取消收藏')
        return false
      }
      await addFavorite(snippetId)
      syncFavorite(snippetId, true)
      toast.success('已加入收藏')
      return true
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, currentlyFavorite ? '取消收藏失败' : '收藏失败，请先登录')
      )
      return currentlyFavorite
    } finally {
      busy.value = false
    }
  }

  return { favoriteIds, busy, isFavorite, syncFavorite, toggleFavorite, clearFavorites }
}
