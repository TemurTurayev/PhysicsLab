"""Voice post-processing for the narration clips.

facility(): the complex's announcer — a calm synthetic female voice. Pitch is flattened and snapped to a
semitone grid that steps between syllables (the "machine pretending to be polite" contour), formants
nudged up, a faint metallic double and a hard-room reverb.
narrator(): the classic's storyteller — warm, slightly slower, with a wide hall.
"""
import numpy as np
import pyworld as pw
from scipy.signal import butter, sosfilt, fftconvolve


def _reverb(x: np.ndarray, sr: int, seconds: float, mix: float, bright: float) -> np.ndarray:
    rng = np.random.default_rng(7)
    n = int(sr * seconds)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = sosfilt(butter(2, bright, 'low', fs=sr, output='sos'), ir)
    ir[: int(sr * 0.012)] = 0
    wet = fftconvolve(x, ir)[: len(x)]
    wet *= np.max(np.abs(x)) / (np.max(np.abs(wet)) + 1e-9)
    return (1 - mix) * x + mix * wet


def _norm(x: np.ndarray, peak: float = 0.89) -> np.ndarray:
    return x * (peak / (np.max(np.abs(x)) + 1e-9))


def facility(x: np.ndarray, sr: int, seed: int = 0) -> np.ndarray:
    x = x.astype(np.float64)
    f0, t = pw.harvest(x, sr, f0_floor=120, f0_ceil=500, frame_period=5)
    sp = pw.cheaptrick(x, f0, t, sr)
    ap = pw.d4c(x, f0, t, sr)
    voiced = f0 > 0
    base = np.median(f0[voiced]) if voiced.any() else 220.0
    rng = np.random.default_rng(seed)
    # Mostly monotone; every voiced run picks a step from a small melodic set, as if typed into a synthesiser.
    steps = np.array([0, 0, 0, 2, -1, 3, 0, 5, -2])
    new = np.zeros_like(f0)
    run_step = 0
    for i in range(len(f0)):
        if voiced[i] and (i == 0 or not voiced[i - 1]):
            run_step = rng.choice(steps)
        if voiced[i]:
            # keep 25% of the natural contour so words stay intelligible, then quantise
            semis = 12 * np.log2(f0[i] / base) * 0.25 + run_step
            new[i] = base * 1.06 * 2 ** (np.round(semis) / 12)
    # formant shift up ~6% (younger, more synthetic timbre)
    bins = sp.shape[1]
    idx = np.clip(np.arange(bins) / 1.06, 0, bins - 1)
    sp2 = np.array([np.interp(idx, np.arange(bins), row) for row in sp])
    y = pw.synthesize(new, sp2, ap, sr, frame_period=5)
    # metallic double: a 30 Hz ring-modulated copy, tiny delay
    tt = np.arange(len(y)) / sr
    ring = np.roll(y * np.sin(2 * np.pi * 30 * tt), int(sr * 0.004))
    y = y + 0.12 * ring
    y = sosfilt(butter(2, [150, min(7500, 0.45 * sr)], 'band', fs=sr, output='sos'), y)
    y = _reverb(y, sr, 0.9, 0.22, 5000)
    return _norm(y)


def narrator(x: np.ndarray, sr: int, seed: int = 0) -> np.ndarray:
    x = x.astype(np.float64)
    f0, t = pw.harvest(x, sr, f0_floor=60, f0_ceil=300, frame_period=5)
    sp = pw.cheaptrick(x, f0, t, sr)
    ap = pw.d4c(x, f0, t, sr)
    voiced = f0 > 0
    base = np.median(f0[voiced]) if voiced.any() else 110.0
    # deepen slightly and widen the melody: a storyteller leans into the words
    new = np.where(voiced, base * 0.92 * (f0 / base) ** 1.35, 0)
    bins = sp.shape[1]
    idx = np.clip(np.arange(bins) * 1.04, 0, bins - 1)
    sp2 = np.array([np.interp(idx, np.arange(bins), row) for row in sp])
    y = pw.synthesize(new, sp2, ap, sr, frame_period=5)
    y = sosfilt(butter(2, [70, min(9000, 0.45 * sr)], 'band', fs=sr, output='sos'), y)
    y = _reverb(y, sr, 2.2, 0.18, 3500)
    return _norm(y)
