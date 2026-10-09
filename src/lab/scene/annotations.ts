import * as THREE from 'three'
import type { ShotResult } from '../sim/types'

const ru = (v: number, d = 1) => v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d })
const LABEL_H = 0.03 // label size, constant on screen: readable at any zoom

function label(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const font = 'bold 44px ui-monospace, Menlo, monospace'
  ctx.font = font
  canvas.width = Math.ceil(ctx.measureText(text).width) + 36
  canvas.height = 64
  ctx.font = font
  ctx.fillStyle = 'rgba(10,12,14,0.78)'
  ctx.beginPath()
  ctx.roundRect(0, 0, canvas.width, canvas.height, 14)
  ctx.fill()
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 18, 34)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, sizeAttenuation: false, toneMapped: false }))
  sprite.scale.set((LABEL_H * canvas.width) / canvas.height, LABEL_H, 1)
  sprite.renderOrder = 10
  return sprite
}

function line(points: THREE.Vector3[], color: string, dashed = false): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.5, gapSize: 0.35, depthTest: false, toneMapped: false })
    : new THREE.LineBasicMaterial({ color, depthTest: false, toneMapped: false })
  const l = new THREE.Line(geo, mat)
  if (dashed) l.computeLineDistances()
  l.renderOrder = 9
  return l
}

function arrow(from: THREE.Vector3, to: THREE.Vector3, color: string): THREE.Group {
  const g = new THREE.Group()
  const dir = to.clone().sub(from)
  const len = dir.length()
  if (len < 1e-6) return g
  const head = Math.min(0.9, len * 0.25)
  g.add(line([from, to], color))
  const cone = new THREE.Mesh(new THREE.ConeGeometry(head * 0.35, head, 10), new THREE.MeshBasicMaterial({ color, depthTest: false, toneMapped: false }))
  cone.position.copy(to).addScaledVector(dir.normalize(), -head / 2)
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  cone.renderOrder = 9
  g.add(cone)
  return g
}

interface Timed {
  object: THREE.Object3D
  from: number // scene time when it appears
}

/**
 * The geometry of the throw drawn into the world: release point and height, v₀ with its components
 * and the launch angle, the apex height, and a ruler from the machine to the landing point.
 * Each piece appears when the stone gets there.
 */
export class ShotAnnotations {
  readonly group = new THREE.Group()
  private items: Timed[] = []

  set(shot: ShotResult | null): void {
    this.clear()
    if (!shot?.launch || shot.releaseT === null) return
    const start = shot.flight[0]
    if (!start) return
    const t0 = shot.releaseT
    const p0 = new THREE.Vector3(start.x, start.y, 0)
    const { speed, angleDeg } = shot.launch
    const scale = 0.35 // m of arrow per m/s
    const vx = start.vx * scale
    const vy = start.vy * scale

    // Release: height above the ground, v₀ and its components, the angle.
    this.add(t0, line([new THREE.Vector3(p0.x, 0, 0), p0], '#9fd3ff', true))
    this.add(t0, this.at(label(`y₀ = ${ru(start.y)} м`, '#9fd3ff'), p0.x - 1.5, p0.y / 2))
    this.add(t0, arrow(p0, p0.clone().add(new THREE.Vector3(vx, vy, 0)), '#ffd166'))
    this.add(t0, arrow(p0, p0.clone().add(new THREE.Vector3(vx, 0, 0)), '#ff8fa3'))
    this.add(t0, arrow(p0, p0.clone().add(new THREE.Vector3(0, vy, 0)), '#7ee08a'))
    this.add(t0, this.at(label(`v₀ = ${ru(speed)} м/с · α = ${ru(angleDeg)}°`, '#ffd166'), p0.x + vx, p0.y + vy + 1.2))
    this.add(t0, this.at(label(`vx = ${ru(start.vx)}`, '#ff8fa3'), p0.x + vx / 2, p0.y - 0.9))
    this.add(t0, this.at(label(`vy = ${ru(start.vy)}`, '#7ee08a'), p0.x - 2.2, p0.y + vy / 2))
    this.add(t0, this.angleArc(p0, angleDeg))

    if (shot.apex && shot.apex.y > start.y + 0.3) {
      const a = shot.apex
      const tApex = shot.flight.reduce((best, s) => (s.y > best.y ? s : best), start).t
      this.add(tApex, line([new THREE.Vector3(a.x, 0, 0), new THREE.Vector3(a.x, a.y, 0)], '#c3a6ff', true))
      this.add(tApex, this.at(label(`h = ${ru(a.y)} м  (x = ${ru(a.x)} м)`, '#c3a6ff'), a.x, a.y + 1.6))
    }

    if (shot.landing) {
      const { x, t } = shot.landing
      this.add(t, this.ruler(x))
      this.add(t, this.at(label(`R = ${ru(x)} м · t = ${ru(t - t0)} с`, '#ffffff'), x / 2, 1.4))
    }
  }

  /** Show what the stone has already passed at scene time t. */
  reveal(t: number): void {
    for (const it of this.items) it.object.visible = t >= it.from
  }

  dispose(): void {
    this.clear()
  }

  private add(from: number, object: THREE.Object3D): void {
    object.visible = false
    this.items.push({ object, from })
    this.group.add(object)
  }

  private at(o: THREE.Object3D, x: number, y: number): THREE.Object3D {
    o.position.set(x, y, 0)
    return o
  }

  private angleArc(p0: THREE.Vector3, angleDeg: number): THREE.Line {
    const r = 2.2
    const n = 24
    const a = (angleDeg * Math.PI) / 180
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const k = (a * i) / n
      return new THREE.Vector3(p0.x + r * Math.cos(k), p0.y + r * Math.sin(k), 0)
    })
    return line(pts, '#ffd166')
  }

  private ruler(x: number): THREE.Group {
    const g = new THREE.Group()
    const y = 0.08
    g.add(line([new THREE.Vector3(0, y, 0.6), new THREE.Vector3(x, y, 0.6)], '#ffffff'))
    const step = Math.abs(x) > 60 ? 10 : 5
    for (let m = 0; Math.abs(m) <= Math.abs(x) + 1e-6; m += Math.sign(x || 1) * step) {
      const h = m % 10 === 0 ? 0.6 : 0.3
      g.add(line([new THREE.Vector3(m, y, 0.6), new THREE.Vector3(m, y + h, 0.6)], '#ffffff'))
    }
    return g
  }

  private clear(): void {
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh
      mesh.geometry?.dispose()
      const mat = mesh.material as (THREE.Material & { map?: THREE.Texture }) | undefined
      mat?.map?.dispose()
      mat?.dispose()
    })
    this.group.clear()
    this.items = []
  }
}
