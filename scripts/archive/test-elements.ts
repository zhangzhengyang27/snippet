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

  // Get all elements before click
  const beforeElements = await page.evaluate(() => {
    return document.querySelectorAll('*').length
  })
  console.log('Elements before click:', beforeElements)

  // Click Preview
  console.log('Clicking Preview...')
  await page.locator('button:has-text("Preview")').first().click({ force: true })
  await new Promise(r => setTimeout(r, 5000))

  // Get all elements after click
  const afterElements = await page.evaluate(() => {
    return document.querySelectorAll('*').length
  })
  console.log('Elements after click:', afterElements)

  // Check for any new elements with specific attributes
  const newElements = await page.evaluate(() => {
    const results: any[] = []

    // Check for elements with specific class names
    const selectors = [
      '[class*="preview"]',
      '[class*="modal"]',
      '[class*="dialog"]',
      '[class*="iframe"]',
      '[class*="embed"]',
      '[class*="sandbox"]',
      '[id*="preview"]',
      '[id*="modal"]',
      '[id*="dialog"]',
      '[id*="iframe"]',
      '[id*="embed"]',
      '[id*="sandbox"]',
    ]

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector)
      elements.forEach(el => {
        results.push({
          selector,
          tag: el.tagName,
          className: (el as HTMLElement).className?.substring(0, 50),
          id: el.id,
          text: el.textContent?.trim().substring(0, 100),
        })
      })
    }

    return results
  })

  console.log('\nPreview/Modal/Dialog elements:')
  console.log(JSON.stringify(newElements.slice(0, 20), null, 2))

  // Check for any element with src attribute containing wegic
  const srcElements = await page.evaluate(() => {
    const results: any[] = []
    document.querySelectorAll('[src]').forEach(el => {
      const src = el.getAttribute('src')
      if (src && src.includes('wegic') && !src.includes('stripe')) {
        results.push({
          tag: el.tagName,
          src: src.substring(0, 200),
          className: (el as HTMLElement).className?.substring(0, 50),
        })
      }
    })
    return results
  })

  console.log('\nElements with Wegic src:')
  console.log(JSON.stringify(srcElements, null, 2))

  await browser.close()
}

test().catch(console.error)
