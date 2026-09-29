import fs from 'fs/promises'
import path from 'path'

const BASE_DIR = '/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic'

// External domains to strip
const EXTERNAL_DOMAINS = [
  'cdn.wegic.ai',
  'aibuildcdn-dev.geesdev.com',
  'dev.wegic-tx.geesdev.com',
  'images.unsplash.com',
]

async function fixHtml(filePath: string, dir: string): Promise<number> {
  let html = await fs.readFile(filePath, 'utf-8')
  let changes = 0

  // 1. Remove external modulepreload links
  const preloadRegex = /<link[^>]*rel="modulepreload"[^>]*href="https:\/\/[^"]*"[^>]*>/gi
  const preloadCount = (html.match(preloadRegex) || []).length
  if (preloadCount > 0) {
    html = html.replace(preloadRegex, '')
    changes += preloadCount
  }

  // 2. Remove external preload links (for fonts etc)
  const extPreloadRegex = /<link[^>]*rel="preload"[^>]*href="https:\/\/(?!localhost)[^"]*"[^>]*>/gi
  const extPreloadCount = (html.match(extPreloadRegex) || []).length
  if (extPreloadCount > 0) {
    html = html.replace(extPreloadRegex, '')
    changes += extPreloadCount
  }

  // 3. Check for external image URLs
  const imgRegex = /<img[^>]*src="(https:\/\/[^"]+)"[^>]*>/gi
  let imgMatch
  const externalImages: string[] = []
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    externalImages.push(imgMatch[1])
  }

  if (externalImages.length > 0) {
    for (const imgUrl of externalImages) {
      console.log(`    Ext img: ${imgUrl.substring(0, 80)}...`)
    }
  }

  // 4. Check for missing local JS files referenced in script tags
  const scriptRegex = /<script[^>]*src="\.\/assets\/([^"]+)"[^>]*>/gi
  let scriptMatch
  const missingScripts: string[] = []
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const filename = scriptMatch[1]
    const filePath = path.join(BASE_DIR, dir, 'assets', filename)
    try {
      await fs.access(filePath)
    } catch {
      missingScripts.push(filename)
    }
  }

  if (missingScripts.length > 0) {
    // Remove scripts that don't exist locally
    for (const filename of missingScripts) {
      const regex = new RegExp(
        `<script[^>]*src="\\./assets/${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*></script>`,
        'gi'
      )
      html = html.replace(regex, '')
      changes++
    }
    console.log(`    Missing scripts removed: ${missingScripts.join(', ')}`)
  }

  // 5. Check for missing CSS files
  const cssRegex = /<link[^>]*rel="stylesheet"[^>]*href="\.\/assets\/([^"]+)"[^>]*>/gi
  let cssMatch
  const missingCss: string[] = []
  while ((cssMatch = cssRegex.exec(html)) !== null) {
    const filename = cssMatch[1]
    const filePath = path.join(BASE_DIR, dir, 'assets', filename)
    try {
      await fs.access(filePath)
    } catch {
      missingCss.push(filename)
    }
  }

  if (missingCss.length > 0) {
    for (const filename of missingCss) {
      const regex = new RegExp(
        `<link[^>]*rel="stylesheet"[^>]*href="\\./assets/${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`,
        'gi'
      )
      html = html.replace(regex, '')
      changes++
    }
    console.log(`    Missing CSS removed: ${missingCss.join(', ')}`)
  }

  await fs.writeFile(filePath, html)
  return changes
}

async function main() {
  console.log('🔧 Deep-fixing Wegic template HTML files...\n')

  let totalChanges = 0

  for (let i = 1; i <= 24; i++) {
    const filePath = path.join(BASE_DIR, String(i), 'index.html')
    try {
      await fs.access(filePath)
      console.log(`\n📄 ${i}/24:`)
      const changes = await fixHtml(filePath, String(i))
      totalChanges += changes
      console.log(`  → ${changes} fixes`)
    } catch {
      console.log(`  ${i}/24: ❌ no file`)
    }
  }

  console.log(`\n✅ Total fixes: ${totalChanges}`)
}

main().catch(console.error)
