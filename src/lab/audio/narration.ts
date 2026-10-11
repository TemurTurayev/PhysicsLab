import { tr } from '../../i18n'
import type { UniverseId } from '../universe/types'

/** What the narrator reads for a mission: the story, then the goal in one line. */
export function narrationText(story: string | null, goal: string, world: UniverseId): string {
  const label = world === 'sigma' ? tr('Задание') : tr('Цель')
  return [story, `${label}: ${goal}`].filter(Boolean).join(' ')
}
