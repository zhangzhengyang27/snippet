/**
 * 片段版本 Diff 计算工具。
 *
 * 历史上本模块还承载版本列表的加载/缓存/回滚/删除（对接
 * /knowledge/snippets/:id/versions 系列接口），因 UI 侧从未接入且缓存
 * 无淘汰机制，已裁剪；仅保留纯函数 computeVersionDiff。
 * 若未来需要版本历史 UI，请基于 api/client 重新实现并内置竞态防护。
 */
import * as Diff from 'diff'

/**
 * 计算两个版本内容的差异（返回带标记的行数组）。
 * oldContent/newContent 为纯代码文本。
 */
export function computeVersionDiff(
  oldContent: string,
  newContent: string
): {
  added: { lineNum: number; text: string }[]
  removed: { lineNum: number; text: string }[]
  unchanged: { lineNum: number; text: string }[]
} {
  const oldLines = (oldContent ?? '').split('\n')
  const newLines = (newContent ?? '').split('\n')

  const changes = Diff.diffArrays(oldLines, newLines)

  let globalLineNum = 0
  const added: { lineNum: number; text: string }[] = []
  const removed: { lineNum: number; text: string }[] = []
  const unchanged: { lineNum: number; text: string }[] = []

  for (const part of changes) {
    if (part.added) {
      for (const line of part.value) {
        added.push({ lineNum: ++globalLineNum, text: line })
      }
    } else if (part.removed) {
      for (const line of part.value) {
        removed.push({ lineNum: ++globalLineNum, text: line })
      }
    } else {
      for (const line of part.value) {
        const num = ++globalLineNum
        unchanged.push({ lineNum: num, text: line })
        added.push({ lineNum: num, text: line })
        removed.push({ lineNum: num, text: line })
      }
    }
  }

  return { added, removed, unchanged }
}
