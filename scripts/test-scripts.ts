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

  // Get all scripts content
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.src,
      text: s.textContent?.substring(0, 5000),
    })).filter(s => s.text && s.text.includes('template'))
  })

  console.log('Scripts with template:', scripts.length)
  for (let i = 0; i < scripts.length; i++) {
    console.log(`\nScript ${i}:`)
    console.log(scripts[i].text?.substring(0, 2000))
  }

  await browser.close()
}

test().catch(console.error)
