import { chromium } from 'playwright'

async function test() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const detailUrl = 'https://wegic.ai/templates/crimson-mustard-retro-burger-diner-website'
  console.log('Visiting:', detailUrl)

  // Track all network requests
  const requests: { url: string; method: string; type: string }[] = []
  page.on('request', req => {
    const url = req.url()
    const type = req.resourceType()
    if (type === 'document' || type === 'xhr' || type === 'fetch') {
      requests.push({ url: url.substring(0, 200), method: req.method(), type })
    }
  })

  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 60000 })
  console.log('Page loaded')
  await new Promise(r => setTimeout(r, 3000))

  // Clear requests
  requests.length = 0

  // Click Preview
  console.log('Clicking Preview...')
  await page.locator('button:has-text("Preview")').first().click({ force: true })

  // Wait for requests
  await new Promise(r => setTimeout(r, 8000))

  console.log('\nNetwork requests after click:')
  const uniqueUrls = [...new Set(requests.map(r => r.url))]
  uniqueUrls.forEach((url, i) => {
    console.log(`${i}: ${url}`)
  })

  // Check for any iframe changes
  const iframes = await page.locator('iframe').all()
  console.log('\nIframes after click:', iframes.length)
  for (let i = 0; i < iframes.length; i++) {
    const src = await iframes[i].getAttribute('src')
    console.log(`  Iframe ${i}:`, src?.substring(0, 100))
  }

  // Check URL
  console.log('\nCurrent URL:', page.url())

  await browser.close()
}

test().catch(console.error)
