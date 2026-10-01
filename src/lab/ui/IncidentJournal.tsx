import { useEffect, type JSX } from 'react'
import type { FailureId } from '../failures/types'
import { tellFailure } from '../universe/failureCopy'
import { useUniverse } from '../universe/useUniverse'
import { FAILURES } from '../failures/catalog'

export interface IncidentJournalProps {
  found: FailureId[]
  onClose: () => void
}

const ALL_FAILURE_IDS = Object.keys(FAILURES) as FailureId[]

export function IncidentJournal({ found, onClose }: IncidentJournalProps): JSX.Element {
  const universe = useUniverse()
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const foundSet = new Set(found)
  const total = ALL_FAILURE_IDS.length
  const discoveredCount = ALL_FAILURE_IDS.filter((id) => foundSet.has(id)).length
  const progressPercent = total > 0 ? (discoveredCount / total) * 100 : 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="journal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="lab-panel w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 md:p-5 flex flex-col gap-3 border-b border-[var(--lab-line)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 id="journal-title" className="text-lg md:text-xl font-bold truncate" style={{ color: 'var(--lab-text)' }}>
                {universe.terms.journal}
              </h2>
              <p className="text-xs md:text-sm mt-0.5 leading-snug" style={{ color: 'var(--lab-dim)' }}>
                Найдено{' '}
                <span className="lab-mono font-semibold" style={{ color: 'var(--lab-accent)' }}>
                  {discoveredCount}
                </span>{' '}
                из <span className="lab-mono font-semibold">{total}</span>. Ошибки здесь — находки, а не штрафы.
              </p>
            </div>
            <button
              type="button"
              className="lab-btn !min-h-[36px] !px-3 shrink-0"
              onClick={onClose}
              aria-label="Закрыть журнал"
            >
              ✕
            </button>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255, 255, 255, 0.08)' }}
            role="progressbar"
            aria-valuenow={discoveredCount}
            aria-valuemin={0}
            aria-valuemax={total}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%`, background: 'var(--lab-accent)' }}
            />
          </div>
        </div>

        <div className="p-4 md:p-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_FAILURE_IDS.map((id) => {
              const entry = tellFailure(id, universe)
              const isFound = foundSet.has(id)

              if (isFound) {
                return (
                  <div
                    key={id}
                    className="rounded-[10px] p-3 flex flex-col gap-1.5 border border-[var(--lab-line)]"
                    style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg shrink-0" aria-hidden="true">
                        {entry.icon}
                      </span>
                      <h3 className="font-semibold text-sm leading-tight" style={{ color: 'var(--lab-text)' }}>
                        {entry.title}
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--lab-dim)' }}>
                      {entry.why}
                    </p>
                  </div>
                )
              }

              return (
                <div
                  key={id}
                  className="rounded-[10px] p-3 flex flex-col gap-1.5 border border-dashed border-white/10 opacity-50 select-none"
                  style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="lab-mono font-bold text-sm shrink-0 w-6 text-center"
                      style={{ color: 'var(--lab-dim)' }}
                      aria-hidden="true"
                    >
                      ???
                    </span>
                    <h3 className="font-semibold text-sm leading-tight" style={{ color: 'var(--lab-dim)' }}>
                      ???
                    </h3>
                  </div>
                  <p className="text-xs italic leading-relaxed" style={{ color: 'var(--lab-dim)' }}>
                    Ещё не случалось
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
