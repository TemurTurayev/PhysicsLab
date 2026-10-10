import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Three languages. The Russian text in the source is the key (gettext style): `tr('Огонь')`.
 * Translations live in en.json / uz.json, generated from the extracted Russian strings.
 * Placeholders: `tr('Глава {0}', [n])` or `tr('упал на {x} м', { x })`.
 */
export type Locale = 'en' | 'ru' | 'uz'
export const LOCALES: Array<{ id: Locale; label: string; name: string }> = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'ru', label: 'RU', name: 'Русский' },
  { id: 'uz', label: 'UZ', name: "O'zbekcha" },
]

interface LocaleState {
  locale: Locale
  setLocale: (l: Locale) => void
}

export const useLocale = create<LocaleState>()(
  persist((set) => ({ locale: 'en', setLocale: (locale) => set({ locale }) }), { name: 'physicslab-locale' }),
)

type Dict = Record<string, string>
const dicts: Partial<Record<Locale, Dict>> = { ru: {} }

/** Load the dictionary for a language (lazily, one JSON chunk per language). */
export async function loadLocale(l: Locale): Promise<void> {
  if (dicts[l]) return
  dicts[l] = l === 'en' ? (await import('./en.json')).default : (await import('./uz.json')).default
}

export function setDictionary(l: Locale, d: Dict): void {
  dicts[l] = d
}

function fill(s: string, vars?: ReadonlyArray<unknown> | Record<string, unknown>): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = Array.isArray(vars) ? vars[Number(k)] : (vars as Record<string, unknown>)[k]
    return v === undefined ? m : String(v)
  })
}

/** Translate a Russian source string into the current language; unknown strings stay Russian. */
export function tr(ru: string, vars?: ReadonlyArray<unknown> | Record<string, unknown>): string {
  const l = useLocale.getState().locale
  const hit = l === 'ru' ? ru : (dicts[l]?.[ru] ?? ru)
  return fill(hit, vars)
}

/** BCP-47 tag for number formatting (decimal comma in ru/uz, point in en). */
export function localeTag(): string {
  const l = useLocale.getState().locale
  return l === 'en' ? 'en-US' : l === 'uz' ? 'uz-UZ' : 'ru-RU'
}

export function fmt(v: number, digits = 1, min = digits): string {
  return v.toLocaleString(localeTag(), { minimumFractionDigits: min, maximumFractionDigits: digits })
}

/** Short alias for tests and docs. */
export const t = tr
