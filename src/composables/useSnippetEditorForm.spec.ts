/**
 * 片段编辑表单「语义闸门」回归锁。
 *
 * 与后端 `snippet-server/.../snippet-metadata.util.spec.ts` 是同一组边界的镜像，
 * 两边必须同时绿 —— 前端放行而后端 400，用户就会在点保存时莫名失败。
 *
 * 核心是 2026-10-07 修掉的盲点：原实现只做 `desc === title || desc === title + '。'`，
 * 把标题里的空格换成 `/` 就能绕过（当时全库 112 条数据正是这样进来的）。
 */
import { describe, expect, it } from 'vitest'
import {
  SNIPPET_DESCRIPTION_LIMITS,
  SNIPPET_DESCRIPTION_NAME_RESIDUE_MIN,
  SNIPPET_NAME_MAX_LENGTH,
  describeDescriptionIssue,
  describeNameIssue,
  normalizeSnippetMetadataText,
} from './useSnippetEditorForm'

const PINIA_NAME = 'stores user.js - Pinia 状态管理'

/**
 * 注意：`describeDescriptionIssue` 是**逐项早返回**（空 → 过短 → 过长 → 完全相同 → 只是在重复），
 * 所以想验证「复述标题」这一层，样本描述必须先满足 ≥20 字的长度门槛，否则会先报长度问题。
 * 后端 `checkSnippetMetadata` 则是返回全部违规项，两边顺序语义不同，用例写法也不同。
 */
const LONG_TITLE = 'Redis 缓存穿透的完整防护方案与落地细节'

describe('normalizeSnippetMetadataText', () => {
  it('忽略大小写、标点、空白与符号（与后端同口径）', () => {
    expect(normalizeSnippetMetadataText(PINIA_NAME)).toBe(
      normalizeSnippetMetadataText('stores/user.js - Pinia 状态管理。')
    )
  })
})

describe('describeNameIssue', () => {
  it('合格标题返回空串', () => {
    expect(describeNameIssue('Vue 数据加载状态')).toBe('')
  })

  it('空标题直接拦下', () => {
    expect(describeNameIssue('   ')).toContain('不能为空')
  })

  it('恰好 30 字放行、31 字拦下（与后端 nameMaxLength 一致）', () => {
    const exact = '甲'.repeat(SNIPPET_NAME_MAX_LENGTH)
    expect(describeNameIssue(exact)).toBe('')
    expect(describeNameIssue('甲'.repeat(SNIPPET_NAME_MAX_LENGTH + 1))).toContain('超过 30 字上限')
  })

  it('长度判据按 trim 后的字符数计算', () => {
    const padded = `  ${'甲'.repeat(SNIPPET_NAME_MAX_LENGTH)}  `
    expect(describeNameIssue(padded)).toBe('')
  })
})

describe('describeDescriptionIssue', () => {
  it('合格描述返回空串', () => {
    expect(
      describeDescriptionIssue(
        'Redis 缓存穿透',
        '用布隆过滤器先拦掉不存在的 key，再对空结果做短 TTL 缓存，避免请求全部落到数据库。'
      )
    ).toBe('')
  })

  it('空描述与过短描述拦下', () => {
    expect(describeDescriptionIssue('标题', '')).toContain('不能为空')
    expect(describeDescriptionIssue('标题', '太短了')).toContain('至少 20 字')
  })

  it('超过 400 字拦下', () => {
    const long = '甲'.repeat(SNIPPET_DESCRIPTION_LIMITS.max + 1)
    expect(describeDescriptionIssue('标题', long)).toContain('超过 400 字上限')
  })

  it('与标题完全相同拦下（原有行为的回归锁）', () => {
    expect(describeDescriptionIssue(LONG_TITLE, LONG_TITLE)).toContain('完全相同')
    expect(describeDescriptionIssue(LONG_TITLE, `${LONG_TITLE}。`)).toContain('完全相同')
  })

  // ↓↓↓ 旧实现漏掉、本次修复的核心场景 ↓↓↓

  it('把空格换成斜杠后照抄：按归一化判为完全相同', () => {
    expect(describeDescriptionIssue(PINIA_NAME, 'stores/user.js - Pinia 状态管理。')).toContain(
      '完全相同'
    )
  })

  it('仅大小写与标点不同：按归一化判为完全相同', () => {
    expect(
      describeDescriptionIssue(
        'Web Component 通过属性 slot 事件对外通信',
        'web component 通过属性/slot/事件对外通信。'
      )
    ).toContain('完全相同')
  })

  it('标题重复两遍：判为「只是在重复标题」', () => {
    const title = '支持 HTTP Range 的文件下载与断点续传'
    expect(describeDescriptionIssue(title, `${title}：${title}。`)).toContain('只是在重复标题')
  })

  it('标题 + 几个不含信息的尾巴：判为「只是在重复标题」', () => {
    expect(
      describeDescriptionIssue('Redis 键过期与内存管理', 'Redis 键过期与内存管理 TTL 设置与查看。')
    ).toContain('只是在重复标题')
  })

  it('去掉标题后正好剩 10 字：放行（阈值边界，不留误伤）', () => {
    expect(
      describeDescriptionIssue(
        'Redis 缓存',
        'Redis 缓存穿透与击穿的常用处置方案，布隆过滤器加空值缓存即可。'
      )
    ).toBe('')
  })

  it('去掉标题后只剩 9 字：拦下（阈值边界）', () => {
    // 归一化后剩余「击穿与雪崩应对方案」共 9 字，正好卡在阈值下方
    expect(
      describeDescriptionIssue('Redis 缓存穿透防护', 'Redis 缓存穿透防护：击穿与雪崩应对方案')
    ).toContain('只是在重复标题')
  })

  it('只在句中提到标题、且补充了实质内容：不得误伤', () => {
    expect(
      describeDescriptionIssue(
        'Node 读取大文件',
        '用 readline 逐行消费，避免把内容一次性读进内存，也适用于 Node 读取大文件的日志场景。'
      )
    ).toBe('')
  })

  it('标题为空时不做复述比对', () => {
    expect(
      describeDescriptionIssue('', '一段与标题无关的说明文字，超过二十个字用于通过长度校验。')
    ).toBe('')
  })

  it('阈值常量与后端保持一致', () => {
    expect(SNIPPET_DESCRIPTION_NAME_RESIDUE_MIN).toBe(10)
    expect(SNIPPET_DESCRIPTION_LIMITS.min).toBe(20)
    expect(SNIPPET_DESCRIPTION_LIMITS.max).toBe(400)
    expect(SNIPPET_NAME_MAX_LENGTH).toBe(30)
  })
})
