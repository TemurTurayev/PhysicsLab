import { FAILURES, type FailureEntry } from '../failures/catalog'
import type { FailureId } from '../failures/types'
import type { Universe } from './types'

const STONE_TO_PROJECTILE: Array<[RegExp, string]> = [
  [/Камень/g, 'Снаряд'],
  [/камень/g, 'снаряд'],
  [/камня/g, 'снаряда'],
  [/камнем/g, 'снарядом'],
  [/камню/g, 'снаряду'],
]

const renameStone = (text: string) => STONE_TO_PROJECTILE.reduce((t, [re, to]) => t.replace(re, to), text)

/** The post-mortem as this universe tells it: own lines where the setting differs, the same physics everywhere. */
export function tellFailure(id: FailureId, u: Universe): FailureEntry {
  const base = FAILURES[id]
  if (u.id === 'classic') return base
  const own = u.failureCopy?.[id] ?? {}
  return {
    ...base,
    title: renameStone(own.title ?? base.title),
    why: renameStone(own.why ?? base.why),
    realLife: renameStone(own.realLife ?? base.realLife),
    what: (n) => renameStone(base.what(n)),
  }
}
