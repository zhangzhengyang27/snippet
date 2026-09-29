/**
 * 片段语言的展示名与品牌色。
 *
 * 使用点：SnippetListRow.vue / SnippetDetailPage.vue —— 返回值直接用于
 * 语言色点的 background 与语言徽标文案。
 *  - 显示名与编辑器语言下拉（types/code-block 的 codeBlockLanguages.label）
 *    保持同源，别名（js / ts / sh / yml…）归一化后映射到规范显示名；
 *  - 品牌色采用 GitHub Linguist 的语言配色（业界通用口径），未知语言
 *    回退中性灰 #9e9e9e（与 SnippetDetailPage 的兜底色一致）。
 */
import { codeBlockLanguages, normalizeSnippetLanguage } from '@/types/code-block'

/** 未知语言 / 空语言的兜底色（中性灰）。 */
const FALLBACK_COLOR = '#9e9e9e'

/** 规范语言值与别名 → 显示名（由 codeBlockLanguages 单一来源构建）。 */
const LANGUAGE_LABELS: Record<string, string> = {}
for (const def of codeBlockLanguages) {
  LANGUAGE_LABELS[def.value] = def.label
  for (const alias of def.aliases ?? []) {
    LANGUAGE_LABELS[alias] = def.label
  }
}

/**
 * 各语言的品牌色（GitHub Linguist 配色，键为规范语言值）。
 * 新增语言时同步更新 types/code-block 的 codeBlockLanguages。
 */
const LANGUAGE_COLORS: Record<string, string> = {
  text: FALLBACK_COLOR,
  bash: '#89e051',
  javascript: '#f1e05a',
  typescript: '#3178c6',
  python: '#3572A5',
  java: '#b07219',
  go: '#00ADD8',
  css: '#563d7c',
  html: '#e34c26',
  json: '#292929',
  yaml: '#cb171e',
  sql: '#e38c00',
  markdown: '#083fa1',
  mermaid: '#ff3670',
  vue: '#41b883',
}

/**
 * 获取语言的展示名。
 * 别名归一化后命中内置语言表返回其 label（如 js → JavaScript）；
 * 未收录语言原样返回小写文本，空值返回空串。
 *
 * @param lang - 语言标识（如 javascript / js / ts / text）
 * @returns 语言展示名
 */
export function languageLabel(lang: string): string {
  const normalized = normalizeSnippetLanguage(lang)
  if (!normalized) return ''
  return LANGUAGE_LABELS[normalized] ?? normalized
}

/**
 * 获取语言的品牌色（色点用）。
 * 未收录语言 / 空值返回中性灰兜底色。
 *
 * @param lang - 语言标识
 * @returns CSS 颜色值（十六进制）
 */
export function languageColor(lang: string): string {
  const normalized = normalizeSnippetLanguage(lang)
  if (!normalized) return FALLBACK_COLOR
  return LANGUAGE_COLORS[normalized] ?? FALLBACK_COLOR
}
