import type { UniverseId } from '../universe/types'

export interface ProgressData {
  completed: Record<string, number>
  incidents: string[]
  universe: UniverseId | null
}

/**
 * Signing in on a browser that already has progress must never lose any of it:
 * best stars per mission, every failure ever found, and the account's chosen world.
 */
export function mergeProgress(local: ProgressData, remote: ProgressData | null): ProgressData {
  if (!remote) return local
  const completed = { ...remote.completed }
  for (const [id, stars] of Object.entries(local.completed)) completed[id] = Math.max(stars, completed[id] ?? 0)
  const incidents = [...remote.incidents, ...local.incidents.filter((x) => !remote.incidents.includes(x))]
  return { completed, incidents, universe: remote.universe ?? local.universe }
}
