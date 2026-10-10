import { useState } from 'react'

export interface NumberFieldProps {
  value: number | null
  min: number
  max: number
  step: number
  unit: string
  label: string
  onCommit: (v: number) => void
}

const show = (v: number | null) => (v === null ? '' : String(v).replace('.', ','))

/**
 * Exact entry next to a slider: the student computed 58,4 m and wants 58,4, not "about there".
 * Accepts a comma or a dot; commits on Enter or blur, clamped to the slider's range and step.
 */
export function NumberField({ value, min, max, step, unit, label, onCommit }: NumberFieldProps) {
  // null = not editing: the field mirrors the slider; a string = what the student is typing
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    const raw = (draft ?? '').replace(',', '.').trim()
    const v = Number(raw)
    setDraft(null)
    if (draft === null || raw === '' || !Number.isFinite(v)) return
    const snapped = Math.round((Math.min(max, Math.max(min, v)) - min) / step) * step + min
    onCommit(Number(snapped.toFixed(4)))
  }
  return (
    <span className="flex items-baseline gap-1">
      <input
        className="lab-num lab-mono text-lg text-right w-[5.5ch] min-h-[36px] bg-transparent rounded-md px-1"
        style={{ color: 'var(--lab-accent)', border: '1px solid var(--lab-line)' }}
        inputMode="decimal"
        aria-label={label}
        placeholder="—"
        value={draft ?? show(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
      />
      <span className="lab-mono text-sm" style={{ color: 'var(--lab-accent)' }}>
        {unit}
      </span>
    </span>
  )
}
