import { create } from 'zustand'
import { CHAPTERS, isUnlocked } from '../levels'
import { useLabProgress } from '../state/labProgress'
import { useAudioSettings } from '../audio/engine'
import { DEFAULT_CVARS, runCommand, type ConsoleHost, type Cvars } from './commands'

/** What the open mission lets the console do; registered by the mission page while it is mounted. */
export interface MissionBridge {
  current: NonNullable<ConsoleHost['current']>
  fire: () => boolean
  refillLives: () => boolean
}

interface ConsoleState {
  open: boolean
  lines: string[]
  history: string[]
  cvars: Cvars
  cheated: ReadonlySet<string> // missions touched by cheats this session: their wins are not saved
  bridge: MissionBridge | null
  go: (path: string) => void
  toggle: (open?: boolean) => void
  setBridge: (b: MissionBridge | null) => void
  setGo: (go: (path: string) => void) => void
  submit: (line: string) => void
}

const MAX_LINES = 200

export const useConsole = create<ConsoleState>()((set, get) => ({
  open: false,
  lines: ['PhysicsLab console. help — список команд.'],
  history: [],
  cvars: DEFAULT_CVARS,
  cheated: new Set(),
  bridge: null,
  go: () => {},
  toggle: (open) => set((s) => ({ open: open ?? !s.open })),
  setBridge: (bridge) => set({ bridge }),
  setGo: (go) => set({ go }),
  submit: (line) => {
    const s = get()
    const completed = useLabProgress.getState().completed
    const host: ConsoleHost = {
      missions: CHAPTERS.flatMap((c) => c.missions).map((m) => ({ id: m.id, title: m.title, open: isUnlocked(m, completed) })),
      current: s.bridge?.current ?? null,
      go: s.go,
      fire: () => s.bridge?.fire() ?? false,
      refillLives: () => s.bridge?.refillLives() ?? false,
      setMusic: (on) => useAudioSettings.getState().setMusic(on),
      setUniverse: (id) => useLabProgress.getState().setUniverse(id),
    }
    const r = runCommand(line, s.cvars, host)
    const echo = line.trim() ? [`] ${line.trim()}`] : []
    const lines = r.clear ? [] : [...s.lines, ...echo, ...r.lines].slice(-MAX_LINES)
    const missionId = s.bridge?.current.id
    set({
      lines,
      cvars: r.cvars,
      history: line.trim() ? [...s.history.filter((h) => h !== line.trim()), line.trim()].slice(-50) : s.history,
      cheated: r.cheated && missionId ? new Set([...s.cheated, missionId]) : s.cheated,
    })
  },
}))
