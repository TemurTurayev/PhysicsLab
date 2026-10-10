import { tr } from '../../i18n'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { chapterLabel } from '../levels'
import type { Mission } from '../levels/types'
import { LanguageSwitch } from '../../i18n/LanguageSwitch'
import { useAudioSettings } from '../audio/engine'
import { useConsole } from '../console/store'
import type { FxQuality } from '../scene/postFx'

/** Where the student is looking: the solution desk (task, data, maths) or the field (the 3D shot). */
export type View = 'desk' | 'field'

const VIEWS: Array<{ id: View; label: string; hint: string }> = [
  { id: 'desk', label: tr('📐 Стол решений'), hint: tr('Задача, данные, формулы и расчёт') },
  { id: 'field', label: tr('🎯 Поле'), hint: tr('Смотреть на выстрел и вращать камеру') },
]

export interface ActBarProps {
  mission: Mission
  view: View
  onView: (v: View) => void
  incidents: number
  onJournal: () => void
  muted: boolean
  onMute: () => void
  retro: boolean
  onRetro: () => void
  quality: FxQuality
  onQuality: (q: FxQuality) => void
}

const QUALITY: Array<[FxQuality, string]> = [
  ['high', tr('Высокое')],
  ['low', tr('Обычное')],
  ['off', tr('Без эффектов')],
]

/** Where am I (chapter · mission · title), which way of looking at it (three steps), and the few global toggles. */
export function ActBar(p: ActBarProps) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const audio = useAudioSettings()
  const openConsole = useConsole((s) => s.toggle)
  // The settings menu closes on Esc and on any press outside it.
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    const onDown = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [menu])
  return (
    <div className="lab-panel relative z-10 flex items-center gap-x-3 gap-y-2 px-2 py-1.5 flex-wrap">
      <Link to="/trebuchet" className="lab-btn !min-h-[38px] !px-3" aria-label={tr("К карте мира")} title={tr("К карте мира")}>
        ←
      </Link>
      <div className="min-w-0 flex-1 basis-0">
        <div className="lab-label">
          {chapterLabel(p.mission.chapter)} · {p.mission.subject ? tr(`{0} · шаг`, [p.mission.subject]) : tr('миссия')} {p.mission.order}
        </div>
        <div className="lab-title text-[17px] md:text-lg leading-tight truncate">{p.mission.title}</div>
      </div>

      <div role="tablist" aria-label={tr("Режим")} className="order-last w-full md:order-none md:w-auto flex items-center gap-1" data-coach="view">
        {VIEWS.map((v) => {
          const active = p.view === v.id
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={v.hint}
              onClick={() => p.onView(v.id)}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 min-h-[36px] rounded-[9px] text-sm font-semibold transition-colors"
              style={active ? { background: 'var(--lab-accent)', color: '#1a1206' } : { background: 'var(--lab-raise)', color: 'var(--lab-text)' }}
            >
              {v.label}
            </button>
          )
        })}
      </div>

      <button type="button" className="lab-btn !min-h-[38px] !px-3" onClick={p.onJournal} title={tr("Журнал провалов: всё, что уже случалось")}>
        📓 <span className="lab-mono">{p.incidents}</span>
      </button>
      <div className="relative" ref={menuRef}>
        <button type="button" className="lab-btn !min-h-[38px] !px-3" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label={tr("Настройки")} title={tr("Настройки")}>
          ⚙
        </button>
        {menu && (
          <div className="lab-panel lab-rise absolute right-0 top-[46px] z-30 p-2 flex flex-col gap-1 w-[260px] max-h-[calc(100dvh-70px)] overflow-y-auto" role="menu">
            <button type="button" role="menuitemcheckbox" aria-checked={!p.muted} className="lab-btn justify-between w-full" onClick={p.onMute}>
              
              {tr("Звук") + ' '}<span>{p.muted ? tr('🔇 выкл') : tr('🔊 вкл')}</span>
            </button>
            <button type="button" role="menuitemcheckbox" aria-checked={audio.music} className="lab-btn justify-between w-full" onClick={() => audio.setMusic(!audio.music)}>
              
              {tr("Музыка") + ' '}<span>{audio.music ? tr('♪ вкл') : tr('выкл')}</span>
            </button>
            {audio.music && (
              <label className="flex items-center gap-2 px-1 text-xs" style={{ color: 'var(--lab-dim)' }}>
                
                {tr("Громкость")}
                <input type="range" className="lab-range" min={0} max={1} step={0.05} value={audio.musicVolume} onChange={(e) => audio.setMusicVolume(Number(e.target.value))} aria-label={tr("Громкость музыки")} />
              </label>
            )}
            <button type="button" role="menuitemcheckbox" aria-checked={audio.uiSounds} className="lab-btn justify-between w-full" onClick={() => audio.setUiSounds(!audio.uiSounds)}>
              
              {tr("Звуки кнопок") + ' '}<span>{audio.uiSounds ? tr('вкл') : tr('выкл')}</span>
            </button>
            <button type="button" role="menuitemcheckbox" aria-checked={p.retro} className="lab-btn justify-between w-full" onClick={p.onRetro}>
              
              {tr("Ретро-экран") + ' '}<span className="lab-mono text-xs">{p.retro ? tr('вкл') : tr('выкл')}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="lab-btn justify-between w-full"
              onClick={() => {
                setMenu(false)
                openConsole(true)
              }}
            >
              
              {tr("Консоль") + ' '}<span className="lab-kbd">~</span>
            </button>
            <div className="lab-label px-1 pt-2">{tr("Language · Язык · Til")}</div>
            <LanguageSwitch className="self-start" />
            <div className="lab-label px-1 pt-2">{tr("Графика")}</div>
            <div className="grid grid-cols-3 gap-1">
              {QUALITY.map(([q, label]) => (
                <button
                  key={q}
                  type="button"
                  role="menuitemradio"
                  aria-checked={p.quality === q}
                  className={`lab-btn !min-h-[32px] !px-1 text-[11px] ${p.quality === q ? 'lab-btn-primary' : ''}`}
                  onClick={() => p.onQuality(q)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
