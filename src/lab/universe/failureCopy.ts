import { tr } from '../../i18n'
import { FAILURES, type FailureEntry } from '../failures/catalog'
import type { FailureId } from '../failures/types'
import type { Universe } from './types'

const STONE_TO_PROJECTILE: Array<[RegExp, string]> = [
  [/Камень/g, tr('Снаряд')],
  [/камень/g, tr('снаряд')],
  [/камня/g, tr('снаряда')],
  [/камнем/g, tr('снарядом')],
  [/камню/g, tr('снаряду')],
]

// The complex speaks to its intern formally, like the briefs do.
const FORMAL: Array<[RegExp, string]> = [
  [/В твоём коде/g, tr('В вашем коде')],
  [/в твоём коде/g, tr('в вашем коде')],
  [/Ты делаешь то же самое/g, tr('Вы делаете то же самое')],
  [/Убавь одно из двух/g, tr('Убавьте одно из двух')],
]

// The steel machine has a cable on a hook, not a sling that opens.
const MACHINE: Array<[RegExp, string]> = [
  [/Праща раскроется, когда рука опустится до/g, tr('Трос сойдёт с крюка, когда балка опустится до')],
  [/Праща не раскрылась/g, tr('Трос не сошёл с крюка')],
  [/Жми «Огонь»/g, tr('Нажмите «Огонь»')],
]

const renameStone = (text: string) => [...STONE_TO_PROJECTILE, ...FORMAL, ...MACHINE].reduce((t, [re, to]) => t.replace(re, to), text)

/** Any shared line (placard, hints) as this universe would say it. */
export function tellLine(text: string, u: Universe): string {
  return u.id === 'classic' ? text : renameStone(text)
}

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
