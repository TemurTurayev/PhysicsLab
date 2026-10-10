import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { placeBubble } from './coachPlace'
import { markCoachDone } from './coachStore'

export interface CoachStep {
  target: string // value of a data-coach attribute
  title: string
  text: string
}

/** The ringed panel, or a point mid-screen when it is not on the page (the bubble then just sits in the middle). */
function rectOf(target: string): DOMRect {
  const el = document.querySelector(`[data-coach="${target}"]`)
  const r = el?.getBoundingClientRect()
  return r && r.width > 0 ? r : new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0)
}

/** A three-step tour of the first mission: dim everything, ring one panel, say one thing about it. */
export function CoachMarks({ steps, onDone }: { steps: CoachStep[]; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const step = steps[i]
  const last = i + 1 >= steps.length

  const finish = () => {
    markCoachDone()
    onDone()
  }
  const next = () => (last ? finish() : setI(i + 1))

  useEffect(() => {
    const update = () => setRect(rectOf(step.target))
    const id = requestAnimationFrame(update)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', update)
    }
  }, [step.target])

  // Measure the bubble and put it wherever it fits whole; a step whose panel is missing is skipped.
  useLayoutEffect(() => {
    if (!rect) return
    const b = bubbleRef.current?.getBoundingClientRect()
    if (!b) return
    // Placement needs the bubble's measured size, which exists only after layout.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPos(placeBubble(rect, { width: b.width, height: b.height }, { width: window.innerWidth, height: window.innerHeight }))
    nextRef.current?.focus()
  }, [rect, i])

  // Keys work wherever focus is: Enter / → go on, Esc closes the tour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
        next()
      } else if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  const pad = 6
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Знакомство с лабораторией">
      {rect && rect.width > 0 && (
        <div
          className="absolute rounded-[16px] transition-all duration-300 pointer-events-none"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(5,6,8,0.62), 0 0 0 2px var(--lab-accent)',
          }}
        />
      )}
      <div
        ref={bubbleRef}
        key={i}
        className="lab-panel lab-rise absolute p-4 flex flex-col gap-2"
        style={{ width: 'min(320px, calc(100vw - 24px))', left: pos?.left ?? 12, top: pos?.top ?? 12, visibility: pos ? 'visible' : 'hidden', background: 'var(--lab-panel-solid)' }}
      >
        <div className="lab-label">
          {i + 1} из {steps.length}
        </div>
        <div className="lab-title text-lg">{step.title}</div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--lab-dim)' }}>
          {step.text}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <button ref={nextRef} type="button" className="lab-btn lab-btn-primary" onClick={next}>
            {last ? 'Понятно, стреляю' : 'Дальше'} <span className="lab-kbd">Enter</span>
          </button>
          <button type="button" className="lab-btn" onClick={finish}>
            Пропустить
          </button>
        </div>
      </div>
    </div>
  )
}
