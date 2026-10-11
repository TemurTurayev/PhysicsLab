/**
 * PhysicsLab API on Cloudflare Workers + D1: plain username/password accounts and one saved
 * progress record per user. Static files are served by the assets binding; only /api/* runs here.
 * Clients send `Authorization: Bearer <token>` (no cookies, so the Vercel copy of the site can call it too).
 */
import { hashPassword, randomHex, tokenHash, verifyPassword } from './crypto'
import { checkCredentials, checkProgress, MAX_PROGRESS_BYTES } from './validate'

interface D1Statement {
  bind(...values: unknown[]): D1Statement
  first<T>(): Promise<T | null>
  run(): Promise<unknown>
}
interface Env {
  DB: { prepare(sql: string): D1Statement }
  ASSETS: { fetch(req: Request): Promise<Response> }
}

const SESSION_DAYS = 90
const LIMIT_WINDOW_MS = 10 * 60 * 1000
const LIMIT_TRIES = 12
const ORIGINS = new Set(['https://physicslab-gold.vercel.app', 'https://physicslab.temurturayev7822.workers.dev', 'http://localhost:5180', 'http://localhost:8787'])

type Json = Record<string, unknown>

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  return ORIGINS.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS', Vary: 'Origin' }
    : {}
}

function reply(req: Request, status: number, body: Json): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(req) } })
}
const ok = (req: Request, data: Json = {}) => reply(req, 200, { success: true, data })
const fail = (req: Request, status: number, error: string) => reply(req, status, { success: false, error })

async function readJson(req: Request, limit = MAX_PROGRESS_BYTES): Promise<unknown> {
  const text = await req.text()
  if (text.length > limit) throw new RangeError('too large')
  return JSON.parse(text)
}

/** The session token from `Authorization: Bearer <64 hex>`, or null. */
function bearer(req: Request): string | null {
  const m = (req.headers.get('Authorization') ?? '').match(/^Bearer ([0-9a-f]{64})$/)
  return m ? m[1] : null
}

/** At most LIMIT_TRIES sign-in/sign-up attempts per client IP per 10 minutes. */
async function overLimit(env: Env, req: Request): Promise<boolean> {
  const key = `ip:${req.headers.get('CF-Connecting-IP') ?? 'unknown'}`
  const now = Date.now()
  const row = await env.DB.prepare('SELECT count, window_start FROM attempts WHERE key = ?').bind(key).first<{ count: number; window_start: number }>()
  if (!row || now - row.window_start > LIMIT_WINDOW_MS) {
    await env.DB.prepare('INSERT OR REPLACE INTO attempts (key, count, window_start) VALUES (?, 1, ?)').bind(key, now).run()
    return false
  }
  if (row.count >= LIMIT_TRIES) return true
  await env.DB.prepare('UPDATE attempts SET count = count + 1 WHERE key = ?').bind(key).run()
  return false
}

async function newSession(env: Env, userId: number): Promise<string> {
  const token = randomHex(32)
  const expires = Date.now() + SESSION_DAYS * 86_400_000
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await tokenHash(token), userId, expires).run()
  return token
}

async function currentUser(env: Env, req: Request): Promise<{ id: number; username: string } | null> {
  const token = bearer(req)
  if (!token) return null
  return env.DB.prepare('SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .bind(await tokenHash(token), Date.now())
    .first<{ id: number; username: string }>()
}

async function register(env: Env, req: Request): Promise<Response> {
  if (await overLimit(env, req)) return fail(req, 429, 'Слишком много попыток. Подожди 10 минут.')
  const c = checkCredentials(await readJson(req, 1000))
  if (!c.ok) return fail(req, 400, c.error)
  const taken = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(c.value.username).first()
  if (taken) return fail(req, 409, 'Это имя уже занято — выбери другое')
  const salt = randomHex(16)
  await env.DB.prepare('INSERT INTO users (username, pass_hash, salt, created_at) VALUES (?, ?, ?, ?)')
    .bind(c.value.username, await hashPassword(c.value.password, salt), salt, Date.now())
    .run()
  const user = await env.DB.prepare('SELECT id, username FROM users WHERE username = ?').bind(c.value.username).first<{ id: number; username: string }>()
  if (!user) return fail(req, 500, 'Не удалось создать аккаунт')
  return ok(req, { token: await newSession(env, user.id), username: user.username })
}

async function login(env: Env, req: Request): Promise<Response> {
  if (await overLimit(env, req)) return fail(req, 429, 'Слишком много попыток. Подожди 10 минут.')
  const c = checkCredentials(await readJson(req, 1000))
  if (!c.ok) return fail(req, 400, 'Неверное имя или пароль')
  const user = await env.DB.prepare('SELECT id, username, pass_hash, salt FROM users WHERE username = ?')
    .bind(c.value.username)
    .first<{ id: number; username: string; pass_hash: string; salt: string }>()
  // Same answer for an unknown name and a wrong password, so names cannot be probed.
  if (!user || !(await verifyPassword(c.value.password, user.salt, user.pass_hash))) return fail(req, 401, 'Неверное имя или пароль')
  return ok(req, { token: await newSession(env, user.id), username: user.username })
}

async function route(env: Env, req: Request, path: string): Promise<Response> {
  if (req.method === 'POST' && path === '/api/register') return register(env, req)
  if (req.method === 'POST' && path === '/api/login') return login(env, req)
  const user = await currentUser(env, req)
  if (!user) return fail(req, 401, 'Нужно войти заново')
  if (req.method === 'GET' && path === '/api/me') return ok(req, { username: user.username })
  if (req.method === 'POST' && path === '/api/logout') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await tokenHash(bearer(req)!)).run()
    return ok(req)
  }
  if (req.method === 'GET' && path === '/api/progress') {
    const row = await env.DB.prepare('SELECT data, updated_at FROM progress WHERE user_id = ?').bind(user.id).first<{ data: string; updated_at: number }>()
    return ok(req, { progress: row ? JSON.parse(row.data) : null, updatedAt: row?.updated_at ?? null })
  }
  if (req.method === 'PUT' && path === '/api/progress') {
    const p = checkProgress(await readJson(req))
    if (!p.ok) return fail(req, 400, p.error)
    const now = Date.now()
    await env.DB.prepare('INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
      .bind(user.id, JSON.stringify(p.value), now)
      .run()
    return ok(req, { updatedAt: now })
  }
  return fail(req, 404, 'Нет такого адреса')
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const path = new URL(req.url).pathname
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(req)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) })
    try {
      return await route(env, req, path)
    } catch (e) {
      if (e instanceof SyntaxError || e instanceof RangeError) return fail(req, 400, 'Неверный запрос')
      console.error('api error', e)
      return fail(req, 500, 'Сервер не справился. Попробуй ещё раз.')
    }
  },
}
