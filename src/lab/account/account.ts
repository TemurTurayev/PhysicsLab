import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useLabProgress } from '../state/labProgress'
import { mergeProgress, type ProgressData } from '../state/mergeProgress'
import { localizeServerError } from '../../i18n/foreign'
import { api } from './api'

type SyncState = 'idle' | 'saving' | 'saved' | 'offline'

interface Account {
  username: string | null
  token: string | null
  sync: SyncState
  signIn: (mode: 'login' | 'register', username: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  pull: () => Promise<void>
}

const snapshot = (): ProgressData => {
  const { completed, incidents, universe } = useLabProgress.getState()
  return { completed, incidents, universe }
}

/** A plain account: name + password, progress kept on the server and merged with this browser on sign-in. */
export const useAccount = create<Account>()(
  persist(
    (set, get) => ({
      username: null,
      token: null,
      sync: 'idle',
      signIn: async (mode, username, password) => {
        const res = mode === 'login' ? await api.login(username, password) : await api.register(username, password)
        if (!res.success) return localizeServerError(res.error)
        set({ username: res.data.username, token: res.data.token })
        await get().pull()
        return null
      },
      signOut: async () => {
        const token = get().token
        set({ username: null, token: null, sync: 'idle' })
        if (token) await api.logout(token)
      },
      // Fetch the account's progress, merge it with this browser's and save the union back.
      pull: async () => {
        const token = get().token
        if (!token) return
        const res = await api.getProgress(token)
        if (!res.success) {
          if (res.status === 401) set({ username: null, token: null })
          set({ sync: 'offline' })
          return
        }
        const merged = mergeProgress(snapshot(), res.data.progress)
        useLabProgress.getState().load(merged)
        await push()
      },
    }),
    { name: 'physicslab-account', partialize: (s) => ({ username: s.username, token: s.token }) },
  ),
)

async function push(): Promise<void> {
  const { token } = useAccount.getState()
  if (!token) return
  useAccount.setState({ sync: 'saving' })
  const res = await api.putProgress(token, snapshot())
  useAccount.setState({ sync: res.success ? 'saved' : 'offline' })
}

let timer: ReturnType<typeof setTimeout> | null = null
let started = false

/** Once per page: pull on start, then save a second after every change of progress. */
export function startCloudSync(): void {
  if (started) return
  started = true
  void useAccount.getState().pull()
  useLabProgress.subscribe((now, before) => {
    if (now.completed === before.completed && now.incidents === before.incidents && now.universe === before.universe) return
    if (!useAccount.getState().token) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void push(), 1000)
  })
}
