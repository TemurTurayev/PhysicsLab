import * as THREE from 'three'
import type { LaunchSheet } from '../calc/launchSheet'
import { arrow, label, line } from './annotations'

export type PreviewPart = 'v0' | 'alpha' | 'vx' | 'vy' | 'y0' | 'x0'

const ru = (v: number) => v.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const SCALE = 0.35 // m of arrow per m/s, same as the shot annotations
const DIM = 0.35

interface Part {
  shape: THREE.Object3D
  tag: THREE.Sprite
}

function setOpacity(o: THREE.Object3D, opacity: number): void {
  o.traverse((c) => {
    const m = (c as THREE.Mesh).material as THREE.Material | undefined
    if (!m) return
    m.transparent = true
    m.opacity = opacity
  })
}

/**
 * The launch the current setting will produce, drawn on the machine before any shot: v₀ with its
 * components, the angle and the release height. Hovering a number in the data panel lights up its
 * piece of geometry, so «vy = 17,8» becomes an arrow you can see.
 */
export class LaunchPreview {
  readonly group = new THREE.Group()
  private parts = new Map<PreviewPart, Part>()
  private lit: PreviewPart | null = null

  set(sheet: LaunchSheet | null): void {
    this.clear()
    if (!sheet) return
    const p0 = new THREE.Vector3(sheet.x0, sheet.y0, 0)
    const vx = sheet.vx * SCALE
    const vy = sheet.vy * SCALE
    const tip = p0.clone().add(new THREE.Vector3(vx, vy, 0))
    const r = 2.2
    const a = (sheet.alphaDeg * Math.PI) / 180
    const arc = line(
      Array.from({ length: 25 }, (_, i) => new THREE.Vector3(p0.x + r * Math.cos((a * i) / 24), p0.y + r * Math.sin((a * i) / 24), 0)),
      '#ffd166',
    )
    this.add('v0', arrow(p0, tip, '#ffd166'), label(`v₀ = ${ru(sheet.v0)} м/с`, '#ffd166'), tip.x, tip.y + 1.1)
    this.add('alpha', arc, label(`α = ${ru(sheet.alphaDeg)}°`, '#ffd166'), p0.x + r + 1.2, p0.y + 0.6)
    this.add('vx', arrow(p0, p0.clone().add(new THREE.Vector3(vx, 0, 0)), '#ff8fa3'), label(`vx = ${ru(sheet.vx)} м/с`, '#ff8fa3'), p0.x + vx / 2, p0.y - 0.9)
    this.add('vy', arrow(p0, p0.clone().add(new THREE.Vector3(0, vy, 0)), '#7ee08a'), label(`vy = ${ru(sheet.vy)} м/с`, '#7ee08a'), p0.x - 2.4, p0.y + vy / 2)
    this.add('y0', line([new THREE.Vector3(p0.x, 0, 0), p0], '#9fd3ff', true), label(`y₀ = ${ru(sheet.y0)} м`, '#9fd3ff'), p0.x - 1.6, p0.y / 2)
    this.add('x0', line([new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(p0.x, 0.05, 0)], '#9fd3ff'), label(`x₀ = ${ru(sheet.x0)} м`, '#9fd3ff'), p0.x / 2, 0.7)
    this.highlight(this.lit)
  }

  /** Light one piece and show its value; null dims everything back to a quiet sketch. */
  highlight(part: PreviewPart | null): void {
    this.lit = part
    for (const [key, { shape, tag }] of this.parts) {
      const on = key === part
      setOpacity(shape, part === null ? 0.75 : on ? 1 : DIM)
      tag.visible = on
    }
  }

  get highlighted(): PreviewPart | null {
    return this.lit
  }

  dispose(): void {
    this.clear()
  }

  private add(key: PreviewPart, shape: THREE.Object3D, tag: THREE.Sprite, x: number, y: number): void {
    tag.position.set(x, y, 0)
    tag.visible = false
    this.parts.set(key, { shape, tag })
    this.group.add(shape, tag)
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
    this.parts.clear()
  }
}
