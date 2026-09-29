import type { CodeExample } from '@/types'
import { escapeHtml } from '@/utils/escape'

export { escapeHtml }

export interface Snippet {
  label: string
  css?: string
  js?: string
  html?: string
}

/**
 * 检测并去除完全重复的 JS 块。
 * 部分导入的示例数据会被重复拼接，导致 top-level const/let 重复声明而报错。
 */
function deduplicateRepeatedJs(js: string): string {
  const trimmed = js.trim()
  if (!trimmed) return js

  if (trimmed.length % 2 === 0) {
    const half = trimmed.length / 2
    const first = trimmed.slice(0, half)
    const second = trimmed.slice(half)
    if (first === second) return first
  }

  const statements = trimmed
    .split(/\n(?=(?:const|let|var|function|class|import|export)\s)/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (statements.length >= 2 && statements.length % 2 === 0) {
    const mid = statements.length / 2
    const firstHalf = statements.slice(0, mid)
    const secondHalf = statements.slice(mid)
    if (firstHalf.every((s, i) => s === secondHalf[i])) {
      return firstHalf.join('\n\n')
    }
  }

  return js
}

/**
 * 允许通过父窗口代理加载的同源资源前缀（可信白名单）。
 * 其余外链请求将被 CSP 拦截，避免 iframe 内脚本外泄数据到任意外部域。
 */
export const SANDBOX_ALLOWED_PREFIXES = [
  '/shared-assets/',
  '/static-sites/',
  '/assets/',
  '/images/',
]

/** postMessage 通信协议：iframe 请求资源 / 父窗口回传资源 */
export const SANDBOX_MSG_TYPE = 'SNIPPET_SANDBOX_RESOURCE'

interface SandboxResourceRequest {
  __sfc_sandbox__: typeof SANDBOX_MSG_TYPE
  kind: 'request'
  id: string
  url: string
}

interface SandboxResourceResponse {
  __sfc_sandbox__: typeof SANDBOX_MSG_TYPE
  kind: 'response'
  id: string
  ok: boolean
  status?: number
  contentType?: string
  body?: string
}

function isAllowedResource(url: string): boolean {
  return SANDBOX_ALLOWED_PREFIXES.some((prefix) => url.startsWith(prefix))
}

/**
 * 在 iframe 沙箱内注入的引导脚本：
 * 1. 拦截 <img>/<script>/<link> 等标签对可信同源资源的请求——改为通过 postMessage
 *    委托父窗口抓取（父窗口同源，可读取资源后回传），从而无需 allow-same-origin。
 * 2. 提供 fetch 的安全封装，仅允许白名单前缀，其余直接拒绝。
 */
function buildSandboxBootstrap(): string {
  const allowedPrefixesJson = JSON.stringify(SANDBOX_ALLOWED_PREFIXES)
  return `
<script>
(function () {
  var ALLOWED = ${allowedPrefixesJson};
  function isAllowed(u) {
    if (/^https?:\\/\\//i.test(u)) return false;
    return ALLOWED.some(function (p) { return u.indexOf(p) === 0; });
  }
  var pending = {};
  var seq = 0;
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.__sfc_sandbox__ !== '${SANDBOX_MSG_TYPE}' || d.kind !== 'response') return;
    var cb = pending[d.id];
    if (cb) { delete pending[d.id]; cb(d); }
  });
  function fetchViaParent(url) {
    return new Promise(function (resolve, reject) {
      var id = 'r' + (++seq);
      pending[id] = function (res) {
        if (res.ok) resolve(res);
        else reject(new Error('资源加载失败: ' + res.status));
      };
      parent.postMessage({
        __sfc_sandbox__: '${SANDBOX_MSG_TYPE}',
        kind: 'request', id: id, url: url
      }, '*');
    });
  }
  // 重写 fetch：仅允许白名单前缀，其余拒绝
  window.fetch = function (input) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (!isAllowed(url)) {
      return Promise.reject(new Error('沙箱禁止访问非白名单资源: ' + url));
    }
    return fetchViaParent(url);
  };
  // 拦截图片：可信前缀改为 base64 data URL 注入
  document.addEventListener('DOMContentLoaded', function () {
    var imgs = document.querySelectorAll('img[src^="/"]');
    imgs.forEach(function (img) {
      var src = img.getAttribute('src');
      if (src && isAllowed(src)) {
        fetchViaParent(src).then(function (res) {
          if (res.ok && res.contentType && res.body) {
            img.src = 'data:' + res.contentType + ';base64,' + res.body;
          }
        }).catch(function () {});
      }
    });
  });
})();
</script>`
}

/**
 * 内容安全策略（注入到 srcdoc / 新标签页文档）。
 * - 仅允许自身与 data:/blob: 内联资源（示例代码需内联执行）
 * - 禁止任何外部网络连接（connect-src 'none'），阻断数据外泄
 * - 禁止表单提交目标跳转（form-action 'none'）
 * - sandbox 指令强制文档运行在 opaque origin 下：即使在**新标签页顶层**打开
 *   （blob: URL 本与应用同源），也无法读取 localStorage/cookie 等同源凭据，
 *   防止恶意片段代码窃取登录会话。与 iframe sandbox 属性等价的权限集合。
 */
function buildCspMeta(): string {
  const csp =
    "sandbox allow-scripts allow-forms allow-modals allow-popups; " +
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
    "img-src 'self' data: blob:; " +
    "style-src 'self' 'unsafe-inline'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "connect-src 'none'; " +
    "form-action 'none'; " +
    "frame-ancestors 'none';"
  return `<meta http-equiv="Content-Security-Policy" content="${csp}">`
}

/**
 * 将 CodeExample 的 html/css/js 组合成完整的、严格隔离的 HTML 文档字符串。
 * 用于 iframe 的 srcdoc 属性。
 *
 * 安全模型（相较旧版的关键改进）：
 * - iframe 不再携带 allow-same-origin，与父窗口完全隔离，消除沙箱逃逸。
 * - 移除 <base href=origin>，同源资源改由父窗口 postMessage 代理加载（白名单）。
 * - 注入 CSP meta，禁止外部网络连接与表单外跳。
 *
 * @param example - 示例代码
 * @param snippet - 可选的 snippet，其 css/html/js 会覆盖/合并到示例中
 */
export function buildSrcDoc(example: CodeExample, snippet?: Snippet): string {
  const baseCss = example.css ?? ''
  const baseJs = example.js ?? ''

  const css = snippet?.css ? `${baseCss}\n${snippet.css}` : baseCss
  const html = snippet?.html ?? example.html
  const js = snippet?.js ? `${baseJs}\n${snippet.js}` : baseJs

  const useExampleStage = example.topicSlug === 'html5'
  const stagedHtml = useExampleStage ? `<div class="example-stage">${html}</div>` : html
  const exampleStageCss = useExampleStage
    ? `.example-stage {
      width: 100%;
      min-height: 100vh;
      height: 100vh;
      overflow: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .example-stage > * {
      flex-shrink: 0;
    }`
    : ''

  const safeJs = deduplicateRepeatedJs(js).replace(/<\/script/gi, '<\\/script')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${buildCspMeta()}
  <title>${escapeHtml(example.title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      min-height: 100vh;
      padding: 0;
    }
    .demo-layout {
      display: flex;
      height: 100vh;
      gap: 0;
    }
    .snippet-panel {
      width: 320px;
      flex-shrink: 0;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      border-right: 1px solid #ddd;
      background: #fafafa;
    }
    .snippet-btn {
      padding: 10px 14px;
      border: 1px solid #ccc;
      border-radius: 6px;
      background: #fff;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 13px;
      color: #333;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
      line-height: 1.4;
    }
    .snippet-btn:hover {
      border-color: #8083ff;
      background: #f0f0ff;
    }
    .snippet-btn.active {
      border-color: #8083ff;
      background: #e8e8ff;
      color: #571bc1;
      font-weight: 600;
    }
    .preview-panel {
      flex: 1;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      overflow: auto;
    }
    .preview-panel > section,
    .preview-panel > div:not(.snippet-panel):not(.demo-layout) {
      flex: 1;
      width: 100%;
      min-height: 0;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    ${exampleStageCss}
    ${css}
  </style>
  ${buildSandboxBootstrap()}
</head>
<body>
  ${stagedHtml}
  ${safeJs ? '<script>' + safeJs + '</' + 'script>' : ''}
</body>
</html>`
}

/**
 * 将自包含 HTML 知识片段组装成可直接运行的完整文档字符串（不做沙箱隔离）。
 *
 * 输入说明：
 *  - 主 HTML 在 `html`（即 snippet.content），**本身可能已是完整 HTML 文档**
 *    （含 `<!DOCTYPE>`/`<html>`/`<head>`/`<body>`），也可能只是 `<body>` 内的片段。
 *  - `files` 是同片段的其他文件（idb.js / util.js 等），用于解析 HTML 中对
 *    相对路径 `./xxx.js` 的 `<script src>` 引用并内联，使文档脱离外部文件独立运行。
 *
 * 处理方式：
 *  - 若 `html` 已是完整文档：仅对其内 `<script src>` 做内联，**不额外套壳**
 *    （避免生成嵌套 HTML 文档）。
 *  - 否则：套一层标准壳。
 *
 * 注意：本函数仅生成"内容本身"，不注入 CSP / 沙箱引导脚本，
 * 用于在新标签页（blob URL）直接打开给用户看，保持与示例库一致的效果。
 *
 * @param html   主 HTML 文件源码（snippet.content）
 * @param files  同片段的其他文件（js/css 等），用于解析 src 引用
 */
export function buildSnippetHtml(
  html: string,
  files: { name: string; language?: string; code?: string }[]
): string {
  const codeByName = new Map<string, string>()
  for (const file of files) {
    if (file.code == null) continue
    // 同时支持 "util.js"（裸名）与 "./util.js"（带 ./ 前缀），
    // 避免 HTML 里不写 ./ 前缀时无法匹配
    codeByName.set(file.name, file.code)
    codeByName.set('./' + file.name, file.code)
  }

  // 把 src 解析成可查的 key：去掉前导 ./ ，并剥离 ?query 与 #hash
  const normalizeSrc = (src: string): string => {
    const clean = src.replace(/[?#].*$/, '')
    return clean.replace(/^\.\//, '')
  }

  const inlineScriptSrc = (doc: string): string =>
    doc.replace(
      // 覆盖：裸名/./前缀/根路径(/assets/x) 均可匹配；允许属性间任意空白与换行
      /<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
      (_match, before: string, src: string, after: string) => {
        const key = normalizeSrc(src)
        // 优先按完整匹配（./x 或 /assets/x），其次按裸文件名
        const code =
          codeByName.get(src) ?? codeByName.get(key) ?? codeByName.get('./' + key) ?? null
        if (code == null) return _match // 找不到对应文件则保留原样
        const safe = code.replace(/<\/script/gi, '<\\/script')
        return `<script${before}${after}>${safe}</script>`
      }
    )

  const isFullDocument = /<html[\s>]/i.test(html) || /<!DOCTYPE/i.test(html)

  if (isFullDocument) {
    return inlineScriptSrc(html)
  }

  // 片段形态：套标准壳
  const inlined = inlineScriptSrc(html)
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>片段预览</title>
</head>
<body>
  ${inlined}
</body>
</html>`
}

/**
 * 将自包含 HTML 知识片段组装成可嵌入 iframe 的严格隔离文档。
 *
 * 在 {@link buildSnippetHtml} 生成的干净文档基础上注入 CSP 与沙箱引导脚本，
 * 配合 iframe 的 sandbox（不含 allow-same-origin）实现与父窗口完全隔离的预览。
 *
 * @param html   主 HTML 文件源码（snippet.content）
 * @param files  同片段的其他文件（js/css 等），用于解析 src 引用
 */
export function buildSnippetSrcDoc(
  html: string,
  files: { name: string; language?: string; code?: string }[]
): string {
  const doc = buildSnippetHtml(html, files)
  const headInjection = `${buildCspMeta()}\n  ${buildSandboxBootstrap()}`

  if (/<head[\s>]/i.test(doc)) {
    return doc.replace(/<head([\s>])/i, `<head$1\n  ${headInjection}\n  `)
  }
  // 无显式 <head>：插入到 <html> 之后
  return doc.replace(/<html([\s>])/i, `<html$1\n<head>\n  ${headInjection}\n  </head>\n`)
}

/**
 * 在新浏览器标签页打开 HTML 片段预览（地址栏为 blob: URL）。
 *
 * 将 {@link buildSnippetSrcDoc} 生成的文档（含 CSP sandbox 指令 + 沙箱引导脚本）
 * 转为 Blob 后 window.open 新标签打开。CSP 的 sandbox 指令使该顶层文档运行在
 * opaque origin 下——blob: URL 本与应用同源，若不做隔离，片段 JS 可直接读取
 * localStorage 中的登录会话；注入 CSP 后与 iframe 预览同等隔离强度。
 *
 * @param html   主 HTML 文件源码（snippet.content）
 * @param files  同片段的其他文件（js/css 等），用于解析 src 引用
 * @returns 是否成功打开（false 表示被浏览器弹窗拦截）
 */
export function openSnippetPreviewWindow(
  html: string,
  files: { name: string; language?: string; code?: string }[]
): boolean {
  const doc = buildSnippetSrcDoc(html, files)
  const blob = new Blob([doc], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  // 注意：不能携带 noopener 特性——按规范其返回值恒为 null，无法区分「已打开」
  // 与「被拦截」。改为正常打开后手动断开 opener，同时保留返回值语义。
  const win = window.open(url, '_blank')
  if (!win) {
    // 弹窗被拦截：立即释放，避免泄漏 blob
    URL.revokeObjectURL(url)
    return false
  }
  win.opener = null
  // 60s 后释放，确保新窗口有足够时间完成加载
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return true
}

/**
 * 检测示例内容是否引用了需要父窗口代理的同源资源（白名单前缀）。
 * 该值仅用于提示日志/调试，不再影响 sandbox 属性（现在永远严格隔离）。
 */
export function hasTrustedAssetReference(example: CodeExample): boolean {
  const combined = (example.html ?? '') + (example.css ?? '') + (example.js ?? '')
  return SANDBOX_ALLOWED_PREFIXES.some((prefix) => combined.includes(prefix))
}

/**
 * 返回严格的 iframe sandbox 属性列表。
 *
 * 安全说明：
 * - 一律不携带 allow-same-origin，iframe 与父窗口完全隔离，彻底消除沙箱逃逸风险。
 * - 示例中需加载的同源资源（/shared-assets/、/static-sites/ 等）改由父窗口
 *   通过 postMessage 代理抓取后回传（见 buildSandboxBootstrap / usePreview 的监听）。
 * - CSP meta 已禁止任何外部网络连接与表单外跳，进一步收敛攻击面。
 */
export function getSandboxAttributes(): string[] {
  return ['allow-scripts', 'allow-forms', 'allow-modals', 'allow-popups']
}

/**
 * ArrayBuffer → base64。按 32KB 分块拼接后再 btoa，
 * 避免逐字节 `acc + String.fromCharCode(byte)` 的 O(n²) 字符串拼接卡顿大资源。
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

/**
 * 父窗口侧的资源代理处理器：监听 iframe 的 postMessage 请求，
 * 抓取白名单内的同源资源并回传。返回清理函数。
 *
 * 安全说明：沙箱 iframe 为 opaque origin（event.origin 恒为 'null'），无法用
 * origin 鉴别来源；改用 `event.source === iframe.contentWindow` 校验，确保
 * 仅处理目标 iframe 自身发来的请求——其他 iframe / 窗口伪造的请求一律忽略，
 * 防止借道本代理读取白名单静态资源。
 *
 * @param iframe - 目标 iframe 元素（用于定向回传）
 */
export function createSandboxResourceProxy(iframe: HTMLIFrameElement): () => void {
  const handler = async (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) {
      return
    }
    const data = event.data as SandboxResourceRequest | undefined
    if (!data || data.__sfc_sandbox__ !== SANDBOX_MSG_TYPE || data.kind !== 'request') {
      return
    }
    if (!isAllowedResource(data.url)) {
      iframe.contentWindow?.postMessage(
        {
          __sfc_sandbox__: SANDBOX_MSG_TYPE,
          kind: 'response',
          id: data.id,
          ok: false,
          status: 403,
        } satisfies SandboxResourceResponse,
        '*'
      )
      return
    }

    try {
      const res = await fetch(data.url, { credentials: 'same-origin' })
      const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
      const buffer = await res.arrayBuffer()
      const body = arrayBufferToBase64(buffer)
      iframe.contentWindow?.postMessage(
        {
          __sfc_sandbox__: SANDBOX_MSG_TYPE,
          kind: 'response',
          id: data.id,
          ok: true,
          status: res.status,
          contentType,
          body,
        } satisfies SandboxResourceResponse,
        '*'
      )
    } catch {
      iframe.contentWindow?.postMessage(
        {
          __sfc_sandbox__: SANDBOX_MSG_TYPE,
          kind: 'response',
          id: data.id,
          ok: false,
          status: 500,
        } satisfies SandboxResourceResponse,
        '*'
      )
    }
  }

  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}
