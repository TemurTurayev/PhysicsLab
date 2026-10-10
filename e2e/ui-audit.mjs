// UI audit: on many screen sizes, walk every screen and state and check that each visible control is
// on screen (or reachable by scrolling) and not covered by something else. Fails on any problem.
//   npm run e2e:ui            (needs the dev server: npm run dev)
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:5180'
const UNIVERSE = process.env.UNIVERSE || 'classic'
// Controls are found by their visible names, in the language under test (LOCALE=en|ru|uz).
const LOCALE = process.env.LOCALE || 'ru'
const DICT = LOCALE === 'ru' ? {} : JSON.parse(readFileSync(new URL(`../src/i18n/${LOCALE}.json`, import.meta.url), 'utf8'))
const L = (ru) => DICT[ru] ?? ru
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const re = (...alts) => new RegExp(`^(${alts.map((a) => esc(L(a))).join('|')})`, 'i')
const VIEWPORTS = [
  [1920, 1080], [1440, 900], [1366, 768], [1280, 720], [1024, 640], [1024, 768], [768, 1024], [390, 844], [375, 667], [360, 640], [844, 390],
]
const ONLY = process.env.VP ? VIEWPORTS.filter(([w, h]) => `${w}x${h}` === process.env.VP) : VIEWPORTS

/** Runs in the page: every visible control must be reachable and on top. */
function audit() {
  const problems = []
  const vw = innerWidth
  const vh = innerHeight
  const dialogs = [...document.querySelectorAll('[role=dialog], [role=menu]')].filter((d) => d.getBoundingClientRect().width > 0)
  const scope = dialogs.at(-1) ?? document
  const pageScrolls = document.scrollingElement.scrollHeight > vh + 2
  const scroller = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p)
      if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (p.scrollHeight > p.clientHeight + 2 || p.scrollWidth > p.clientWidth + 2)) return p
    }
    return null
  }
  const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)
  for (const el of scope.querySelectorAll('button, a[href], input, select, textarea, [role=tab], [role=radio]')) {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    const st = getComputedStyle(el)
    if (st.visibility === 'hidden' || st.opacity === '0' || el.closest('.sr-only, [aria-hidden=true]')) continue
    if (el.disabled) continue
    const box = scroller(el)
    if (box) {
      // Inside a scroll box: scroll it into view first, then judge.
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
    } else if (pageScrolls) {
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
    }
    const q = el.getBoundingClientRect()
    if (q.right > vw + 1 || q.left < -1) problems.push(`off-screen horizontally: «${name(el)}» x=${Math.round(q.left)}..${Math.round(q.right)}`)
    if (q.bottom > vh + 1 || q.top < -1) {
      problems.push(`off-screen vertically: «${name(el)}» y=${Math.round(q.top)}..${Math.round(q.bottom)}`)
      continue
    }
    if (q.width < 24 || q.height < 24) {
      if (el.tagName !== 'INPUT' || el.type !== 'range') problems.push(`tiny target ${Math.round(q.width)}×${Math.round(q.height)}: «${name(el)}»`)
    }
    const cx = Math.min(vw - 1, Math.max(0, q.left + q.width / 2))
    const cy = Math.min(vh - 1, Math.max(0, q.top + q.height / 2))
    const hit = document.elementFromPoint(cx, cy)
    if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) {
      problems.push(`covered: «${name(el)}» under «${name(hit)}» (${hit.tagName.toLowerCase()}.${String(hit.className).split(' ')[0]})`)
    }
  }
  // Panels must not lie on top of each other (open dialogs and menus are meant to).
  if (scope === document) {
    const panels = [...document.querySelectorAll('.lab-panel')].filter((p) => {
      const r = p.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(p).position !== 'static' || p.closest('[class*="absolute"]')
    })
    // Only the part a student can see: clip each panel by every scrolling/clipping ancestor.
    const visible = (el) => {
      let { left, top, right, bottom } = el.getBoundingClientRect()
      for (let p = el.parentElement; p; p = p.parentElement) {
        const st = getComputedStyle(p)
        if (st.overflowX === 'visible' && st.overflowY === 'visible') continue
        const r = p.getBoundingClientRect()
        left = Math.max(left, r.left); top = Math.max(top, r.top); right = Math.min(right, r.right); bottom = Math.min(bottom, r.bottom)
      }
      return { left, top, right, bottom, width: right - left, height: bottom - top }
    }
    const boxes = panels.map((p) => [p, visible(p)]).filter(([, r]) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [pa, a] = boxes[i]
        const [pb, b] = boxes[j]
        if (pa.contains(pb) || pb.contains(pa) || pa.closest('[role=menu],[role=dialog]') || pb.closest('[role=menu],[role=dialog]')) continue
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (w > 4 && h > 4) problems.push(`panels overlap ${Math.round(w)}×${Math.round(h)}: «${name(pa)}» and «${name(pb)}»`)
      }
    }
  }
  // Horizontal page overflow is always a bug.
  if (document.scrollingElement.scrollWidth > vw + 2) problems.push(`page scrolls sideways: ${document.scrollingElement.scrollWidth}px > ${vw}px`)
  return problems
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal'] })
const report = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

for (const [w, h] of ONLY) {
  const vp = `${w}x${h}`
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768, isMobile: w < 768 })
  await ctx.addInitScript(([u, l]) => {
    localStorage.setItem('physicslab-lab-v1', JSON.stringify({ state: { completed: {}, incidents: [], universe: u }, version: 0 }))
    localStorage.setItem('physicslab-locale', JSON.stringify({ state: { locale: l }, version: 0 }))
  }, [UNIVERSE, LOCALE])
  const page = await ctx.newPage()
  page.on('pageerror', (e) => report.push(`${vp} PAGEERROR ${e.message}`))
  const check = async (state) => {
    await sleep(350)
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${vp}-${state.replace(/\s+/g, '_')}.png` })
    for (const p of await page.evaluate(audit)) report.push(`${vp} [${state}] ${p}`)
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  }
  const click = async (re, state) => {
    const b = page.getByRole('button', { name: re }).first()
    if (!(await b.count())) {
      report.push(`${vp} [${state}] missing button ${re}`)
      return false
    }
    try {
      await b.click({ timeout: 3000 })
      return true
    } catch {
      report.push(`${vp} [${state}] cannot click ${re}`)
      return false
    }
  }

  await page.goto(`${BASE}/`)
  await check('home')
  if (await click(UNIVERSE === 'sigma' ? re('Войти в профиль') : re('Войти'), 'login')) {
    await sleep(400)
    await check('login dialog')
    await page.keyboard.press('Escape')
    await sleep(200)
    if (await page.getByRole('dialog').count()) report.push(`${vp} [login] Esc does not close the dialog`)
  }
  await page.goto(`${BASE}/trebuchet`)
  await check('map')

  // First mission: intro → tour (three steps, by keyboard and by clicks) → panel → settings menu.
  await page.goto(`${BASE}/trebuchet/0-1`)
  await page.waitForSelector('canvas')
  await sleep(1200)
  await check('intro')
  await page.keyboard.press('Enter')
  await sleep(500)
  for (let i = 0; i < 6; i++) {
    const tour = page.locator(`[aria-label="${L('Знакомство с лабораторией')}"]`)
    if (!(await tour.count())) {
      if (i < 4) report.push(`${vp} [tour] tour closed early at step ${i + 1}`)
      break
    }
    await check(`tour ${i + 1}`)
    if (i === 0) await page.keyboard.press('Enter')
    else await click(re('Дальше', 'Понятно, стреляю'), `tour ${i + 1}`)
    await sleep(300)
  }
  if (await page.locator(`[aria-label="${L('Знакомство с лабораторией')}"]`).count()) report.push(`${vp} [tour] still open after the last step`)
  await check('mission')
  if (await click(re('Настройки'), 'settings')) {
    await check('settings menu')
    await page.keyboard.press('Escape')
    await sleep(200)
    if (await page.locator('[role=menu]').count()) report.push(`${vp} [settings] Esc does not close the menu`)
  }
  // A miss → incident card, then a hit → result banner.
  await click(re('Огонь'), 'fire')
  await sleep(4500)
  await check('after miss')
  for (let i = 0; i < 3; i++) if (!(await page.getByRole('button', { name: re('Понятно') }).count()) || !(await click(re('Понятно'), 'incident'))) break
  await check('after incident')
  const journal = page.getByRole('button', { name: /📓/ }).first()
  if (await journal.count()) {
    await journal.click()
    await check('journal')
    await page.keyboard.press('Escape')
  }

  // Out of lives: three wrong predictions in a step that costs lives.
  await page.goto(`${BASE}/trebuchet/0-4`)
  await page.waitForSelector('canvas')
  await sleep(1000)
  await page.keyboard.press('Enter')
  for (let i = 0; i < 3; i++) {
    const field = page.locator('input[inputmode=decimal]').last()
    await field.fill('5')
    await field.press('Enter')
    await click(re('Огонь'), `life ${i + 1}`)
    await sleep(4000)
    for (let k = 0; k < 3; k++) if (!(await page.getByRole('button', { name: re('Понятно') }).count()) || !(await click(re('Понятно'), 'incident'))) break
  }
  await check('out of lives')

  // Code mission: the editor drawer and its run button.
  await page.goto(`${BASE}/trebuchet/0-8`)
  await page.waitForSelector('canvas')
  await sleep(1500)
  await page.keyboard.press('Enter')
  await sleep(1500)
  await check('code mission')
  await ctx.close()
}
await browser.close()

if (report.length) {
  console.log(report.join('\n'))
  console.log(`\n${report.length} problem(s)`)
  process.exit(1)
}
console.log(`OK: ${ONLY.length} screen sizes, no hidden or covered controls`)
