import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { NOTICES } from '../../home/notices'
import { MISSIONS } from '../levels'
import { storyFor } from '../levels/story'
import { applyCopy, getUniverse } from '../universe'
import { narrationText } from './narration'

const WORLDS = ['classic', 'sigma'] as const
const clips = [...NOTICES.map((_, i) => `sigma/notice-${i}`), ...WORLDS.flatMap((w) => MISSIONS.map((m) => `${w}/${m.id}`))]

describe('narration clips', () => {
  it.each(['ru', 'en', 'uz'])('every line has a rendered clip in %s', (lang) => {
    const missing = clips.filter((c) => !existsSync(`public/voice/${lang}/${c}.mp3`))
    expect(missing).toEqual([])
  })

  it('the rendered Russian lines match the current texts (re-run scripts/voice after editing a story)', () => {
    const lines = JSON.parse(readFileSync('scripts/voice/lines-ru.json', 'utf8')) as Record<string, string>
    NOTICES.forEach((n, i) => expect(lines[`sigma/notice-${i}`]).toBe(n))
    for (const w of WORLDS) {
      for (const m of MISSIONS) {
        expect(lines[`${w}/${m.id}`]).toBe(narrationText(storyFor(m.id, w), applyCopy(m, getUniverse(w)).goal, w))
      }
    }
  })

  it('reads the story, then the goal with its label', () => {
    expect(narrationText('История.', 'Попади.', 'sigma')).toBe('История. Задание: Попади.')
    expect(narrationText(null, 'Попади.', 'classic')).toBe('Цель: Попади.')
  })
})
