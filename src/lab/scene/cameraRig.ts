import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CameraShot } from './camera'

const MIN_HEIGHT = 0.6 // m above the floor
const LOCK_ON = 0.18 // share of the gap to the stone closed each frame

/** The camera never goes below the floor; walls are cut away instead (see Cutaway). */
export function aboveFloor(p: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(p.x, Math.max(MIN_HEIGHT, p.y), p.z)
}

/**
 * The cinematic camera until the student grabs it; then a free orbit camera (drag, wheel, pinch)
 * until they ask for the cinematic one back. A plain click never takes control, so clicking the
 * ground to place a prediction still works.
 */
export class CameraRig {
  private readonly controls: OrbitControls
  private readonly camera: THREE.PerspectiveCamera
  private free = false
  private touching = false
  private listener: ((free: boolean) => void) | null = null

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

  /** Where the camera is looking: the orbit centre. */
  get target(): THREE.Vector3 {
    return this.controls.target
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
    if (this.free) {
      this.controls.update()
    } else {
      this.camera.position.copy(shot.position)
      this.controls.target.copy(shot.target)
    }
    this.camera.position.copy(aboveFloor(this.camera.position))
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
