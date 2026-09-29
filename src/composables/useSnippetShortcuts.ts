/**
 * 代码片段管理器快捷键注册表。
 * 提供统一的快捷键绑定、条件判断和生命周期管理。
 */

export interface ShortcutConfig {
  key: string
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  description: string
  action: () => void
  condition?: () => boolean
  category?: 'navigation' | 'action'
}

/**
 * 创建快捷键监听器。
 *
 * @param configs 快捷键配置数组
 * @returns 清理函数（在 onBeforeUnmount 中调用）
 */
export function useSnippetShortcuts(configs: ShortcutConfig[]) {
  const handler = (e: KeyboardEvent) => {
    // 跳过输入框中的按键（除非是明确的导航快捷键）
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

    for (const cfg of configs) {
      const matchKey = e.key.toLowerCase() === cfg.key.toLowerCase()
      const matchMeta = !!e.metaKey === !!cfg.metaKey
      const matchShift = !!e.shiftKey === !!cfg.shiftKey
      const matchAlt = !!e.altKey === !!cfg.altKey
      const condOk = !cfg.condition || cfg.condition()

      if (matchKey && matchMeta && matchShift && matchAlt && condOk) {
        e.preventDefault()
        cfg.action()
        break
      }
    }
  }

  // 绑定到 document
  document.addEventListener('keydown', handler)

  // 返回清理函数
  return () => {
    document.removeEventListener('keydown', handler)
  }
}
