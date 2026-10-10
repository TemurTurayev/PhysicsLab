import { useState } from 'react'
import { checkValue, type Verdict } from '../calc/check'
import { vacuumFlight, type LaunchSheet } from '../calc/launchSheet'
import { useUniverse } from '../universe/useUniverse'

interface Slot {
  key: string
  label: string
  unit: string
  truth: number
}

const MARK: Record<Verdict, { sign: string; say: string; color: string }> = {
  ok: { sign: '✓', say: 'верно', color: 'var(--lab-good)' },
  close: { sign: '≈', say: 'близко: проверь округление и g', color: '#f2c94c' },
  wrong: { sign: '✗', say: 'не сходится', color: 'var(--lab-bad)' },
}

function slotsFor(sheet: LaunchSheet, showVelocity: boolean): Slot[] {
  const f = vacuumFlight(sheet)
  return [
    ...(showVelocity
      ? [
          { key: 'vx', label: 'vx = v₀·cos α', unit: 'м/с', truth: sheet.vx },
          { key: 'vy', label: 'vy = v₀·sin α', unit: 'м/с', truth: sheet.vy },
        ]
      : []),
    { key: 't', label: 't пол', unit: 'с', truth: f.tFlight },
    { key: 'h', label: 'h max', unit: 'м', truth: f.apexY },
    { key: 'R', label: 'R', unit: 'м', truth: f.range },
  ]
}

/**
 * The student's own calculation for the current setting, checked step by step before any shot:
 * a green vx and a red t says exactly where the slip is. Free — it never costs a life.
 */
export function WorkSheet({ sheet, showVelocity, vacuumNote, hidden, only }: { sheet: LaunchSheet; showVelocity: boolean; vacuumNote: boolean; hidden: string | null; only?: string[] }) {
  const [entries, setEntries] = useState<Record<string, string>>({})
  const formal = useUniverse().id === 'sigma'
  // The quantity a prediction mission asks for stays unchecked: the prediction itself is the test.
  const slots = slotsFor(sheet, showVelocity).filter((s) => s.key !== hidden && (!only || only.includes(s.key)))
  return (
    <div className="flex flex-col gap-1">
      <div className="lab-label mt-2">
        {formal ? 'Проверка расчёта' : 'Проверь свой расчёт'}
        {vacuumNote ? ' (без воздуха)' : ''}
      </div>
      <p className="text-[11px]" style={{ color: 'var(--lab-dim)' }}>
        {formal
          ? 'Рассчитайте вручную для текущей настройки и внесите значения — проверка не расходует допуски.'
          : 'Посчитай на бумаге для текущей настройки и впиши — проверка бесплатная, жизни не тратит.'}
      </p>
      {slots.map((s) => {
        const raw = entries[s.key] ?? ''
        const v = Number(raw.replace(',', '.'))
        const verdict = raw.trim() !== '' && Number.isFinite(v) ? checkValue(v, s.truth) : null
        return (
          <label key={s.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs">
            <span style={{ color: 'var(--lab-dim)' }}>{s.label}</span>
            <span className="flex items-baseline gap-1">
              <input
                className={`lab-num lab-mono w-[7ch] text-right bg-transparent rounded-md px-1 py-0.5 ${verdict ?? ''}`}
                style={{ border: '1px solid var(--lab-line)', color: 'var(--lab-text)' }}
                inputMode="decimal"
                placeholder="?"
                value={raw}
                onChange={(e) => setEntries((cur) => ({ ...cur, [s.key]: e.target.value }))}
              />
              <span className="lab-mono" style={{ color: 'var(--lab-dim)' }}>
                {s.unit}
              </span>
            </span>
            <span className="w-4 text-center font-bold" style={{ color: verdict ? MARK[verdict].color : 'transparent' }} title={verdict ? MARK[verdict].say : ''}>
              {verdict ? MARK[verdict].sign : '·'}
            </span>
          </label>
        )
      })}
    </div>
  )
}
