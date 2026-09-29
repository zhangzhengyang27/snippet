import { chromium } from 'playwright'

async function test() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  const url = 'https://wegic.ai/templates/concrete-grey-high-end-architecture-construction-website'
  console.log('Visiting:', url)
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(5000)

  // Extract previewUrl from page content/scripts
  const previewUrl = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'))
    for (const s of scripts) {
      const t = s.textContent || ''
      // Look for previewUrl in JSON or JS objects
      const m = t.match(/"previewUrl"\s*:\s*"([^"]+)"/)
      if (m) return m[1]
    }
    // Also check window object
    if ((window as any).__NEXT_DATA__) {
      const nd = (window as any).__NEXT_DATA__
      return nd.props?.pageProps?.previewUrl || null
    }
    return null
  })

  console.log('previewUrl from evaluate:', previewUrl)

  // Also check the full HTML
  const html = await page.content()
  const match = html.match(/"previewUrl":"([^"]+)"/)
  console.log('previewUrl from HTML:', match ? match[1] : 'not found')

  // Also try the RSC payload approach
  const rscMatch = html.match(/previewUrl[^}]*?"([^"]*\.wegic\.(?:net|ai)[^"]*)"/)
  console.log('RSC match:', rscMatch ? rscMatch[1] : 'not found')

  await browser.close()
}

test().catch(console.error)
