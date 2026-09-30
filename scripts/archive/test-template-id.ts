import { chromium } from 'playwright'

async function test() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const detailUrl = 'https://wegic.ai/templates/crimson-mustard-retro-burger-diner-website'
  console.log('Visiting:', detailUrl)

  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 60000 })
  console.log('Page loaded')
  await new Promise(r => setTimeout(r, 3000))

  // Extract template ID from page scripts
  const templateId = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'))
    for (const script of scripts) {
      const text = script.textContent || ''
      if (text.includes('templateDetail')) {
        const match = text.match(/"id":"([^"]+)"/)
        if (match) {
          return match[1]
        }
      }
    }
    return null
  })

  console.log('Template ID:', templateId)

  // Try to construct preview URL
  if (templateId) {
    const previewUrl = `https://my-website-${templateId.toLowerCase().substring(0, 8)}.wegic.net/`
    console.log('Possible preview URL:', previewUrl)

    // Try to visit the preview URL
    const previewPage = await context.newPage()
    try {
      await previewPage.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await new Promise(r => setTimeout(r, 3000))

      const title = await previewPage.title()
      console.log('Preview page title:', title)
      console.log('Preview page URL:', previewPage.url())

      const html = await previewPage.content()
      console.log('Preview HTML length:', html.length)
      console.log('Preview HTML preview:', html.substring(0, 500))

    } catch (e: any) {
      console.log('Error visiting preview:', e.message)
    }
  }

  await browser.close()
}

test().catch(console.error)
