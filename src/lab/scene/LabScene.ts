import * as THREE from 'three'
import { simulateArm } from '../sim/trebuchet'
import type { ArmSample, FlightSample, ShotResult, TrebuchetParams } from '../sim/types'
import type { Target } from '../levels/types'
import { cameraAt } from './camera'
import { createCrew, type Crew } from './crew'
import { ForceArrows, ImpactBurst, PathLine, PredictionMarker } from './effects'
import type { Environment, EnvironmentFactory } from './environments/types'
import { armAt, flightAt } from './sampling'
import { skyEnvironment } from './sky'
import { createTrebuchet, type TrebuchetModel } from './trebuchetModel'

export interface ShotView {
  shot: ShotResult
  ghost?: FlightSample[] // reference flight drawn as a dashed line
  crewScatterAt?: number | null
  hitIndex?: number | null
}

const TAIL_AFTER_LANDING = 3 // seconds the scene keeps running after impact
const NO_LANDING_SHOWN = 6 // seconds of a flight that never lands

/**
 * Owns the renderer and everything in the 3D world. React talks to it through
 * setters; the frame for any time t is a pure function of the current shot.
 */
export class LabScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 3000)
  private env: Environment | null = null
  private envMap: THREE.WebGLRenderTarget | null = null
  private machine: TrebuchetModel | null = null
  private idle: ArmSample | null = null
  private crew: Crew
  private readonly stone: THREE.Mesh
  private readonly trail = new PathLine('#ffe2a8', 0.9, false)
  private readonly ghost = new PathLine('#ffffff', 0.45, true)
  private readonly burst = new ImpactBurst()
  private readonly marker = new PredictionMarker()
  private readonly arrows = new ForceArrows()
  private view: ShotView | null = null
  private targets: Target[] = []
  private focusX = 60
  private t = 0
  private playing = false
  private speed = 1
  private xray = false
  private lastFrame = 0
  private raf = 0
  private onTime: ((t: number, done: boolean) => void) | null = null
  private readonly resizeObserver: ResizeObserver

  private readonly canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMappingExposure = 1.2
    this.crew = createCrew()
    this.stone = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.15, 1),
      new THREE.MeshStandardMaterial({ color: '#8c8a85', flatShading: true }),
    )
    this.stone.castShadow = true
    this.stone.visible = false
    this.scene.add(this.crew.group, this.stone, this.trail.line, this.ghost.line, this.burst.points, this.marker.group, this.arrows.group)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.resize()
    this.raf = requestAnimationFrame(this.loop)
  }

  setEnvironment(factory: EnvironmentFactory, targets: Target[], maxX: number): void {
    this.env?.dispose()
    if (this.env) this.scene.remove(this.env.group)
    this.targets = targets
    this.focusX = targets[0]?.x ?? maxX * 0.6
    this.env = factory({ targets, maxX })
    this.scene.add(this.env.group)
    this.scene.fog = this.env.fog
    this.scene.background = this.env.background
    this.envMap?.dispose()
    this.envMap = null
    this.scene.environment = null
    const sky = this.env.group.children.find((c) => c.userData.isSky) as THREE.Mesh | undefined
    if (sky) {
      this.envMap = skyEnvironment(this.renderer, sky)
      this.scene.environment = this.envMap.texture
      this.scene.environmentIntensity = 0.55
    }
    this.render()
  }

  setTrebuchet(p: TrebuchetParams): void {
    if (this.machine) {
      this.scene.remove(this.machine.group)
      this.machine.dispose()
    }
    this.machine = createTrebuchet(p)
    this.idle = simulateArm(p, 9.81, { duration: 0 }).arm[0]
    this.scene.add(this.machine.group)
    const s = this.stone.geometry as THREE.IcosahedronGeometry
    this.stone.scale.setScalar(p.r / s.parameters.radius)
    this.render()
  }

  /** Load a shot and play it from the trigger. */
  setShot(view: ShotView | null): void {
    this.view = view
    this.trail.set(view?.shot.flight ?? [])
    this.ghost.set(view?.ghost ?? [])
    const landing = view?.shot.landing ?? null
    this.burst.trigger(landing?.x ?? 0, landing ? landing.t : null)
    this.env?.setHit(null)
    this.t = 0
    this.playing = view !== null
    this.render()
  }

  setPrediction(landingX: number | null, apex: { x: number; y: number } | null): void {
    this.marker.set(landingX, apex)
    this.render()
  }

  setXray(on: boolean): void {
    this.xray = on
    this.render()
  }

  setSpeed(speed: number): void {
    this.speed = speed
  }

  replay(speed = this.speed): void {
    this.speed = speed
    this.t = 0
    this.playing = this.view !== null
    this.env?.setHit(null)
  }

  /** Called every frame while playing; done = the shot (plus aftermath) is over. */
  onTimeUpdate(cb: ((t: number, done: boolean) => void) | null): void {
    this.onTime = cb
  }

  /** Ground x under a screen point, for placing the prediction flag. */
  groundXAt(clientX: number, clientY: number): number | null {
    const rect = this.canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(ndc, this.camera)
    const hit = new THREE.Vector3()
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit) ? hit.x : null
  }

  private endTime(): number {
    const shot = this.view?.shot
    if (!shot) return 0
    const armEnd = shot.arm.at(-1)?.t ?? 0
    if (!shot.released) return armEnd
    const releaseT = shot.releaseT ?? 0
    // A stone that never comes down (no gravity in student code) gets a few seconds of fame, not forty.
    return shot.landing ? Math.max(shot.landing.t + TAIL_AFTER_LANDING, releaseT + 1.5) : releaseT + NO_LANDING_SHOWN
  }

  private readonly loop = (now: number) => {
    const dt = this.lastFrame ? Math.min(0.05, (now - this.lastFrame) / 1000) : 0
    this.lastFrame = now
    if (this.playing) {
      this.t += dt * this.speed
      const end = this.endTime()
      if (this.t >= end) {
        this.t = end
        this.playing = false
      }
      this.onTime?.(this.t, !this.playing)
    }
    this.render()
    this.raf = requestAnimationFrame(this.loop)
  }

  private render(): void {
    const t = this.t
    const shot = this.view?.shot ?? null
    const arm = shot ? armAt(shot.arm, t) : null
    const stoneNow = shot ? flightAt(shot.flight, t) : null
    const pose = arm ?? this.idle
    if (this.machine && pose) this.machine.pose(pose.theta, pose.phi, pose.released)
    const landed = shot?.landing && t >= shot.landing.t
    this.stone.visible = stoneNow !== null && !(landed && (this.view?.hitIndex ?? null) !== null)
    if (stoneNow) this.stone.position.set(stoneNow.x, Math.max(stoneNow.y, 0.15), 0)
    this.trail.reveal(t)
    this.ghost.reveal(Infinity)
    this.burst.update(t)
    this.arrows.update(stoneNow && !landed ? stoneNow : null, this.xray)
    this.crew.update(t, this.view?.crewScatterAt ?? null)
    this.moveTargets(t)
    if (landed && this.view?.hitIndex !== undefined && this.view.hitIndex !== null) this.env?.setHit(this.view.hitIndex)
    this.env?.update(performance.now() / 1000)

    const landSample = shot?.landing ? (shot.flight.at(-1) ?? null) : null
    const cam = cameraAt(t, this.camera.aspect, stoneNow, shot?.releaseT ?? null, landSample, this.focusX)
    this.camera.position.copy(cam.position)
    this.camera.lookAt(cam.target)
    this.renderer.render(this.scene, this.camera)
  }

  private moveTargets(t: number): void {
    const objects = this.env?.group.userData.targets as THREE.Object3D[] | undefined
    if (!objects) return
    this.targets.forEach((tg, i) => {
      const obj = objects[i]
      if (obj && tg.moving) obj.position.x = tg.x + tg.moving.speed * Math.max(0, t - (this.view?.shot.releaseT ?? t))
    })
  }

  private resize(): void {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (w === 0 || h === 0) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.render()
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    this.resizeObserver.disconnect()
    this.env?.dispose()
    this.envMap?.dispose()
    this.machine?.dispose()
    this.crew.dispose()
    ;[this.trail, this.ghost, this.burst, this.marker, this.arrows].forEach((x) => x.dispose())
    this.stone.geometry.dispose()
    ;(this.stone.material as THREE.Material).dispose()
    this.renderer.dispose()
  }
}
