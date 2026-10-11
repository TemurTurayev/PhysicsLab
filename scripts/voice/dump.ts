// Dump every narrated line for one language: LOCALE=en npx vite-node scripts/voice/dump.ts
// Writes scripts/voice/lines-<locale>.json  { clipId: text }. Clip ids match src/lab/audio/voice.ts.
import { readFileSync, writeFileSync } from 'node:fs'
import { setDictionary, useLocale, type Locale } from '../../src/i18n'

const locale = (process.env.LOCALE ?? 'ru') as Locale
useLocale.setState({ locale })
if (locale !== 'ru') setDictionary(locale, JSON.parse(readFileSync(`src/i18n/${locale}.json`, 'utf8')))

const { NOTICES } = await import('../../src/home/notices')
const { MISSIONS } = await import('../../src/lab/levels')
const { storyFor } = await import('../../src/lab/levels/story')
const { applyCopy, getUniverse } = await import('../../src/lab/universe')
const { narrationText } = await import('../../src/lab/audio/narration')

const lines: Record<string, string> = {}
NOTICES.forEach((n, i) => (lines[`sigma/notice-${i}`] = n))
for (const world of ['classic', 'sigma'] as const) {
  for (const m of MISSIONS) {
    const told = applyCopy(m, getUniverse(world))
    lines[`${world}/${m.id}`] = narrationText(storyFor(m.id, world), told.goal, world)
  }
}
writeFileSync(`scripts/voice/lines-${locale}.json`, JSON.stringify(lines, null, 1) + '\n')
