import { describe, expect, it, vi } from 'vitest'
import { complete, DEFAULT_CVARS, runCommand, type ConsoleHost } from './commands'

const host = (over: Partial<ConsoleHost> = {}): ConsoleHost => ({
  missions: [
    { id: '0-1', title: 'Числовая ось', open: true },
    { id: '2-3', title: 'Свой полёт', open: false },
  ],
  current: { id: '0-1', title: 'Числовая ось', g: 9.81, lives: 2, shots: 1 },
  go: vi.fn(),
  fire: vi.fn(() => true),
  refillLives: vi.fn(() => true),
  setMusic: vi.fn(),
  setUniverse: vi.fn(),
  ...over,
})

describe('console', () => {
  it('cheats need sv_cheats 1 first, then mark the mission as cheated', () => {
    const h = host()
    expect(runCommand('sv_gravity 3.71', DEFAULT_CVARS, h).cvars.sv_gravity).toBeNull()
    const on = runCommand('sv_cheats 1', DEFAULT_CVARS, h).cvars
    const r = runCommand('sv_gravity 3,71', on, h)
    expect(r.cvars.sv_gravity).toBe(3.71)
    expect(r.cheated).toBe(true)
  })
  it('turning cheats off restores normal physics', () => {
    const cheating = { ...DEFAULT_CVARS, sv_cheats: true, sv_gravity: 1.62, god: true }
    expect(runCommand('sv_cheats 0', cheating, host()).cvars).toEqual(DEFAULT_CVARS)
  })
  it('map opens only unlocked missions unless cheating', () => {
    const h = host()
    runCommand('map 2-3', DEFAULT_CVARS, h)
    expect(h.go).not.toHaveBeenCalled()
    runCommand('map 2-3', { ...DEFAULT_CVARS, sv_cheats: true }, h)
    expect(h.go).toHaveBeenCalledWith('/trebuchet/2-3')
  })
  it('host_timescale is clamped and needs no cheats', () => {
    expect(runCommand('host_timescale 0.01', DEFAULT_CVARS, host()).cvars.host_timescale).toBe(0.1)
    expect(runCommand('host_timescale 2', DEFAULT_CVARS, host()).cvars.host_timescale).toBe(2)
  })
  it('impulse 101 refills lives only with cheats', () => {
    const h = host()
    expect(runCommand('impulse 101', DEFAULT_CVARS, h).cheated).toBeUndefined()
    expect(runCommand('impulse 101', { ...DEFAULT_CVARS, sv_cheats: true }, h).cheated).toBe(true)
    expect(h.refillLives).toHaveBeenCalledOnce()
  })
  it('answers unknown commands and completes prefixes', () => {
    expect(runCommand('noclip', DEFAULT_CVARS, host()).lines[0]).toMatch(/Неизвестная команда/)
    expect(complete('sv_')).toEqual(['sv_cheats', 'sv_gravity'])
    expect(complete('')).toEqual([])
  })
})
