import { chromium } from 'playwright'

async function test() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const detailUrl = 'https://wegic.ai/templates/crimson-mustard-retro-burger-diner-website'
  console.log('Visiting:', detailUrl)

  // Listen for all network requests
  const requests: string[] = []
  page.on('request', req => {
    const url = req.url()
    if (url.includes('wegic') && !url.includes('stripe') && !url.includes('googletag')) {
      requests.push(url.substring(0, 150))
    }
  })

  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 60000 })
  console.log('Page loaded')
  await new Promise(r => setTimeout(r, 3000))

  // Clear requests before click
  requests.length = 0

  console.log('Clicking Preview...')
  await page.locator('button:has-text("Preview")').first().click({ force: true })

  // Wait and collect requests
  await new Promise(r => setTimeout(r, 5000))

  console.log('\nRequests after click:')
  requests.forEach((url, i) => console.log(`  ${i}: ${url}`))

  // Check if there's a new window target
  const targets = await browser.targets()
  console.log('\nBrowser targets:')
  for (const target of targets) {
    const url = target.url()
    if (url && url !== 'about:blank' && !url.includes('stripe') && !url.includes('googletag')) {
      console.log(`  ${target.type()}: ${url.substring(0, 100)}`)
    }
  }

  // Check page content after click
  const hasIframe = await page.locator('iframe').count() > 0
  console.log('\nHas iframe after click:', hasIframe)

  // Check if there's a srcdoc iframe
  const srcdocIframes = await page.locator('iframe[srcdoc]').all()
  console.log('Srcdoc iframes:', srcdocIframes.length)

  // Check for any new elements with specific patterns
  const newContent = await page.evaluate(() => {
    // Check for any element that might contain a preview
    const allElements = Array.from(document.querySelectorAll('*'))
    const previewElements = allElements.filter(el => {
      const text = el.textContent?.toLowerCase() || ''
      const className = (el as HTMLElement).className?.toLowerCase() || ''
      return text.includes('preview') || className.includes('preview') || className.includes('modal')
    })

    return previewElements.map(el => ({
      tag: el.tagName,
      className: (el as HTMLElement).className?.substring(0, 50),
      text: el.textContent?.trim().substring(0, 100),
    })).slice(0, 10)
  })

  console.log('\nPreview-related elements:')
  console.log(JSON.stringify(newContent, null, 2))

  await browser.close()
}

test().catch(console.error)
