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

  // Get the page content before click
  const htmlBefore = await page.content()
  console.log('HTML before click length:', htmlBefore.length)

  // Click Preview
  console.log('Clicking Preview...')
  await page.locator('button:has-text("Preview")').first().click({ force: true })
  await new Promise(r => setTimeout(r, 5000))

  // Check for any iframe with wegic in src
  const iframes = await page.locator('iframe').all()
  console.log('Total iframes:', iframes.length)

  for (let i = 0; i < iframes.length; i++) {
    const src = await iframes[i].getAttribute('src')
    console.log(`Iframe ${i}:`, src?.substring(0, 200))

    if (src && src.includes('wegic') && !src.includes('stripe') && !src.includes('pxf')) {
      console.log('  -> This looks like the preview iframe!')
      try {
        const frame = await iframes[i].contentFrame()
        if (frame) {
          const frameUrl = frame.url()
          console.log('  Frame URL:', frameUrl)
          const frameHtml = await frame.content()
          console.log('  Frame HTML length:', frameHtml.length)
          console.log('  Frame HTML preview:', frameHtml.substring(0, 500))
        }
      } catch (e: any) {
        console.log('  Error getting frame content:', e.message)
      }
    }
  }

  // Also check if there's a new window opened
  const allPages = context.pages()
  console.log('Total pages:', allPages.length)
  for (let i = 0; i < allPages.length; i++) {
    console.log(`Page ${i}:`, allPages[i].url().substring(0, 100))
  }

  await browser.close()
}

test().catch(console.error)
