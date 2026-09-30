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

  // Check all links on the page
  const allLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent?.trim().substring(0, 100),
      target: a.getAttribute('target'),
      className: (a as HTMLElement).className?.substring(0, 50),
    })).filter(l => l.href && l.href.startsWith('http'))
  })

  console.log('\nAll external links:')
  allLinks.forEach((l, i) => {
    console.log(`${i}: ${l.href?.substring(0, 100)}`)
    console.log(`   text: ${l.text}`)
    console.log(`   target: ${l.target}`)
    console.log(`   class: ${l.className}`)
  })

  // Check for any data attributes that might contain preview URL
  const dataUrls = await page.evaluate(() => {
    const results: any[] = []
    document.querySelectorAll('*').forEach(el => {
      const attrs = el.getAttributeNames()
      attrs.forEach(attr => {
        const value = el.getAttribute(attr)
        if (value && (value.includes('my-website') || value.includes('.wegic.net') || value.includes('preview'))) {
          results.push({
            tag: el.tagName,
            attr,
            value: value.substring(0, 200),
            text: el.textContent?.trim().substring(0, 50),
          })
        }
      })
    })
    return results
  })

  console.log('\nData attributes with preview URLs:')
  dataUrls.forEach(d => console.log(JSON.stringify(d)))

  // Check for any script that might contain preview URL
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.src,
      text: s.textContent?.substring(0, 1000),
    })).filter(s => s.text && (s.text.includes('preview') || s.text.includes('.wegic.net')))
  })

  console.log('\nScripts with preview info:', scripts.length)

  await browser.close()
}

test().catch(console.error)
