import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { aboveFloor } from './cameraRig'

describe('aboveFloor', () => {
  it('lifts a camera that dipped under the floor and leaves everything else alone', () => {
    expect(aboveFloor(new THREE.Vector3(500, -3, 900)).toArray()).toEqual([500, 0.6, 900])
    expect(aboveFloor(new THREE.Vector3(60, 40, 36)).toArray()).toEqual([60, 40, 36])
  })
})
