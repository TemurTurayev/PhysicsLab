import { describe, expect, it } from 'vitest'
import { parseErrorLine, parseErrorMessage } from './harness'

const tb = `Traceback (most recent call last):
  File "/lib/python313.zip/_pyodide/_base.py", line 597, in eval_code_async
  File "<exec>", line 12, in <module>
  File "<exec>", line 4, in step
ZeroDivisionError: division by zero`

describe('traceback parsing', () => {
  it('finds the innermost line of student code', () => {
    expect(parseErrorLine(tb)).toBe(4)
  })
  it('returns null when the error is outside student code', () => {
    expect(parseErrorLine('Traceback\n  File "x.py", line 3\nOops')).toBeNull()
  })
  it('keeps only the final message', () => {
    expect(parseErrorMessage(tb)).toBe('ZeroDivisionError: division by zero')
  })
})
