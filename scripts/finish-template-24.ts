import { chromium } from 'playwright'
import fs from 'fs/promises'
import path from 'path'

const SITE_DIR = '/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic/24'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  console.log('Visiting burger-hub.wegic.net...')
  try {
    await page.goto('https://burger-hub.wegic.net/', { waitUntil: 'networkidle', timeout: 30000 })
  } catch {
    console.log('Loading slow, trying domcontentloaded...')
    try {
      await page.goto('https://burger-hub.wegic.net/', { waitUntil: 'domcontentloaded', timeout: 15000 })
    } catch {
      console.log('Still slow, using what we have')
    }
  }

  const html = await page.content()
  console.log(`HTML: ${html.length}B`)

  // List already downloaded assets
  const assetsDir = path.join(SITE_DIR, 'assets')
  const imagesDir = path.join(SITE_DIR, 'images')
  const assets = await fs.readdir(assetsDir).catch(() => [])
  const images = await fs.readdir(imagesDir).catch(() => [])

  // Get resource URLs from page
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
    return r
  })

  // Match downloaded files to resources
  const assetSet = new Set(assets)
  const imageSet = new Set(images)
  const replacements: { from: string; to: string }[] = []

  for (const r of resources) {
    const fn = r.type === 'img' ? images.find(i => i.includes(path.basename(new URL(r.url).pathname).split('?')[0])) : assets.find(a => a.includes(path.basename(new URL(r.url).pathname).split('?')[0]))
    if (fn) {
      const localPath = r.type === 'img' ? `./images/${fn}` : `./assets/${fn}`
      replacements.push({ from: r.url, to: localPath })
    }
  }

  console.log(`Matched: ${replacements.length}/${resources.length}`)

  let lh = html
  for (const r of replacements) {
    lh = lh.replace(new RegExp(r.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), r.to)
  }

  await fs.writeFile(path.join(SITE_DIR, 'index.html'), lh)
  console.log('✅ index.html saved')

  await ctx.close()
  await browser.close()
}

main().catch(console.error)
