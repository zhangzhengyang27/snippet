import { chromium } from 'playwright'

async function test() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto('https://wegic.ai/templates/concrete-grey-high-end-architecture-construction-website', {
    waitUntil: 'networkidle',
    timeout: 60000
  })
  await page.waitForTimeout(5000)

  // 检查页面内容
  const html = await page.content()
  console.log('HTML length:', html.length)

  // 搜索 previewUrl
  const previewMatch = html.match(/previewUrl.*?&quot;([^&]+)/)
  console.log('Preview match:', previewMatch ? previewMatch[0] : 'not found')

  // 搜索 templateDetail
  const detailMatch = html.match(/templateDetail.*?&quot;([^&]+)/)
  console.log('Detail match:', detailMatch ? detailMatch[0] : 'not found')

  // 搜索所有包含 wegic.net 的链接
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => a.getAttribute('href'))
      .filter(href => href && href.includes('wegic.net'))
  })
  console.log('Wegic.net links:', links)

  // 检查是否有 iframe
  const iframes = await page.locator('iframe').count()
  console.log('Iframes:', iframes)

  await browser.close()
}

test().catch(console.error)
