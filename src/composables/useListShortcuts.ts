import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { isTypingTarget } from '@/utils/keyboard'

export interface UseListShortcutsOptions<T extends { id: string }> {
  items: Ref<T[]>
  onOpen: (item: T) => void
  searchRef?: Ref<{ focus: () => void } | null>
  activeIndex?: Ref<number>
}

export function useListShortcuts<T extends { id: string }>(
  options: UseListShortcutsOptions<T>
): { activeIndex: Ref<number> } {
  const { items, onOpen, searchRef } = options
  const activeIndex = options.activeIndex ?? ref(-1)

  function focusSearch() {
    searchRef?.value?.focus()
  }

  function clearSelection() {
    activeIndex.value = -1
  }

  function scrollActiveIntoView() {
    if (activeIndex.value < 0) return
    const element = document.querySelector<HTMLElement>(`[data-card-index="${activeIndex.value}"]`)
    element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      clearSelection()
      return
    }

    if (isTypingTarget(e)) return

    if (e.key === '/') {
      e.preventDefault()
      focusSearch()
      return
    }

    if (items.value.length === 0) return

    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault()
      activeIndex.value = (activeIndex.value + 1) % items.value.length
      scrollActiveIntoView()
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault()
      activeIndex.value = activeIndex.value <= 0 ? items.value.length - 1 : activeIndex.value - 1
      scrollActiveIntoView()
    } else if (e.key === 'Enter' && activeIndex.value >= 0) {
      e.preventDefault()
      onOpen(items.value[activeIndex.value])
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))

  return { activeIndex }
}
