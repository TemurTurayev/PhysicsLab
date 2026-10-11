import { useLabProgress } from '../state/labProgress'
import { getUniverse } from './index'
import type { Universe } from './types'

/** The universe the student chose (Classic until they choose). */
export function useUniverse(): Universe {
  return getUniverse(useLabProgress((s) => s.universe))
}
