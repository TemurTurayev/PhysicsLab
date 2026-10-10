import { useState } from 'react'
import { tr } from '../../i18n'

/** Hints one at a time: the first at once, each next one after another attempt — try first, then get help. */
export function HintLadder({ hints, shots }: { hints: string[]; shots: number }) {
  const [open, setOpen] = useState(0)
  const unlocked = Math.min(hints.length, 1 + shots)
  return (
    <div className="flex flex-col gap-2" data-coach="hint">
      <div className="flex items-center gap-2 flex-wrap">
        {open < unlocked ? (
          <button type="button" className="lab-btn !min-h-[34px] !px-3 text-sm" onClick={() => setOpen(open + 1)}>
            💡 {tr('Подсказка {0}/{1}', [open + 1, hints.length])}
          </button>
        ) : (
          open < hints.length && (
            <span className="text-xs" style={{ color: 'var(--lab-dim)' }}>
              💡 {tr('следующая подсказка — после выстрела')}
            </span>
          )
        )}
      </div>
      {open > 0 && (
        <ol className="flex flex-col gap-1.5">
          {hints.slice(0, open).map((h, i) => (
            <li key={i} className="lab-rise text-[13px] leading-relaxed rounded-lg px-2.5 py-2 flex gap-2" style={{ background: 'var(--lab-accent-soft)' }}>
              <span className="lab-mono text-[11px] mt-0.5 shrink-0" style={{ color: 'var(--lab-accent)' }}>
                {i + 1}
              </span>
              <span>{h}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
