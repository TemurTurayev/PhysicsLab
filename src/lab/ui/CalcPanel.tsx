import { localeTag, tr } from '../../i18n'
import { useMemo, useState } from 'react'
import { launchSheet } from '../calc/launchSheet'
import { withSliders } from '../levels/evaluate'
import type { Mission, SliderValues } from '../levels/types'
import { dragFactor } from '../sim/flight'
import { Formula } from './Formula'
import type { PreviewPart } from '../scene/launchPreview'
import { WorkSheet } from './WorkSheet'

export interface ShotLogRow {
  values: SliderValues
  v0: number | null
  alphaDeg: number | null
  range: number | null
  time: number | null
  apex: number | null
}

const n = (v: number, d = 1) => v.toLocaleString(localeTag(), { minimumFractionDigits: d, maximumFractionDigits: d })

const BASE_FORMULAS = [
  'x(t) = x_0 + v_0\\cos\\alpha\\,t',
  'y(t) = y_0 + v_0\\sin\\alpha\\,t - \\tfrac{g t^2}{2}',
  tr('t_{\\text{пол}} = \\dfrac{v_0\\sin\\alpha + \\sqrt{(v_0\\sin\\alpha)^2 + 2 g y_0}}{g}'),
  tr('R = x_0 + v_0\\cos\\alpha\\cdot t_{\\text{пол}}'),
  tr('h_{\\max} = y_0 + \\dfrac{(v_0\\sin\\alpha)^2}{2g},\\quad t_{\\text{верш}} = \\dfrac{v_0\\sin\\alpha}{g}'),
]

function formulasFor(m: Mission): string[] {
  if (m.panel) return m.panel.formulas
  const extra: string[] = []
  if (m.targets.some((t) => t.h)) extra.push(tr('t_{\\text{стена}} = \\dfrac{x_{\\text{стена}} - x_0}{v_0\\cos\\alpha},\\quad y(t_{\\text{стена}}) > h \\Rightarrow \\text{перелетит}'))
  if (m.targets.some((t) => t.moving)) extra.push(tr('x_{\\text{цели}}(t) = x_{\\text{старт}} + u\\,t \\;\\Rightarrow\\; R = x_{\\text{старт}} + u\\,t_{\\text{пол}}'))
  if (m.base.world.drag) extra.push('\\vec a = \\vec g - k\\,|\\vec v - \\vec w|\\,(\\vec v - \\vec w),\\quad k = \\dfrac{\\rho C_d \\pi r^2}{2m}')
  return [...BASE_FORMULAS, ...extra]
}

const PREDICTED_SLOT: Record<string, string> = { landingX: 'R', apexY: 'h', flightTime: 't' }

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span style={{ color: 'var(--lab-dim)' }}>{k}</span>
      <span className="lab-mono text-right">{v}</span>
    </>
  )
}

function ShotTable({ log }: { log: ShotLogRow[] }) {
  const cell = (v: number | null, unit = '') => (v === null ? '—' : `${n(v)}${unit}`)
  return (
    <table className="lab-mono text-[11px] w-full">
      <thead style={{ color: 'var(--lab-dim)' }}>
        <tr>
          {['#', tr('настр.'), 'v₀', 'α', 'R', 't', 'h'].map((h, i) => (
            <th key={h} className={`font-normal ${i < 2 ? 'text-left' : 'text-right'}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {log.map((r, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td>{Object.values(r.values).map((v) => v.toLocaleString(localeTag())).join('/') || '—'}</td>
            <td className="text-right">{cell(r.v0)}</td>
            <td className="text-right">{cell(r.alphaDeg, '°')}</td>
            <td className="text-right">{cell(r.range)}</td>
            <td className="text-right">{cell(r.time)}</td>
            <td className="text-right">{cell(r.apex)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

type Tab = 'launch' | 'formulas' | 'check' | 'shots'

function Tile({ k, v, unit, part, onHighlight }: { k: string; v: string; unit: string; part: PreviewPart; onHighlight?: (p: PreviewPart | null) => void }) {
  return (
    <button
      type="button"
      className="text-left rounded-lg px-2.5 py-2 transition-colors hover:ring-1 focus-visible:ring-1"
      style={{ background: 'var(--lab-raise)', ['--tw-ring-color' as string]: 'var(--lab-accent)' }}
      onMouseEnter={() => onHighlight?.(part)}
      onMouseLeave={() => onHighlight?.(null)}
      onFocus={() => onHighlight?.(part)}
      onBlur={() => onHighlight?.(null)}
      title={tr("Показать на сцене")}
    >
      <div className="text-[11px]" style={{ color: 'var(--lab-dim)' }}>
        {k}
      </div>
      <div className="lab-mono text-[17px] leading-tight">
        {v}
        <span className="text-[11px] ml-1" style={{ color: 'var(--lab-dim)' }}>
          {unit}
        </span>
      </div>
    </button>
  )
}

/** All the numbers and formulas needed to compute the throw instead of guessing it, one tab at a time. */
export function CalcPanel({ mission, values, log, onHighlight }: { mission: Mission; values: SliderValues; log: ShotLogRow[]; onHighlight?: (p: PreviewPart | null) => void }) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 768)
  const [tab, setTab] = useState<Tab>('launch')
  const params = useMemo(() => withSliders(mission, values), [mission, values])
  const sheet = useMemo(() => launchSheet(params), [params])
  const formulas = useMemo(() => formulasFor(mission), [mission])
  const p = params.trebuchet
  const w = params.world
  const hideVelocity = mission.code?.fn === 'launch_velocity' // computing vx, vy is the task itself
  // Basics steps show only the numbers this step needs; the rest is the student's to compute.
  const shown = (part: PreviewPart) => !mission.panel || mission.panel.show.includes(part)
  const launcher = params.launcher
  const setting = mission.sliders.map((s) => `${(values[s.key] ?? s.start).toLocaleString(localeTag())}${s.unit === '°' ? '°' : ` ${s.unit}`}`).join(', ')
  const tabs: Array<[Tab, string]> = [
    ['launch', tr('Пуск')],
    ['formulas', tr('Формулы')],
    ...(mission.panel?.check.length === 0 ? [] : ([['check', tr('Проверка')]] as Array<[Tab, string]>)),
    ['shots', tr(`Выстрелы{0}`, [log.length ? ` · ${log.length}` : ''])],
  ]

  return (
    <div className="lab-panel p-3 flex flex-col gap-2.5 text-sm" data-coach="calc">
      <button type="button" className="flex items-center justify-between text-left min-h-[32px] -my-1" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="lab-label">{tr("📐 Данные для расчёта")}</span>
        <span aria-hidden style={{ color: 'var(--lab-dim)' }}>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <>
          <div role="tablist" aria-label={tr("Расчёт")} className="grid gap-1 rounded-[10px] p-0.5" style={{ background: 'var(--lab-raise)', gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className="min-h-[30px] rounded-[8px] text-[12px] font-semibold px-1 truncate"
                style={tab === id ? { background: 'var(--lab-accent)', color: '#1a1206' } : { color: 'var(--lab-dim)' }}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'launch' && (
            <div className="flex flex-col gap-2.5 lab-rise">
              <div className="lab-label">{tr("Пуск при") + ' '}{setting || tr('заданной настройке')}</div>
              <p className="text-[11px] -mt-1" style={{ color: 'var(--lab-dim)' }}>
                
                {tr("Наведи на число — оно загорится на сцене.")}
              </p>
              {sheet ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {shown('v0') && <Tile k={tr("скорость вылета v₀")} v={n(sheet.v0)} unit={tr("м/с")} part="v0" onHighlight={onHighlight} />}
                  {shown('alpha') && <Tile k={tr("угол вылета α")} v={`${n(sheet.alphaDeg)}°`} unit="" part="alpha" onHighlight={onHighlight} />}
                  {shown('x0') && <Tile k={tr("точка вылета x₀")} v={n(sheet.x0)} unit={tr("м")} part="x0" onHighlight={onHighlight} />}
                  {shown('y0') && <Tile k={tr("высота вылета y₀")} v={n(sheet.y0, 2)} unit={tr("м")} part="y0" onHighlight={onHighlight} />}
                  {!hideVelocity && shown('vx') && <Tile k="vx" v={n(sheet.vx)} unit={tr("м/с")} part="vx" onHighlight={onHighlight} />}
                  {!hideVelocity && shown('vy') && <Tile k="vy" v={n(sheet.vy)} unit={tr("м/с")} part="vy" onHighlight={onHighlight} />}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--lab-bad)' }}>
                  
                  {tr("При этой настройке праща не раскроется.")}
                </p>
              )}
              {mission.panel?.known && (
                <ul className="flex flex-col gap-1 text-[13px]">
                  {mission.panel.known.map((k) => (
                    <li key={k} className="rounded-lg px-2.5 py-1.5" style={{ background: 'var(--lab-accent-soft)' }}>
                      {k}
                    </li>
                  ))}
                </ul>
              )}
              {w.drag && (
                <p className="text-xs" style={{ color: 'var(--lab-dim)' }}>
                  
                  {tr("Формулы — без воздуха: это верхняя оценка, воздух укоротит бросок.")}
                </p>
              )}
              <div className="lab-label">{tr("Установка и мир")}</div>
              <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
                <Row k="g" v={tr(`{0} м/с²`, [n(w.g, 2)])} />
                <Row k={tr("Воздух")} v={w.drag ? tr(`есть, k = {0} 1/м`, [n(dragFactor(p.mp, p.r), 4)]) : tr('нет (вакуум)')} />
                {w.drag && <Row k={tr("Ветер w")} v={tr(`{0} м/с`, [n(w.wind)])} />}
                {mission.targets.map((t, i) => (
                  <Row
                    key={i}
                    k={mission.targets.length > 1 ? tr(`Цель {0}`, [i + 1]) : tr('Цель')}
                    v={tr(`x = {0} ± {1} м{2}{3}`, [n(t.x), n(t.r), t.h ? tr(`, h = {0} м`, [n(t.h)]) : '', t.moving ? tr(`, u = {0} м/с`, [n(t.moving.speed)]) : ''])}
                  />
                ))}
                {!launcher && <Row k={tr("Плечи L₁ / L₂")} v={tr(`{0} / {1} м`, [n(p.L1), n(p.L2)])} />}
                {!launcher && <Row k={tr("Праща Lₛ, ось H")} v={tr(`{0} м, {1} м`, [n(p.Ls), n(p.H)])} />}
                {!launcher && <Row k={tr("Противовес / снаряд")} v={tr(`{0} / {1} кг`, [p.mc.toLocaleString(localeTag()), n(p.mp)])} />}
              </div>
            </div>
          )}

          {tab === 'formulas' && (
            <div className="lab-rise">
              {formulas.map((f) => (
                <Formula key={f} tex={f} className="overflow-x-auto text-[13px]" />
              ))}
            </div>
          )}

          {tab === 'check' &&
            (sheet ? (
              <WorkSheet key={setting} sheet={sheet} showVelocity={!hideVelocity} vacuumNote={w.drag} hidden={PREDICTED_SLOT[mission.predict?.quantity ?? ''] ?? null} only={mission.panel?.check} />
            ) : (
              <p className="text-xs" style={{ color: 'var(--lab-dim)' }}>
                
                {tr("Сначала выбери настройку, при которой праща раскрывается.")}
              </p>
            ))}

          {tab === 'shots' &&
            (log.length > 0 ? (
              <ShotTable log={log} />
            ) : (
              <p className="text-xs" style={{ color: 'var(--lab-dim)' }}>
                
                {tr("Здесь появится каждый выстрел: настройка, v₀, α, дальность, время и высота.")}
              </p>
            ))}
        </>
      )}
    </div>
  )
}
