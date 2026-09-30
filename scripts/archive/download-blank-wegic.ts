/**
 * Download blank Wegic templates (32-102) using Playwright to render JS content.
 * 
 * The preview URLs on wegic.net require JavaScript execution to load content.
 * A simple fetch() returns only an empty shell.
 */

import { chromium } from 'playwright'
import fs from 'fs/promises'
import path from 'path'

const BASE_DIR = '/Users/xiaoye/Desktop/html5-examples/public/static-sites'
const WEGIC_DIR = path.join(BASE_DIR, 'wegic')
const PREVIEW_URLS_FILE = '/tmp/wegic-preview-urls.json'
const START = 25

interface PreviewEntry {
  slug: string
  previewUrl: string
  title: string
}

// ============================================================
// Helpers
// ============================================================

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function safeFilename(url: string): string {
  try {
    const b = path.basename(new URL(url).pathname) || 'res'
    return b.split('?')[0].replace(/[^a-zA-Z0-9._-]/g, '_')
  } catch {
    return 'res_' + Date.now()
  }
}

async function downloadFile(url: string, outPath: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: '*/*',
      },
    })
    clearTimeout(timeout)
    if (!resp.ok) return false
    const buf = await resp.arrayBuffer()
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, Buffer.from(buf))
    return true
  } catch {
    return false
  }
}

async function downloadResources(
  resources: { type: string; url: string }[],
  siteDir: string
): Promise<{ type: string; url: string; fn: string }[]> {
  const aDir = path.join(siteDir, 'assets')
  const iDir = path.join(siteDir, 'images')
  await fs.mkdir(aDir, { recursive: true })
  await fs.mkdir(iDir, { recursive: true })

  const concurrency = 8
  const dl: { type: string; url: string; fn: string }[] = []

  for (let i = 0; i < resources.length; i += concurrency) {
    const batch = resources.slice(i, i + concurrency)
    const results = await Promise.all(
      batch.map(async r => {
        try {
          const absUrl = new URL(r.url, 'https://wegic.net').href
          const fn = safeFilename(absUrl)
          const op = r.type === 'img' ? path.join(iDir, fn) : path.join(aDir, fn)
          const ok = await downloadFile(absUrl, op)
          return ok ? { type: r.type, url: r.url, fn } : null
        } catch {
          return null
        }
      })
    )
    for (const r of results) {
      if (r) dl.push(r)
    }
  }

  return dl
}

// ============================================================
// Main download function
// ============================================================

async function downloadRenderedSite(
  previewUrl: string,
  siteDir: string,
  templateNum: number
): Promise<boolean> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })

  try {
    const page = await context.newPage()

    // Navigate to preview
    console.log(`  🌐 Loading preview...`)
    try {
      await page.goto(previewUrl, { waitUntil: 'networkidle', timeout: 45000 })
    } catch {
      console.log(`  ⚠️ Network idle timeout, trying domcontentloaded...`)
      try {
        await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      } catch {
        console.log(`  ⚠️ Still slow, continuing...`)
      }
    }

    // Wait extra for rendering
    await delay(3000)

    // Check if content loaded
    const bodyContent = await page.evaluate(() => {
      const root = document.getElementById('root')
      return root ? root.innerHTML.length : 0
    })
    console.log(`  📄 Body content: ${bodyContent} chars`)

    if (bodyContent < 100) {
      // Try waiting more
      console.log(`  ⏳ Content small, waiting 3s more...`)
      await delay(3000)
      const retryContent = await page.evaluate(() => {
        const root = document.getElementById('root')
        return root ? root.innerHTML.length : 0
      })
      if (retryContent < 100) {
        console.log(`  ❌ Still no content after waiting`)
        return false
      }
      console.log(`  📄 Content now: ${retryContent} chars`)
    }

    // Get full HTML
    const html = await page.content()
    console.log(`  ✅ HTML captured: ${html.length} chars`)

    // Extract resources
    const resources: { type: string; url: string }[] = []

    // CSS
    const cssLinks = await page.evaluate(() => {
      const r: string[] = []
      document.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
        const h = l.getAttribute('href')
        if (h) r.push(h)
      })
      return r
    })
    cssLinks.forEach(url => resources.push({ type: 'css', url }))

    // JS (only local/wegic scripts)
    const scripts = await page.evaluate(() => {
      const r: string[] = []
      document.querySelectorAll('script[src]').forEach(s => {
        const u = s.getAttribute('src')
        if (u && (u.includes('wegic') || u.startsWith('./') || u.startsWith('/'))) {
          r.push(u)
        }
      })
      return r
    })
    scripts.forEach(url => resources.push({ type: 'js', url }))

    // Images
    const imgs = await page.evaluate(() => {
      const r: string[] = []
      document.querySelectorAll('img').forEach(i => {
        const s = i.getAttribute('src')
        if (s) r.push(s)
      })
      return r
    })
    imgs.forEach(url => resources.push({ type: 'img', url }))

    // Favicon
    const favicon = await page.evaluate(() => {
      const f = document.querySelector('link[rel*="icon"]')
      return f ? f.getAttribute('href') : null
    })
    if (favicon) resources.push({ type: 'img', url: favicon })

    console.log(`  📦 ${resources.length} resources found`)

    // Download resources
    const dl = await downloadResources(resources, siteDir)
    console.log(`  💾 Downloaded ${dl.length}/${resources.length} resources`)

    // Rewrite HTML with local paths
    let localHtml = html
    for (const d of dl) {
      const lp = d.type === 'img' ? `./images/${d.fn}` : `./assets/${d.fn}`
      localHtml = localHtml.replace(
        new RegExp(d.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        lp
      )
    }

    // Strip external CDN refs and scripts
    localHtml = localHtml.replace(
      /<link[^>]*href="https:\/\/(?:cdn\.wegic\.ai|aibuildcdn-dev|dev\.wegic-tx|images\.unsplash|fonts\.googleapis|fonts\.gstatic)[^"]*"[^>]*>/gi,
      ''
    )
    localHtml = localHtml.replace(/<link[^>]*href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*>/gi, '')
    localHtml = localHtml.replace(/<div[^>]*id="wegic-branding-badge"[^>]*>[\s\S]*?<\/div>/gi, '')
    localHtml = localHtml.replace(/<style[^>]*id="wegic-badge-styles"[^>]*>[\s\S]*?<\/style>/gi, '')

    // Save index.html
    await fs.writeFile(path.join(siteDir, 'index.html'), localHtml)
    console.log(`  💾 Saved: ${Buffer.byteLength(localHtml)} bytes`)
    return true
  } catch (error: unknown) {
    console.error(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
    return false
  } finally {
    await browser.close()
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  const data: PreviewEntry[] = JSON.parse(await fs.readFile(PREVIEW_URLS_FILE, 'utf-8'))
  console.log(`\n🚀 Downloading blank Wegic Templates (render via Playwright)`)
  console.log(`📋 ${data.length} preview URLs available (mapping to templates ${START}-${START + data.length - 1})`)

  // Find blank templates
  const blankTemplates: { num: number; entry: PreviewEntry }[] = []
  for (let i = 0; i < data.length; i++) {
    const dirNum = START + i
    const siteDir = path.join(WEGIC_DIR, String(dirNum))
    try {
      const html = await fs.readFile(path.join(siteDir, 'index.html'), 'utf-8')
      // Check if body is empty
      const rootMatch = html.match(/<div\s+id="root"[^>]*>\s*<\/div>/)
      if (rootMatch) {
        blankTemplates.push({ num: dirNum, entry: data[i] })
      }
    } catch {
      // No index.html, also needs download
      blankTemplates.push({ num: dirNum, entry: data[i] })
    }
  }

  console.log(`🎯 ${blankTemplates.length} blank templates to download`)
  console.log(`   Numbers: ${blankTemplates.map(t => t.num).join(', ')}`)
  console.log()

  let ok = 0,
    fail = 0

  for (let i = 0; i < blankTemplates.length; i++) {
    const { num, entry } = blankTemplates[i]
    const siteDir = path.join(WEGIC_DIR, String(num))
    const label = entry.title.length > 55 ? entry.title.substring(0, 52) + '...' : entry.title

    console.log(
      `\n[${i + 1}/${blankTemplates.length}] Template #${num}: ${label}`
    )
    console.log(`  🔗 ${entry.previewUrl}`)

    const success = await downloadRenderedSite(entry.previewUrl, siteDir, num)
    if (success) {
      ok++
    } else {
      fail++
      console.log(`  ❌ Failed`)
    }

    if (i < blankTemplates.length - 1) {
      const waitMs = 1500 + Math.random() * 1000
      console.log(`  ⏳ Waiting ${Math.round(waitMs / 1000)}s...`)
      await delay(waitMs)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 ✅ ${ok} | ❌ ${fail} | Total ${blankTemplates.length}`)
  console.log(`💡 Next: run translation script on newly downloaded templates`)
}

main().catch(console.error)
