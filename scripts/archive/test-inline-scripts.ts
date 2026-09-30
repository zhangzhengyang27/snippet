import { chromium } from 'playwright'

async function test() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto('https://wegic.ai/templates/concrete-grey-high-end-architecture-construction-website', {
    waitUntil: 'networkidle',
    timeout: 60000
  })
  await page.waitForTimeout(5000)

  // 获取所有 inline script 内容
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script:not([src])')).map((s, i) => ({
      index: i,
      text: s.textContent
    }))
  })

  for (const script of scripts) {
    if (script.text && script.text.includes('preview')) {
      console.log(`\n=== Script ${script.index} (contains 'preview') ===`)
      console.log(script.text.substring(0, 2000))
      console.log('...')
    }
  }

  // 搜索包含 template 的 script
  for (const script of scripts) {
    if (script.text && script.text.includes('templateDetail')) {
      console.log(`\n=== Script ${script.index} (contains 'templateDetail') ===`)
      console.log(script.text.substring(0, 2000))
      console.log('...')
    }
  }

  await browser.close()
}

test().catch(console.error)
