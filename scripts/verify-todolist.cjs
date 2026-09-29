const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => pageErrors.push(err.message))

  const url = 'http://localhost:5555/desktop-widgets/todo-list?w_width_px=320&w_height_px=420'
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  const diag = await page.evaluate(() => {
    const root = document.querySelector('.todo-list-widget')
    const items = document.querySelectorAll('.todo-item')
    const h1 = document.querySelector('h1')?.textContent || '(none)'
    const bodyText = document.body.innerText.slice(0, 400)
    return {
      todoRoot: !!root,
      itemCount: items.length,
      h1,
      hasErrorText: bodyText.includes('出现了一些问题') || bodyText.includes('widgetData'),
      bodyText
    }
  })

  console.log(JSON.stringify({ consoleErrors, pageErrors, diag }, null, 2))
  await browser.close()
})()
