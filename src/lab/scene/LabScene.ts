import * as THREE from 'three'
import { simulateArm } from '../sim/trebuchet'
import type { ArmSample, FlightSample, ShotResult, TrebuchetParams } from '../sim/types'
import type { Target } from '../levels/types'
import { ShotAnnotations } from './annotations'
import { cameraAt } from './camera'
import { CameraRig } from './cameraRig'
import { Cutaway } from './cutaway'
import { createCrew, type Crew } from './crew'
import { ForceArrows, ImpactBurst, PathLine, PredictionMarker } from './effects'
import type { Environment, EnvironmentFactory } from './environments/types'
import { armAt, flightAt } from './sampling'
import { skyEnvironment } from './sky'
import { RetroPass } from './retroPass'
import { createTrebuchet, type MachineSkin, type TrebuchetModel } from './trebuchetModel'

export interface ShotView {
  shot: ShotResult
  ghost?: FlightSample[] // reference flight drawn as a dashed line
  crewScatterAt?: number | null
  hitIndex?: number | null
}

const TAIL_AFTER_LANDING = 3 // seconds the scene keeps running after impact
const NO_LANDING_SHOWN = 6 // seconds of a flight that never lands
const SKIRT_RADIUS = 3000 // m, far past every fog distance

/**
 * Owns the renderer and everything in the 3D world. React talks to it through
 * setters; the frame for any time t is a pure function of the current shot.
 */
export class LabScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 3000)
  private env: Environment | null = null
  private skirt: THREE.Mesh | null = null
  private envMap: THREE.WebGLRenderTarget | null = null
  private machine: TrebuchetModel | null = null
  private idle: ArmSample | null = null
  private crew: Crew
  private readonly stone: THREE.Mesh
  private readonly trail = new PathLine('#ffe2a8', 0.9, false)
  private readonly ghost = new PathLine('#ffffff', 0.45, true)
  private readonly burst = new ImpactBurst()
  private readonly splinters = new ImpactBurst(90)
  private pivotY = 4
  private readonly marker = new PredictionMarker()
  private readonly arrows = new ForceArrows()
  private readonly notes = new ShotAnnotations()
  // The last three throws stay as fading lines, so attempts can be compared by eye.
  private readonly past = [0.38, 0.24, 0.13].map((o) => new PathLine('#ffb4a2', o, false))
  private pastFlights: FlightSample[][] = []
  private baseSpeed = 1
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
  private retro: RetroPass | null = null

  private readonly canvas: HTMLCanvasElement
  private readonly rig: CameraRig
  private readonly cutaway = new Cutaway()

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
    this.scene.add(this.crew.group, this.stone, this.trail.line, this.ghost.line, this.burst.points, this.splinters.points, this.marker.group, this.arrows.group, this.notes.group, ...this.past.map((p) => p.line))
    this.rig = new CameraRig(this.camera, canvas)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.resize()
    this.raf = requestAnimationFrame(this.loop)
  }

  setEnvironment(factory: EnvironmentFactory, targets: Target[], maxX: number, wind = 0): void {
    this.cutaway.restore()
    this.env?.dispose()
    if (this.env) this.scene.remove(this.env.group)
    this.targets = targets
    this.focusX = targets[0]?.x ?? maxX * 0.6
    this.env = factory({ targets, maxX, wind })
    this.scene.add(this.env.group)
    this.setSkirt(this.env.skirt ?? null)
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

  /** A huge flat disc just below the ground plane: fogged into the horizon instead of a visible edge. */
  private setSkirt(color: string | null): void {
    if (this.skirt) {
      this.scene.remove(this.skirt)
      this.skirt.geometry.dispose()
      ;(this.skirt.material as THREE.Material).dispose()
      this.skirt = null
    }
    if (!color) return
    const geo = new THREE.CircleGeometry(SKIRT_RADIUS, 48).rotateX(-Math.PI / 2)
    this.skirt = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }))
    this.skirt.position.y = -1.5
    this.scene.add(this.skirt)
  }

  setTrebuchet(p: TrebuchetParams, skin: MachineSkin = 'wood'): void {
    if (this.machine) {
      this.scene.remove(this.machine.group)
      this.machine.dispose()
    }
    this.machine = createTrebuchet(p, skin)
    this.idle = simulateArm(p, 9.81, { duration: 0 }).arm[0]
    this.pivotY = p.H
    this.scene.add(this.machine.group)
    const s = this.stone.geometry as THREE.IcosahedronGeometry
    this.stone.scale.setScalar(p.r / s.parameters.radius)
    this.render()
  }

  /** Load a shot and play it from the trigger. */
  setShot(view: ShotView | null): void {
    const previous = this.view?.shot.flight
    this.pastFlights = view === null ? [] : previous?.length ? [previous, ...this.pastFlights].slice(0, this.past.length) : this.pastFlights
    this.past.forEach((line, i) => {
      line.set(this.pastFlights[i] ?? [])
      line.reveal(Infinity)
    })
    this.view = view
    this.trail.set(view?.shot.flight ?? [])
    this.ghost.set(view?.ghost ?? [])
    const landing = view?.shot.landing ?? null
    this.burst.trigger(landing?.x ?? 0, landing ? landing.t : null)
    const snapped = view?.shot.breakage?.kind === 'beam' ? view.shot.breakage.t : null
    this.splinters.trigger(0, snapped, this.pivotY)
    this.notes.set(view?.shot ?? null)
    this.env?.setHit(null)
    this.speed = this.baseSpeed
    this.t = 0
    this.playing = view !== null
    this.render()
  }

  setPrediction(landingX: number | null, apex: { x: number; y: number } | null): void {
    this.marker.set(landingX, apex)
    this.render()
  }

  /** Late-90s pixel pass; the canvas keeps its size, only the internal resolution drops. */
  setRetro(on: boolean): void {
    if (on === (this.retro !== null)) return
    this.retro?.dispose()
    this.retro = on ? new RetroPass() : null
    this.resize()
  }

  /** Environments that have warning beacons expose setAlarm on their group. */
  setAlarm(on: boolean): void {
    const fn = this.env?.group.userData.setAlarm as ((v: boolean) => void) | undefined
    fn?.(on)
  }

  setXray(on: boolean): void {
    this.xray = on
    this.render()
  }

  setSpeed(speed: number): void {
    this.speed = speed
  }

  /** Slow motion for every shot from now on, so there is time to turn the camera. */
  setSlowMotion(on: boolean): void {
    this.baseSpeed = on ? 0.35 : 1
    this.speed = this.baseSpeed
  }

  replay(speed = this.baseSpeed): void {
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
    this.notes.reveal(t)
    this.ghost.reveal(Infinity)
    this.burst.update(t)
    this.splinters.update(t)
    this.arrows.update(stoneNow && !landed ? stoneNow : null, this.xray)
    this.crew.update(t, this.view?.crewScatterAt ?? null)
    this.moveTargets(t)
    if (landed && this.view?.hitIndex !== undefined && this.view.hitIndex !== null) this.env?.setHit(this.view.hitIndex)
    this.env?.update(performance.now() / 1000)

    const landSample = shot?.landing ? (shot.flight.at(-1) ?? null) : null
    const cam = cameraAt(t, this.camera.aspect, stoneNow, shot?.releaseT ?? null, landSample, this.focusX)
    this.rig.apply(cam, stoneNow && !landed ? new THREE.Vector3(stoneNow.x, Math.max(stoneNow.y, 0.15), 0) : null)
    this.cutaway.update(this.env?.indoor ? this.env.group : null, this.camera.position, this.rig.target)
    if (this.retro) this.retro.render(this.renderer, this.scene, this.camera)
    else this.renderer.render(this.scene, this.camera)
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
    const buffer = this.renderer.getDrawingBufferSize(new THREE.Vector2())
    this.retro?.setSize(buffer.x, buffer.y)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.render()
  }

  /** Free orbit camera (the student dragged or zoomed) or the cinematic one. */
  onCameraMode(cb: ((free: boolean) => void) | null): void {
    this.rig.onModeChange(cb)
  }

  autoCamera(): void {
    this.rig.backToAuto()
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    this.rig.dispose()
    this.resizeObserver.disconnect()
    this.env?.dispose()
    this.setSkirt(null)
    this.envMap?.dispose()
    this.machine?.dispose()
    this.crew.dispose()
    ;[this.trail, this.ghost, this.burst, this.splinters, this.marker, this.arrows, this.notes, ...this.past].forEach((x) => x.dispose())
    this.stone.geometry.dispose()
    ;(this.stone.material as THREE.Material).dispose()
    this.retro?.dispose()
    this.renderer.dispose()
  }
}
