import type * as THREE from 'three'
import type { Target } from '../../levels/types'

/** A level backdrop. It never affects physics; the mission's SimParams do. */
export interface Environment {
  group: THREE.Group
  fog: THREE.Fog | null
  background: THREE.Color
  /** Called every frame with scene time in seconds (flags waving, smoke, birds). */
  update(t: number): void
  /** Highlight targets: index of the target that was hit, or null to reset. */
  setHit(index: number | null): void
  dispose(): void
  palette: { accent: string; ground: string; sky: string }
  /** Outdoor worlds: colour of the endless ground beyond the detailed plane, so its edge never shows. */
  skirt?: string
}

export interface EnvironmentOptions {
  targets: Target[]
  maxX: number // furthest distance the camera may show (m)
  wind?: number // m/s along +x (negative = headwind); 0 or undefined = calm
}

export type EnvironmentFactory = (opts: EnvironmentOptions) => Environment
