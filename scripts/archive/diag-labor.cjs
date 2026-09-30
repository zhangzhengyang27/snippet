const { chromium } = require('/Users/xiaoye/Desktop/html5-examples/node_modules/playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto('http://localhost:5555/desktop-widgets/labor-progress', { waitUntil: 'networkidle' }).catch(e => {})
  await page.waitForTimeout(2000)
  const stack = await page.evaluate(() => {
    const e = window.__lastError
    if (!e) return '(no __lastError)'
    return (e.stack || e.message || String(e))
  })
  console.log('=== LABOR-PROGRESS ERROR STACK ===')
  console.log(stack)
  await browser.close()
})().catch((e) => { console.error('SCRIPT ERR', e); process.exit(1) })
