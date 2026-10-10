import { describe, expect, it } from 'vitest'
import { checkValue } from './check'

describe('checkValue', () => {
  it('accepts a correctly rounded answer', () => {
    expect(checkValue(65.3, 65.31)).toBe('ok')
    expect(checkValue(0.4, 0.43)).toBe('ok') // small numbers: absolute slack of ~0.05
  })
  it('calls a slip of a few percent close (g = 10 instead of 9.81, early rounding)', () => {
    expect(checkValue(63.5, 65.3)).toBe('close')
  })
  it('calls a wrong formula wrong, including a wrong sign', () => {
    expect(checkValue(50, 65.3)).toBe('wrong')
    expect(checkValue(-8.2, 8.2)).toBe('wrong')
  })
})
