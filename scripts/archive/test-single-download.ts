import { chromium } from 'playwright'
import fs from 'fs/promises'
import path from 'path'

const BASE_DIR = '/Users/xiaoye/Desktop/html5-examples/public/static-sites'

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function downloadFile(url: string, outputPath: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
      }
    })

    if (!response.ok) return false

    const buffer = await response.arrayBuffer()
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, Buffer.from(buffer))
    return true
  } catch {
    return false
  }
}

function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const basename = path.basename(urlObj.pathname) || 'resource'
    return basename.split('?')[0].replace(/[^a-zA-Z0-9._-]/g, '_')
  } catch {
    return 'resource_' + Date.now()
  }
}

async function main() {
  const templateId = 123
  const templateTitle = 'Crimson Mustard Retro Burger Diner Website'
  const detailUrl = 'https://wegic.ai/templates/crimson-mustard-retro-burger-diner-website'
  const siteDir = path.join(BASE_DIR, 'wegic', templateId.toString())

  console.log('Testing single template download...')
  console.log('Template:', templateTitle)
  console.log('Detail URL:', detailUrl)
  console.log('Output dir:', siteDir)

  await fs.mkdir(siteDir, { recursive: true })

  console.log('\nLaunching browser...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    console.log('Visiting detail page...')
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await delay(2000)
    console.log('Page loaded, current URL:', page.url())

    console.log('Clicking Preview button...')
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const previewBtn = buttons.find(b => {
        const text = b.textContent?.toLowerCase() || ''
        return text.includes('preview')
      })
      if (previewBtn) {
        console.log('Found preview button, clicking...')
        previewBtn.click()
      } else {
        console.log('No preview button found')
      }
    })

    console.log('Waiting for new page...')
    await delay(5000)

    const pages = context.pages()
    console.log('Total pages:', pages.length)

    if (pages.length < 2) {
      console.log('No preview page opened!')
      await browser.close()
      return
    }

    const previewPage = pages[pages.length - 1]
    console.log('Preview page URL:', previewPage.url())

    console.log('Waiting for preview page to load...')
    await previewPage.waitForLoadState('domcontentloaded', { timeout: 30000 })
    await delay(3000)

    console.log('Getting HTML...')
    const html = await previewPage.content()
    console.log('HTML length:', html.length)

    // Extract resources
    console.log('Extracting resources...')
    const resources = await previewPage.evaluate(() => {
      const results: { type: string; url: string }[] = []

      document.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
        const href = l.getAttribute('href')
        if (href) results.push({ type: 'css', url: href })
      })

      document.querySelectorAll('script[src]').forEach(s => {
        const src = s.getAttribute('src')
        if (src) results.push({ type: 'js', url: src })
      })

      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src')
        if (src) results.push({ type: 'img', url: src })
      })

      return results
    })

    console.log('Found resources:', resources.length)
    console.log('CSS:', resources.filter(r => r.type === 'css').length)
    console.log('JS:', resources.filter(r => r.type === 'js').length)
    console.log('Images:', resources.filter(r => r.type === 'img').length)

    // Download resources
    const assetsDir = path.join(siteDir, 'assets')
    const imagesDir = path.join(siteDir, 'images')
    await fs.mkdir(assetsDir, { recursive: true })
    await fs.mkdir(imagesDir, { recursive: true })

    const downloaded: { type: string; originalUrl: string; filename: string }[] = []

    for (const r of resources) {
      const filename = getFilenameFromUrl(r.url)
      const outputPath = r.type === 'img'
        ? path.join(imagesDir, filename)
        : path.join(assetsDir, filename)

      console.log(`Downloading ${r.type}: ${filename}`)
      const success = await downloadFile(r.url, outputPath)
      if (success) {
        downloaded.push({ type: r.type, originalUrl: r.url, filename })
        console.log('  ✓ Success')
      } else {
        console.log('  ✗ Failed')
      }
    }

    console.log(`\nDownloaded ${downloaded.length}/${resources.length} resources`)

    // Rewrite HTML
    let localHtml = html
    for (const r of downloaded) {
      const localPath = r.type === 'img' ? `./images/${r.filename}` : `./assets/${r.filename}`
      localHtml = localHtml.replace(
        new RegExp(r.originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        localPath
      )
    }

    // Remove Wegic branding
    localHtml = localHtml.replace(/<script[^>]*src="[^"]*sandbox-script[^"]*"[^>]*><\/script>/gi, '')
    localHtml = localHtml.replace(/<script[^>]*src="[^"]*badge-control[^"]*"[^>]*><\/script>/gi, '')
    localHtml = localHtml.replace(/<script[^>]*src="[^"]*posthog[^"]*"[^>]*><\/script>/gi, '')
    localHtml = localHtml.replace(/<script[^>]*src="[^"]*collect[^"]*"[^>]*><\/script>/gi, '')
    localHtml = localHtml.replace(/<script[^>]*src="[^"]*error-check[^"]*"[^>]*><\/script>/gi, '')
    localHtml = localHtml.replace(/<script[^>]*src="[^"]*element-inspector[^"]*"[^>]*><\/script>/gi, '')
    localHtml = localHtml.replace(/<script[^>]*src="[^"]*preview[^"]*"[^>]*><\/script>/gi, '')
    localHtml = localHtml.replace(/<script[^>]*src="[^"]*page-state[^"]*"[^>]*><\/script>/gi, '')
    localHtml = localHtml.replace(/<script[^>]*src="[^"]*tour-scroll[^"]*"[^>]*><\/script>/gi, '')
    localHtml = localHtml.replace(/<script[^>]*src="[^"]*url-sync[^"]*"[^>]*><\/script>/gi, '')
    localHtml = localHtml.replace(/<script[^>]*src="[^"]*route-tracker[^"]*"[^>]*><\/script>/gi, '')
    localHtml = localHtml.replace(/<script[^>]*src="[^"]*analytics[^"]*"[^>]*><\/script>/gi, '')
    localHtml = localHtml.replace(/<div[^>]*id="wegic-branding-badge"[^>]*>[\s\S]*?<\/div>/gi, '')
    localHtml = localHtml.replace(/<style[^>]*id="wegic-badge-styles"[^>]*>[\s\S]*?<\/style>/gi, '')

    // Save HTML
    await fs.writeFile(path.join(siteDir, 'index.html'), localHtml)
    console.log('\n✅ Saved index.html')

    // Check file sizes
    const files = await fs.readdir(siteDir, { recursive: true })
    console.log('\nFiles in site directory:')
    for (const file of files) {
      const filePath = path.join(siteDir, file)
      const stat = await fs.stat(filePath)
      if (stat.isFile()) {
        console.log(`  ${file}: ${(stat.size / 1024).toFixed(1)} KB`)
      }
    }

    await browser.close()
    console.log('\n✅ Test completed successfully!')

  } catch (error: unknown) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error))
    await browser.close()
  }
}

main().catch(console.error)
