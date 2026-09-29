import { describe, it, expect } from 'vitest'
import { escapeHtml } from '@/utils/escape'
import {
  getSandboxAttributes,
  SANDBOX_ALLOWED_PREFIXES,
  hasTrustedAssetReference,
  buildSrcDoc,
} from './sandbox'
import type { CodeExample } from '@/types'

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

  it('hasTrustedAssetReference 检测可信资源引用', () => {
    const withAsset: CodeExample = {
      id: '1',
      title: 't',
      html: '<img src="/shared-assets/a.png">',
    } as CodeExample
    const without: CodeExample = {
      id: '2',
      title: 't',
      html: '<img src="https://evil.com/a.png">',
    } as CodeExample
    expect(hasTrustedAssetReference(withAsset)).toBe(true)
    expect(hasTrustedAssetReference(without)).toBe(false)
  })
})

describe('buildSrcDoc', () => {
  it('注入 CSP meta 标签', () => {
    const ex: CodeExample = { id: '1', title: 't', html: '<p>hi</p>' } as CodeExample
    const doc = buildSrcDoc(ex)
    expect(doc).toContain('http-equiv="Content-Security-Policy"')
    expect(doc).toContain("connect-src 'none'")
  })

  it('CSP 携带 sandbox 指令且不含 allow-same-origin，保证新标签页打开也运行在 opaque origin', () => {
    const ex: CodeExample = { id: '1', title: 't', html: '<p>hi</p>' } as CodeExample
    const doc = buildSrcDoc(ex)
    expect(doc).toContain('sandbox allow-scripts allow-forms allow-modals allow-popups;')
    expect(doc).not.toContain('allow-same-origin')
  })

  it('转义脚本中的闭合标签，防止提前结束 script', () => {
    const ex: CodeExample = {
      id: '1',
      title: 't',
      js: "console.log('</script><script>alert(1)')",
    } as CodeExample
    const doc = buildSrcDoc(ex)
    expect(doc).not.toContain('</script><script>alert(1)')
    expect(doc).toContain('<\\/script>')
  })

  it('移除 <base href> 同源访问，改用代理引导脚本', () => {
    const ex: CodeExample = { id: '1', title: 't', html: '<p>hi</p>' } as CodeExample
    const doc = buildSrcDoc(ex)
    expect(doc).not.toContain('<base')
    expect(doc).toContain('SNIPPET_SANDBOX_RESOURCE')
  })
})
