/** Input checks for the accounts API. Everything from the client is untrusted. */

export interface Credentials {
  username: string
  password: string
}

export interface SavedProgress {
  completed: Record<string, number>
  incidents: string[]
  universe: 'classic' | 'sigma' | null
}

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string }

const USERNAME = /^[a-zA-Z0-9а-яА-ЯёЁ_.-]{3,24}$/
const MISSION_ID = /^\d{1,2}-\d{1,2}$/
const FAILURE_ID = /^[a-z_]{2,32}$/
export const MAX_PROGRESS_BYTES = 16_000

export function checkCredentials(body: unknown): Checked<Credentials> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Нужны имя и пароль' }
  const { username, password } = body as Record<string, unknown>
  if (typeof username !== 'string' || !USERNAME.test(username.trim())) {
    return { ok: false, error: 'Имя: от 3 до 24 символов — буквы, цифры, точка, дефис или подчёркивание' }
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return { ok: false, error: 'Пароль: от 6 до 128 символов' }
  }
  return { ok: true, value: { username: username.trim(), password } }
}

export function checkProgress(body: unknown): Checked<SavedProgress> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Нет данных прогресса' }
  const { completed, incidents, universe } = body as Record<string, unknown>
  if (typeof completed !== 'object' || completed === null || Array.isArray(completed)) return { ok: false, error: 'Неверный формат прогресса' }
  const entries = Object.entries(completed as Record<string, unknown>)
  if (entries.length > 200) return { ok: false, error: 'Слишком много миссий' }
  for (const [id, stars] of entries) {
    if (!MISSION_ID.test(id) || typeof stars !== 'number' || !Number.isInteger(stars) || stars < 1 || stars > 3) {
      return { ok: false, error: `Неверная запись миссии ${id.slice(0, 12)}` }
    }
  }
  if (!Array.isArray(incidents) || incidents.length > 100 || !incidents.every((x) => typeof x === 'string' && FAILURE_ID.test(x))) {
    return { ok: false, error: 'Неверный журнал провалов' }
  }
  if (universe !== null && universe !== 'classic' && universe !== 'sigma') return { ok: false, error: 'Неизвестная вселенная' }
  return { ok: true, value: { completed: Object.fromEntries(entries) as Record<string, number>, incidents: incidents as string[], universe } }
}
