import { useMemo, useState } from 'react'
import { launchSheet } from '../calc/launchSheet'
import { withSliders } from '../levels/evaluate'
import type { Mission, SliderValues } from '../levels/types'
import { dragFactor } from '../sim/flight'
import { Formula } from './Formula'

export interface ShotLogRow {
  values: SliderValues
  v0: number | null
  alphaDeg: number | null
  range: number | null
  time: number | null
  apex: number | null
}

const n = (v: number, d = 1) => v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d })

const BASE_FORMULAS = [
  'x(t) = x_0 + v_0\\cos\\alpha\\,t',
  'y(t) = y_0 + v_0\\sin\\alpha\\,t - \\tfrac{g t^2}{2}',
  't_{\\text{пол}} = \\dfrac{v_0\\sin\\alpha + \\sqrt{(v_0\\sin\\alpha)^2 + 2 g y_0}}{g}',
  'R = x_0 + v_0\\cos\\alpha\\cdot t_{\\text{пол}}',
  'h_{\\max} = y_0 + \\dfrac{(v_0\\sin\\alpha)^2}{2g},\\quad t_{\\text{верш}} = \\dfrac{v_0\\sin\\alpha}{g}',
]

function formulasFor(m: Mission): string[] {
  const extra: string[] = []
  if (m.targets.some((t) => t.h)) extra.push('t_{\\text{стена}} = \\dfrac{x_{\\text{стена}} - x_0}{v_0\\cos\\alpha},\\quad y(t_{\\text{стена}}) > h \\Rightarrow \\text{перелетит}')
  if (m.targets.some((t) => t.moving)) extra.push('x_{\\text{цели}}(t) = x_{\\text{старт}} + u\\,t \\;\\Rightarrow\\; R = x_{\\text{старт}} + u\\,t_{\\text{пол}}')
  if (m.base.world.drag) extra.push('\\vec a = \\vec g - k\\,|\\vec v - \\vec w|\\,(\\vec v - \\vec w),\\quad k = \\dfrac{\\rho C_d \\pi r^2}{2m}')
  return [...BASE_FORMULAS, ...extra]
}

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
          {['#', 'настр.', 'v₀', 'α', 'R', 't', 'h'].map((h, i) => (
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
            <td>{Object.values(r.values).map((v) => v.toLocaleString('ru-RU')).join('/') || '—'}</td>
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

/** All the numbers and formulas needed to compute the throw instead of guessing it. */
export function CalcPanel({ mission, values, log }: { mission: Mission; values: SliderValues; log: ShotLogRow[] }) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 768)
  const params = useMemo(() => withSliders(mission, values), [mission, values])
  const sheet = useMemo(() => launchSheet(params), [params])
  const formulas = useMemo(() => formulasFor(mission), [mission])
  const p = params.trebuchet
  const w = params.world
  const hideVelocity = mission.code?.fn === 'launch_velocity' // computing vx, vy is the task itself
  const setting = mission.sliders.map((s) => `${(values[s.key] ?? s.start).toLocaleString('ru-RU')}${s.unit === '°' ? '°' : ` ${s.unit}`}`).join(', ')

  return (
    <div className="lab-panel p-3 flex flex-col gap-2 text-sm">
      <button type="button" className="flex items-center justify-between text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="lab-label">📐 Данные для расчёта</span>
        <span aria-hidden style={{ color: 'var(--lab-dim)' }}>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <>
          <div className="lab-label mt-1">Установка и мир</div>
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs">
            <Row k="Плечи: длинное L₁ / короткое L₂" v={`${n(p.L1)} / ${n(p.L2)} м`} />
            <Row k="Праща Lₛ, ось на высоте H" v={`${n(p.Ls)} м, ${n(p.H)} м`} />
            <Row k="Противовес / снаряд" v={`${p.mc.toLocaleString('ru-RU')} / ${n(p.mp)} кг`} />
            <Row k="g" v={`${n(w.g, 2)} м/с²`} />
            <Row k="Воздух" v={w.drag ? `есть, k = ${n(dragFactor(p.mp, p.r), 4)} 1/м` : 'нет (вакуум)'} />
            {w.drag && <Row k="Ветер w" v={`${n(w.wind)} м/с`} />}
            {mission.targets.map((t, i) => (
              <Row
                key={i}
                k={mission.targets.length > 1 ? `Цель ${i + 1}` : 'Цель'}
                v={`x = ${n(t.x)} ± ${n(t.r)} м${t.h ? `, h = ${n(t.h)} м` : ''}${t.moving ? `, u = ${n(t.moving.speed)} м/с` : ''}`}
              />
            ))}
          </div>

          <div className="lab-label mt-2">Пуск при {setting || 'заданной настройке'}</div>
          {sheet ? (
            <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs">
              <Row k="Точка вылета x₀, y₀" v={`${n(sheet.x0)} м, ${n(sheet.y0)} м`} />
              <Row k="Скорость вылета v₀" v={`${n(sheet.v0)} м/с`} />
              <Row k="Угол вылета α" v={`${n(sheet.alphaDeg)}°`} />
              {!hideVelocity && <Row k="vx, vy" v={`${n(sheet.vx)}, ${n(sheet.vy)} м/с`} />}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--lab-bad)' }}>
              При этой настройке праща не раскроется.
            </p>
          )}
          {w.drag && (
            <p className="text-xs" style={{ color: 'var(--lab-dim)' }}>
              Формулы ниже — без воздуха: это верхняя оценка, воздух укоротит бросок.
            </p>
          )}

          <div className="lab-label mt-2">Формулы</div>
          {formulas.map((f) => (
            <Formula key={f} tex={f} className="overflow-x-auto text-xs" />
          ))}

          {log.length > 0 && (
            <>
              <div className="lab-label mt-2">Таблица выстрелов</div>
              <ShotTable log={log} />
            </>
          )}
        </>
      )}
    </div>
  )
}
