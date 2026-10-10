// Full playthrough: every mission of one universe solved through the real UI with the reference
// answers. Fails if any mission is not won. Needs the dev server (npm run dev) and a Chrome.
//   npm run e2e:playthrough            # classic
//   npm run e2e:playthrough -- sigma   # the complex
import { chromium } from 'playwright-core'
const universe = process.argv[2] || 'classic'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => console.error('PAGEERROR', e.message))
// The driver finds buttons by their Russian names.
await page.addInitScript(() => localStorage.setItem('physicslab-locale', JSON.stringify({ state: { locale: 'ru' }, version: 0 })))
await page.goto((process.env.BASE_URL || 'http://localhost:5180') + '/trebuchet')
await page.evaluate(async (u) => { localStorage.clear(); localStorage.setItem('physicslab-coach-done', '1'); (await import('/src/lab/state/labProgress.ts')).useLabProgress.getState().setUniverse(u); await import('/e2e/drv.js') }, universe)
const result = await page.evaluate(async () => {
  const D = window.__drv; const M = (id) => D.L.findMission(id)
  const steps = [
    ['0-1', { x0: 22 }], ['0-2', { speed: 18 }], ['0-3', null, 1.56], ['0-4', null, 23.9], ['0-5', { speed: 13 }], ['0-6', null, 2.04], ['0-7', null, 15.29], ['0-8', null, undefined, 'ref'], ['0-9', null, undefined, 'ref'],
    ['1-1', { releaseDeg: 116 }], ['1-2', null, 58.5], ['1-3', null, undefined, 'ref'], ['1-4', { releaseDeg: 96 }], ['1-4', { releaseDeg: 103 }], ['1-4', { releaseDeg: 111 }],
    ['2-1', { releaseDeg: 111 }], ['2-2', null, 32], ['2-3', null, undefined, 'ref'], ['2-4', { releaseDeg: 97 }],
    ['3-1', { mc: 825 }], ['3-2', null, 150], ['3-3', null, undefined, 'ref'], ['3-4', { mc: 850, releaseDeg: 101 }], ['3-4', { mc: 1000, releaseDeg: 108 }],
    ['4-1', { releaseDeg: 109 }], ['4-2', null, 33], ['4-3', null, undefined, 'ref'], ['4-4', null, undefined, 'ref'],
    ['5-1', null, 73], ['5-2', null, 9], ['5-3', null, undefined, 'ref'], ['5-4', { releaseDeg: 101 }],
  ]
  const out = []; let cur = null
  for (const [id, values, pred, code] of steps) {
    if (id !== cur) { D.go('/trebuchet/' + id); await D.sleep(2200); [...document.querySelectorAll('button')].find((b) => /^(Начать|Приступить)/.test(b.textContent))?.click(); await D.sleep(300); cur = id }
    const r = await D.shoot(M(id), values ?? undefined, pred, code ? M(id).code.reference : undefined)
    out.push(id + ': ' + r.at(-1).slice(0, 60))
  }
  return out
})
console.log(result.join('\n'))
await browser.close()
// The last shot of every mission must end in a win.
const last = new Map(result.map((line) => [line.split(':')[0], line]))
const lost = [...last.values()].filter((line) => !/пройден/i.test(line))
if (lost.length > 0) {
  console.error('NOT WON:\n' + lost.join('\n'))
  process.exit(1)
}
console.log(`OK: ${last.size} missions won`)
