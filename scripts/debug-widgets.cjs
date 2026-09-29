const { chromium } = require('playwright')
const BASE = 'http://localhost:5555'

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const failed = []
  page.on('requestfailed', (r) => failed.push(r.url() + ' :: ' + (r.failure()?.errorText || '')))
  page.on('response', (r) => { if (r.status() >= 400) failed.push('HTTP ' + r.status() + ' ' + r.url()) })
  const consoleErr = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErr.push(m.text()) })
  const pageErr = []
  page.on('pageerror', (e) => pageErr.push(e.message))

  await page.goto(`${BASE}/desktop-widgets`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const g = await page.evaluate(() => ({
    appChildren: document.querySelector('#app')?.children.length,
    appHTMLlen: document.querySelector('#app')?.innerHTML.length,
    cards: document.querySelectorAll('.dw-card').length,
    bodyStart: document.body.innerText.slice(0, 200),
    hasOverlay: !!document.querySelector('.vite-error-overlay')
  }))
  console.log('GALLERY', JSON.stringify(g, null, 2))
  console.log('FAILED_REQ', JSON.stringify(failed.slice(0, 15), null, 2))
  console.log('CONSOLE_ERR', JSON.stringify(consoleErr.slice(0, 15), null, 2))
  console.log('PAGE_ERR', JSON.stringify(pageErr.slice(0, 15), null, 2))
  await browser.close()
})()
