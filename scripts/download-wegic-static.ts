import { chromium, type BrowserContext, type Page } from 'playwright'
import fs from 'fs/promises'
import path from 'path'

const BASE_DIR = '/Users/xiaoye/Desktop/html5-examples/public/static-sites'

const templatesJson = JSON.parse(
  await fs.readFile(path.join(BASE_DIR, 'wegic-templates.json'), 'utf-8')
)
const templatesData = templatesJson.templates

async function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function downloadFile(url: string, outPath: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': '*/*' }
    })
    clearTimeout(timeout)
    if (!resp.ok) return false
    const buf = await resp.arrayBuffer()
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, Buffer.from(buf))
    return true
  } catch { return false }
}

function safeFilename(url: string): string {
  try {
    const b = path.basename(new URL(url).pathname) || 'res'
    return b.split('?')[0].replace(/[^a-zA-Z0-9._-]/g, '_')
  } catch { return 'res_' + Date.now() }
}

async function extractPreviewUrl(page: Page): Promise<string | null> {
  try {
    const html = await page.content()
    const match = html.match(/previewUrl[^}]*?"([^"]*\.wegic\.(?:net|ai)[^"]*)"/)
    if (match) return match[1].replace(/\\$/, '')
    return null
  } catch { return null }
}

async function downloadResourcesInParallel(
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
      batch.map(async (r) => {
        const fn = safeFilename(r.url)
        const op = r.type === 'img' ? path.join(iDir, fn) : path.join(aDir, fn)
        const ok = await downloadFile(r.url, op)
        return ok ? { type: r.type, url: r.url, fn } : null
      })
    )
    for (const r of results) {
      if (r) dl.push(r)
    }
  }

  return dl
}

async function downloadSite(ctx: BrowserContext, previewUrl: string, siteDir: string): Promise<boolean> {
  const page = await ctx.newPage()
  try {
    try {
      await page.goto(previewUrl, { waitUntil: 'networkidle', timeout: 30000 })
    } catch {
      console.log('  ⚠️ Preview loading slow, trying domcontentloaded...')
      try {
        await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
      } catch {
        console.log('  ⚠️ Still slow, continuing with current content...')
      }
    }
    await delay(2000)

    const html = await page.content()

    const resources = await page.evaluate(() => {
      const r: { type: string; url: string }[] = []
      document.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
        const h = l.getAttribute('href'); if (h) r.push({ type: 'css', url: h })
      })
      document.querySelectorAll('script[src]').forEach(s => {
        const u = s.getAttribute('src'); if (u) r.push({ type: 'js', url: u })
      })
      document.querySelectorAll('img').forEach(i => {
        const s = i.getAttribute('src'); if (s) r.push({ type: 'img', url: s })
      })
      const f = document.querySelector('link[rel*="icon"]')
      if (f) { const h = f.getAttribute('href'); if (h) r.push({ type: 'img', url: h }) }
      return r
    })

    const dl = await downloadResourcesInParallel(resources, siteDir)
    console.log(`  ✅ ${dl.length}/${resources.length}`)

    let lh = html
    for (const d of dl) {
      const lp = d.type === 'img' ? `./images/${d.fn}` : `./assets/${d.fn}`
      lh = lh.replace(new RegExp(d.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), lp)
    }
    await fs.writeFile(path.join(siteDir, 'index.html'), lh)
    console.log(`  ✅ HTML: ${html.length}B, ${dl.length} resources`)
    return true
  } catch (error: unknown) {
    console.error(`  ❌ ${error instanceof Error ? error.message : String(error)}`)
    return false
  } finally {
    try { await page.close() } catch { /* ignore */ }
  }
}

async function isTemplateDownloaded(siteDir: string): Promise<boolean> {
  try {
    await fs.access(path.join(siteDir, 'index.html'))
    return true
  } catch { return false }
}

async function main() {
  console.log('\n🚀 Wegic Template Download')
  console.log('='.repeat(60))
  console.log(`📋 ${templatesData.length} templates\n`)

  const wegicDir = path.join(BASE_DIR, 'wegic')
  await fs.mkdir(wegicDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })

  let ok = 0, fail = 0, skipped = 0
  const failedList: string[] = []

  for (let i = 0; i < templatesData.length; i++) {
    const t = templatesData[i]
    const siteDir = path.join(wegicDir, String(i + 1))

    // Check if already done
    if (await isTemplateDownloaded(siteDir)) {
      skipped++
      ok++
      continue
    }

    console.log(`\n🔄 [${i + 1}/${templatesData.length}] ${t.title}`)

    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    try {
      console.log(`  📄 ${t.url}`)
      try {
        await page.goto(t.url, { waitUntil: 'networkidle', timeout: 60000 })
      } catch {
        console.log(`  ⚠️ networkidle timeout, trying load...`)
        await page.goto(t.url, { waitUntil: 'load', timeout: 30000 })
      }
      await delay(3000)

      const previewUrl = await extractPreviewUrl(page)
      console.log(`  🌐 ${previewUrl || 'NOT FOUND'}`)

      if (!previewUrl) {
        fail++
        failedList.push(t.title)
      } else {
        await fs.mkdir(siteDir, { recursive: true })
        const succ = await downloadSite(ctx, previewUrl, siteDir)
        if (succ) { ok++ } else { fail++; failedList.push(t.title) }
      }
    } catch (error: unknown) {
      console.error(`  ❌ ${error instanceof Error ? error.message : String(error)}`)
      fail++
      failedList.push(t.title)
    } finally {
      try { await ctx.close() } catch { /* ignore */ }
    }

    if (i < templatesData.length - 1) {
      const ms = 2000 + Math.random() * 1000
      console.log(`  ⏳ ${Math.round(ms / 1000)}s...`)
      await delay(ms)
    }
  }

  await browser.close()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 ✅ ${ok} | ❌ ${fail} | Skipped ${skipped} | Total ${templatesData.length}`)
  console.log(`${'='.repeat(60)}`)
  if (fail > 0) {
    console.log('\n❌ Failed:')
    for (const n of failedList) console.log(`  ✗ ${n}`)
  }
}

main().catch(console.error)
