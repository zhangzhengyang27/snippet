/**
 * 日期时间格式化 —— 全应用唯一入口。
 *
 * 此前这些逻辑以 6 份内联实现散落在 DashboardPage / RecentPage / SnippetListRow /
 * SnippetDetailPage / SnippetDetailDialog / SnippetDetailPane 里。本模块把它们收口，
 * 并**如实保留**各场景之间原本就存在的差异（而不是强行统一成一种格式）。
 *
 * 三组函数的定位：
 * - `formatDateTime`    需要精确时刻的场景（创建于 / 更新于 / 最后使用）
 * - `formatRelativeTime` 中等宽度的列表（概览、最近使用）—— 分钟粒度
 * - `formatRelativeDay`  窄卡片（片段列表行）—— 天粒度，含「昨天」，日期更紧凑
 *
 * ⚠️ `formatRelativeTime` 与 `formatRelativeDay` **不是重复实现**，差异是刻意的：
 * 卡片宽度有限，需要「昨天」这种更短且更符合直觉的表达，以及 `M/D` 这种紧凑日期。
 * 若将来要统一，请先确认产品上接受哪种取舍。
 */

/** 默认空值占位 */
export const EMPTY_PLACEHOLDER = '—'

/**
 * 把任意输入安全地转成 Date；无效输入返回 null。
 *
 * 各函数统一走这里，因此**无效日期不会渲染成「NaN 分钟前」这类脏数据**，
 * 而是回落到空值占位。（原 RecentPage / DashboardPage 的实现缺这一层保护。）
 */
function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * 完整日期时间（本地化，24 小时制）。例：`2026/9/30 09:53:36`
 *
 * @param emptyText 空值 / 无效值时的占位符。默认 `'—'`；
 *                  弹窗场景可用 `'暂无'`。
 */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  emptyText: string = EMPTY_PLACEHOLDER
): string {
  const d = toDate(value)
  if (!d) return emptyText
  return d.toLocaleString('zh-CN', { hour12: false })
}

/**
 * 相对时间（**分钟粒度**）：刚刚 / N 分钟前 / N 小时前 / N 天前 / 超出 7 天回落日期。
 *
 * 适用于中等宽度的列表项（概览页、最近使用页）。
 */
export function formatRelativeTime(
  value: string | number | Date | null | undefined,
  emptyText: string = EMPTY_PLACEHOLDER
): string {
  const d = toDate(value)
  if (!d) return emptyText

  const minutes = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`

  return d.toLocaleDateString('zh-CN')
}

/**
 * 相对时间（**天粒度，紧凑**）：刚刚 / N 小时前 / 昨天 / N 天前 / 同年 `M/D` / 跨年 `Y/M/D`。
 *
 * 适用于窄卡片（片段列表行）。与 `formatRelativeTime` 的差异见文件头说明。
 *
 * @param emptyText 默认 `''`（卡片里不占位，避免出现孤立的破折号）。
 */
export function formatRelativeDay(
  value: string | number | Date | null | undefined,
  emptyText = ''
): string {
  const d = toDate(value)
  if (!d) return emptyText

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / 3_600_000)
    return diffHours <= 0 ? '刚刚' : `${diffHours} 小时前`
  }
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`

  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

/**
 * 仅日期（本地化）。例：`2026/9/30`
 */
export function formatDateOnly(
  value: string | number | Date | null | undefined,
  emptyText: string = EMPTY_PLACEHOLDER
): string {
  const d = toDate(value)
  if (!d) return emptyText
  return d.toLocaleDateString('zh-CN')
}

/**
 * 长日期标签（用于问候语旁）。例：`9月30日星期三`
 */
export function formatDateLabel(value: string | number | Date | null | undefined): string {
  const d = toDate(value) ?? new Date()
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
}
