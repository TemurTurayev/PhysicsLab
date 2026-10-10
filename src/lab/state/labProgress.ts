import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FailureId } from '../failures/types'
import type { UniverseId } from '../universe/types'

interface LabProgress {
  completed: Record<string, number> // mission id → best stars (1–3)
  incidents: FailureId[] // discovered failure types, in discovery order
  universe: UniverseId | null // null until the student has chosen; a setting, so reset() keeps it
  setUniverse: (id: UniverseId) => void
  complete: (missionId: string, stars: number) => void
  /** Returns true when this failure type is seen for the first time. */
  recordIncident: (id: FailureId) => boolean
  /** Replace everything with merged progress (after signing in). */
  load: (p: { completed: Record<string, number>; incidents: string[]; universe: UniverseId | null }) => void
  reset: () => void
}

export const useLabProgress = create<LabProgress>()(
  persist(
    (set, get) => ({
      completed: {},
      incidents: [],
      universe: null,
      setUniverse: (universe) => set({ universe }),
      complete: (missionId, stars) =>
        set((s) => ({ completed: { ...s.completed, [missionId]: Math.max(stars, s.completed[missionId] ?? 0) } })),
      recordIncident: (id) => {
        if (get().incidents.includes(id)) return false
        set((s) => ({ incidents: [...s.incidents, id] }))
        return true
      },
      load: (p) => set({ completed: p.completed, incidents: p.incidents as FailureId[], universe: p.universe }),
      reset: () => set({ completed: {}, incidents: [] }),
    }),
    { name: 'physicslab-lab-v1' },
  ),
)
