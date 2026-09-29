import DOMPurify from 'dompurify'

/**
 * 对 HTML 字符串进行消毒，防止 XSS 注入。
 * 允许的标签覆盖默认白名单，保留常见展示标签。
 */
const ALLOWED_TAGS = [
  'a',
  'b',
  'br',
  'code',
  'del',
  'em',
  'i',
  'img',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'div',
  'small',
  'blockquote',
  'hr',
  'dl',
  'dt',
  'dd',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'src', 'alt', 'title']

// 允许的 URI 协议白名单（防止 javascript:、vbscript:、data: 等危险协议）
// 仅允许 http(s)/mailto/tel/ftp、安全的图片 data URI、相对路径(/)、锚点(#)。
// 注意 `\/(?!\/)` 与末尾 `(?!\/\/)` 两个守卫：显式拒绝 `//evil.com` 协议相对
// 外链（原 `[/#]` 单字符分支会放行它），避免净化后的 HTML 携带外部追踪/跳转。
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel|ftp):|data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);?|\/(?!\/)[^:]*$|#[^:]*$|(?![a-z][a-z0-9+.-]*:)(?!\/\/)[^:]*$)/i

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // 禁用 style 属性避免 CSS 注入（如 expression()、url(javascript:)、position:fixed 钓鱼）
    FORBID_ATTR: ['style'],
    // 强制所有链接添加安全属性，防止钓鱼和反向 tabnabbing
    ADD_ATTR: ['target', 'rel'],
    // a 标签强制添加 rel="noopener noreferrer"
    SANITIZE_DOM: true,
    // 限制 URI 协议白名单
    ALLOWED_URI_REGEXP,
  }).replace(/<a\b([^>]*)>/gi, (match, attrs: string) => {
    // 确保 <a> 标签总是带 rel="noopener noreferrer"，已存在则不重复添加
    if (/\brel\s*=/.test(attrs)) {
      return match.replace(/\brel\s*=\s*["']([^"']*)["']/i, (_m, rel: string) => {
        const rels = new Set(rel.toLowerCase().split(/\s+/))
        rels.add('noopener')
        rels.add('noreferrer')
        return `rel="${[...rels].join(' ')}"`
      })
    }
    return `<a${attrs} rel="noopener noreferrer">`
  })
}
