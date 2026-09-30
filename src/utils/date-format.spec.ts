/**
 * 日期格式化单测。
 *
 * 这组测试的核心目的不是"覆盖率"，而是**证明合并重构没有改变行为** ——
 * 6 份内联实现被收口到一个模块，任何一处语义漂移都应该在这里被抓住。
 *
 * 因此每个断言都对应原实现的一行逻辑（含边界），并额外覆盖原实现缺失的
 * 「无效日期」分支。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EMPTY_PLACEHOLDER,
  formatDateLabel,
  formatDateOnly,
  formatDateTime,
  formatRelativeDay,
  formatRelativeTime,
} from './date-format'

/** 构造本地时间的 Date，避免测试结果受运行环境时区影响 */
const at = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min, 0, 0)

const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

/** 基准时刻：2026-09-30 09:00（本地） */
const NOW = at(2026, 9, 30, 9)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('formatDateTime', () => {
  it('空值返回默认占位符', () => {
    expect(formatDateTime(null)).toBe(EMPTY_PLACEHOLDER)
    expect(formatDateTime(undefined)).toBe(EMPTY_PLACEHOLDER)
    expect(formatDateTime('')).toBe(EMPTY_PLACEHOLDER)
  })

  it('支持自定义占位符（SnippetDetailDialog 用「暂无」）', () => {
    expect(formatDateTime(null, '暂无')).toBe('暂无')
  })

  it('输出 24 小时制的本地化完整时间', () => {
    const out = formatDateTime(at(2026, 9, 30, 14, 5))
    expect(out).toContain('2026')
    expect(out).toContain('14:05')
    expect(out).not.toMatch(/[上下]午/)
  })

  it('无效日期回落到占位符（原实现无此保护）', () => {
    expect(formatDateTime('not-a-date')).toBe(EMPTY_PLACEHOLDER)
  })
})

describe('formatRelativeTime（分钟粒度：概览 / 最近使用）', () => {
  it('1 分钟内 → 刚刚', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 30_000))).toBe('刚刚')
  })

  it('分钟级边界：59 分钟 → 分钟前，60 分钟 → 1 小时前', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 59 * MIN))).toBe('59 分钟前')
    expect(formatRelativeTime(new Date(NOW.getTime() - 60 * MIN))).toBe('1 小时前')
  })

  it('小时级边界：23 小时 → 小时前，24 小时 → 1 天前', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 23 * HOUR))).toBe('23 小时前')
    expect(formatRelativeTime(new Date(NOW.getTime() - 24 * HOUR))).toBe('1 天前')
  })

  it('天级边界：6 天 → 天前，7 天 → 回落日期', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 6 * DAY))).toBe('6 天前')
    const fallback = formatRelativeTime(new Date(NOW.getTime() - 7 * DAY))
    expect(fallback).not.toContain('前')
    expect(fallback).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2}$/)
  })

  it('空值 → 占位符；无效日期 → 占位符（原实现会渲染「NaN 分钟前」）', () => {
    expect(formatRelativeTime(null)).toBe(EMPTY_PLACEHOLDER)
    expect(formatRelativeTime('not-a-date')).toBe(EMPTY_PLACEHOLDER)
  })
})

describe('formatRelativeDay（天粒度紧凑：片段列表行）', () => {
  it('当天内按小时，刚过 0 点按「刚刚」', () => {
    expect(formatRelativeDay(new Date(NOW.getTime() - 30_000))).toBe('刚刚')
    expect(formatRelativeDay(new Date(NOW.getTime() - 5 * HOUR))).toBe('5 小时前')
  })

  it('有「昨天」这一档（这是与 formatRelativeTime 的关键差异）', () => {
    // 25 小时前 → 落在昨天
    expect(formatRelativeDay(new Date(NOW.getTime() - 25 * HOUR))).toBe('昨天')
    // 对照：同一时刻在分钟粒度版本里是「1 天前」
    expect(formatRelativeTime(new Date(NOW.getTime() - 25 * HOUR))).toBe('1 天前')
  })

  it('2–6 天 → N 天前', () => {
    expect(formatRelativeDay(new Date(NOW.getTime() - 3 * DAY))).toBe('3 天前')
    expect(formatRelativeDay(new Date(NOW.getTime() - 6 * DAY))).toBe('6 天前')
  })

  it('同年超过 7 天 → 紧凑 M/D', () => {
    expect(formatRelativeDay(at(2026, 9, 20))).toBe('9/20')
    expect(formatRelativeDay(at(2026, 1, 5))).toBe('1/5')
  })

  it('跨年 → 完整 Y/M/D', () => {
    expect(formatRelativeDay(at(2025, 12, 25))).toBe('2025/12/25')
  })

  it('空值 / 无效日期 → 空串（卡片里不留孤立破折号）', () => {
    expect(formatRelativeDay(null)).toBe('')
    expect(formatRelativeDay('not-a-date')).toBe('')
  })
})

describe('formatDateOnly', () => {
  it('仅日期，本地化', () => {
    expect(formatDateOnly(at(2026, 9, 30))).toMatch(/^2026\/9\/30$/)
  })

  it('空值 → 占位符', () => {
    expect(formatDateOnly(null)).toBe(EMPTY_PLACEHOLDER)
  })
})

describe('formatDateLabel（问候语旁的长日期）', () => {
  it('输出「月日星期」形式', () => {
    const out = formatDateLabel(at(2026, 9, 30))
    expect(out).toContain('9月')
    expect(out).toContain('30')
    expect(out).toContain('星期')
  })

  it('无参数时回落到当前时间（不返回空）', () => {
    expect(formatDateLabel(null)).toContain('月')
  })
})
