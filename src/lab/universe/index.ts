import { CLASSIC } from './classic'
import { SIGMA } from './sigma'
import type { Universe, UniverseId } from './types'

export const UNIVERSES: Universe[] = [CLASSIC, SIGMA]

export function getUniverse(id: UniverseId | null | undefined): Universe {
  return UNIVERSES.find((u) => u.id === id) ?? CLASSIC
}

export { applyCopy } from './copy'
export type { Universe, UniverseId } from './types'
