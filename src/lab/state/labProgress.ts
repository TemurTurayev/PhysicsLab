import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FailureId } from '../failures/types'

interface LabProgress {
  completed: Record<string, number> // mission id → best stars (1–3)
  incidents: FailureId[] // discovered failure types, in discovery order
  complete: (missionId: string, stars: number) => void
  /** Returns true when this failure type is seen for the first time. */
  recordIncident: (id: FailureId) => boolean
  reset: () => void
}

export const useLabProgress = create<LabProgress>()(
  persist(
    (set, get) => ({
      completed: {},
      incidents: [],
      complete: (missionId, stars) =>
        set((s) => ({ completed: { ...s.completed, [missionId]: Math.max(stars, s.completed[missionId] ?? 0) } })),
      recordIncident: (id) => {
        if (get().incidents.includes(id)) return false
        set((s) => ({ incidents: [...s.incidents, id] }))
        return true
      },
      reset: () => set({ completed: {}, incidents: [] }),
    }),
    { name: 'physicslab-lab-v1' },
  ),
)
