import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { Cutaway } from './cutaway'

const wall = () => new THREE.Mesh(new THREE.BoxGeometry(40, 20, 0.4), new THREE.MeshBasicMaterial())

describe('Cutaway', () => {
  it('hides a wall between the camera and the subject, and brings it back when the camera moves', () => {
    const hall = new THREE.Group()
    const w = wall()
    w.position.set(0, 10, 15)
    const side = wall()
    side.position.set(0, 10, -15)
    hall.add(w, side)
    hall.updateMatrixWorld(true)
    const cut = new Cutaway()
    cut.update(hall, new THREE.Vector3(0, 5, 30), new THREE.Vector3(0, 2, 0))
    expect(w.visible).toBe(false)
    expect(side.visible).toBe(true)
    cut.update(hall, new THREE.Vector3(0, 5, 10), new THREE.Vector3(0, 2, 0))
    expect(w.visible).toBe(true)
  })
})
