import { chromium } from 'playwright'

async function test() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto('https://wegic.ai/templates/concrete-grey-high-end-architecture-construction-website', {
    waitUntil: 'networkidle',
    timeout: 60000
  })
  await page.waitForTimeout(5000)

  // 检查 iframe
  const iframeCount = await page.locator('iframe').count()
  console.log('Iframes:', iframeCount)

  if (iframeCount > 0) {
    const iframeSrc = await page.locator('iframe').first().getAttribute('src')
    console.log('Iframe src:', iframeSrc)
  }

  // 检查所有按钮
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent?.trim(),
      className: b.className,
      id: b.id
    }))
  })
  console.log('Buttons:', JSON.stringify(buttons, null, 2))

  // 检查所有链接
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map(a => ({
      text: a.textContent?.trim().substring(0, 50),
      href: a.getAttribute('href')
    })).filter(l => l.href && l.href.includes('wegic'))
  })
  console.log('Links:', JSON.stringify(links, null, 2))

  // 检查页面上的 script 标签内容
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map((s, i) => ({
      index: i,
      src: s.src,
      textLength: s.textContent?.length || 0,
      hasPreview: s.textContent?.includes('preview') || false,
      hasTemplate: s.textContent?.includes('template') || false
    }))
  })
  console.log('Scripts:', JSON.stringify(scripts, null, 2))

  // 检查是否有 data 属性
  const dataElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-preview]')).map(el => ({
      tag: el.tagName,
      dataPreview: el.getAttribute('data-preview')
    }))
  })
  console.log('Data preview elements:', JSON.stringify(dataElements, null, 2))

  await browser.close()
}

test().catch(console.error)
