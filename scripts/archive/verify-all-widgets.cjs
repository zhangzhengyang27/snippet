const { chromium } = require('playwright')

const BASE = 'http://localhost:5555'
const widgets = [
  'clock', 'todo-list', 'glitch', 'notepad', 'mickey-clock', 'time-progress',
  'collection', 'quick-search', 'countdown', 'countdown2', 'birthday-list',
  'labor-progress', 'photo', 'water-reminder', 'wave-progress', 'dynamic-island',
  'key-stroke', 'phone-reminder', 'lyric-book'
]
const sizes = {
  clock: [320, 320], todo: [320, 420], glitch: [300, 160], notepad: [300, 360],
  'mickey-clock': [320, 320], 'time-progress': [320, 300], collection: [300, 340],
  'quick-search': [320, 300], countdown: [320, 200], 'countdown2': [320, 200],
  'birthday-list': [340, 420], 'labor-progress': [320, 320], photo: [320, 320],
  'water-reminder': [300, 300], 'wave-progress': [320, 320], 'dynamic-island': [360, 200],
  'key-stroke': [320, 200], 'phone-reminder': [360, 460], 'lyric-book': [340, 420]
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const allErrors = []

  // 画廊页
  await page.goto(`${BASE}/desktop-widgets`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const gallery = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent,
    cards: document.querySelectorAll('.dw-card').length
  }))
  console.log('GALLERY', JSON.stringify(gallery))

  for (const name of widgets) {
    const [w, h] = sizes[name] || [300, 300]
    const errors = []
    const pageErrors = []
    page.removeAllListeners('console')
    page.removeAllListeners('pageerror')
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('pageerror', (e) => pageErrors.push(e.message))

    let diag = {}
    try {
      await page.goto(`${BASE}/desktop-widgets/${name}?w_width_px=${w}&w_height_px=${h}`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(700)
      diag = await page.evaluate(() => {
        const body = document.body.innerText
        const frame = document.querySelector('.dw-stage__frame')
        return {
          hasErrorText: body.includes('出现了一些问题') || body.includes('Cannot access'),
          frameChildren: frame ? frame.children.length : 0,
          title: document.querySelector('.dw-detail__heading h1')?.textContent || ''
        }
      })
    } catch (e) {
      pageErrors.push('NAV_FAIL: ' + e.message)
    }
    const ok = pageErrors.length === 0 && errors.length === 0 && !diag.hasErrorText
    const rec = { name, ok, consoleErrors: errors.slice(0, 3), pageErrors: pageErrors.slice(0, 3), diag }
    if (!ok) allErrors.push(rec)
    console.log((ok ? 'OK  ' : 'FAIL') + ' ' + name, JSON.stringify(rec))
  }

  console.log('\nSUMMARY fail count =', allErrors.length)
  await browser.close()
})()
