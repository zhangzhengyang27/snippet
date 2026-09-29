const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(`[console] ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

  const checks = {}

  // 1. 画廊页
  await page.goto('http://localhost:5555/desktop-widgets', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  checks.gallery = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent,
    cards: document.querySelectorAll('.dw-card').length
  }))

  // 2. 时钟详情页
  await page.goto('http://localhost:5555/desktop-widgets/clock?w_width_px=300&w_height_px=300', {
    waitUntil: 'networkidle'
  })
  await page.waitForTimeout(600)
  checks.clock = await page.evaluate(() => ({
    clockRoot: !!document.querySelector('.clock-container'),
    images: document.querySelectorAll('.clock-container img').length
  }))

  // 3. 待办详情页（TDZ 修复验证）
  await page.goto('http://localhost:5555/desktop-widgets/todo-list?w_width_px=320&w_height_px=420', {
    waitUntil: 'networkidle'
  })
  await page.waitForTimeout(600)
  checks.todo = await page.evaluate(() => ({
    todoRoot: !!document.querySelector('.todo-list-widget'),
    items: document.querySelectorAll('.todo-item').length,
    hasError: document.body.innerText.includes('出现了一些问题')
  }))

  console.log(JSON.stringify({ errors, checks }, null, 2))
  await browser.close()
})()
