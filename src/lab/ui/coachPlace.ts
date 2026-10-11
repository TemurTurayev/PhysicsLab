export interface Box {
  left: number
  top: number
  width: number
  height: number
}

const GAP = 16
const EDGE = 12

/**
 * Where to put the tour bubble so it is always fully on screen: below the ringed panel, above it,
 * beside it, or — when the panel fills the screen — over it, clamped to the viewport.
 */
export function placeBubble(target: Box, bubble: { width: number; height: number }, view: { width: number; height: number }): { left: number; top: number } {
  const clampX = (x: number) => Math.min(Math.max(EDGE, x), Math.max(EDGE, view.width - bubble.width - EDGE))
  const clampY = (y: number) => Math.min(Math.max(EDGE, y), Math.max(EDGE, view.height - bubble.height - EDGE))
  const below = target.top + target.height + GAP
  if (below + bubble.height <= view.height - EDGE) return { left: clampX(target.left), top: below }
  const above = target.top - GAP - bubble.height
  if (above >= EDGE) return { left: clampX(target.left), top: above }
  const right = target.left + target.width + GAP
  if (right + bubble.width <= view.width - EDGE) return { left: right, top: clampY(target.top) }
  const left = target.left - GAP - bubble.width
  if (left >= EDGE) return { left, top: clampY(target.top) }
  // Nothing fits around it: sit over the panel near the bottom of the screen, fully visible.
  return { left: clampX(target.left + (target.width - bubble.width) / 2), top: clampY(view.height - bubble.height - EDGE) }
}
