import { ref, computed } from 'vue'
import { getFavorites, addFavorite, removeFavorite } from '@/api/favorites'
import type { CodeExample } from '@/types'
import { toast } from '@/composables/useToast'

const favorites = ref<CodeExample[]>([])
const loading = ref(false)
const loaded = ref(false)

const favoriteIds = computed(() => new Set(favorites.value.map((e) => e.id)))

async function loadFavorites(): Promise<void> {
 if (loading.value) return
 loading.value = true
 try {
   favorites.value = await getFavorites()
   loaded.value = true
 } catch {
   toast.error('收藏列表加载失败，请先登录')
 } finally {
   loading.value = false
 }
}

function isFavorite(exampleId: string): boolean {
 return favoriteIds.value.has(exampleId)
}

async function toggleFavorite(exampleId: string, example?: CodeExample): Promise<void> {
 if (isFavorite(exampleId)) {
   try {
     await removeFavorite(exampleId)
     favorites.value = favorites.value.filter((e) => e.id !== exampleId)
     toast.success('已取消收藏')
   } catch {
     toast.error('取消收藏失败')
   }
 } else {
   try {
     await addFavorite(exampleId)
     if (example) {
       favorites.value.unshift(example)
     }
     toast.success('已收藏')
   } catch {
     toast.error('收藏失败，请先登录')
   }
 }
}

/**
* 清空收藏状态（用于登出时避免跨用户数据泄露）。
* 重置 favorites/loaded，使下次 useFavorites() 调用会重新加载。
*/
export function clearFavorites() {
 favorites.value = []
 loaded.value = false
}

export function useFavorites() {
 const shouldReload = !loaded.value && !loading.value
 if (shouldReload) {
   loadFavorites()
 }

 return {
   favorites,
   loading,
   favoriteIds,
   isFavorite,
   toggleFavorite,
   loadFavorites,
   clearFavorites,
 }
}
