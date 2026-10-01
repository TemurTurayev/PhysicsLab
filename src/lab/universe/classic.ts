import { createMoon } from '../scene/environments/moon'
import { createPass } from '../scene/environments/pass'
import { createRange } from '../scene/environments/range'
import { createSiege } from '../scene/environments/siege'
import { createWorkshop } from '../scene/environments/workshop'
import type { EnvironmentFactory } from '../scene/environments/types'
import type { Universe } from './types'

const ENVS: Record<number, EnvironmentFactory> = { 1: createWorkshop, 2: createRange, 3: createSiege, 4: createPass, 5: createMoon }

export const CLASSIC: Universe = {
  id: 'classic',
  name: 'Классика',
  tagline: 'Двор плотника, открытое поле и замок на закате. Дерево, верёвка и камень.',
  envFor: (chapter) => ENVS[chapter] ?? null,
  copy: {},
  chapterTitles: { 1: 'Мастерская', 2: 'Полигон', 3: 'Осада', 4: 'Перевал', 5: 'Луна' },
  chapterTaglines: {},
  machine: 'wood',
  terms: { journal: 'Журнал инцидентов', incident: 'Инцидент', incidentNew: 'Новая запись в журнале', movingTarget: 'Тележка проедет' },
  retroByDefault: false,
}
