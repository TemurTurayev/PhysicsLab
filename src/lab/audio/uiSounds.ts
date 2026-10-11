import { getBus, useAudioSettings } from './engine'
import { noiseHit, pluck } from './instruments'
import type { Theme } from './music'

export type UiSound = 'click' | 'hover' | 'open' | 'error'

/** Interface sounds per world: a wooden tap and koto chime in Classic, terse menu blips in the complex. */
export function playUi(kind: UiSound, theme: Theme): void {
  if (!useAudioSettings.getState().uiSounds) return
  const bus = getBus()
  if (!bus || bus.ctx.state !== 'running') return
  const { ctx, ui } = bus
  const t = ctx.currentTime + 0.005
  if (theme === 'sigma') {
    const blip = (f0: number, f1: number, len: number, vel: number, type: OscillatorType = 'square') => {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.setValueAtTime(f0, t)
      o.frequency.exponentialRampToValueAtTime(f1, t + len)
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1600
      const g = ctx.createGain()
      g.gain.setValueAtTime(vel, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + len)
      o.connect(bp).connect(g).connect(ui)
      o.start(t)
      o.stop(t + len + 0.01)
    }
    if (kind === 'hover') blip(2600, 2400, 0.018, 0.05)
    if (kind === 'click') {
      blip(1900, 950, 0.05, 0.22)
      noiseHit(ctx, ui, t, 0.06, 3000, 0.02)
    }
    if (kind === 'open') blip(700, 1500, 0.09, 0.16)
    if (kind === 'error') blip(220, 180, 0.25, 0.25, 'sawtooth')
    return
  }
  if (kind === 'hover') return // Classic stays quiet until something is pressed
  if (kind === 'click') {
    noiseHit(ctx, ui, t, 0.16, 1400, 0.05, 'bandpass', 4)
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(540, t)
    o.frequency.exponentialRampToValueAtTime(380, t + 0.06)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.12, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    o.connect(g).connect(ui)
    o.start(t)
    o.stop(t + 0.09)
  }
  if (kind === 'open') pluck(ctx, ui, t, 81, 0.25, 0.6)
  if (kind === 'error') pluck(ctx, ui, t, 50, 0.3, 0.2)
}

let installed = false
const CONTROL = 'button, a[href], [role=tab], [role=radio], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], input[type=range]'

/**
 * One listener for the whole app: every press of a control clicks, hovering ticks (in the complex).
 * The first gesture also wakes the audio context, which browsers keep asleep until then.
 */
export function installUiSounds(theme: () => Theme): void {
  if (installed || typeof document === 'undefined') return
  installed = true
  const wake = () => getBus()
  document.addEventListener('pointerdown', wake, { capture: true })
  document.addEventListener('keydown', wake, { capture: true })
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest(CONTROL) as HTMLButtonElement | null
      if (el && !el.disabled) playUi('click', theme())
    },
    { capture: true },
  )
  let last: Element | null = null
  document.addEventListener('pointerover', (e) => {
    const el = (e.target as Element | null)?.closest(CONTROL) ?? null
    if (el && el !== last && !(el as HTMLButtonElement).disabled) playUi('hover', theme())
    last = el
  })
}
