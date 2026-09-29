import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const detailUrl = 'https://wegic.ai/templates/crimson-mustard-retro-burger-diner-website'
  console.log('Visiting:', detailUrl)

  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await new Promise(r => setTimeout(r, 3000))

  // Check all buttons
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a, [role="button"]')).map((el, i) => ({
      index: i,
      tag: el.tagName,
      text: el.textContent?.trim().substring(0, 100),
      className: (el as HTMLElement).className?.substring(0, 100),
      href: el.getAttribute('href'),
      onclick: el.getAttribute('onclick'),
      'data-action': el.getAttribute('data-action'),
      id: el.id,
    }))
  })

  console.log('\nAll interactive elements:')
  buttons.forEach(b => {
    if (b.text?.toLowerCase().includes('preview') ||
        b.text?.toLowerCase().includes('view') ||
        b.text?.toLowerCase().includes('live') ||
        b.className?.toLowerCase().includes('preview')) {
      console.log(JSON.stringify(b, null, 2))
    }
  })

  // Check for any data attributes that might contain preview URL
  const dataAttrs = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('*'))
    const results: Array<Record<string, string>> = []
    allElements.forEach(el => {
      const attrs = el.getAttributeNames()
      attrs.forEach(attr => {
        if (attr.includes('preview') || attr.includes('url') || attr.includes('link')) {
          const value = el.getAttribute(attr)
          if (value && value.includes('http')) {
            results.push({
              tag: el.tagName,
              attr,
              value: value.substring(0, 200),
              text: el.textContent?.trim().substring(0, 50),
            })
          }
        }
      })
    })
    return results
  })

  console.log('\nData attributes with URLs:')
  dataAttrs.slice(0, 20).forEach(d => console.log(JSON.stringify(d)))

  // Check for any script that might contain preview URL
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.src,
      text: s.textContent?.substring(0, 500),
    })).filter(s => s.text && (s.text.includes('preview') || s.text.includes('wegic')))
  })

  console.log('\nRelevant scripts:', scripts.length)

  // Check for any link that might be the preview
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent?.trim().substring(0, 50),
      target: a.getAttribute('target'),
    })).filter(l => l.href && (l.href.includes('wegic') || l.href.includes('my-website')))
  })

  console.log('\nWegic links:')
  links.forEach(l => console.log(JSON.stringify(l)))

  await browser.close()
}

main().catch(console.error)
