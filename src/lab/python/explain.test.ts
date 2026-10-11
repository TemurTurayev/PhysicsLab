import { describe, expect, it } from 'vitest'
import { explainError } from './explain'

describe('explainError', () => {
  it('explains the errors a beginner meets first, in Russian, naming the culprit', () => {
    expect(explainError("SyntaxError: expected ':'")).toMatch(/двоеточ/)
    expect(explainError("NameError: name 'G' is not defined")).toMatch(/«G»/)
    expect(explainError('IndentationError: unexpected indent')).toMatch(/отступ/)
    expect(explainError("KeyError: 'vx'")).toMatch(/«vx»/)
    expect(explainError('ZeroDivisionError: division by zero')).toMatch(/нол/)
    expect(explainError("TypeError: unsupported operand type(s) for *: 'NoneType' and 'float'")).toMatch(/None|return/)
  })
  it('stays silent on anything it does not recognise', () => {
    expect(explainError('Код не закончил работу за 3 секунды')).toBeNull()
  })
})
