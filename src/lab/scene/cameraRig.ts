import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CameraShot } from './camera'
import type { EnvironmentBounds } from './environments/types'

const WALL_MARGIN = 1.5 // m the camera keeps from walls and ceiling
const MIN_HEIGHT = 0.6 // m above the floor
const LOCK_ON = 0.18 // share of the gap to the stone closed each frame

/** Keep a point inside an indoor hall (and above the floor everywhere). Pure, so it is testable. */
export function clampToBounds(p: THREE.Vector3, bounds: EnvironmentBounds | null): THREE.Vector3 {
  const out = p.clone()
  out.y = Math.max(MIN_HEIGHT, out.y)
  if (!bounds) return out
  const m = WALL_MARGIN
  out.x = THREE.MathUtils.clamp(out.x, bounds.minX + m, bounds.maxX - m)
  out.z = THREE.MathUtils.clamp(out.z, bounds.minZ + m, bounds.maxZ - m)
  out.y = Math.min(out.y, bounds.maxY - m)
  return out
}

/**
 * The cinematic camera until the student grabs it; then a free orbit camera (drag, wheel, pinch)
 * until they ask for the cinematic one back. A plain click never takes control, so clicking the
 * ground to place a prediction still works.
 */
export class CameraRig {
  private readonly controls: OrbitControls
  private readonly camera: THREE.PerspectiveCamera
  private bounds: EnvironmentBounds | null = null
  private free = false
  private touching = false
  private listener: ((free: boolean) => void) | null = null
  private followed: THREE.Vector3 | null = null

  constructor(camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    this.camera = camera
    this.controls = new OrbitControls(camera, dom)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 2
    this.controls.maxDistance = 400
    this.controls.maxPolarAngle = Math.PI * 0.495 // never below the floor
    this.controls.zoomToCursor = true
    this.controls.addEventListener('start', () => (this.touching = true))
    this.controls.addEventListener('end', () => (this.touching = false))
    this.controls.addEventListener('change', () => {
      if (this.touching && !this.free) this.setFree(true)
    })
  }

  get isFree(): boolean {
    return this.free
  }

  setBounds(bounds: EnvironmentBounds | null): void {
    this.bounds = bounds
  }

  onModeChange(cb: ((free: boolean) => void) | null): void {
    this.listener = cb
  }

  /** Hand the camera back to the cinematic shots. */
  backToAuto(): void {
    this.setFree(false)
  }

  /**
   * Called every frame with the cinematic shot for this moment (used only while not free) and the
   * flying stone, if any: a free camera rides along with the stone, keeping the student's angle.
   */
  apply(shot: CameraShot, stone: THREE.Vector3 | null = null): void {
    if (this.free && stone) {
      // Lock on smoothly: the orbit centre slides onto the stone and the camera keeps its offset.
      const step = stone.clone().sub(this.controls.target).multiplyScalar(LOCK_ON)
      this.camera.position.add(step)
      this.controls.target.add(step)
    }
    this.followed = stone ? stone.clone() : null
    if (this.free) {
      this.controls.update()
    } else {
      this.camera.position.copy(shot.position)
      this.controls.target.copy(shot.target)
    }
    this.camera.position.copy(clampToBounds(this.camera.position, this.bounds))
    this.camera.lookAt(this.controls.target)
  }

  dispose(): void {
    this.controls.dispose()
  }

  private setFree(free: boolean): void {
    if (this.free === free) return
    this.free = free
    this.listener?.(free)
  }
}
