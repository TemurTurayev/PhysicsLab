import { useEffect, useMemo, useRef } from 'react'
import type { Mission } from '../levels/types'
import { useConsole, type MissionBridge } from './store'

/** The mission as the console has bent it (sv_gravity), plus whether cheats touched it. */
export function useConsoleMission(mission: Mission) {
  const cvars = useConsole((s) => s.cvars)
  const cheated = useConsole((s) => s.cheated.has(mission.id))
  const played = useMemo(
    () => (cvars.sv_gravity === null ? mission : { ...mission, base: { ...mission.base, world: { ...mission.base.world, g: cvars.sv_gravity } } }),
    [mission, cvars.sv_gravity],
  )
  return { cvars, played, cheated }
}

/** Let the console reach the open mission (status, +attack, impulse 101) while this page is mounted. */
export function useMissionBridge(bridge: MissionBridge): void {
  const ref = useRef(bridge)
  ref.current = bridge
  const setBridge = useConsole((s) => s.setBridge)
  useEffect(() => {
    setBridge({
      get current() {
        return ref.current.current
      },
      fire: () => ref.current.fire(),
      refillLives: () => ref.current.refillLives(),
    })
    return () => setBridge(null)
  }, [setBridge])
}
