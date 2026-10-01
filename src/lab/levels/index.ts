import { CHAPTER_1 } from './chapter1'
import { CHAPTER_2 } from './chapter2'
import type { Chapter, Mission } from './types'

export const CHAPTERS: Chapter[] = [CHAPTER_1, CHAPTER_2]
export const MISSIONS: Mission[] = CHAPTERS.flatMap((c) => c.missions)

export function findMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id)
}

export function isUnlocked(m: Mission, completed: Record<string, number>): boolean {
  return m.requires.every((id) => (completed[id] ?? 0) > 0)
}

export function nextMission(id: string): Mission | undefined {
  const i = MISSIONS.findIndex((m) => m.id === id)
  return i >= 0 ? MISSIONS[i + 1] : undefined
}
