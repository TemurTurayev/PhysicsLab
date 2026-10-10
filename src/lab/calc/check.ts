export type Verdict = 'ok' | 'close' | 'wrong'

/** Grades a hand-computed number against the true one: rounding passes, a small slip is "close". */
export function checkValue(entered: number, truth: number): Verdict {
  const err = Math.abs(entered - truth)
  const scale = Math.abs(truth)
  if (err <= Math.max(0.05, 0.015 * scale)) return 'ok'
  if (Math.sign(entered) === Math.sign(truth) && err <= 0.06 * scale) return 'close'
  return 'wrong'
}
