import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { clampToBounds } from './cameraRig'

const hall = { minX: -50, maxX: 125, minZ: -14, maxZ: 30, maxY: 29 }

describe('clampToBounds', () => {
  it('pulls a tracking camera that drifted through a wall back inside the hall', () => {
    const p = clampToBounds(new THREE.Vector3(60, 40, 36), hall)
    expect(p.z).toBeLessThan(hall.maxZ)
    expect(p.y).toBeLessThan(hall.maxY)
    expect(p.x).toBe(60)
  })
  it('outdoors only keeps the camera above the ground', () => {
    const p = clampToBounds(new THREE.Vector3(500, -3, 900), null)
    expect(p.toArray()).toEqual([500, 0.6, 900])
  })
})
