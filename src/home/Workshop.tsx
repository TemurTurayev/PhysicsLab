import { CHAPTERS } from '../lab/levels'
import { UNIVERSE_META as UNIVERSES } from '../lab/universe/meta'
import type { UniverseId } from '../lab/universe/types'
import type { ProgressSummary } from './progress'

const MOOD: Record<UniverseId, string> = {
  classic: 'Дерево · верёвка · камень',
  sigma: 'Бетон · сталь · протоколы',
}

export interface WorkshopProps {
  universe: UniverseId
  onUniverse: (id: UniverseId) => void
  summary: ProgressSummary
  onOpen: () => void
}

/** The workshop: pick the world the physics is told in, then a chapter. Progress is shared by both worlds. */
export function Workshop({ universe, onUniverse, summary, onOpen }: WorkshopProps) {
  const u = UNIVERSES.find((x) => x.id === universe) ?? UNIVERSES[0]
  return (
    <section id="workshop" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 md:py-24 scroll-mt-16">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="lab-label mb-2">Мастерская</div>
          <h2 className="home-display text-4xl md:text-5xl">Требушет</h2>
          <p className="mt-3 max-w-xl leading-relaxed" style={{ color: 'var(--lab-dim)' }}>
            Пять глав: от первого выстрела во дворе до полёта без воздуха на Луне. Задачи и прогресс общие — вселенная меняет только
            атмосферу.
          </p>
        </div>
        <button type="button" onClick={onOpen} className="lab-btn self-start md:self-auto">
          Карта всех миссий →
        </button>
      </div>

      <div role="radiogroup" aria-label="Вселенная" className="grid grid-cols-2 gap-3 mb-6">
        {UNIVERSES.map((x) => {
          const on = x.id === universe
          return (
            <button
              key={x.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onUniverse(x.id)}
              className="text-left rounded-xl border-2 p-2 flex items-center gap-3 transition-colors"
              style={{ borderColor: on ? 'var(--lab-accent)' : 'var(--lab-line)', background: on ? 'var(--lab-accent-soft)' : 'var(--lab-raise)' }}
            >
              <img src={`/previews/${x.id}-1.webp`} alt="" className="w-16 h-11 sm:w-24 sm:h-14 rounded-lg object-cover shrink-0" loading="lazy" />
              <span className="min-w-0">
                <span className="block font-semibold text-[15px] sm:text-base">{x.name}</span>
                <span className="block text-xs truncate" style={{ color: 'var(--lab-dim)' }}>
                  {MOOD[x.id]}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-sm mb-8 max-w-3xl" style={{ color: 'var(--lab-dim)' }}>
        {u.tagline}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHAPTERS.map((c, i) => {
          const p = summary.chapters[i]
          return (
            <button
              key={c.id}
              type="button"
              onClick={onOpen}
              className="home-card lab-panel !rounded-2xl overflow-hidden text-left flex flex-col"
            >
              <div className="relative overflow-hidden aspect-[16/9]">
                <img src={`/previews/${universe}-${c.id}.webp`} alt="" loading="lazy" className="home-shot absolute inset-0 w-full h-full object-cover" />
                <span className="absolute left-3 top-3 lab-mono text-xs px-2 py-1 rounded-md" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                  Глава {c.id}
                </span>
                {p.done === p.total && (
                  <span className="absolute right-3 top-3 text-xs font-semibold px-2 py-1 rounded-md" style={{ background: 'var(--lab-accent)', color: '#1a1206' }}>
                    Пройдена
                  </span>
                )}
              </div>
              <div className="p-4 sm:p-5 flex flex-col gap-2 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="lab-title text-xl">{u.chapterTitles[c.id] ?? c.title}</h3>
                  <span className="lab-mono text-xs shrink-0" style={{ color: p.stars ? 'var(--lab-accent)' : 'var(--lab-dim)' }}>
                    ★ {p.stars}/{p.total * 3}
                  </span>
                </div>
                <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--lab-dim)' }}>
                  {u.chapterTaglines[c.id] ?? c.tagline}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="home-bar flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.done} aria-label={`Глава ${c.id}: пройдено ${p.done} из ${p.total}`}>
                    <span style={{ width: `${(p.done / p.total) * 100}%` }} />
                  </div>
                  <span className="lab-mono text-xs" style={{ color: 'var(--lab-dim)' }}>
                    {p.open ? `${p.done}/${p.total}` : `после гл. ${c.id - 1}`}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
        <HowItWorks />
      </div>
    </section>
  )
}

/** The sixth tile closes the grid: what a mission asks of you. */
function HowItWorks() {
  const steps: Array<[string, string]> = [
    ['Увидь', 'Стреляй и смотри, куда летит камень.'],
    ['Пойми', 'Векторы, формулы и данные пуска прямо на сцене.'],
    ['Собери', 'Напиши свой движок полёта на Python.'],
  ]
  return (
    <div className="lab-panel !rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--lab-panel-solid)' }}>
      <div className="lab-label">Как устроена миссия</div>
      <ol className="flex flex-col gap-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="lab-mono text-sm w-7 h-7 rounded-full grid place-items-center shrink-0" style={{ background: 'var(--lab-accent-soft)', color: 'var(--lab-accent)' }}>
              {i + 1}
            </span>
            <span>
              <span className="font-semibold">{t}</span>
              <span className="block text-sm" style={{ color: 'var(--lab-dim)' }}>
                {d}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className="text-sm mt-auto pt-3 border-t" style={{ borderColor: 'var(--lab-line)', color: 'var(--lab-dim)' }}>
        <span aria-hidden>❤️❤️❤️</span> Три жизни на миссию: считай, а не угадывай. Каждый провал — запись в журнале.
      </p>
    </div>
  )
}
