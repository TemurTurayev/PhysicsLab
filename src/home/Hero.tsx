import type { ProgressSummary } from './progress'

const FRAMES = [1, 3, 2, 4, 5].map((ch) => `/previews/classic-${ch}.webp`)

export interface HeroProps {
  summary: ProgressSummary
  onContinue: () => void
}

/** First screen: what this is in one line, real frames from the scenes behind it, one button to begin. */
export function Hero({ summary, onContinue }: HeroProps) {
  const next = summary.next
  const cta = !summary.started ? 'Начать с первой миссии' : next ? `Продолжить · миссия ${next.chapter}-${next.order}` : 'Открыть карту мастерской'
  return (
    <section className="home-hero md:min-h-[92vh] flex items-end md:items-center">
      <div className="home-hero-frames" aria-hidden="true">
        {FRAMES.map((src, i) => (
          <div key={src} style={{ backgroundImage: `url('${src}')`, animationDelay: `${i * 6 - 1}s` }} />
        ))}
      </div>
      <div className="home-hero-shade" aria-hidden="true" />

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 pt-[38vh] pb-10 md:py-24">
        <div className="max-w-[620px] lab-rise">
          <div className="lab-label mb-4" style={{ color: 'var(--lab-accent)' }}>
            3D-лаборатория физики · Python в браузере
          </div>
          <h1 className="home-display text-[44px] sm:text-6xl md:text-[72px]">
            Рассчитай бросок —<br />
            <span className="home-accent">и попади.</span>
          </h1>
          <svg className="home-arc mt-3 mb-5 w-[220px] h-[34px]" viewBox="0 0 220 34" aria-hidden="true">
            <path d="M4 30 Q 110 -20 216 30" fill="none" stroke="var(--lab-accent)" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p className="text-[17px] md:text-lg leading-relaxed max-w-[540px]" style={{ color: 'var(--lab-text)', opacity: 0.88 }}>
            Настраиваешь требушет, считаешь траекторию по формулам и проверяешь расчёт выстрелом. Промах не страшен: он попадает в журнал
            и объясняет, что пошло не так.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-8">
            <button type="button" onClick={onContinue} className="lab-btn lab-btn-primary !min-h-[52px] !px-6 !text-base !rounded-xl">
              {cta} <span aria-hidden>→</span>
            </button>
            <a href="#workshop" className="lab-btn !min-h-[52px] !px-5 !text-base !rounded-xl">
              Выбрать главу
            </a>
          </div>
          {summary.started && next && (
            <p className="text-sm mt-3" style={{ color: 'var(--lab-dim)' }}>
              Дальше: «{next.title}»
            </p>
          )}

          <dl className="flex flex-wrap gap-x-8 gap-y-3 mt-10 lab-mono text-sm">
            <Stat value={String(summary.total)} label="миссий" />
            <Stat value="5" label="глав" />
            <Stat value="2" label="вселенные" />
            {summary.started && <Stat value={`${summary.stars}/${summary.maxStars}`} label="звёзд" accent />}
          </dl>
        </div>
      </div>
    </section>
  )
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="sr-only">{label}</dt>
      <dd className="text-2xl font-semibold" style={{ color: accent ? 'var(--lab-accent)' : 'var(--lab-text)' }}>
        {value}
      </dd>
      <span aria-hidden style={{ color: 'var(--lab-dim)' }}>
        {label}
      </span>
    </div>
  )
}
