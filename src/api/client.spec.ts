/**
 * getApiErrorMessage 单测。
 *
 * 这个函数被 12 处调用（收藏夹 / 最近 / 概览 / 集合树 / 片段列表 / 命令面板 …）
 * 用于生成**直接展示给用户**的错误文案，因此它的两条防泄漏规则值得被锁住。
 */
import { describe, expect, it } from 'vitest'
import { ApiError, getApiErrorMessage } from './client'

const err = (status: number, body?: unknown) =>
  new ApiError(status, 'Not Found', 'http://localhost/api/x', body)

describe('getApiErrorMessage', () => {
  describe('防泄漏：不可读的响应体应回落到 fallback', () => {
    it('HTML 错误页（网关 / nginx / 静态服务器 502、504、404）不能被透出', () => {
      const html = '<!DOCTYPE HTML>\n<html lang="en">\n<head><title>Error</title></head></html>'
      expect(getApiErrorMessage(err(404, html), '加载失败')).toBe('加载失败')
      // 前后有空白时同样要识别出来
      expect(getApiErrorMessage(err(502, `  \n${html}`), '加载失败')).toBe('加载失败')
    })

    it('超长文本（>200 字符）不能被透出', () => {
      expect(getApiErrorMessage(err(500, 'x'.repeat(201)), '加载失败')).toBe('加载失败')
      // 边界：正好 200 字符应当保留
      expect(getApiErrorMessage(err(500, 'x'.repeat(200)))).toHaveLength(200)
    })

    it('无响应体时返回 fallback，而不是「API Error: 404 Not Found - /api/xxx」', () => {
      const msg = getApiErrorMessage(err(404), '收藏加载失败')
      expect(msg).toBe('收藏加载失败')
      expect(msg).not.toContain('API Error')
      expect(msg).not.toContain('/api/')
    })

    it('空字符串响应体同样回落到 fallback', () => {
      expect(getApiErrorMessage(err(500, ''), '加载失败')).toBe('加载失败')
    })
  })

  describe('正常路径：可读信息应被提取', () => {
    it('后端返回 { message: string }', () => {
      expect(getApiErrorMessage(err(400, { message: 'exampleId 不能为空' }))).toBe(
        'exampleId 不能为空'
      )
    })

    it('后端返回 { message: string[] }（class-validator 的多条校验错误）', () => {
      expect(getApiErrorMessage(err(400, { message: ['标题不能为空', '语言不合法'] }))).toBe(
        '标题不能为空；语言不合法'
      )
    })

    it('响应体是纯文本时直接使用（如代理返回的简短说明）', () => {
      expect(getApiErrorMessage(err(503, 'upstream connect failed'))).toBe(
        'upstream connect failed'
      )
    })

    it('空数组 message 视为无可用信息', () => {
      expect(getApiErrorMessage(err(400, { message: [] }), '请求失败')).toBe('请求失败')
    })
  })

  describe('兜底', () => {
    it('非 ApiError 的 Error 使用其 message', () => {
      expect(getApiErrorMessage(new Error('boom'))).toBe('boom')
    })

    it('非 Error 输入返回默认 fallback', () => {
      expect(getApiErrorMessage('字符串')).toBe('请求失败')
      expect(getApiErrorMessage(undefined, '自定义兜底')).toBe('自定义兜底')
    })
  })
})
