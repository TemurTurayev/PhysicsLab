import * as THREE from 'three'
import type { FlightSample } from '../sim/types'

const MAX_POINTS = 20000

/** A polyline revealed up to the current time, for the live trail and the reference ghost. */
export class PathLine {
  readonly line: THREE.Line
  private readonly times: number[] = []
  private count = 0

  constructor(color: string, opacity: number, dashed: boolean) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3))
    const material = dashed
      ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.8, gapSize: 0.6 })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    this.line = new THREE.Line(geometry, material)
    this.line.frustumCulled = false
    this.line.visible = false
  }

  set(samples: FlightSample[]): void {
    const usable = samples.filter((s) => Number.isFinite(s.x) && Number.isFinite(s.y) && Math.abs(s.x) < 1e5 && Math.abs(s.y) < 1e5)
    const step = Math.max(1, Math.ceil(usable.length / MAX_POINTS))
    const kept = usable.filter((_, i) => i % step === 0)
    const pos = this.line.geometry.getAttribute('position') as THREE.BufferAttribute
    kept.forEach((s, i) => pos.setXYZ(i, s.x, Math.max(s.y, 0.02), 0))
    pos.needsUpdate = true
    this.times.splice(0, this.times.length, ...kept.map((s) => s.t))
    this.count = kept.length
    this.line.geometry.setDrawRange(0, this.count)
    this.line.geometry.computeBoundingSphere()
    if (this.line.material instanceof THREE.LineDashedMaterial) this.line.computeLineDistances()
    this.line.visible = this.count > 1
  }

  /** Show the path up to time t (Infinity shows all of it). */
  reveal(t: number): void {
    let n = 0
    while (n < this.count && this.times[n] <= t) n++
    this.line.geometry.setDrawRange(0, n)
  }

  dispose(): void {
    this.line.geometry.dispose()
    ;(this.line.material as THREE.Material).dispose()
  }
}

/** Dust and splinters bursting from the landing point; a pure function of time since impact. */
export class ImpactBurst {
  readonly points: THREE.Points
  private readonly dirs: Float32Array
  private origin = new THREE.Vector3()
  private at: number | null = null

  constructor(count = 160) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    this.dirs = new Float32Array(count * 3)
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2
      const up = 0.4 + rand() * 1.2
      const sp = 2 + rand() * 6
      this.dirs.set([Math.cos(a) * sp, up * sp, Math.sin(a) * sp], i * 3)
    }
    const material = new THREE.PointsMaterial({ color: '#c9a77a', size: 0.35, transparent: true, depthWrite: false })
    this.points = new THREE.Points(geometry, material)
    this.points.visible = false
    this.points.frustumCulled = false
  }

  trigger(x: number, at: number | null): void {
    this.origin.set(x, 0.1, 0)
    this.at = at
  }

  update(t: number): void {
    const dt = this.at === null ? -1 : t - this.at
    this.points.visible = dt >= 0 && dt < 2.5
    if (!this.points.visible) return
    const pos = this.points.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const vx = this.dirs[i * 3]
      const vy = this.dirs[i * 3 + 1]
      const vz = this.dirs[i * 3 + 2]
      const y = Math.max(0.05, vy * dt - 4.9 * dt * dt)
      pos.setXYZ(i, this.origin.x + vx * dt * 0.8, this.origin.y + y, this.origin.z + vz * dt * 0.8)
    }
    pos.needsUpdate = true
    ;(this.points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - dt / 2.5)
  }

  dispose(): void {
    this.points.geometry.dispose()
    ;(this.points.material as THREE.Material).dispose()
  }
}

/** The student's guess: a flag on the ground (landing) or a dashed bar in the air (apex height). */
export class PredictionMarker {
  readonly group = new THREE.Group()
  private readonly flag: THREE.Group
  private readonly bar: THREE.Mesh
  private readonly disposables: Array<{ dispose(): void }> = []

  constructor(color = '#f0a640') {
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 6)
    const clothGeo = new THREE.PlaneGeometry(1.4, 0.8)
    const barGeo = new THREE.BoxGeometry(14, 0.12, 0.12)
    const pole = new THREE.MeshStandardMaterial({ color: '#3b3b40' })
    const cloth = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, emissive: color, emissiveIntensity: 0.35 })
    const barMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
    this.disposables.push(poleGeo, clothGeo, barGeo, pole, cloth, barMat)
    this.flag = new THREE.Group()
    const poleMesh = new THREE.Mesh(poleGeo, pole)
    poleMesh.position.y = 1.5
    const clothMesh = new THREE.Mesh(clothGeo, cloth)
    clothMesh.position.set(0.7, 2.6, 0)
    this.flag.add(poleMesh, clothMesh)
    this.bar = new THREE.Mesh(barGeo, barMat)
    this.group.add(this.flag, this.bar)
    this.set(null, null)
  }

  set(landingX: number | null, apex: { x: number; y: number } | null): void {
    this.flag.visible = landingX !== null
    if (landingX !== null) this.flag.position.set(landingX, 0, 0)
    this.bar.visible = apex !== null
    if (apex) this.bar.position.set(apex.x, apex.y, 0)
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose())
  }
}

/** X-ray mode: velocity (amber) and gravity (blue) arrows on the stone. */
export class ForceArrows {
  readonly group = new THREE.Group()
  private readonly velocity = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, '#f0a640', 0.8, 0.5)
  private readonly gravity = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 3, '#58a6ff', 0.8, 0.5)

  constructor() {
    this.group.add(this.velocity, this.gravity)
    this.group.visible = false
  }

  update(s: FlightSample | null, enabled: boolean): void {
    this.group.visible = enabled && s !== null
    if (!s || !enabled) return
    const origin = new THREE.Vector3(s.x, Math.max(s.y, 0.2), 0.3)
    const v = new THREE.Vector3(s.vx, s.vy, 0)
    const len = v.length()
    if (len > 1e-6) {
      this.velocity.position.copy(origin)
      this.velocity.setDirection(v.normalize())
      this.velocity.setLength(Math.min(12, len * 0.25), 0.8, 0.5)
    }
    this.gravity.position.copy(origin)
  }

  dispose(): void {
    this.velocity.dispose()
    this.gravity.dispose()
  }
}
