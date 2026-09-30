import { chromium } from 'playwright'

async function test() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const detailUrl = 'https://wegic.ai/templates/crimson-mustard-retro-burger-diner-website'
  console.log('Visiting:', detailUrl)

  await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  console.log('Page loaded')
  await new Promise(r => setTimeout(r, 2000))

  // Check if there are any preview buttons
  const buttons = await page.locator('button:has-text("Preview")').all()
  console.log('Preview buttons found:', buttons.length)

  if (buttons.length > 0) {
    const firstBtn = buttons[0]
    console.log('First button visible:', await firstBtn.isVisible().catch(() => false))
    console.log('First button text:', await firstBtn.textContent())
  }

  // Try clicking with Playwright
  try {
    console.log('Trying Playwright click...')
    await page.locator('button:has-text("Preview")').first().click({ timeout: 10000, force: true })
    console.log('Playwright click succeeded')
  } catch (e: unknown) {
    console.log('Playwright click failed:', e instanceof Error ? e.message : String(e))
  }

  await new Promise(r => setTimeout(r, 5000))

  // Check all pages
  console.log('Total pages:', context.pages().length)
  for (let i = 0; i < context.pages().length; i++) {
    const p = context.pages()[i]
    console.log(`Page ${i}:`, p.url())
  }

  await browser.close()
}

test().catch(console.error)
