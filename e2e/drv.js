// Browser playthrough driver (dev only, not shipped). Loaded into the page by e2e/playthrough.mjs: await import('/e2e/drv.js')
const L = await import('/src/lab/levels/index.ts')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const go = (path) => {
  history.pushState({}, '', path)
  dispatchEvent(new PopStateEvent('popstate'))
}
const setRange = (input, v) => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  set.call(input, String(v))
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
const btn = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent.trim()) && !b.disabled)
async function waitFor(fn, ms = 30000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const v = fn()
    if (v) return v
    await sleep(150)
  }
  return null
}
const outcome = () => {
  const dlg = document.querySelector('[role=dialog]')
  if (dlg) return 'INCIDENT: ' + dlg.querySelector('h2')?.textContent + ' | ' + dlg.innerText.replace(/\s+/g, ' ').slice(0, 260)
  const st = document.querySelector('[role=status]')
  return st ? st.innerText.replace(/\s+/g, ' ') : null
}
const closeDialogs = async () => {
  for (let i = 0; i < 6; i++) {
    const b = btn(/^Понятно$/)
    if (!b) break
    b.click()
    await sleep(250)
  }
}
async function fire(m, values, prediction, code) {
  await waitFor(() => document.querySelector('canvas'))
  await sleep(400)
  const ranges = [...document.querySelectorAll('input.lab-range')]
  m.sliders.forEach((s, i) => values?.[s.key] !== undefined && setRange(ranges[i], values[s.key]))
  if (m.predict && prediction !== undefined) setRange(ranges[m.sliders.length], prediction)
  if (code !== undefined) {
    await waitFor(() => window.monaco?.editor.getModels().length)
    window.monaco.editor.getModels().at(-1).setValue(code)
    await waitFor(() => /Python готов/.test(document.body.textContent), 90000)
  }
  await sleep(300)
  const f = await waitFor(() => btn(/^(Огонь|▶ Запустить)/))
  if (!f) return 'NO FIRE BUTTON'
  f.click()
  await waitFor(() => !outcome(), 4000)
  const r = await waitFor(() => {
    const o = outcome()
    if (o) return o
    const pre = [...document.querySelectorAll('pre')].map((p) => p.textContent).join(' ')
    return /Строка \d|Error/.test(pre) ? 'CODE: ' + pre.slice(0, 300) : null
  }, 60000)
  return r ?? 'TIMEOUT'
}
async function shoot(m, values, prediction, code) {
  await closeDialogs()
  const all = [await fire(m, values, prediction, code)]
  for (let i = 0; i < 5; i++) {
    const b = btn(/^Понятно$/)
    if (!b) break
    b.click()
    await sleep(300)
    const o = outcome()
    if (o && o !== all.at(-1)) all.push(o)
  }
  return all
}
window.__log = []
async function run(steps) {
  for (const s of steps) {
    try {
      if (s.go) {
        go('/trebuchet/' + s.go)
        await sleep(1800)
        continue
      }
      const m = L.findMission(s.id)
      window.__log.push({ id: s.id, tag: s.tag, r: await shoot(m, s.values, s.prediction, s.code) })
    } catch (e) {
      window.__log.push({ id: s.id, err: String(e) })
    }
  }
  window.__log.push('DONE')
}
window.__drv = { L, sleep, go, setRange, btn, waitFor, outcome, closeDialogs, fire, shoot, run }
export default window.__drv
