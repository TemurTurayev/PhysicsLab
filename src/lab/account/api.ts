import type { ProgressData } from '../state/mergeProgress'

/** The API lives on the Cloudflare copy of the site; other hosts (Vercel) call it there. Dev proxies /api. */
const REMOTE = 'https://physicslab.temurturayev7822.workers.dev'
const TIMEOUT_MS = 10_000

function base(): string {
  const host = window.location.hostname
  return host === 'localhost' || host.endsWith('.workers.dev') ? '' : REMOTE
}

export type ApiResult<T> = { success: true; data: T } | { success: false; error: string; status: number }

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<ApiResult<T>> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${base()}/api/${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}) },
    })
    const body = (await res.json().catch(() => null)) as { success?: boolean; data?: T; error?: string } | null
    if (res.ok && body?.success) return { success: true, data: body.data as T }
    return { success: false, status: res.status, error: body?.error ?? 'Сервер не ответил как надо. Попробуй ещё раз.' }
  } catch {
    return { success: false, status: 0, error: 'Нет связи с сервером. Проверь интернет.' }
  } finally {
    clearTimeout(timer)
  }
}

export interface Session {
  token: string
  username: string
}

export const api = {
  register: (username: string, password: string) => call<Session>('register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) => call<Session>('login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: (token: string) => call<object>('logout', { method: 'POST', token }),
  getProgress: (token: string) => call<{ progress: ProgressData | null }>('progress', { token }),
  putProgress: (token: string, progress: ProgressData) => call<{ updatedAt: number }>('progress', { method: 'PUT', token, body: JSON.stringify(progress) }),
}
