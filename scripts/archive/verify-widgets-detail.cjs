const { chromium } = require('/Users/xiaoye/Desktop/html5-examples/node_modules/playwright')

const NAMES = [
  'clock', 'todo-list', 'glitch', 'notepad', 'mickey-clock', 'time-progress',
  'collection', 'quick-search', 'countdown', 'countdown2', 'birthday-list',
  'labor-progress', 'photo', 'water-reminder', 'wave-progress',
  'dynamic-island', 'key-stroke', 'phone-reminder', 'lyric-book',
]

async function testOne(page, name) {
  const pageErrors = []
  const consoleMsgs = []
  const onErr = (e) => pageErrors.push(e.message)
  const onConsole = (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(`[${m.type()}] ${m.text()}`)
  }
  page.on('pageerror', onErr)
  page.on('console', onConsole)

  let ok = false
  let info = null
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      await page.goto(`http://localhost:5555/desktop-widgets/${name}`, {
        waitUntil: 'networkidle',
        timeout: 20000,
      })
      await page.waitForTimeout(700)
      info = await page.evaluate(() => {
        const frame = document.querySelector('.dw-stage__frame')
        return {
          frameChildren: frame ? frame.children.length : -1,
          frameHTMLlen: frame ? frame.innerHTML.length : 0,
          h1: document.querySelector('.dw-detail__heading h1')
            ? document.querySelector('.dw-detail__heading h1').textContent
            : null,
          empty: !!document.querySelector('.dw-detail__empty'),
          overlay: !!document.querySelector('vite-error-overlay'),
        }
      })
      ok = info.frameChildren > 0 && !info.empty && !info.overlay && info.h1 !== null
    } catch (e) {
      info = { navError: e.message }
      ok = false
    }
  }

  page.off('pageerror', onErr)
  page.off('console', onConsole)
  return { info, pageErrors, consoleMsgs, ok }
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const results = {}

  for (const name of NAMES) {
    const { info, pageErrors, consoleMsgs, ok } = await testOne(page, name)
    results[name] = { info, pageErrors, consoleMsgs, ok }
    const bad = !ok
    console.log(
      `${bad ? 'FAIL' : 'OK  '} ${name.padEnd(16)} ` +
        (info ? `frame=${info.frameChildren} len=${info.frameHTMLlen} h1=${info.h1}` : '') +
        (bad ? ` err=${JSON.stringify(pageErrors.concat(consoleMsgs)).slice(0, 240)}` : ''),
    )
  }

  const fails = Object.entries(results).filter(([, v]) => !v.ok)
  console.log(`\n=== SUMMARY: ${NAMES.length - fails.length}/${NAMES.length} OK, ${fails.length} FAIL ===`)
  if (fails.length) console.log('FAILING:', fails.map(([n]) => n).join(', '))
  await browser.close()
  process.exit(fails.length ? 2 : 0)
})().catch((e) => {
  console.error('VERIFY SCRIPT ERROR:', e)
  process.exit(1)
})
