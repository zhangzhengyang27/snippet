/**
 * 键盘事件工具。
 *
 * 供全局快捷键在触发前判断事件目标是否处于输入态
 * （使用点：App.vue、AppHeader.vue、useListShortcuts.ts、ExampleDetailPage.vue；
 * 同时经 sfc-modules 注册为 '@/utils/keyboard' 别名模块，供示例 SFC 引用）。
 */

/**
 * 判断键盘事件目标是否处于输入态：
 *  - 目标是输入框 / 文本域 / 下拉框
 *  - 目标开启了 contenteditable
 *  - 输入法组合输入中（isComposing，避免快捷键打断拼音等待选状态）
 *
 * @param e - 键盘事件对象
 * @returns 处于输入态时返回 true，全局快捷键应跳过处理
 */
export function isTypingTarget(e: KeyboardEvent): boolean {
  if (e.isComposing) return true

  const target = e.target
  if (!(target instanceof HTMLElement)) return false

  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true

  return target.isContentEditable
}
