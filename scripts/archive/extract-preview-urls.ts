import { chromium } from 'playwright'
import fs from 'fs/promises'
import path from 'path'

const OUT_FILE = '/tmp/wegic-preview-urls.json'

const alreadyHave = new Set([
  'concrete-grey-high-end-architecture-construction-website', 'roasted-mocha-organic-coffee-boutique-website',
  'monochromatic-minimalist-apparel-studio-website', 'pristine-white-creative-designer-portfolio-website',
  'charcoal-black-bold-design-studio-portfolio-website', 'realistic-vivid-photographer-templates-website',
  'bold-brown-classic-grooming-website', 'elegant-rose-gold-luxury-salon-website',
  'dark-sleek-modern-grooming-website', 'bold-dark-professional-image-consulting-website',
  'clean-navy-elegant-image-consulting-website', 'elegant-dark-classic-law-firm-website',
  'minimal-white-corporate-law-firm-website', 'soft-pink-elegant-boutique-website',
  'bold-black-luxury-boutique-website', 'bold-dark-sleek-mens-grooming-clinic-website',
  'vibrant-purple-creative-music-website', 'teal-craft-decor-website',
  'coral-fiesta-venue-website', 'yellow-cartoon-daycare-website',
  'sage-petal-florist-website', 'charcoal-orange-modern-creative-agency-website',
  'warm-linen-minimalist-apparel-brand-website', 'crimson-mustard-retro-burger-diner-website',
])

const all = JSON.parse(await fs.readFile('/tmp/wegic-all-templates.json', 'utf-8'))
const newTmpl = all.filter(t => !alreadyHave.has(t.slug))
console.log(`Extracting preview URLs for ${newTmpl.length} new templates...\n`)

const d = (ms: number) => new Promise(r => setTimeout(r, ms))

async function getPreview(ctx: any, slug: string): Promise<string | null> {
  const pg = await ctx.newPage()
  try {
    const url = `https://wegic.ai/templates/${slug}`
    try { await pg.goto(url, { waitUntil: 'networkidle', timeout: 30000 }) }
    catch { try { await pg.goto(url, { waitUntil: 'load', timeout: 20000 }) } catch {} }
    await d(2000)
    const h = await pg.content()
    const m = h.match(/previewUrl[^}]*?"([^"]*\.wegic\.(?:net|ai)[^"]*)"/)
    return m ? m[1].replace(/\\$/, '') : null
  } catch { return null }
  finally { try { await pg.close() } catch {} }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext()

  // Check existing progress
  let existing: { slug: string; previewUrl: string; title: string }[] = []
  try { existing = JSON.parse(await fs.readFile(OUT_FILE, 'utf-8')) } catch {}

  const existingSlugs = new Set(existing.map(e => e.slug))
  const toProcess = newTmpl.filter(t => !existingSlugs.has(t.slug))

  console.log(`Already extracted: ${existing.length}, Remaining: ${toProcess.length}\n`)

  const results = [...existing]

  for (let i = 0; i < toProcess.length; i++) {
    const t = toProcess[i]
    console.log(`[${i + 1}/${toProcess.length}] ${t.title.substring(0, 60)}`)

    const previewUrl = await getPreview(ctx, t.slug)
    if (previewUrl) {
      results.push({ slug: t.slug, previewUrl, title: t.title })
      console.log(`  ✅ ${previewUrl}`)
    } else {
      console.log(`  ❌ No preview URL`)
    }

    // Save progress periodically
    if (results.length % 10 === 0 || i === toProcess.length - 1) {
      await fs.writeFile(OUT_FILE, JSON.stringify(results, null, 2))
      console.log(`  💾 Saved (${results.length} total)\n`)
    }

    await d(1500)
  }

  await ctx.close()
  await browser.close()

  console.log(`\n📊 Total extracted: ${results.length}`)
  console.log(`Saved to: ${OUT_FILE}`)
}

main().catch(console.error)
