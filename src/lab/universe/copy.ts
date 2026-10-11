import type { Mission } from '../levels/types'
import type { Universe } from './types'

/** The mission as this universe tells it. Physics, targets and code never change — only the words. */
export function applyCopy(m: Mission, u: Universe): Mission {
  const c = u.copy[m.id]
  if (!c) return m
  return {
    ...m,
    title: c.title ?? m.title,
    brief: c.brief ?? m.brief,
    goal: c.goal ?? m.goal,
    hints: c.hints ?? m.hints,
  }
}
