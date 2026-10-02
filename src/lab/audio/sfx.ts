export type Sfx = 'creak' | 'whoosh' | 'thud' | 'crack' | 'success' | 'fail'

const KEY = 'physicslab-muted'
let muted = false

try {
  if (typeof window !== 'undefined' && window.localStorage) {
    muted = window.localStorage.getItem(KEY) === 'true'
  }
} catch {
  // Local storage access fallback
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    try {
      ctx = new AC()
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.setValueAtTime(-16, ctx.currentTime)
      comp.knee.setValueAtTime(10, ctx.currentTime)
      comp.ratio.setValueAtTime(4, ctx.currentTime)
      comp.attack.setValueAtTime(0.005, ctx.currentTime)
      comp.release.setValueAtTime(0.12, ctx.currentTime)
      comp.connect(ctx.destination)

      master = ctx.createGain()
      master.gain.setValueAtTime(muted ? 0 : 0.5, ctx.currentTime)
      master.connect(comp)
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {})
  }
  return ctx
}

function getNoise(c: AudioContext): AudioBuffer {
  if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
    const len = c.sampleRate
    noiseBuf = c.createBuffer(1, len, c.sampleRate)
    const ch = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(val: boolean): void {
  muted = val
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(KEY, String(val))
    }
  } catch {
    // Ignore storage errors
  }
  if (master && ctx) {
    master.gain.setValueAtTime(muted ? 0 : 0.5, ctx.currentTime)
  }
}

export function playSfx(name: Sfx, opts?: { intensity?: number }): void {
  if (muted) return
  const c = getCtx()
  if (!c || !master) return

  const t = c.currentTime
  const v = Math.max(0, Math.min(1, opts?.intensity ?? 0.7))

  switch (name) {
    case 'creak': {
      const osc = c.createOscillator()
      const oscF = c.createBiquadFilter()
      const oscG = c.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(85, t)
      osc.frequency.linearRampToValueAtTime(135, t + 0.2)
      osc.frequency.linearRampToValueAtTime(70, t + 0.6)
      oscF.type = 'bandpass'
      oscF.frequency.setValueAtTime(420, t)
      oscF.Q.setValueAtTime(3.5, t)
      oscG.gain.setValueAtTime(0, t)
      oscG.gain.linearRampToValueAtTime(v * 0.35, t + 0.08)
      oscG.gain.linearRampToValueAtTime(0.001, t + 0.6)
      osc.connect(oscF).connect(oscG).connect(master)
      osc.start(t)
      osc.stop(t + 0.6)

      const src = c.createBufferSource()
      src.buffer = getNoise(c)
      const nf = c.createBiquadFilter()
      const ng = c.createGain()
      nf.type = 'bandpass'
      nf.frequency.setValueAtTime(550, t)
      nf.frequency.linearRampToValueAtTime(750, t + 0.3)
      nf.frequency.linearRampToValueAtTime(450, t + 0.6)
      nf.Q.setValueAtTime(2.5, t)
      ng.gain.setValueAtTime(0, t)
      ng.gain.linearRampToValueAtTime(v * 0.25, t + 0.05)
      ng.gain.linearRampToValueAtTime(0.001, t + 0.6)
      src.connect(nf).connect(ng).connect(master)
      src.start(t)
      src.stop(t + 0.6)
      break
    }
    case 'whoosh': {
      const src = c.createBufferSource()
      src.buffer = getNoise(c)
      const f = c.createBiquadFilter()
      const g = c.createGain()
      f.type = 'bandpass'
      f.Q.setValueAtTime(2.2, t)
      f.frequency.setValueAtTime(260, t)
      f.frequency.exponentialRampToValueAtTime(1400, t + 0.32)
      f.frequency.exponentialRampToValueAtTime(280, t + 0.7)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(v * 0.65, t + 0.32)
      g.gain.linearRampToValueAtTime(0.001, t + 0.7)
      src.connect(f).connect(g).connect(master)
      src.start(t)
      src.stop(t + 0.7)
      break
    }
    case 'thud': {
      const osc = c.createOscillator()
      const og = c.createGain()
      osc.frequency.setValueAtTime(90, t)
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.45)
      og.gain.setValueAtTime(v * 0.85, t)
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      osc.connect(og).connect(master)
      osc.start(t)
      osc.stop(t + 0.5)

      const src = c.createBufferSource()
      src.buffer = getNoise(c)
      const f = c.createBiquadFilter()
      const ng = c.createGain()
      f.type = 'lowpass'
      f.frequency.setValueAtTime(220, t)
      ng.gain.setValueAtTime(v * 0.6, t)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
      src.connect(f).connect(ng).connect(master)
      src.start(t)
      src.stop(t + 0.18)
      break
    }
    case 'crack': {
      const click = c.createOscillator()
      const cg = c.createGain()
      click.type = 'triangle'
      click.frequency.setValueAtTime(1400, t)
      click.frequency.exponentialRampToValueAtTime(180, t + 0.03)
      cg.gain.setValueAtTime(v * 0.9, t)
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
      click.connect(cg).connect(master)
      click.start(t)
      click.stop(t + 0.035)

      const src = c.createBufferSource()
      src.buffer = getNoise(c)
      const f = c.createBiquadFilter()
      const ng = c.createGain()
      f.type = 'bandpass'
      f.frequency.setValueAtTime(2200, t)
      f.Q.setValueAtTime(1.8, t)
      ng.gain.setValueAtTime(v * 0.85, t)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      src.connect(f).connect(ng).connect(master)
      src.start(t)
      src.stop(t + 0.12)
      break
    }
    case 'success': {
      for (const [freq, delay, dur] of [[523.25, 0, 0.28], [659.25, 0.11, 0.45]] as const) {
        const nt = t + delay
        const osc = c.createOscillator()
        const warm = c.createOscillator()
        const g = c.createGain()
        const wg = c.createGain()
        osc.frequency.setValueAtTime(freq, nt)
        warm.type = 'triangle'
        warm.frequency.setValueAtTime(freq * 2, nt)
        g.gain.setValueAtTime(0.001, nt)
        g.gain.linearRampToValueAtTime(v * 0.5, nt + 0.015)
        g.gain.exponentialRampToValueAtTime(0.001, nt + dur)
        wg.gain.setValueAtTime(v * 0.12, nt)
        warm.connect(wg).connect(g)
        osc.connect(g).connect(master)
        osc.start(nt)
        osc.stop(nt + dur)
        warm.start(nt)
        warm.stop(nt + dur)
      }
      break
    }
    case 'fail': {
      const osc = c.createOscillator()
      const body = c.createOscillator()
      const f = c.createBiquadFilter()
      const g = c.createGain()
      const bg = c.createGain()
      osc.frequency.setValueAtTime(165, t)
      osc.frequency.exponentialRampToValueAtTime(82, t + 0.32)
      body.type = 'triangle'
      body.frequency.setValueAtTime(235, t)
      body.frequency.exponentialRampToValueAtTime(115, t + 0.18)
      f.type = 'lowpass'
      f.frequency.setValueAtTime(450, t)
      g.gain.setValueAtTime(0.001, t)
      g.gain.linearRampToValueAtTime(v * 0.6, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32)
      bg.gain.setValueAtTime(v * 0.2, t)
      bg.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      osc.connect(g)
      body.connect(bg).connect(g)
      g.connect(f).connect(master)
      osc.start(t)
      osc.stop(t + 0.32)
      body.start(t)
      body.stop(t + 0.2)
      break
    }
  }
}
