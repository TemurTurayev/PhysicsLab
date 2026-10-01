import type { EnvironmentFactory } from '../scene/environments/types'

export type UniverseId = 'classic' | 'sigma'

/** Per-mission text overlay; any field left out keeps the mission's own text. */
export interface MissionCopy {
  title?: string
  brief?: string
  goal?: string
  hints?: string[]
}

export interface Universe {
  id: UniverseId
  name: string
  tagline: string
  /** Environment for a chapter, or null when this universe has not built that sector yet. */
  envFor(chapter: number): EnvironmentFactory | null
  copy: Record<string, MissionCopy>
  chapterTitles: Record<number, string>
  chapterTaglines: Record<number, string>
  /** CSS background for chapter banners on the world map; undefined keeps the chapter's own. */
  bannerFor?: (chapter: number) => string
  machine: 'wood' | 'steel'
  terms: { journal: string; incident: string; incidentNew: string }
  retroByDefault: boolean
}
