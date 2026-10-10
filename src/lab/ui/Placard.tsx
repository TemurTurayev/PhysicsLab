import { localeTag, tr } from '../../i18n'
import type { JSX } from 'react'
import type { ShotResult } from '../sim/types'

export interface PlacardProps {
  shot: ShotResult | null
  releaseDeg: number
  phase: 'idle' | 'flying' | 'landed'
  movingTargetSpeed?: number
  beamLimit?: number // N·m; when set, show the peak beam load as a share of it
  movingLabel?: string
  /** Rewords the story for the current universe (stone → projectile, sling → cable). */
  tell?: (line: string) => string
  /** What to say before the shot when the machine is not a sling (the basics launcher). */
  idleLine?: string
}

const fmt1 = (v: number): string =>
  v.toLocaleString(localeTag(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

function getStory(
  phase: 'idle' | 'flying' | 'landed',
  shot: ShotResult | null,
  releaseDeg: number,
): string {
  if (phase === 'idle') {
    const degStr = releaseDeg.toLocaleString(localeTag(), { maximumFractionDigits: 1 })
    return tr(`Праща раскроется, когда рука опустится до {0}°. Жми «Огонь».`, [degStr])
  }

  if (phase === 'flying') {
    if (!shot || !shot.released || !shot.launch) {
      return tr('Праща не раскрылась')
    }
    return tr(`Камень ушёл со скоростью {0} м/с под углом {1}° к горизонту.`, [fmt1(shot.launch.speed), fmt1(shot.launch.angleDeg)])
  }

  // phase === 'landed'
  if (!shot || !shot.released) {
    return tr('Праща не раскрылась')
  }
  if (!shot.landing) {
    return tr('Камень так и не упал')
  }

  const flightTime = Math.max(0, shot.landing.t - (shot.releaseT ?? 0))
  const apexText = shot.apex ? tr(` Наивысшая точка {0} м.`, [fmt1(shot.apex.y)]) : ''
  return tr(`Упал в {0} м через {1} с полёта.{2}`, [fmt1(shot.landing.x), fmt1(flightTime), apexText])
}

export function Placard({ shot, releaseDeg, phase, movingTargetSpeed, beamLimit, movingLabel = tr('Тележка проедет'), tell = (s) => s, idleLine }: PlacardProps): JSX.Element {
  const story = phase === 'idle' && idleLine ? idleLine : tell(getStory(phase, shot, releaseDeg))

  const isFlyingOrLanded = phase === 'flying' || phase === 'landed'
  const speedVal = isFlyingOrLanded && shot?.launch ? tr(`{0} м/с`, [fmt1(shot.launch.speed)]) : '—'
  const angleVal = isFlyingOrLanded && shot?.launch ? `${fmt1(shot.launch.angleDeg)}°` : '—'

  const flightTime = shot?.landing ? Math.max(0, shot.landing.t - (shot.releaseT ?? 0)) : null
  const rangeVal = phase === 'landed' && shot?.landing ? tr(`{0} м`, [fmt1(shot.landing.x)]) : '—'
  const timeVal = phase === 'landed' && flightTime !== null ? tr(`{0} с`, [fmt1(flightTime)]) : '—'
  const cartVal =
    phase === 'landed' && flightTime !== null && movingTargetSpeed !== undefined
      ? tr(`{0} м`, [fmt1(movingTargetSpeed * flightTime)])
      : '—'

  const readouts: Array<{ label: string; short?: string; value: string }> = [
    { label: tr('Скорость'), short: 'v₀', value: speedVal },
    { label: tr('Угол вылета'), short: 'α', value: angleVal },
    { label: tr('Дальность'), short: 'R', value: rangeVal },
    { label: tr('Время полёта'), short: 't', value: timeVal },
  ]

  if (movingTargetSpeed !== undefined) {
    readouts.push({ label: movingLabel, value: cartVal })
  }
  if (beamLimit !== undefined) {
    const load = shot && isFlyingOrLanded ? Math.round((shot.peakMoment / beamLimit) * 100) : null
    readouts.push({ label: tr('Нагрузка балки'), short: tr('балка'), value: load === null ? '—' : `${load}%` })
  }

  return (
    <div className="lab-panel px-3 py-2 md:px-4 md:py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-6 min-w-0">
      <div className="min-w-0 flex-1 hidden md:block">
        <p className="text-sm leading-snug" style={{ color: 'var(--lab-text)' }}>
          {story}
        </p>
      </div>
      <div className="grid sm:flex sm:flex-wrap items-center gap-x-3 gap-y-2 shrink-0 w-full md:w-auto" style={{ gridTemplateColumns: `repeat(${readouts.length}, minmax(0, 1fr))` }}>
        {readouts.map((r) => (
          <div key={r.label} className="flex flex-col min-w-0">
            <span className="lab-label truncate">
              <span className="md:hidden normal-case text-[13px] tracking-normal">{r.short ?? r.label}</span>
              <span className="hidden md:inline">{r.label}</span>
            </span>
            <span className="lab-mono text-sm font-semibold truncate" style={{ color: 'var(--lab-accent)' }}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
