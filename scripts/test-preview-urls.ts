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

  // Check for any element that might contain a preview URL in data attributes
  const previewUrls = await page.evaluate(() => {
    const results: { tag: string; attr: string; value: string }[] = []

    // Check all elements for data attributes
    document.querySelectorAll('*').forEach(el => {
      const attrs = el.getAttributeNames()
      attrs.forEach(attr => {
        const value = el.getAttribute(attr)
        if (value && (
          value.includes('.wegic.net') ||
          value.includes('my-website') ||
          value.includes('preview') ||
          value.includes('sandbox')
        )) {
          results.push({
            tag: el.tagName,
            attr,
            value: value.substring(0, 200),
          })
        }
      })
    })

    return results
  })

  console.log('\nElements with preview-related attributes:')
  previewUrls.forEach(d => console.log(JSON.stringify(d)))

  // Check for any script that might contain preview URL
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.src,
      text: s.textContent?.substring(0, 2000),
    })).filter(s => {
      const text = s.text || ''
      return text.includes('.wegic.net') || text.includes('my-website') || text.includes('preview')
    })
  })

  console.log('\nScripts with preview URLs:', scripts.length)
  scripts.forEach((s, i) => {
    console.log(`Script ${i}:`)
    console.log(s.text?.substring(0, 500))
  })

  // Check for any link with target="_blank"
  const blankLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[target="_blank"]')).map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent?.trim().substring(0, 50),
    }))
  })

  console.log('\nLinks with target="_blank":')
  blankLinks.forEach(l => console.log(JSON.stringify(l)))

  await browser.close()
}

test().catch(console.error)
