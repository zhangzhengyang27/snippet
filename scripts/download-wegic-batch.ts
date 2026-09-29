/**
 * Download blank Wegic templates in small batches.
 * Usage: npx tsx scripts/download-wegic-batch.ts [startIdx] [endIdx]
 *   startIdx, endIdx: indices into the preview-urls JSON (0-based relative to START=25)
 *   Example: npx tsx scripts/download-wegic-batch.ts 7 12  (downloads templates 32-37)
 */

import { chromium } from 'playwright'
import fs from 'fs/promises'
import path from 'path'

const BASE_DIR = '/Users/xiaoye/Desktop/html5-examples/public/static-sites'
const WEGIC_DIR = path.join(BASE_DIR, 'wegic')
const PREVIEW_URLS_FILE = '/tmp/wegic-preview-urls.json'
const START = 25

const args = process.argv.slice(2)
const startIdx = parseInt(args[0]) || 0
const endIdx = parseInt(args[1]) || 999

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
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, Buffer.from(await resp.arrayBuffer()))
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

  const concurrency = 5
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

async function main() {
  const data: { slug: string; previewUrl: string; title: string }[] = JSON.parse(
    await fs.readFile(PREVIEW_URLS_FILE, 'utf-8')
  )

  const actualEnd = Math.min(endIdx, data.length - 1)
  console.log(`\n🚀 Batch download: indices ${startIdx}-${actualEnd}`)
  console.log(`📋 Mapping to templates ${START + startIdx}-${START + actualEnd}\n`)

  const browser = await chromium.launch({ headless: true })

  let ok = 0,
    fail = 0

  for (let i = startIdx; i <= actualEnd; i++) {
    const entry = data[i]
    const dirNum = START + i
    const siteDir = path.join(WEGIC_DIR, String(dirNum))

    // Check if already has content
    try {
      const existing = await fs.readFile(path.join(siteDir, 'index.html'), 'utf-8')
      if (existing.length > 5000) {
        console.log(`[#${dirNum}] Already has content (${existing.length}B), skipping`)
        ok++
        if (i < actualEnd) await delay(500)
        continue
      }
    } catch {
      // No file yet, proceed
    }

    const label = entry.title.length > 50 ? entry.title.substring(0, 47) + '...' : entry.title
    console.log(`[#${dirNum}] ${label}`)

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })

    try {
      const page = await context.newPage()

      // Navigate
      try {
        await page.goto(entry.previewUrl, { waitUntil: 'networkidle', timeout: 45000 })
      } catch {
        try {
          await page.goto(entry.previewUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
        } catch {
          console.log('  ⚠️ Slow loading, continuing...')
        }
      }

      await delay(4000)

      // Check body content
      let bodyLen = await page.evaluate(() => {
        const root = document.getElementById('root')
        return root ? root.innerHTML.length : 0
      })
      console.log(`  Body: ${bodyLen} chars`)

      if (bodyLen < 200) {
        await delay(3000)
        bodyLen = await page.evaluate(() => {
          const root = document.getElementById('root')
          return root ? root.innerHTML.length : 0
        })
        if (bodyLen < 200) {
          console.log(`  ❌ Content too small (${bodyLen}), saving as-is`)
        }
      }

      // Get full HTML
      const html = await page.content()
      console.log(`  HTML: ${html.length} chars`)

      // Extract resources
      const resources: { type: string; url: string }[] = await page.evaluate(() => {
        const r: { type: string; url: string }[] = []
        document.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
          const h = l.getAttribute('href')
          if (h) r.push({ type: 'css', url: h })
        })
        document.querySelectorAll('script[src]').forEach(s => {
          const u = s.getAttribute('src')
          if (u && !u.includes('google') && !u.includes('gstatic')) {
            r.push({ type: 'js', url: u })
          }
        })
        document.querySelectorAll('img').forEach(i => {
          const s = i.getAttribute('src')
          if (s) r.push({ type: 'img', url: s })
        })
        const f = document.querySelector('link[rel*="icon"]')
        if (f) {
          const h = f.getAttribute('href')
          if (h) r.push({ type: 'img', url: h })
        }
        return r
      })

      console.log(`  Resources: ${resources.length}`)

      // Download resources
      const dl = await downloadResources(resources, siteDir)
      console.log(`  Downloaded: ${dl.length}/${resources.length}`)

      // Rewrite HTML
      let lh = html
      for (const d of dl) {
        const lp = d.type === 'img' ? `./images/${d.fn}` : `./assets/${d.fn}`
        lh = lh.replace(
          new RegExp(d.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          lp
        )
      }

      // Strip external refs
      lh = lh.replace(
        /<link[^>]*href="https:\/\/(?:cdn\.wegic\.ai|aibuildcdn-dev|dev\.wegic-tx|images\.unsplash|fonts\.googleapis|fonts\.gstatic)[^"]*"[^>]*>/gi,
        ''
      )
      lh = lh.replace(/<div[^>]*id="wegic-branding-badge"[^>]*>[\s\S]*?<\/div>/gi, '')
      lh = lh.replace(/<style[^>]*id="wegic-badge-styles"[^>]*>[\s\S]*?<\/style>/gi, '')

      await fs.mkdir(siteDir, { recursive: true })
      await fs.writeFile(path.join(siteDir, 'index.html'), lh)
      console.log(`  ✅ Saved: ${Buffer.byteLength(lh)}B\n`)
      ok++
    } catch (error: unknown) {
      console.error(`  ❌ ${error instanceof Error ? error.message : String(error)}\n`)
      fail++
    } finally {
      await context.close()
    }

    if (i < actualEnd) {
      const waitMs = 2000 + Math.random() * 2000
      await delay(waitMs)
    }
  }

  await browser.close()
  console.log(`\n📊 Batch done: ✅ ${ok} | ❌ ${fail}`)
}

main().catch(console.error)
