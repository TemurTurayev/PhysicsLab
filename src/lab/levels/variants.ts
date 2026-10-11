import { fill, fmt, tr } from '../../i18n'
import { simulateShot } from '../sim/shot'
import type { LauncherParams, TrebuchetParams } from '../sim/types'
import type { Mission } from './types'

/**
 * Prediction missions change their conditions after every miss: otherwise the stone of the first try
 * shows on the field where it falls, and the second answer is copied instead of computed.
 * Variant 0 is the mission as written; 1…n cycle through `predict.variants`.
 */
export interface Variant {
  launcher?: Partial<Pick<LauncherParams, 'speed' | 'y0' | 'angleDeg'>>
  trebuchet?: Partial<Pick<TrebuchetParams, 'releaseDeg' | 'mc'>>
}

export function withVariant(m: Mission, n: number): Mission {
  const list = m.predict?.variants
  if (!list?.length || n <= 0) return tellNumbers(m)
  const v = list[(n - 1) % list.length]
  const base = {
    ...m.base,
    trebuchet: { ...m.base.trebuchet, ...v.trebuchet },
    ...(m.base.launcher ? { launcher: { ...m.base.launcher, ...v.launcher } } : {}),
  }
  return tellNumbers({ ...m, base })
}

const EARTH_G = 9.81

/** The given numbers a text may quote: {y0}, {v0}, {alpha}, {sinAlpha}, {release}, {mc}, and for other worlds {earthR}, {earthT}. */
export function textVars(m: Mission): Record<string, string> {
  const l = m.base.launcher
  const t = m.base.trebuchet
  const vars: Record<string, string> = {
    release: fmt(t.releaseDeg, 0),
    mc: fmt(t.mc, 0),
    ...(l ? { y0: fmt(l.y0, 1, 0), v0: fmt(l.speed, 1, 0), alpha: fmt(l.angleDeg, 0), sinAlpha: fmt(Math.sin((l.angleDeg * Math.PI) / 180), 3, 1) } : {}),
  }
  if (m.base.world.g === EARTH_G) return vars
  // «On Earth this setting gave …»: the same machine and angle under Earth gravity.
  const earth = simulateShot({ ...m.base, world: { ...m.base.world, g: EARTH_G } })
  return {
    ...vars,
    earthR: earth.landing ? fmt(earth.landing.x, 0) : '—',
    earthT: earth.landing && earth.releaseT !== null ? fmt(earth.landing.t - earth.releaseT, 1) : '—',
  }
}

/** Put the mission's current numbers into its texts (the brief, hints and facts are written with placeholders). */
export function tellNumbers(m: Mission): Mission {
  if (!m.predict) return m
  const vars = textVars(m)
  const say = (s: string) => fill(s, vars)
  return {
    ...m,
    brief: say(m.brief),
    goal: say(m.goal),
    hints: m.hints.map(say),
    ...(m.panel ? { panel: { ...m.panel, known: m.panel.known?.map(say) } } : {}),
  }
}

export interface Change {
  label: string
  value: number
  unit: string
}

const LABELS: Record<string, () => [string, string]> = {
  speed: () => [tr('скорость вылета'), tr('м/с')],
  y0: () => [tr('высота вышки'), tr('м')],
  angleDeg: () => [tr('угол лотка'), '°'],
  releaseDeg: () => [tr('угол отпуска'), '°'],
  mc: () => [tr('противовес'), tr('кг')],
}

/** What differs from the written conditions, for the «conditions changed» note. */
export function variantChanges(m: Mission, n: number): Change[] {
  const varied = withVariant(m, n)
  if (varied === m) return []
  const pairs: Array<[string, number | undefined, number | undefined]> = [
    ...(['speed', 'y0', 'angleDeg'] as const).map((k) => [k, m.base.launcher?.[k], varied.base.launcher?.[k]] as [string, number | undefined, number | undefined]),
    ...(['releaseDeg', 'mc'] as const).map((k) => [k, m.base.trebuchet[k], varied.base.trebuchet[k]] as [string, number | undefined, number | undefined]),
  ]
  return pairs.flatMap(([k, a, b]) => {
    if (b === undefined || a === b) return []
    const [label, unit] = LABELS[k]()
    return [{ label, value: b, unit }]
  })
}
