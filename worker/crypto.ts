/** Password hashing (PBKDF2-SHA256) and session tokens, with Web Crypto only. */

const ITERATIONS = 100_000 // the Workers runtime caps PBKDF2 at 100 000
const enc = new TextEncoder()

const toHex = (buf: ArrayBuffer | Uint8Array) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex: string) => new Uint8Array((hex.match(/../g) ?? []).map((h) => parseInt(h, 16)))

export function randomHex(bytes: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)))
}

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: ITERATIONS }, key, 256)
  return toHex(bits)
}

/** Constant-time comparison so a wrong password takes as long whatever its first wrong character. */
export function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyPassword(password: string, saltHex: string, expectedHex: string): Promise<boolean> {
  return sameHex(await hashPassword(password, saltHex), expectedHex)
}

/** Sessions are stored by the hash of their token, so a leaked table cannot be used to log in. */
export async function tokenHash(token: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(token)))
}
