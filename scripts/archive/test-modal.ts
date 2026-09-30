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

  // Check for modals/dialogs before click
  const modalsBefore = await page.locator('[role="dialog"], .modal, [class*="modal"]').count()
  console.log('Modals before click:', modalsBefore)

  // Click Preview
  console.log('Clicking Preview...')
  await page.locator('button:has-text("Preview")').first().click({ force: true })
  await new Promise(r => setTimeout(r, 3000))

  // Check for modals/dialogs after click
  const modalsAfter = await page.locator('[role="dialog"], .modal, [class*="modal"]').count()
  console.log('Modals after click:', modalsAfter)

  // Check for iframes
  const iframes = await page.locator('iframe').all()
  console.log('Iframes after click:', iframes.length)
  for (let i = 0; i < Math.min(iframes.length, 5); i++) {
    const src = await iframes[i].getAttribute('src')
    console.log(`  Iframe ${i}:`, src?.substring(0, 100))
  }

  // Check URL
  console.log('Current URL:', page.url())

  // Check for any new elements
  const newElements = await page.evaluate(() => {
    const results: Array<{
      tag: string
      className: string
      width: number
      height: number
      zIndex: string
    }> = []

    // Check for fixed positioned elements that might be modals
    document.querySelectorAll('*').forEach((el) => {
      const style = window.getComputedStyle(el)
      if (style.position === 'fixed' && style.display !== 'none') {
        const rect = el.getBoundingClientRect()
        if (rect.width > 100 && rect.height > 100) {
          results.push({
            tag: el.tagName,
            className: (el as HTMLElement).className?.substring(0, 50),
            width: rect.width,
            height: rect.height,
            zIndex: style.zIndex,
          })
        }
      }
    })

    return results.slice(0, 10)
  })

  console.log('Fixed elements:', JSON.stringify(newElements, null, 2))

  await browser.close()
}

test().catch(console.error)
