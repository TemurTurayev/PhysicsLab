import type { Mission } from './types'

export const MAX_LIVES = 3

/** A shot costs a life when it achieves nothing; the untouched starter code is a free look at the bug. */
export function costsLife(m: Mission, r: { hits: number[]; predictionError: number | null }, code: string): boolean {
  if (m.practice) return false
  if (m.code && code.trim() === m.code.starter.trim()) return false
  if (r.hits.length > 0) return false
  if (m.predict && r.predictionError !== null && Math.abs(r.predictionError) <= m.predict.tolerance) return false
  return true
}

/** Stars at the win are simply the lives left: a clean first solve is three. */
export function starsForLives(livesLeft: number): number {
  return Math.max(1, Math.min(MAX_LIVES, livesLeft))
}
