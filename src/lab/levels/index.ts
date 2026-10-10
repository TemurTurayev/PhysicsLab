import { tr } from '../../i18n'
import { CHAPTER_0 } from './chapter0'
import { CHAPTER_1 } from './chapter1'
import { CHAPTER_2 } from './chapter2'
import { CHAPTER_3 } from './chapter3'
import { CHAPTER_4 } from './chapter4'
import { CHAPTER_5 } from './chapter5'
import type { Chapter, Mission } from './types'

export const CHAPTERS: Chapter[] = [CHAPTER_0, CHAPTER_1, CHAPTER_2, CHAPTER_3, CHAPTER_4, CHAPTER_5]
export const MISSIONS: Mission[] = CHAPTERS.flatMap((c) => c.missions)

export function findMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id)
}

/** Open when its prerequisites are done — or when it is already done (progress saved before a step was added stays open). */
export function isUnlocked(m: Mission, completed: Record<string, number>): boolean {
  return (completed[m.id] ?? 0) > 0 || m.requires.every((id) => (completed[id] ?? 0) > 0)
}

export function nextMission(id: string): Mission | undefined {
  const i = MISSIONS.findIndex((m) => m.id === id)
  return i >= 0 ? MISSIONS[i + 1] : undefined
}

/** «Основы» for the basics, «Глава N» for the rest. */
export function chapterLabel(id: number): string {
  return id === 0 ? tr('Основы') : tr(`Глава {0}`, [id])
}
