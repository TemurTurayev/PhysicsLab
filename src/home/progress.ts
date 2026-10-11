import { CHAPTERS, isUnlocked, MISSIONS } from '../lab/levels'
import type { Mission } from '../lab/levels/types'

export interface ChapterProgress {
  id: number
  done: number
  total: number
  stars: number
  open: boolean // its first mission is unlocked
}

export interface ProgressSummary {
  done: number
  total: number
  stars: number
  maxStars: number
  started: boolean
  next: Mission | undefined
  chapters: ChapterProgress[]
}

const starsOf = (missions: Mission[], completed: Record<string, number>) => missions.reduce((s, m) => s + (completed[m.id] ?? 0), 0)
const doneOf = (missions: Mission[], completed: Record<string, number>) => missions.filter((m) => (completed[m.id] ?? 0) > 0).length

/** What the home page needs to know: how far the student is and where to continue. */
export function summarize(completed: Record<string, number>): ProgressSummary {
  const done = doneOf(MISSIONS, completed)
  return {
    done,
    total: MISSIONS.length,
    stars: starsOf(MISSIONS, completed),
    maxStars: MISSIONS.length * 3,
    started: done > 0,
    next: MISSIONS.find((m) => isUnlocked(m, completed) && (completed[m.id] ?? 0) === 0),
    chapters: CHAPTERS.map((c) => ({ id: c.id, done: doneOf(c.missions, completed), total: c.missions.length, stars: starsOf(c.missions, completed), open: isUnlocked(c.missions[0], completed) })),
  }
}
