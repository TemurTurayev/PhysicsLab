import * as THREE from 'three'

const KEEP_NEAR_TARGET = 2.5 // m: whatever stands right at the focus point is the subject, not an obstacle

/**
 * Indoor halls: any wall, ceiling or column standing between the camera and what it looks at
 * is hidden for that frame, like a dollhouse cut-away, so the camera can go anywhere.
 */
export class Cutaway {
  private hidden: THREE.Object3D[] = []
  private readonly ray = new THREE.Raycaster()

  update(root: THREE.Object3D | null, from: THREE.Vector3, to: THREE.Vector3): void {
    this.restore()
    if (!root) return
    const dir = to.clone().sub(from)
    const dist = dir.length()
    if (dist <= KEEP_NEAR_TARGET) return
    this.ray.set(from, dir.normalize())
    this.ray.near = 0
    this.ray.far = dist - KEEP_NEAR_TARGET
    for (const hit of this.ray.intersectObject(root, true)) {
      const o = hit.object
      if (!(o as THREE.Mesh).isMesh || o.userData.isSky || this.hidden.includes(o)) continue
      o.visible = false
      this.hidden.push(o)
    }
  }

  restore(): void {
    for (const o of this.hidden) o.visible = true
    this.hidden = []
  }
}
