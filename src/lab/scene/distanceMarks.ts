import * as THREE from 'three'

const STEP = 10 // m between marks
const SIDE_Z = 5.4 // m: just outside the lane, on the camera's side
const PLATE_H = 0.7 // m: world-sized, so near marks read large and far ones shrink like real signs

function plate(text: string, major: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const font = `bold ${major ? 52 : 44}px ui-monospace, Menlo, monospace`
  ctx.font = font
  canvas.width = Math.ceil(ctx.measureText(text).width) + 40
  canvas.height = 72
  ctx.font = font
  ctx.fillStyle = major ? 'rgba(255, 214, 140, 0.95)' : 'rgba(250, 248, 240, 0.92)'
  ctx.beginPath()
  ctx.roundRect(0, 0, canvas.width, canvas.height, 12)
  ctx.fill()
  ctx.fillStyle = '#1b1712'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(text, canvas.width / 2, 38)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, toneMapped: false, fog: true, depthWrite: false }))
  sprite.scale.set((PLATE_H * canvas.width) / canvas.height, PLATE_H, 1)
  sprite.raycast = () => {} // never an occluder for the camera cutaway
  return sprite
}

/**
 * Distance marks along the lane — 0, 10 м, 20 м … — so the field reads as a number line.
 * Every 50 m is highlighted; the lane is flat in every scene, so plates sit at a fixed height.
 */
export function createDistanceMarks(maxX: number): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group()
  group.name = 'distance-marks'
  for (let x = 0; x <= maxX; x += STEP) {
    const major = x % 50 === 0
    const s = plate(x === 0 ? '0 м' : `${x} м`, major)
    s.position.set(x, PLATE_H * 0.75, SIDE_Z)
    group.add(s)
  }
  return {
    group,
    dispose: () =>
      group.children.forEach((c) => {
        const m = (c as THREE.Sprite).material
        m.map?.dispose()
        m.dispose()
      }),
  }
}
