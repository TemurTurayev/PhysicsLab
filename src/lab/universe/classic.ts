import { createMoon } from '../scene/environments/moon'
import { createPass } from '../scene/environments/pass'
import { createRange } from '../scene/environments/range'
import { createSiege } from '../scene/environments/siege'
import { createWorkshop } from '../scene/environments/workshop'
import type { EnvironmentFactory } from '../scene/environments/types'
import { CLASSIC_META } from './meta'
import type { Universe } from './types'

const ENVS: Record<number, EnvironmentFactory> = { 0: createRange, 1: createWorkshop, 2: createRange, 3: createSiege, 4: createPass, 5: createMoon }

export const CLASSIC: Universe = {
  ...CLASSIC_META,
  envFor: (chapter) => ENVS[chapter] ?? null,
  copy: {},
  machine: 'wood',
  terms: { journal: 'Журнал инцидентов', incident: 'Инцидент', incidentNew: 'Новая запись в журнале', movingTarget: 'Тележка проедет' },
  retroByDefault: false,
}
