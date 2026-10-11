import * as THREE from 'three'

export interface Crew {
  group: THREE.Group
  /** Deterministic pose for scene time t (seconds). scatterAt = time a stone lands near them, or null. */
  update(t: number, scatterAt: number | null): void
  dispose(): void
}

interface Dummy {
  root: THREE.Group
  torso: THREE.Group
  head: THREE.Group
  lArm: THREE.Group
  rArm: THREE.Group
  lForearm: THREE.Group
  rForearm: THREE.Group
  lLeg: THREE.Group
  rLeg: THREE.Group
  lCalf: THREE.Group
  rCalf: THREE.Group
  basePos: [number, number, number]
  escape: [number, number]
}

export function createCrew(): Crew {
  const group = new THREE.Group()
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xd8b17a, roughness: 0.65 })
  const jointMat = new THREE.MeshStandardMaterial({ color: 0xa87b4a, roughness: 0.55 })
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf0a640, roughness: 0.35 })

  const gPelvis = new THREE.CylinderGeometry(0.09, 0.08, 0.16, 12)
  const gTorso = new THREE.CapsuleGeometry(0.1, 0.22, 4, 12)
  const gJoint = new THREE.SphereGeometry(0.045, 12, 10)
  const gThigh = new THREE.CylinderGeometry(0.05, 0.04, 0.38, 10)
  const gShin = new THREE.CylinderGeometry(0.04, 0.032, 0.38, 10)
  const gFoot = new THREE.BoxGeometry(0.08, 0.05, 0.14)
  const gArmU = new THREE.CylinderGeometry(0.04, 0.034, 0.28, 10)
  const gArmL = new THREE.CylinderGeometry(0.034, 0.028, 0.26, 10)
  const gHand = new THREE.SphereGeometry(0.038, 10, 8)
  const gHead = new THREE.SphereGeometry(0.11, 16, 12)
  const gHelmet = new THREE.SphereGeometry(0.128, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)
  const geoms = [gPelvis, gTorso, gJoint, gThigh, gShin, gFoot, gArmU, gArmL, gHand, gHead, gHelmet]

  const m = (g: THREE.BufferGeometry, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(g, mat)
    mesh.castShadow = true
    return mesh
  }

  function makeDummy(basePos: [number, number, number], escape: [number, number]): Dummy {
    const root = new THREE.Group()
    root.position.set(...basePos)
    root.rotation.y = Math.PI * 0.5

    const pelvis = m(gPelvis, woodMat)
    pelvis.position.y = 0.88
    root.add(pelvis)

    const makeLeg = (x: number) => {
      const hip = new THREE.Group(), calf = new THREE.Group()
      hip.position.set(x * 0.1, 0.86, 0); calf.position.y = -0.38
      const thigh = m(gThigh, woodMat), shin = m(gShin, woodMat), foot = m(gFoot, woodMat)
      thigh.position.y = shin.position.y = -0.19; foot.position.set(0, -0.38, 0.04)
      hip.add(m(gJoint, jointMat), thigh, calf)
      calf.add(m(gJoint, jointMat), shin, foot)
      root.add(hip)
      return { hip, calf }
    }
    const lL = makeLeg(-1), rL = makeLeg(1)

    const torso = new THREE.Group(), head = new THREE.Group()
    torso.position.y = 0.96; head.position.y = 0.46
    const chest = m(gTorso, woodMat), skull = m(gHead, woodMat), helmet = m(gHelmet, helmetMat)
    chest.position.y = 0.2; skull.position.y = 0.12; helmet.position.set(0, 0.17, -0.01)
    head.add(m(gJoint, jointMat), skull, helmet)
    torso.add(m(gJoint, jointMat), chest, head)

    const makeArm = (x: number) => {
      const arm = new THREE.Group(), forearm = new THREE.Group()
      arm.position.set(x * 0.18, 0.36, 0); forearm.position.y = -0.28
      const bicep = m(gArmU, woodMat), fMesh = m(gArmL, woodMat), hand = m(gHand, woodMat)
      bicep.position.y = -0.14; fMesh.position.y = -0.13; hand.position.y = -0.26
      arm.add(m(gJoint, jointMat), bicep, forearm)
      forearm.add(m(gJoint, jointMat), fMesh, hand)
      torso.add(arm)
      return { arm, forearm }
    }
    const lA = makeArm(-1), rA = makeArm(1)
    root.add(torso)
    group.add(root)

    return {
      root, torso, head,
      lArm: lA.arm, rArm: rA.arm,
      lForearm: lA.forearm, rForearm: rA.forearm,
      lLeg: lL.hip, rLeg: rL.hip,
      lCalf: lL.calf, rCalf: rL.calf,
      basePos, escape,
    }
  }

  const dummies: Dummy[] = [
    makeDummy([-7.0, 0, 1.2], [-1.5, 2.5]),
    makeDummy([-8.5, 0, -0.8], [-1.5, -2.5]),
    makeDummy([-10.0, 0, 0.6], [-3.5, 0.0]),
  ]

  function applyIdle(d: Dummy, t: number, i: number): void {
    if (i === 0) {
      d.torso.rotation.set(Math.sin(t * 1.8) * 0.04, 0, Math.cos(t * 1.2) * 0.02)
      d.head.rotation.set(-0.05 + Math.sin(t * 1.8) * 0.03, Math.sin(t * 0.9) * 0.15, 0)
      d.lArm.rotation.set(Math.sin(t * 1.5) * 0.06, 0, -0.12); d.rArm.rotation.set(-Math.sin(t * 1.5) * 0.06, 0, 0.12)
      d.lForearm.rotation.set(0.2, 0, 0); d.rForearm.rotation.set(0.2, 0, 0)
      d.lLeg.rotation.set(0, 0, -0.05); d.rLeg.rotation.set(0, 0, 0.05)
      d.lCalf.rotation.set(0, 0, 0); d.rCalf.rotation.set(0, 0, 0)
    } else if (i === 1) {
      d.torso.rotation.set(0.03, 0, -0.05 + Math.sin(t * 1.6) * 0.02)
      d.head.rotation.set(Math.cos(t * 1.4) * 0.04, 0.2 + Math.sin(t * 0.7) * 0.1, 0)
      d.lArm.rotation.set(Math.sin(t * 1.4) * 0.05, 0, -0.1); d.lForearm.rotation.set(0.15, 0, 0)
      d.rArm.rotation.set(0.1, -0.2, 0.55); d.rForearm.rotation.set(0.9, -0.4, 0.3)
      d.lLeg.rotation.set(0.05, 0, -0.08); d.rLeg.rotation.set(-0.05, 0, 0.06)
      d.lCalf.rotation.set(0.04, 0, 0); d.rCalf.rotation.set(0, 0, 0)
    } else {
      d.torso.rotation.set(-0.04 + Math.sin(t * 1.5) * 0.03, 0, 0)
      d.head.rotation.set(-0.08, -0.1 + Math.sin(t * 1.1) * 0.12, 0)
      d.lArm.rotation.set(0.45, 0.3, -0.25); d.lForearm.rotation.set(0.9, -0.5, 0)
      d.rArm.rotation.set(0.48, -0.3, 0.25); d.rForearm.rotation.set(0.85, 0.5, 0)
      d.lLeg.rotation.set(0, 0, -0.05); d.rLeg.rotation.set(0, 0, 0.05)
      d.lCalf.rotation.set(0, 0, 0); d.rCalf.rotation.set(0, 0, 0)
    }
  }

  function applyLand(d: Dummy, k: number, i: number): void {
    if (i === 0) {
      d.root.position.y = -0.52 * k; d.torso.rotation.set(-0.4 * k, 0, 0); d.head.rotation.set(0.1 * k, 0.7 * k, 0)
      d.lLeg.rotation.set(-1.45 * k, 0, -0.15 * k); d.rLeg.rotation.set(-1.4 * k, 0, 0.15 * k)
      d.lCalf.rotation.set(0.25 * k, 0, 0); d.rCalf.rotation.set(0.3 * k, 0, 0)
      d.lArm.rotation.set(0.6 * k, 0, -0.35 * k); d.rArm.rotation.set(0.6 * k, 0, 0.35 * k)
      d.lForearm.rotation.set(0.3 * k, 0, 0); d.rForearm.rotation.set(0.3 * k, 0, 0)
    } else if (i === 1) {
      d.root.position.y = -0.72 * k; d.root.rotation.x = 1.35 * k
      d.torso.rotation.set(0.2 * k, 0, 0); d.head.rotation.set(0.3 * k, 0, 0)
      d.lArm.rotation.set(-2.7 * k, 0, 0.5 * k); d.rArm.rotation.set(-2.7 * k, 0, -0.5 * k)
      d.lForearm.rotation.set(-0.8 * k, 0, 0.8 * k); d.rForearm.rotation.set(-0.8 * k, 0, -0.8 * k)
      d.lLeg.rotation.set(-0.3 * k, 0, -0.2 * k); d.rLeg.rotation.set(-0.2 * k, 0, 0.2 * k)
      d.lCalf.rotation.set(0.4 * k, 0, 0); d.rCalf.rotation.set(0.5 * k, 0, 0)
    } else {
      d.root.position.y = -0.52 * k; d.torso.rotation.set(0.25 * k, 0, 0); d.head.rotation.set(0.2 * k, 0, 0)
      d.lLeg.rotation.set(-1.45 * k, 0, -0.35 * k); d.rLeg.rotation.set(-1.45 * k, 0, 0.35 * k)
      d.lCalf.rotation.set(0.3 * k, 0, 0); d.rCalf.rotation.set(0.3 * k, 0, 0)
      d.lArm.rotation.set(-1.7 * k, 0, -0.2 * k); d.rArm.rotation.set(-1.7 * k, 0, 0.2 * k)
      d.lForearm.rotation.set(-0.9 * k, 0.7 * k, 0); d.rForearm.rotation.set(-0.9 * k, -0.7 * k, 0)
    }
  }

  return {
    group,
    update(t: number, scatterAt: number | null): void {
      if (scatterAt === null || t < scatterAt - 0.8) {
        dummies.forEach((d, i) => {
          d.root.position.set(...d.basePos); d.root.rotation.set(0, Math.PI * 0.5, 0)
          applyIdle(d, t, i)
        })
        return
      }

      const dt = t - (scatterAt - 0.8)

      if (dt < 0.25) {
        const a = dt / 0.25
        dummies.forEach((d) => {
          d.root.position.set(...d.basePos); d.root.rotation.set(0, Math.PI * 0.5, 0)
          d.head.rotation.set(-0.45 * a, 0.3 * a, 0); d.torso.rotation.set(0.1 * a, 0, 0)
          d.lArm.rotation.set(-0.7 * a, 0, -0.3); d.rArm.rotation.set(-0.7 * a, 0, 0.3)
          d.lForearm.rotation.set(-0.4 * a, 0, 0); d.rForearm.rotation.set(-0.4 * a, 0, 0)
          d.lLeg.rotation.set(-0.15 * a, 0, -0.05); d.rLeg.rotation.set(-0.15 * a, 0, 0.05)
          d.lCalf.rotation.set(0.3 * a, 0, 0); d.rCalf.rotation.set(0.3 * a, 0, 0)
        })
        return
      }

      if (dt < 1.2) {
        const runP = (dt - 0.25) / 0.95
        const stride = Math.sin(runP * 18), dist = runP * 0.72, wave = Math.sin(runP * 20)
        dummies.forEach((d) => {
          const targetYaw = Math.atan2(d.escape[0], d.escape[1])
          d.root.rotation.set(0, THREE.MathUtils.lerp(Math.PI * 0.5, targetYaw, Math.min(1, runP * 3)), 0)
          d.root.position.set(d.basePos[0] + d.escape[0] * dist, Math.abs(stride) * 0.08, d.basePos[2] + d.escape[1] * dist)
          d.lLeg.rotation.set(stride * 0.85, 0, -0.05); d.rLeg.rotation.set(-stride * 0.85, 0, 0.05)
          d.lCalf.rotation.set(Math.max(0, -stride * 1.2), 0, 0); d.rCalf.rotation.set(Math.max(0, stride * 1.2), 0, 0)
          d.lArm.rotation.set(-2.4 + wave * 0.3, 0, -0.4); d.rArm.rotation.set(-2.4 - wave * 0.3, 0, 0.4)
          d.lForearm.rotation.set(-0.5, 0, 0); d.rForearm.rotation.set(-0.5, 0, 0)
          d.torso.rotation.set(0.2, 0, wave * 0.1); d.head.rotation.set(-0.3, 0, 0)
        })
        return
      }

      const slideP = Math.min(1, (dt - 1.2) / 0.8)
      const k = 1 - Math.pow(1 - slideP, 2), dist = 0.72 + 0.28 * k
      dummies.forEach((d, i) => {
        d.root.rotation.set(0, Math.atan2(d.escape[0], d.escape[1]), 0)
        d.root.position.set(d.basePos[0] + d.escape[0] * dist, 0, d.basePos[2] + d.escape[1] * dist)
        applyLand(d, k, i)
      })
    },
    dispose(): void {
      geoms.forEach((g) => g.dispose())
      woodMat.dispose()
      jointMat.dispose()
      helmetMat.dispose()
    },
  }
}
