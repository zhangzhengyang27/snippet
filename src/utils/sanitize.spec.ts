import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from './sanitize'

describe('sanitizeHtml URI 白名单', () => {
  it('放行相对路径与锚点', () => {
    expect(sanitizeHtml('<a href="/docs/x">a</a>')).toContain('href="/docs/x"')
    expect(sanitizeHtml('<a href="#section">a</a>')).toContain('href="#section"')
    expect(sanitizeHtml('<a href="img.png">a</a>')).toContain('href="img.png"')
  })

  it('放行 http(s) 与安全图片 data URI', () => {
    expect(sanitizeHtml('<a href="https://example.com">a</a>')).toContain(
      'href="https://example.com"'
    )
    expect(sanitizeHtml('<img src="data:image/png;base64,AAAA">')).toContain(
      'src="data:image/png;base64,AAAA"'
    )
  })

  it('拒绝协议相对外链（//evil.com）', () => {
    const html = sanitizeHtml('<img src="//evil.com/track.gif">')
    expect(html).not.toContain('//evil.com')
    expect(sanitizeHtml('<a href="//evil.com">x</a>')).not.toContain('//evil.com')
  })

  it('拒绝 javascript: 等危险协议', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:')
    expect(sanitizeHtml('<a href="vbscript:alert(1)">x</a>')).not.toContain('vbscript:')
  })
})
