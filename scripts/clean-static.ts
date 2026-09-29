import fs from 'fs/promises'
import path from 'path'

const BASE_DIR = '/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic'

async function checkAndStrip(dirNum: string): Promise<{ dir: string; externalRefs: number; stripped: number }> {
  const filePath = path.join(BASE_DIR, dirNum, 'index.html')
  let html = await fs.readFile(filePath, 'utf-8')

  // Count external references (excluding Google Fonts which are harmless)
  const externalUrls = html.match(/https:\/\/(?!(?:localhost|fonts\.googleapis\.com|fonts\.gstatic\.com))[^"'\s]+/gi) || []

  if (externalUrls.length === 0) {
    return { dir: dirNum, externalRefs: 0, stripped: 0 }
  }

  console.log(`  Found ${externalUrls.length} external refs, stripping JS...`)
  let changes = 0

  // Remove ALL <script> tags (inline and external)
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  html = html.replace(/<script[^>]*\/>/gi, '')
  changes++

  // Remove external <link> tags
  html = html.replace(/<link[^>]*href="https:\/\/[^"]*"[^>]*>/gi, '')
  changes++

  await fs.writeFile(filePath, html)
  return { dir: dirNum, externalRefs: externalUrls.length, stripped: changes }
}

async function main() {
  console.log('🔧 Targeted fix: strip JS only from templates with external CDN refs\n')

  let strippedCount = 0
  let cleanCount = 0

  for (let i = 1; i <= 24; i++) {
    const result = await checkAndStrip(String(i))
    if (result.stripped > 0) {
      strippedCount++
      console.log(`  ${i}/24: ⚠️ ${result.externalRefs} external → stripped JS`)
    } else {
      cleanCount++
    }
  }

  console.log(`\n📊 ✅ Clean (JS intact): ${cleanCount} | 🔧 Stripped (static HTML): ${strippedCount}`)
}

main().catch(console.error)
