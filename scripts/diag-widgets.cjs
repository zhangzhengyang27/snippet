const { chromium } = require('/Users/xiaoye/Desktop/html5-examples/node_modules/playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  const logs = []
  const pageErrors = []
  const failedReqs = []

  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', (err) => pageErrors.push(`${err.message}\n${err.stack || ''}`))
  page.on('requestfailed', (req) =>
    failedReqs.push(`${req.url()} :: ${req.failure() && req.failure().errorText}`),
  )

  // 1) 直接打开画廊页，看 Vue 渲染结果
  await page.goto('http://localhost:5555/desktop-widgets', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  const domInfo = await page.evaluate(() => {
    const app = document.getElementById('app')
    const html = app ? app.innerHTML : ''
    return {
      appLen: html.length,
      hasH1: !!document.querySelector('h1'),
      h1Text: document.querySelector('h1') ? document.querySelector('h1').textContent : null,
      cardCount: document.querySelectorAll('.dw-card').length,
      hasOverlay: !!document.querySelector('vite-error-overlay'),
      bodyText: (document.body.innerText || '').slice(0, 200),
    }
  })

  // 2) 在页面上下文里动态 import registry，强制触发模块求值，捕获精确错误
  let importResult = 'OK'
  try {
    const mod = await page.evaluate(async () => {
      const m = await import('/src/desktop-widgets/registry.ts')
      return {
        count: Array.isArray(m.desktopWidgets) ? m.desktopWidgets.length : 'n/a',
        names: Array.isArray(m.desktopWidgets) ? m.desktopWidgets.map((w) => w.name) : [],
      }
    })
    importResult = JSON.stringify(mod)
  } catch (e) {
    importResult = 'IMPORT ERROR: ' + (e && e.message ? e.message : String(e))
    // 尝试拿到更详细的 stack
    try {
      importResult += '\nSTACK:\n' + (await page.evaluate(async () => {
        try {
          await import('/src/desktop-widgets/registry.ts')
        } catch (err) {
          return err && err.stack ? err.stack : String(err)
        }
        return 'no error on second import'
      }))
    } catch (_) {}
  }

  console.log('=== DOM INFO ===')
  console.log(JSON.stringify(domInfo, null, 2))
  console.log('=== REGISTRY IMPORT ===')
  console.log(importResult)
  console.log('=== PAGE ERRORS (' + pageErrors.length + ') ===')
  console.log(pageErrors.join('\n----\n'))
  console.log('=== CONSOLE (' + logs.length + ') ===')
  console.log(logs.join('\n'))
  console.log('=== FAILED REQUESTS (' + failedReqs.length + ') ===')
  console.log(failedReqs.join('\n'))

  await browser.close()
})().catch((e) => {
  console.error('DIAG SCRIPT ERROR:', e)
  process.exit(1)
})
