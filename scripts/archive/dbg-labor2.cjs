const { chromium } = require('/Users/xiaoye/Desktop/html5-examples/node_modules/playwright')
;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const logs = []
  page.on('console', (m) => logs.push('[' + m.type() + '] ' + m.text()))
  await page.goto('http://localhost:5555/desktop-widgets/labor-progress', { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(2000)
  console.log(logs.filter((l) => l.includes('DBG-LABOR') || l.toLowerCase().includes('error')).join('\n'))
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
