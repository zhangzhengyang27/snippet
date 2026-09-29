import { chromium } from 'playwright'

async function test() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const detailUrl = 'https://wegic.ai/templates/crimson-mustard-retro-burger-diner-website'
  console.log('Visiting:', detailUrl)

  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 60000 })
  console.log('Page loaded, URL:', page.url())
  await new Promise(r => setTimeout(r, 3000))

  // Listen for navigation
  page.on('framenavigated', frame => {
    console.log('Frame navigated:', frame.url().substring(0, 100))
  })

  // Click Preview
  console.log('Clicking Preview...')
  await page.locator('button:has-text("Preview")').first().click({ force: true })

  // Wait
  await new Promise(r => setTimeout(r, 8000))

  console.log('Current URL:', page.url())
  console.log('Title:', await page.title())

  // Check if we're on a different page
  const currentUrl = page.url()
  if (currentUrl !== detailUrl) {
    console.log('URL changed! New URL:', currentUrl)
  } else {
    console.log('URL did not change')
  }

  // Check for iframe with preview content
  const iframes = await page.locator('iframe').all()
  console.log('Iframes:', iframes.length)
  for (const iframe of iframes) {
    const src = await iframe.getAttribute('src')
    if (src && !src.includes('stripe') && !src.includes('pxf')) {
      console.log('  Iframe src:', src.substring(0, 100))
    }
  }

  await browser.close()
}

test().catch(console.error)
