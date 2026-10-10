import { describe, expect, it } from 'vitest'
import en from './en.json'
import keys from './keys.json'
import uz from './uz.json'

const DICTS: Record<string, Record<string, string>> = { en, uz }
const placeholders = (s: string) => (s.replace(/\\text\{[^}]*\}/g, '').match(/\{\w+\}/g) ?? []).sort()
const latex = (s: string) => (s.match(/\\[a-zA-Z]+/g) ?? []).filter((c) => c !== '\\text').sort()
const isCode = (s: string) => /^\s*(def |import |[A-Z_]+ = )/m.test(s) && s.includes('\n')
/** Python with comments and docstrings removed: what the translation must leave untouched. */
const codeOnly = (s: string) =>
  s
    .replace(/"""[\s\S]*?"""/g, '""""""')
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trimEnd())
    .filter((l) => l.trim() !== '')
    .join('\n')

describe.each(Object.keys(DICTS))('%s dictionary', (lang) => {
  const dict = DICTS[lang]
  it('translates every key in the source', () => {
    const missing = keys.filter((k) => typeof dict[k] !== 'string' || dict[k].trim() === '')
    expect(missing).toEqual([])
  })
  it('keeps placeholders and formula commands', () => {
    for (const k of keys) {
      if (!dict[k]) continue
      expect(placeholders(dict[k]), k).toEqual(placeholders(k))
      expect(latex(dict[k]), k).toEqual(latex(k))
    }
  })
  it('changes only comments and docstrings in Python starters', () => {
    for (const k of keys.filter(isCode)) if (dict[k]) expect(codeOnly(dict[k]), k.slice(0, 40)).toBe(codeOnly(k))
  })
  it('borrows no names from Valve games', () => {
    const all = Object.values(dict).join('\n')
    expect(all).not.toMatch(/half[- ]?life|black\s*mesa|aperture|\bhev\b|combine|freeman|valve/i)
  })
})
