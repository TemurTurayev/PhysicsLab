import { tr } from '../../i18n'
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
  if (!list?.length || n <= 0) return m
  const v = list[(n - 1) % list.length]
  const base = {
    ...m.base,
    trebuchet: { ...m.base.trebuchet, ...v.trebuchet },
    ...(m.base.launcher ? { launcher: { ...m.base.launcher, ...v.launcher } } : {}),
  }
  return { ...m, base }
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
