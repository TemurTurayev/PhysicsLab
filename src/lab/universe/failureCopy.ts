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

// The complex speaks to its intern formally, like the briefs do.
const FORMAL: Array<[RegExp, string]> = [
  [/В твоём коде/g, 'В вашем коде'],
  [/в твоём коде/g, 'в вашем коде'],
  [/Ты делаешь то же самое/g, 'Вы делаете то же самое'],
  [/Убавь одно из двух/g, 'Убавьте одно из двух'],
]

const renameStone = (text: string) => [...STONE_TO_PROJECTILE, ...FORMAL].reduce((t, [re, to]) => t.replace(re, to), text)

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
    what: own.what ?? ((n) => renameStone(base.what(n))),
  }
}
