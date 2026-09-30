import { chromium } from 'playwright'

async function test() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // Test with first template
  let url = 'https://wegic.ai/templates/concrete-grey-high-end-architecture-construction-website'
  console.log('1. Visiting:', url)
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(4000)
  let html = await page.content()
  let match = html.match(/previewUrl[^}]*?"([^"]*\.wegic\.(?:net|ai)[^"]*)"/)
  console.log('   Result:', match ? match[1] : 'NOT FOUND')

  // Test with second template
  url = 'https://wegic.ai/templates/roasted-mocha-organic-coffee-boutique-website'
  console.log('2. Visiting:', url)
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(4000)
  html = await page.content()
  match = html.match(/previewUrl[^}]*?"([^"]*\.wegic\.(?:net|ai)[^"]*)"/)
  console.log('   Result:', match ? match[1] : 'NOT FOUND')

  // Test with third template
  url = 'https://wegic.ai/templates/monochromatic-minimalist-apparel-studio-website'
  console.log('3. Visiting:', url)
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(4000)
  html = await page.content()
  match = html.match(/previewUrl[^}]*?"([^"]*\.wegic\.(?:net|ai)[^"]*)"/)
  console.log('   Result:', match ? match[1] : 'NOT FOUND')

  await browser.close()
}

test().catch(console.error)
