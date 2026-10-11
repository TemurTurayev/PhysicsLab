import { describe, expect, it } from 'vitest'
import { placeBubble } from './coachPlace'

const view = { width: 1280, height: 720 }
const bubble = { width: 320, height: 180 }
const inside = (p: { left: number; top: number }, v = view, b = bubble) =>
  p.left >= 0 && p.top >= 0 && p.left + b.width <= v.width && p.top + b.height <= v.height

describe('tour bubble placement', () => {
  it('goes below a small panel at the top', () => {
    const p = placeBubble({ left: 20, top: 80, width: 300, height: 120 }, bubble, view)
    expect(p.top).toBeGreaterThan(200)
    expect(inside(p)).toBe(true)
  })
  it('goes above a panel at the bottom', () => {
    const p = placeBubble({ left: 900, top: 560, width: 340, height: 150 }, bubble, view)
    expect(p.top + bubble.height).toBeLessThanOrEqual(560)
    expect(inside(p)).toBe(true)
  })
  it('goes beside a tall panel that leaves no room above or below (the bug: it used to fall off the screen)', () => {
    const p = placeBubble({ left: 900, top: 70, width: 360, height: 620 }, bubble, view)
    expect(p.left + bubble.width).toBeLessThanOrEqual(900)
    expect(inside(p)).toBe(true)
  })
  it('stays on screen even when the panel covers a phone screen entirely', () => {
    const phone = { width: 375, height: 667 }
    const b = { width: 351, height: 220 }
    const p = placeBubble({ left: 0, top: 0, width: 375, height: 667 }, b, phone)
    expect(inside(p, phone, b)).toBe(true)
  })
})
