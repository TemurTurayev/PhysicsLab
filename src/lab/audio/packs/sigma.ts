import { isMuted } from '../sfx'

export type SigmaSfx = 'hydraulic' | 'relay' | 'impactConcrete' | 'alarm' | 'chime' | 'geiger'

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
      master.gain.setValueAtTime(0.5, ctx.currentTime)
      master.connect(comp)
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

function getNoise(c: AudioContext): AudioBuffer {
  if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
    const len = c.sampleRate * 2
    noiseBuf = c.createBuffer(1, len, c.sampleRate)
    const ch = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

export function playSigma(name: SigmaSfx, opts?: { intensity?: number }): void {
  if (isMuted()) return
  const c = getCtx()
  if (!c || !master) return

  const t = c.currentTime
  const v = Math.max(0, Math.min(1, opts?.intensity ?? 0.7))

  switch (name) {
    case 'hydraulic': {
      const osc = c.createOscillator(), og = c.createGain()
      osc.frequency.setValueAtTime(110, t)
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.45)
      og.gain.setValueAtTime(v * 0.8, t)
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
      osc.connect(og).connect(master)
      osc.start(t)
      osc.stop(t + 0.45)

      const src = c.createBufferSource(), f = c.createBiquadFilter(), ng = c.createGain()
      src.buffer = getNoise(c)
      f.type = 'bandpass'
      f.frequency.setValueAtTime(1800, t)
      f.frequency.exponentialRampToValueAtTime(900, t + 0.9)
      f.Q.setValueAtTime(1.5, t)
      ng.gain.setValueAtTime(0.001, t)
      ng.gain.linearRampToValueAtTime(v * 0.55, t + 0.04)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.9)
      src.connect(f).connect(ng).connect(master)
      src.start(t)
      src.stop(t + 0.9)
      break
    }
    case 'relay': {
      for (const delay of [0, 0.08]) {
        const ct = t + delay
        const osc = c.createOscillator(), og = c.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(delay === 0 ? 2200 : 1900, ct)
        osc.frequency.exponentialRampToValueAtTime(160, ct + 0.015)
        og.gain.setValueAtTime(v * 0.7, ct)
        og.gain.exponentialRampToValueAtTime(0.001, ct + 0.015)
        osc.connect(og).connect(master)
        osc.start(ct)
        osc.stop(ct + 0.016)

        const src = c.createBufferSource(), f = c.createBiquadFilter(), ng = c.createGain()
        src.buffer = getNoise(c)
        f.type = 'bandpass'
        f.frequency.setValueAtTime(3600, ct)
        f.Q.setValueAtTime(2, ct)
        ng.gain.setValueAtTime(v * 0.5, ct)
        ng.gain.exponentialRampToValueAtTime(0.001, ct + 0.012)
        src.connect(f).connect(ng).connect(master)
        src.start(ct)
        src.stop(ct + 0.015)
      }
      break
    }
    case 'impactConcrete': {
      const osc = c.createOscillator(), og = c.createGain()
      osc.frequency.setValueAtTime(130, t)
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.35)
      og.gain.setValueAtTime(v * 0.85, t)
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
      osc.connect(og).connect(master)
      osc.start(t)
      osc.stop(t + 0.38)

      const src = c.createBufferSource(), f = c.createBiquadFilter(), ng = c.createGain()
      src.buffer = getNoise(c)
      f.type = 'lowpass'
      f.frequency.setValueAtTime(550, t)
      f.frequency.exponentialRampToValueAtTime(160, t + 0.6)
      ng.gain.setValueAtTime(v * 0.7, t)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
      src.connect(f).connect(ng).connect(master)
      src.start(t)
      src.stop(t + 0.6)
      break
    }
    case 'alarm': {
      const osc = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain()
      osc.type = 'square'
      for (let i = 0; i < 3; i++) {
        const ct = t + i * 0.6
        osc.frequency.setValueAtTime(620, ct)
        osc.frequency.setValueAtTime(480, ct + 0.3)
      }
      f.type = 'lowpass'
      f.frequency.setValueAtTime(900, t)
      const peak = Math.min(0.35, v * 0.35)
      g.gain.setValueAtTime(0.001, t)
      g.gain.linearRampToValueAtTime(peak, t + 0.02)
      g.gain.setValueAtTime(peak, t + 1.76)
      g.gain.linearRampToValueAtTime(0.001, t + 1.8)
      osc.connect(f).connect(g).connect(master)
      osc.start(t)
      osc.stop(t + 1.8)
      break
    }
    case 'chime': {
      for (const [freq, delay, dur] of [[587.33, 0, 0.65], [440, 0.38, 0.82]] as const) {
        const ct = t + delay
        const osc = c.createOscillator(), harm = c.createOscillator()
        const g = c.createGain(), hg = c.createGain()
        osc.frequency.setValueAtTime(freq, ct)
        harm.frequency.setValueAtTime(freq * 2, ct)
        g.gain.setValueAtTime(0.001, ct)
        g.gain.linearRampToValueAtTime(v * 0.45, ct + 0.015)
        g.gain.exponentialRampToValueAtTime(0.001, ct + dur)
        hg.gain.setValueAtTime(0.001, ct)
        hg.gain.linearRampToValueAtTime(v * 0.08, ct + 0.015)
        hg.gain.exponentialRampToValueAtTime(0.001, ct + dur * 0.7)
        harm.connect(hg).connect(g)
        osc.connect(g).connect(master)
        osc.start(ct)
        osc.stop(ct + dur)
        harm.start(ct)
        harm.stop(ct + dur)
      }
      break
    }
    case 'geiger': {
      const dur = 1.5, sr = c.sampleRate, total = Math.floor(dur * sr)
      const buf = c.createBuffer(1, total, sr), data = buf.getChannelData(0)
      const clickLen = Math.floor(0.002 * sr)
      let pos = 0
      while (pos < total) {
        pos += Math.floor(-0.06 * Math.log(Math.random() || 0.0001) * sr)
        if (pos + clickLen >= total) break
        for (let i = 0; i < clickLen; i++) data[pos + i] = (Math.random() * 2 - 1) * (1 - i / clickLen)
      }
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
      src.buffer = buf
      f.type = 'bandpass'
      f.frequency.setValueAtTime(2800, t)
      f.Q.setValueAtTime(2, t)
      g.gain.setValueAtTime(v * 0.7, t)
      src.connect(f).connect(g).connect(master)
      src.start(t)
      src.stop(t + dur)
      break
    }
  }
}

/** Quiet room tone: 50 Hz fluorescent hum + harmonics + faint air handling noise. Returns a stop function. */
export function startAmbience(): () => void {
  if (isMuted()) return () => {}
  const c = getCtx()
  if (!c || !master) return () => {}

  const t = c.currentTime
  const ambGain = c.createGain()
  ambGain.gain.setValueAtTime(0.001, t)
  ambGain.gain.linearRampToValueAtTime(0.04, t + 0.1)
  ambGain.connect(master)

  const humOsc = c.createOscillator(), humF = c.createBiquadFilter(), humG = c.createGain()
  humOsc.type = 'sawtooth'
  humOsc.frequency.setValueAtTime(50, t)
  humF.type = 'lowpass'
  humF.frequency.setValueAtTime(200, t)
  humG.gain.setValueAtTime(0.35, t)
  humOsc.connect(humF).connect(humG).connect(ambGain)
  humOsc.start(t)

  const airSrc = c.createBufferSource(), airF = c.createBiquadFilter(), airG = c.createGain()
  airSrc.buffer = getNoise(c)
  airSrc.loop = true
  airF.type = 'lowpass'
  airF.frequency.setValueAtTime(320, t)
  airG.gain.setValueAtTime(0.65, t)
  airSrc.connect(airF).connect(airG).connect(ambGain)
  airSrc.start(t)

  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    const now = c.currentTime
    ambGain.gain.cancelScheduledValues(now)
    ambGain.gain.setValueAtTime(ambGain.gain.value, now)
    ambGain.gain.linearRampToValueAtTime(0.0001, now + 0.5)
    setTimeout(() => {
      try {
        humOsc.stop()
        airSrc.stop()
        ambGain.disconnect()
      } catch {
        // Ignored if already cleaned up
      }
    }, 550)
  }
}
