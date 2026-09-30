import fs from 'fs/promises'
import path from 'path'

const BASE_DIR = '/Users/xiaoye/Desktop/html5-examples/public/static-sites'
const URLS_FILE = '/tmp/wegic-preview-urls.json'
const START = 25

const d = (ms: number) => new Promise(r => setTimeout(r, ms))

async function downloadFile(url: string, out: string): Promise<boolean> {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 10000)
    const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'Mozilla/5.0' } })
    clearTimeout(t)
    if (!r.ok) return false
    await fs.mkdir(path.dirname(out), { recursive: true })
    await fs.writeFile(out, Buffer.from(await r.arrayBuffer()))
    return true
  } catch { return false }
}

function sf(url: string) {
  try { return path.basename(new URL(url).pathname).split('?')[0].replace(/[^a-zA-Z0-9._-]/g, '_') }
  catch { return 'r_' + Date.now() }
}

async function downloadSite(previewUrl: string): Promise<{ html: string; resources: { type: string; url: string }[] } | null> {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 20000)
    const r = await fetch(previewUrl, { signal: c.signal, headers: { 'User-Agent': 'Mozilla/5.0' } })
    clearTimeout(t)
    if (!r.ok) return null
    const html = await r.text()

    // Extract resources with regex (no Playwright needed!)
    const resources: { type: string; url: string }[] = []

    // CSS
    for (const m of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/gi)) resources.push({ type: 'css', url: m[1] })
    // JS (local only, skip external scripts)
    for (const m of html.matchAll(/<script[^>]*src="([^"]+)"/gi)) {
      const url = m[1]
      if (!url.startsWith('https://') || url.includes('wegic.net')) resources.push({ type: 'js', url })
    }
    // Images
    for (const m of html.matchAll(/<img[^>]*src="([^"]+)"/gi)) resources.push({ type: 'img', url: m[1] })

    return { html, resources }
  } catch { return null }
}

async function saveSite(siteDir: string, html: string, resources: { type: string; url: string }[]) {
  const aDir = path.join(siteDir, 'assets'), iDir = path.join(siteDir, 'images')
  await fs.mkdir(aDir, { recursive: true }); await fs.mkdir(iDir, { recursive: true })
  const dl: { type: string; url: string; fn: string }[] = []

  // Parallel downloads with high concurrency
  const concurrency = 10
  for (let i = 0; i < resources.length; i += concurrency) {
    const batch = resources.slice(i, i + concurrency)
    const results = await Promise.all(batch.map(async r => {
      try {
        const absUrl = new URL(r.url, `https://wegic.net`).href
        const fn = sf(absUrl)
        const op = r.type === 'img' ? path.join(iDir, fn) : path.join(aDir, fn)
        return await downloadFile(absUrl, op) ? { type: r.type, url: r.url, fn } : null
      } catch { return null }
    }))
    for (const r of results) if (r) dl.push(r)
  }

  // Rewrite HTML
  let lh = html
  for (const d of dl) {
    const lp = d.type === 'img' ? `./images/${d.fn}` : `./assets/${d.fn}`
    lh = lh.replace(new RegExp(d.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), lp)
  }

  // Strip external refs and scripts (all fully static)
  lh = lh.replace(/<link[^>]*href="https:\/\/(?:cdn\.wegic\.ai|aibuildcdn-dev|dev\.wegic-tx|images\.unsplash|fonts\.google)[^"]*"[^>]*>/gi, '')
  lh = lh.replace(/<script[\s\S]*?<\/script>/gi, '')
  lh = lh.replace(/<script[^>]*\/>/gi, '')
  lh = lh.replace(/<div[^>]*id="wegic-branding-badge"[^>]*>[\s\S]*?<\/div>/gi, '')
  lh = lh.replace(/<style[^>]*id="wegic-badge-styles"[^>]*>[\s\S]*?<\/style>/gi, '')

  await fs.writeFile(path.join(siteDir, 'index.html'), lh)
  return { size: Buffer.byteLength(lh), count: dl.length }
}

async function main() {
  const data: { slug: string; previewUrl: string; title: string }[] = JSON.parse(
    await fs.readFile(URLS_FILE, 'utf-8')
  )

  const wegicDir = path.join(BASE_DIR, 'wegic')
  console.log(`📋 ${data.length} templates to download\n`)

  let ok = 0, fail = 0
  const failed: string[] = []

  for (let i = 0; i < data.length; i++) {
    const t = data[i]
    const dirNum = START + i
    const siteDir = path.join(wegicDir, String(dirNum))

    // Skip if done
    try { await fs.access(path.join(siteDir, 'index.html')); ok++; continue } catch {
      // 未找到 index.html，继续下载
    }

    const label = t.title.length > 50 ? t.title.substring(0, 47) + '...' : t.title
    process.stdout.write(`\r🔄 [${i + 1}/${data.length}] ${label}`)

    const result = await downloadSite(t.previewUrl)
    if (!result) {
      fail++; failed.push(t.slug)
      console.log(` ❌ download failed`)
      await d(500)
      continue
    }

    const saved = await saveSite(siteDir, result.html, result.resources)
    ok++
    console.log(` ✅ ${saved?.size || 0}B, ${saved?.count || 0} files`)
    await d(300 + Math.random() * 300)
  }

  console.log(`\n📊 ✅ ${ok} | ❌ ${fail}`)
  if (fail > 0) console.log(`Failed: ${failed.join(', ')}`)
}

main().catch(console.error)
