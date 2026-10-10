import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { LOCALES, tr, useLocale } from '../i18n'
import { useAccount } from '../lab/account/account'
import { AuthDialog } from '../lab/account/AuthDialog'
import { useAudioSettings } from '../lab/audio/engine'
import { SOUNDFONT_CREDIT } from '../lab/audio/samples'
import { useConsole } from '../lab/console/store'
import { useLabProgress } from '../lab/state/labProgress'
import { applyCopy, getUniverse } from '../lab/universe'
import { Portrait } from './Portrait'
import type { ProgressSummary } from './progress'
import './sigmaHome.css'

const FRAMES = [1, 3, 4, 2, 5]

type Dialog = 'options' | 'account' | null

/**
 * The complex's main menu, in the manner of an early-2000s PC shooter: a slow cinematic backdrop,
 * the game title, a column of plain text items bottom-left, and windowed option dialogs.
 */
export function SigmaHome({ summary }: { summary: ProgressSummary }) {
  const navigate = useNavigate()
  const setUniverse = useLabProgress((s) => s.setUniverse)
  const openConsole = useConsole((s) => s.toggle)
  const username = useAccount((s) => s.username)
  const [dialog, setDialog] = useState<Dialog>(null)
  const next = summary.next ? applyCopy(summary.next, getUniverse('sigma')) : null

  const items: Array<{ label: string; run: () => void; hot?: boolean }> = [
    next
      ? { label: summary.started ? tr('Продолжить испытание') : tr('Новое испытание'), run: () => navigate(`/trebuchet/${next.id}`), hot: true }
      : { label: tr('Все испытания пройдены'), run: () => navigate('/trebuchet') },
    { label: tr('Выбор испытания'), run: () => navigate('/trebuchet') },
    { label: tr('Настройки'), run: () => setDialog('options') },
    { label: username ? tr('Профиль: {0}', [username]) : tr('Войти в профиль'), run: () => setDialog('account') },
    { label: tr('Консоль'), run: () => openConsole(true) },
    { label: tr('Сменить мир: Классика'), run: () => setUniverse('classic') },
  ]

  return (
    <div className="lab-root cs-home" data-universe="sigma">
      <div className="cs-backdrop" aria-hidden>
        {FRAMES.map((ch, i) => (
          <div key={ch} style={{ ['--sm' as string]: `url('/previews/sigma-${ch}.webp')`, ['--lg' as string]: `url('/previews/hero-sigma-${ch}.webp')`, animationDelay: `${i * 7 - 1}s` }} />
        ))}
      </div>
      <div className="cs-shade" aria-hidden />

      <div className="cs-logo">
        <div className="cs-logo-title">PHYSICSLAB</div>
        <div className="cs-logo-sub">{tr('НИИ «СИГМА-7» · ОТДЕЛ ПРИКЛАДНОЙ МЕХАНИКИ')}</div>
      </div>

      <div className="cs-hero" aria-hidden>
        <Portrait world="sigma" />
      </div>

      <nav className="cs-menu" aria-label={tr('Главное меню')}>
        {next && (
          <div className="cs-next">
            {tr('Следующее испытание')}: <b>{next.id}</b> · {next.title}
          </div>
        )}
        {items.map((it) => (
          <button key={it.label} type="button" className={`cs-item ${it.hot ? 'cs-item-hot' : ''}`} onClick={it.run}>
            {it.label}
          </button>
        ))}
      </nav>

      <div className="cs-footer">
        {tr('Протокол {0} · допуск {1}/{2} ★', ['2026.10', summary.stars, summary.maxStars])}
        <div className="cs-credit">{SOUNDFONT_CREDIT}</div>
      </div>

      {dialog === 'options' && <OptionsDialog onClose={() => setDialog(null)} />}
      {dialog === 'account' && <AuthDialog onClose={() => setDialog(null)} />}
    </div>
  )
}

/** A bevelled options window: language, music, interface sounds. */
function OptionsDialog({ onClose }: { onClose: () => void }) {
  const { locale, setLocale } = useLocale()
  const audio = useAudioSettings()
  return createPortal(
    <div className="cs-modal" role="dialog" aria-modal="true" aria-label={tr('Настройки')} onClick={onClose}>
      <div className="cs-window" onClick={(e) => e.stopPropagation()}>
        <div className="cs-window-title">
          <span>{tr('Настройки')}</span>
          <button type="button" className="cs-btn cs-x" onClick={onClose} aria-label={tr('Закрыть')}>
            ✕
          </button>
        </div>
        <div className="cs-window-body">
          <fieldset className="cs-group">
            <legend>{tr('Язык')} · Language · Til</legend>
            {LOCALES.map((l) => (
              <label key={l.id} className="cs-radio">
                <input type="radio" name="lang" checked={locale === l.id} onChange={() => setLocale(l.id)} /> {l.name}
              </label>
            ))}
          </fieldset>
          <fieldset className="cs-group">
            <legend>{tr('Звук')}</legend>
            <label className="cs-radio">
              <input type="checkbox" checked={audio.music} onChange={(e) => audio.setMusic(e.target.checked)} /> {tr('Музыка')}
            </label>
            <label className="cs-radio cs-slider">
              {tr('Громкость')}
              <input type="range" min={0} max={1} step={0.05} value={audio.musicVolume} onChange={(e) => audio.setMusicVolume(Number(e.target.value))} />
            </label>
            <label className="cs-radio">
              <input type="checkbox" checked={audio.uiSounds} onChange={(e) => audio.setUiSounds(e.target.checked)} /> {tr('Звуки кнопок')}
            </label>
          </fieldset>
        </div>
        <div className="cs-window-buttons">
          <button type="button" className="cs-btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
