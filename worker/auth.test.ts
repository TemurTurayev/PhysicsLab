import { describe, expect, it } from 'vitest'
import { hashPassword, randomHex, sameHex, tokenHash, verifyPassword } from './crypto'
import { checkCredentials, checkProgress } from './validate'

describe('credentials', () => {
  it('accepts a normal name (Latin or Cyrillic) and password', () => {
    expect(checkCredentials({ username: ' temur_7 ', password: 'secret1' })).toEqual({ ok: true, value: { username: 'temur_7', password: 'secret1' } })
    expect(checkCredentials({ username: 'Тимур', password: 'secret1' }).ok).toBe(true)
  })
  it('rejects short, odd or missing values', () => {
    expect(checkCredentials({ username: 'ab', password: 'secret1' }).ok).toBe(false)
    expect(checkCredentials({ username: 'a b c', password: 'secret1' }).ok).toBe(false)
    expect(checkCredentials({ username: "x'; drop", password: 'secret1' }).ok).toBe(false)
    expect(checkCredentials({ username: 'temur', password: '123' }).ok).toBe(false)
    expect(checkCredentials(null).ok).toBe(false)
  })
})

describe('progress payload', () => {
  const good = { completed: { '0-1': 3, '1-4': 1 }, incidents: ['short', 'self_hit'], universe: 'sigma' }
  it('accepts real progress', () => {
    expect(checkProgress(good)).toEqual({ ok: true, value: good })
  })
  it('rejects bad stars, ids, incidents and universes', () => {
    expect(checkProgress({ ...good, completed: { '0-1': 4 } }).ok).toBe(false)
    expect(checkProgress({ ...good, completed: { '<script>': 1 } }).ok).toBe(false)
    expect(checkProgress({ ...good, incidents: ['DROP TABLE'] }).ok).toBe(false)
    expect(checkProgress({ ...good, universe: 'mars' }).ok).toBe(false)
    expect(checkProgress({ ...good, completed: [] }).ok).toBe(false)
  })
})

describe('password hashing', () => {
  it('verifies the right password only, with a per-user salt', async () => {
    const salt = randomHex(16)
    const hash = await hashPassword('correct horse', salt)
    expect(await verifyPassword('correct horse', salt, hash)).toBe(true)
    expect(await verifyPassword('correct hors', salt, hash)).toBe(false)
    expect(await hashPassword('correct horse', randomHex(16))).not.toBe(hash)
  })
  it('stores tokens only as hashes', async () => {
    const token = randomHex(32)
    expect(token).toHaveLength(64)
    expect(await tokenHash(token)).not.toBe(token)
    expect(sameHex('abcd', 'abcd')).toBe(true)
    expect(sameHex('abcd', 'abce')).toBe(false)
  })
})
