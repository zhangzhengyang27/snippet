import fs from 'fs/promises'
import path from 'path'

const BASE_DIR = '/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic'

async function stripBrokenJS(dirNum: string): Promise<{ dir: string; hasErrors: boolean; fixed: boolean }> {
  const filePath = path.join(BASE_DIR, dirNum, 'index.html')
  let html = await fs.readFile(filePath, 'utf-8')

  // Check for modulepreload links that reference external CDNs
  const hasExternalPreloads = /<link[^>]*rel="modulepreload"[^>]*href="https:\/\/[^"]*"[^>]*>/i.test(html)

  // Check for missing assets: find all local script src references, verify they exist
  const localScripts = [...html.matchAll(/<script[^>]*src="\.\/assets\/([^"]+)"[^>]*>/gi)]
  let hasMissingAssets = false
  for (const match of localScripts) {
    const filename = match[1]
    try {
      await fs.access(path.join(BASE_DIR, dirNum, 'assets', filename))
    } catch {
      hasMissingAssets = true
      break
    }
  }

  if (!hasExternalPreloads && !hasMissingAssets) {
    return { dir: dirNum, hasErrors: false, fixed: false }
  }

  // This template has issues - strip all JS and leave static HTML
  console.log(`  ⚠️ Found issues, stripping JS for static display`)

  // Remove all script tags
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  html = html.replace(/<script[^>]*\/>/gi, '')

  // Remove modulepreload links
  html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>/gi, '')

  // Remove any remaining style/script with external CDN references
  html = html.replace(/<link[^>]*href="https:\/\/cdn\.wegic\.ai[^"]*"[^>]*>/gi, '')
  html = html.replace(/<link[^>]*href="https:\/\/aibuildcdn-dev\.geesdev\.com[^"]*"[^>]*>/gi, '')

  await fs.writeFile(filePath, html)
  return { dir: dirNum, hasErrors: true, fixed: true }
}

async function main() {
  console.log('🔧 Stripping broken JS from Wegic templates...\n')

  let stripped = 0
  let clean = 0

  for (let i = 1; i <= 24; i++) {
    console.log(`  ${i}/24:`)
    const result = await stripBrokenJS(String(i))
    if (result.hasErrors && result.fixed) {
      stripped++
    } else {
      clean++
    }
  }

  console.log(`\n📊 Results: ✅ Clean: ${clean} | 🔧 Stripped: ${stripped}`)
  console.log('Stripped templates will show static HTML (no JS interactivity, but no 404 errors).')
}

main().catch(console.error)
