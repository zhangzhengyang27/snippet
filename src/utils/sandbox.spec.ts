import { describe, it, expect } from 'vitest'
import { escapeHtml } from '@/utils/escape'
import {
  getSandboxAttributes,
  SANDBOX_ALLOWED_PREFIXES,
  buildSnippetSrcDoc,
  resolveAllowedResource,
} from './sandbox'

describe('escapeHtml', () => {
  it('转义 HTML 特殊字符', () => {
    expect(escapeHtml('<script>"x" & \'y\'</script>')).toBe(
      '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;'
    )
  })
})

describe('getSandboxAttributes', () => {
  it('严格隔离，绝不携带 allow-same-origin', () => {
    const attrs = getSandboxAttributes()
    expect(attrs).not.toContain('allow-same-origin')
    expect(attrs).toContain('allow-scripts')
  })
})

describe('sandbox 资源白名单', () => {
  it('仅允许可信前缀', () => {
    expect(SANDBOX_ALLOWED_PREFIXES.every((p) => p.startsWith('/'))).toBe(true)
  })
})

describe('buildSnippetSrcDoc', () => {
  it('注入 CSP meta 标签', () => {
    const doc = buildSnippetSrcDoc('<p>hi</p>', [])
    expect(doc).toContain('http-equiv="Content-Security-Policy"')
    expect(doc).toContain("connect-src 'none'")
  })

  it('CSP 携带 sandbox 指令且不含 allow-same-origin，保证新标签页打开也运行在 opaque origin', () => {
    const doc = buildSnippetSrcDoc('<p>hi</p>', [])
    expect(doc).toContain('sandbox allow-scripts allow-forms allow-modals allow-popups;')
    expect(doc).not.toContain('allow-same-origin')
  })

  it('注入沙箱引导脚本（父窗口代理通道）', () => {
    const doc = buildSnippetSrcDoc('<p>hi</p>', [])
    expect(doc).toContain('SNIPPET_SANDBOX_RESOURCE')
  })

  it('内联 <script src> 引用的同片段文件，使文档脱离外部文件独立运行', () => {
    const doc = buildSnippetSrcDoc('<script src="./util.js"></script>', [
      { name: 'util.js', code: 'window.__inlined = 1' },
    ])
    expect(doc).toContain('window.__inlined = 1')
    expect(doc).not.toContain('src="./util.js"')
  })

  it('转义内联脚本中的闭合标签，防止提前结束 script', () => {
    const doc = buildSnippetSrcDoc('<script src="./x.js"></script>', [
      { name: 'x.js', code: "console.log('</script><script>alert(1)')" },
    ])
    expect(doc).not.toContain('</script><script>alert(1)')
    expect(doc).toContain('<\\/script>')
  })
})

/**
 * A2 回归：代理白名单必须按「规范化后」的路径判定，而不是原始字符串前缀。
 * 修复前 `/shared-assets/../api/knowledge/snippets` 能通过前缀检查，
 * fetch 折叠 `..` 后实际打到真实接口 —— 沙箱内代码可借父窗口代理以登录用户身份读数据。
 */
describe('resolveAllowedResource · 沙箱代理白名单（A2）', () => {
  it('放行白名单内的同源资源，并保留 query', () => {
    expect(resolveAllowedResource('/shared-assets/a.png')).toBe('/shared-assets/a.png')
    expect(resolveAllowedResource('/assets/app.css?v=2')).toBe('/assets/app.css?v=2')
  })

  it('拒绝白名单之外的同源路径', () => {
    expect(resolveAllowedResource('/api/knowledge/snippets')).toBeNull()
    expect(resolveAllowedResource('/')).toBeNull()
  })

  it('拒绝借 `..` 折叠绕过白名单的路径（本次修复的核心用例）', () => {
    expect(resolveAllowedResource('/shared-assets/../api/knowledge/snippets')).toBeNull()
    expect(resolveAllowedResource('/assets/../../api/auth/me')).toBeNull()
    expect(resolveAllowedResource('/images/../shared-assets/../api/me')).toBeNull()
  })

  it('拒绝编码形式的点号穿越', () => {
    expect(resolveAllowedResource('/shared-assets/%2e%2e/api/knowledge/snippets')).toBeNull()
    expect(resolveAllowedResource('/shared-assets/%2E%2E/api/auth/me')).toBeNull()
  })

  it('拒绝跨域绝对 URL 与协议相对 URL', () => {
    expect(resolveAllowedResource('https://evil.com/shared-assets/a.png')).toBeNull()
    expect(resolveAllowedResource('//evil.com/shared-assets/a.png')).toBeNull()
  })

  it('拒绝空值与非字符串', () => {
    expect(resolveAllowedResource('')).toBeNull()
    expect(resolveAllowedResource(undefined as unknown as string)).toBeNull()
    expect(resolveAllowedResource(null as unknown as string)).toBeNull()
  })

  it('引导脚本内置的 isAllowed 同样拒绝穿越与绝对 URL（纵深防御）', () => {
    const doc = buildSnippetSrcDoc('<p>hi</p>', [])
    // 沙箱内判定要求以 "/" 开头的站内相对路径
    expect(doc).toContain("u.charAt(0) !== '/'")
    expect(doc).toContain("u.indexOf('//') === 0")
    expect(doc).toContain('\\.\\.|%2e')
  })
})
