import { chromium } from 'playwright'

async function test() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto('https://wegic.ai/templates', { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(3000)

  // Dismiss modals
  try {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1000)
    const overlay = page.locator('.fixed.inset-0.z-\\[1000\\]')
    if (await overlay.count() > 0) {
      await page.mouse.click(100, 100)
      await page.waitForTimeout(1000)
    }
    console.log('Modal dismissed')
  } catch (e) {
    console.log('No modal')
  }

  // Find all cards
  const cards = await page.locator('a[href*="/templates/"]').all()
  console.log(`Found ${cards.length} cards`)

  // Look at card 0's structure
  const card0 = cards[2] // skip filter links, get template card

  // Get the card's parent structure
  console.log('\n=== Card HTML ===')
  const cardHtml = await card0.evaluate(el => {
    // Go up to find the parent card container
    let parent = el
    for (let i = 0; i < 5; i++) {
      if (parent.parentElement) {
        parent = parent.parentElement
        if (parent.getAttribute('role') || parent.className.includes('card') || parent.className.includes('template')) {
          break
        }
      }
    }
    return {
      tag: parent.tagName,
      className: parent.className,
      id: parent.id,
      innerHTML: parent.innerHTML.substring(0, 3000),
    }
  })
  console.log(JSON.stringify(cardHtml, null, 2).substring(0, 2000))

  // Hover the card
  console.log('\n=== Hovering card 2 ===')
  await card0.hover({ timeout: 5000 })
  await page.waitForTimeout(2000)

  // Now check for Preview buttons
  const previewBtns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button'))
      .filter(b => {
        const text = b.textContent?.trim() || ''
        return text === 'Preview' && b.offsetParent !== null
      })
      .map(b => {
        let parent = b.parentElement
        let depth = 0
        const hierarchy = []
        while (parent && depth < 10) {
          hierarchy.push(`${parent.tagName.toLowerCase()}${parent.className ? '.' + parent.className.split(' ').slice(0,2).join('.') : ''}`)
          parent = parent.parentElement
          depth++
        }
        return {
          text: b.textContent?.trim(),
          className: b.className,
          href: b.closest('a')?.getAttribute('href'),
          inCard: b.closest('a[href*="/templates/"]') !== null,
          hierarchy: hierarchy.slice(0, 4).join(' > '),
        }
      })
  })
  console.log('\n=== Visible Preview buttons ===')
  console.log(JSON.stringify(previewBtns, null, 2))

  await browser.close()
}

test().catch(console.error)
