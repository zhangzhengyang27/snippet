import fs from 'fs/promises'
import path from 'path'

const BASE_DIR = '/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic'

async function downloadFile(url: string, outPath: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 15000)
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'image/*,*/*' }
    })
    clearTimeout(t)
    if (!resp.ok) return false
    const buf = await resp.arrayBuffer()
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, Buffer.from(buf))
    return true
  } catch { return false }
}

async function fixExternalImages(filePath: string, dir: string): Promise<number> {
  let html = await fs.readFile(filePath, 'utf-8')
  let fixes = 0

  // Find all external image URLs
  const imgRegex = /<img[^>]*src="(https:\/\/(?:cdn\.wegic\.ai|aibuildcdn-dev\.geesdev\.com|images\.unsplash\.com)[^"]+)"[^>]*>/gi
  const replacements: { url: string; local: string }[] = []

  let match
  while ((match = imgRegex.exec(html)) !== null) {
    const fullUrl = match[1]
    const ext = fullUrl.match(/\.(jpg|jpeg|png|webp|svg|gif)/i)?.[1] || 'jpg'
    const id = fullUrl.match(/(\d{10,16})/)?.[1] || Date.now().toString()
    const filename = `${id}.${ext}`
    const localPath = `./images/${filename}`
    replacements.push({ url: fullUrl, local: localPath })
  }

  if (replacements.length === 0) return 0

  console.log(`    External images: ${replacements.length}`)

  for (const r of replacements) {
    const imgPath = path.join(BASE_DIR, dir, 'images', path.basename(r.local))
    const downloaded = await downloadFile(r.url, imgPath)
    if (downloaded) {
      html = html.replace(r.url, r.local)
      fixes++
      console.log(`      ✅ ${path.basename(r.local)}`)
    } else {
      console.log(`      ❌ ${path.basename(r.local)} (failed)`)

      // Replace with placeholder or remove src
      html = html.replace(
        new RegExp(`src="${r.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
        'src=""'
      )
    }
  }

  await fs.writeFile(filePath, html)
  return fixes
}

async function main() {
  console.log('🔧 Fixing external image URLs...\n')

  let totalFixes = 0

  for (let i = 1; i <= 24; i++) {
    const filePath = path.join(BASE_DIR, String(i), 'index.html')
    try {
      await fs.access(filePath)
      console.log(`📄 ${i}/24:`)
      const fixes = await fixExternalImages(filePath, String(i))
      totalFixes += fixes
    } catch {
      console.log(`  ${i}/24: ❌ no file`)
    }
  }

  console.log(`\n✅ Total images fixed: ${totalFixes}`)
}

main().catch(console.error)
