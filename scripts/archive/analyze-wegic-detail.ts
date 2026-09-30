import { chromium } from 'playwright'
import fs from 'fs/promises'
import path from 'path'

async function analyze() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // 访问模版详情页
  const detailUrl = 'https://wegic.ai/templates/concrete-grey-high-end-architecture-construction-website'
  console.log('Step 1: Visiting detail page:', detailUrl)
  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(3000)

  // 使用 JavaScript 点击 Preview 按钮
  console.log('Step 2: Clicking Preview button...')
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const previewBtn = buttons.find(b => {
      const text = b.textContent?.toLowerCase() || ''
      return text.includes('preview')
    })
    if (previewBtn) {
      previewBtn.click()
    }
  })

  // 等待新页面打开
  await page.waitForTimeout(3000)

  const pages = context.pages()
  console.log('Total pages:', pages.length)

  if (pages.length > 1) {
    const previewPage = pages[pages.length - 1]
    console.log('Step 3: Preview page URL:', previewPage.url())

    await previewPage.waitForLoadState('networkidle')
    await previewPage.waitForTimeout(3000)

    const title = await previewPage.title()
    console.log('Preview page title:', title)

    const html = await previewPage.content()
    console.log('HTML length:', html.length)
    console.log('HTML preview:', html.substring(0, 1000))

    // 检查 HTML 结构
    const structure = await previewPage.evaluate(() => {
      return {
        hasDoctype: document.doctype !== null,
        htmlLang: document.documentElement.lang,
        headChildren: Array.from(document.head.children).map(c => c.tagName + (c.id ? '#' + c.id : '')),
        bodyChildren: Array.from(document.body.children).map(c => c.tagName + (c.id ? '#' + c.id : '')).slice(0, 20),
        scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src).slice(0, 10),
        stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href).slice(0, 10),
        images: Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt,
        })).slice(0, 10),
        links: Array.from(document.querySelectorAll('a[href]')).map(a => a.href).slice(0, 10),
      }
    })
    console.log('Page structure:', JSON.stringify(structure, null, 2))

    // 保存 HTML
    const outputDir = '/Users/xiaoye/Desktop/html5-examples/public/static-sites/test-preview'
    await fs.mkdir(outputDir, { recursive: true })
    await fs.writeFile(path.join(outputDir, 'index.html'), html)
    console.log('Saved HTML to', path.join(outputDir, 'index.html'))

    // 尝试下载所有资源
    console.log('\\nStep 4: Downloading resources...')
    const resources = await previewPage.evaluate(() => {
      const results: { type: string; url: string }[] = []

      // CSS
      document.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
        const href = l.getAttribute('href')
        if (href) results.push({ type: 'css', url: href })
      })

      // JS
      document.querySelectorAll('script[src]').forEach(s => {
        const src = s.getAttribute('src')
        if (src) results.push({ type: 'js', url: src })
      })

      // Images
      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src')
        if (src) results.push({ type: 'img', url: src })
      })

      // Background images in style attributes
      document.querySelectorAll('[style*="url"]').forEach(el => {
        const style = el.getAttribute('style')
        if (style) {
          const matches = style.match(/url\(['"]?(.+?)['"]?\)/g)
          if (matches) {
            matches.forEach(m => {
              const url = m.replace(/url\(['"]?(.+?)['"]?\)/, '$1')
              results.push({ type: 'bg', url })
            })
          }
        }
      })

      return results
    })

    console.log('Found resources:', resources.length)
    for (const r of resources.slice(0, 20)) {
      console.log('  ' + r.type + ': ' + r.url.substring(0, 100))
    }
  }

  await browser.close()
}

analyze().catch(console.error)
