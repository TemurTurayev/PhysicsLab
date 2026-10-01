import type { JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { CHAPTERS, isUnlocked } from '../levels'
import type { EnvironmentId, MissionKind } from '../levels/types'
import { useLabProgress } from '../state/labProgress'
import { FAILURES } from '../failures/catalog'
import './lab.css'

const KIND_LABELS: Record<MissionKind, string> = {
  tune: 'Настрой',
  predict: 'Предскажи',
  write: 'Напиши код',
  fix: 'Почини',
  challenge: 'Испытание',
}

const CHAPTER_THEMES: Record<EnvironmentId, { gradient: string; border: string }> = {
  workshop: {
    gradient:
      'linear-gradient(rgba(14, 17, 23, 0.84), rgba(14, 17, 23, 0.92)), linear-gradient(135deg, #f6dcae 0%, #c98a3d 100%)',
    border: 'rgba(201, 138, 61, 0.35)',
  },
  range: {
    gradient:
      'linear-gradient(rgba(14, 17, 23, 0.84), rgba(14, 17, 23, 0.92)), linear-gradient(135deg, #5fa8e6 0%, #6f9a45 100%)',
    border: 'rgba(95, 168, 230, 0.35)',
  },
}

export function WorldMap(): JSX.Element {
  const navigate = useNavigate()
  const completed = useLabProgress((s) => s.completed)
  const incidents = useLabProgress((s) => s.incidents)
  const totalFailures = Object.keys(FAILURES).length

  const allMissions = CHAPTERS.flatMap((c) => c.missions)
  const nextMission = allMissions.find((m) => isUnlocked(m, completed) && (completed[m.id] ?? 0) === 0)

  return (
    <div className="lab-root min-h-screen px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex flex-col gap-4 border-b border-[var(--lab-line)] pb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="lab-btn text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lab-accent)] focus-visible:outline-offset-2"
            >
              ← Главная
            </button>
            <div className="lab-mono text-xs px-3 py-1.5 rounded-full border border-[var(--lab-line)] bg-white/5 text-[var(--lab-dim)]">
              Журнал инцидентов:{' '}
              <span className="text-[var(--lab-accent)] font-semibold">{incidents.length}</span> / {totalFailures}
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--lab-text)]">
              Мир 1 · Требушет
            </h1>
            <p className="text-sm text-[var(--lab-dim)] mt-1.5 max-w-2xl leading-relaxed">
              Физика броска: от момента отпуска до параболы и собственного движка на Python.
            </p>
          </div>
        </header>

        <main className="space-y-12">
          {CHAPTERS.map((chapter) => {
            const theme = CHAPTER_THEMES[chapter.env] ?? CHAPTER_THEMES.workshop
            return (
              <section key={chapter.id} aria-labelledby={`chapter-${chapter.id}`}>
                <div
                  className="rounded-xl p-5 sm:p-6 mb-6 border"
                  style={{ background: theme.gradient, borderColor: theme.border }}
                >
                  <div className="lab-label">Глава {chapter.id}</div>
                  <h2 id={`chapter-${chapter.id}`} className="text-xl sm:text-2xl font-bold text-[var(--lab-text)] mt-1">
                    {chapter.title}
                  </h2>
                  <p className="text-sm text-[var(--lab-dim)] mt-1 max-w-2xl leading-relaxed">
                    {chapter.tagline}
                  </p>
                </div>

                <div className="relative flex flex-col lg:flex-row items-stretch gap-4 pb-2">
                  <div
                    aria-hidden="true"
                    className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 bg-[var(--lab-line)] -translate-y-1/2 pointer-events-none"
                  />
                  <div
                    aria-hidden="true"
                    className="lg:hidden absolute top-8 bottom-8 left-8 w-0.5 bg-[var(--lab-line)] pointer-events-none"
                  />

                  {chapter.missions.map((mission) => {
                    const unlocked = isUnlocked(mission, completed)
                    const isNext = mission.id === nextMission?.id
                    const stars = completed[mission.id] ?? 0

                    return (
                      <button
                        key={mission.id}
                        type="button"
                        onClick={() => navigate(`/trebuchet/${mission.id}`)}
                        disabled={!unlocked}
                        title={!unlocked ? 'Сначала пройди предыдущую миссию' : undefined}
                        aria-label={
                          !unlocked
                            ? `${mission.title} — Сначала пройди предыдущую миссию`
                            : `${mission.title}, ${KIND_LABELS[mission.kind]}, ${stars} из 3 звёзд`
                        }
                        className={`lab-panel relative z-10 flex-1 flex flex-col justify-between p-4 sm:p-5 text-left rounded-[var(--lab-radius)] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lab-accent)] focus-visible:outline-offset-2 ${
                          !unlocked
                            ? 'opacity-45 cursor-not-allowed border-[var(--lab-line)]'
                            : isNext
                              ? 'ring-2 ring-[var(--lab-accent)] shadow-[0_0_18px_rgba(240,166,64,0.35)] animate-pulse motion-reduce:animate-none border-[var(--lab-accent)]'
                              : 'hover:border-white/20 hover:bg-white/[0.07] cursor-pointer'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="lab-mono text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-[var(--lab-dim)]">
                                {mission.order}
                              </span>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-white/10 bg-white/5 text-[var(--lab-dim)]">
                                {KIND_LABELS[mission.kind]}
                              </span>
                            </div>

                            {!unlocked ? (
                              <svg
                                className="w-4 h-4 text-[var(--lab-dim)] shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            ) : isNext ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--lab-accent)] text-[#1a1206] uppercase tracking-wider shrink-0">
                                Дальше
                              </span>
                            ) : null}
                          </div>

                          <h3 className="text-base font-semibold text-[var(--lab-text)] mt-3">
                            {mission.title}
                          </h3>
                          <p className="text-xs text-[var(--lab-dim)] mt-1.5 line-clamp-2 leading-relaxed">
                            {mission.goal}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-[var(--lab-line)]">
                          {[1, 2, 3].map((starIndex) => (
                            <svg
                              key={starIndex}
                              className={`w-3.5 h-3.5 ${
                                starIndex <= stars ? 'text-[var(--lab-accent)]' : 'text-white/15'
                              }`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </main>
      </div>
    </div>
  )
}
