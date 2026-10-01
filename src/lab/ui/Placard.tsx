import type { JSX } from 'react'
import type { ShotResult } from '../sim/types'

export interface PlacardProps {
  shot: ShotResult | null
  releaseDeg: number
  phase: 'idle' | 'flying' | 'landed'
  movingTargetSpeed?: number
  beamLimit?: number // N·m; when set, show the peak beam load as a share of it
}

const fmt1 = (v: number): string =>
  v.toLocaleString('ru-RU', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

function getStory(
  phase: 'idle' | 'flying' | 'landed',
  shot: ShotResult | null,
  releaseDeg: number,
): string {
  if (phase === 'idle') {
    const degStr = releaseDeg.toLocaleString('ru-RU', { maximumFractionDigits: 1 })
    return `Праща раскроется, когда рука опустится до ${degStr}°. Жми «Огонь».`
  }

  if (phase === 'flying') {
    if (!shot || !shot.released || !shot.launch) {
      return 'Праща не раскрылась'
    }
    return `Камень ушёл со скоростью ${fmt1(shot.launch.speed)} м/с под углом ${fmt1(shot.launch.angleDeg)}° к горизонту.`
  }

  // phase === 'landed'
  if (!shot || !shot.released) {
    return 'Праща не раскрылась'
  }
  if (!shot.landing) {
    return 'Камень так и не упал'
  }

  const flightTime = Math.max(0, shot.landing.t - (shot.releaseT ?? 0))
  const apexText = shot.apex ? ` Наивысшая точка ${fmt1(shot.apex.y)} м.` : ''
  return `Упал в ${fmt1(shot.landing.x)} м через ${fmt1(flightTime)} с полёта.${apexText}`
}

export function Placard({ shot, releaseDeg, phase, movingTargetSpeed, beamLimit }: PlacardProps): JSX.Element {
  const story = getStory(phase, shot, releaseDeg)

  const isFlyingOrLanded = phase === 'flying' || phase === 'landed'
  const speedVal = isFlyingOrLanded && shot?.launch ? `${fmt1(shot.launch.speed)} м/с` : '—'
  const angleVal = isFlyingOrLanded && shot?.launch ? `${fmt1(shot.launch.angleDeg)}°` : '—'

  const flightTime = shot?.landing ? Math.max(0, shot.landing.t - (shot.releaseT ?? 0)) : null
  const rangeVal = phase === 'landed' && shot?.landing ? `${fmt1(shot.landing.x)} м` : '—'
  const timeVal = phase === 'landed' && flightTime !== null ? `${fmt1(flightTime)} с` : '—'
  const cartVal =
    phase === 'landed' && flightTime !== null && movingTargetSpeed !== undefined
      ? `${fmt1(movingTargetSpeed * flightTime)} м`
      : '—'

  const readouts: Array<{ label: string; value: string }> = [
    { label: 'Скорость', value: speedVal },
    { label: 'Угол вылета', value: angleVal },
    { label: 'Дальность', value: rangeVal },
    { label: 'Время полёта', value: timeVal },
  ]

  if (movingTargetSpeed !== undefined) {
    readouts.push({ label: 'Тележка проедет', value: cartVal })
  }
  if (beamLimit !== undefined) {
    const load = shot && isFlyingOrLanded ? Math.round((shot.peakMoment / beamLimit) * 100) : null
    readouts.push({ label: 'Нагрузка балки', value: load === null ? '—' : `${load}%` })
  }

  return (
    <div className="lab-panel px-3 py-2.5 md:px-4 md:py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-6 min-w-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug" style={{ color: 'var(--lab-text)' }}>
          {story}
        </p>
      </div>
      <div className="grid grid-cols-4 sm:flex sm:flex-wrap items-center gap-x-3 gap-y-2 shrink-0 w-full md:w-auto">
        {readouts.map((r) => (
          <div key={r.label} className="flex flex-col min-w-0">
            <span className="lab-label truncate">{r.label}</span>
            <span className="lab-mono text-sm font-semibold truncate" style={{ color: 'var(--lab-accent)' }}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
