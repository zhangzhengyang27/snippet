import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const detailUrl = 'https://wegic.ai/templates/crimson-mustard-retro-burger-diner-website'
  console.log('Visiting:', detailUrl)

  // Listen for new pages BEFORE navigating
  let newPageUrl: string | null = null
  context.on('page', async (newPage) => {
    newPageUrl = newPage.url()
    console.log('New page opened:', newPageUrl)
    try {
      await newPage.waitForLoadState('domcontentloaded', { timeout: 30000 })
      const title = await newPage.title()
      console.log('New page title:', title)
    } catch (e: unknown) {
      console.log('New page load error:', e instanceof Error ? e.message : String(e))
    }
  })

  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await new Promise(r => setTimeout(r, 3000))

  console.log('Page loaded, clicking Preview button...')

  // Use dispatchEvent to trigger the click
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const previewBtn = buttons.find(b => {
      const text = b.textContent?.toLowerCase() || ''
      return text.includes('preview')
    })
    if (previewBtn) {
      console.log('Found preview button, dispatching click event...')
      const event = new MouseEvent('click', { bubbles: true, cancelable: true })
      previewBtn.dispatchEvent(event)
      return true
    }
    return false
  })

  console.log('Click dispatched:', clicked)

  // Wait for new page
  await new Promise(r => setTimeout(r, 5000))

  console.log('Total pages:', context.pages().length)
  context.pages().forEach((p, i) => {
    console.log(`Page ${i}:`, p.url())
  })

  if (newPageUrl) {
    console.log('\nPreview URL found:', newPageUrl)
  } else {
    console.log('\nNo preview URL captured. Trying alternative approach...')

    // Try clicking with Playwright's click method
    try {
      const btn = page.locator('button:has-text("Preview")').first()
      await btn.click({ timeout: 10000, force: true })
      console.log('Playwright click succeeded')
    } catch (e: unknown) {
      console.log('Playwright click failed:', e instanceof Error ? e.message : String(e))
    }

    await new Promise(r => setTimeout(r, 5000))
    console.log('Total pages after Playwright click:', context.pages().length)
    context.pages().forEach((p, i) => {
      console.log(`Page ${i}:`, p.url())
    })
  }

  await browser.close()
}

main().catch(console.error)
