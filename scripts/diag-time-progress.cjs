const { chromium } = require('/Users/xiaoye/Desktop/html5-examples/node_modules/playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const msgs = []
  page.on('console', (m) => msgs.push(`[${m.type()}] ${m.text()}`))
  page.on('pageerror', (e) => msgs.push(`[PAGEERROR] ${e.message}\n${e.stack || ''}`))

  await page.goto('http://localhost:5555/desktop-widgets/time-progress', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  const info = await page.evaluate(() => {
    const frame = document.querySelector('.dw-stage__frame')
    return {
      frameChildren: frame ? frame.children.length : -1,
      frameHTML: frame ? frame.innerHTML.slice(0, 400) : '(no frame)',
      h1: document.querySelector('.dw-detail__heading h1') ? document.querySelector('.dw-detail__heading h1').textContent : null,
      empty: !!document.querySelector('.dw-detail__empty'),
      overlay: !!document.querySelector('vite-error-overlay'),
      overlayText: document.querySelector('vite-error-overlay') ? document.querySelector('vite-error-overlay').shadowRoot?.textContent?.slice(0, 600) : null,
    }
  })

  console.log('=== INFO ===')
  console.log(JSON.stringify(info, null, 2))
  console.log('=== CONSOLE / ERRORS ===')
  console.log(msgs.join('\n'))
  await browser.close()
})().catch((e) => { console.error('SCRIPT ERR', e); process.exit(1) })
