import { describe, expect, it } from 'vitest'
import { setDictionary, t, useLocale } from './index'

describe('t()', () => {
  it('Russian is the key; other languages look it up and fill placeholders', () => {
    setDictionary('en', { 'Глава {0}': 'Chapter {0}', 'упал на {x} м': 'landed at {x} m' })
    useLocale.setState({ locale: 'ru' })
    expect(t('Глава {0}', [2])).toBe('Глава 2')
    useLocale.setState({ locale: 'en' })
    expect(t('Глава {0}', [2])).toBe('Chapter 2')
    expect(t('упал на {x} м', { x: '4.5' })).toBe('landed at 4.5 m')
    expect(t('нет перевода')).toBe('нет перевода')
  })
})
