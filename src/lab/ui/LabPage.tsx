import { tr } from '../../i18n'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { isMuted, playSfx, setMuted } from '../audio/sfx'
import type { FailureEvent } from '../failures/types'
import { findMission, nextMission } from '../levels'
import type { Mission, SliderValues } from '../levels/types'
import { isPythonReady, warmUpPython } from '../python/runStudent'
import { LabScene } from '../scene/LabScene'
import { useLabProgress } from '../state/labProgress'
import { ActBar, type View } from './ActBar'
import { CalcPanel, type ShotLogRow } from './CalcPanel'
import { CameraChip } from './CameraChip'
import { OutOfLives } from './OutOfLives'
import { launchSheet } from '../calc/launchSheet'
import { withSliders } from '../levels/evaluate'
import { CoachMarks, type CoachStep } from './CoachMarks'
import { coachDone } from './coachStore'
import { MissionIntro } from './MissionIntro'
import { useIsDesktop, useIsShort, useIsWide } from './useIsDesktop'
import { useConsoleMission, useMissionBridge } from '../console/useConsoleMission'
import { defaultQuality, saveQuality, type FxQuality } from '../scene/postFx'
import { CodeDrawer } from './CodeDrawer'
import { ControlPanel } from './ControlPanel'
import { IncidentCard } from './IncidentCard'
import { IncidentJournal } from './IncidentJournal'
import { MissionBrief } from './MissionBrief'
import { Placard } from './Placard'
import { ResultBanner } from './ResultBanner'
import { SolutionDesk } from './SolutionDesk'
import { storyFor } from '../levels/story'
import { useMissionRun, type ShotRecord } from './useMissionRun'
import './lab.css'
import './sigma.css'
import { playSigma } from '../audio/packs/sigma'
import { applyCopy, getUniverse, type Universe } from '../universe'
import { tellLine } from '../universe/failureCopy'
import { useUniverse } from '../universe/useUniverse'

type Phase = 'idle' | 'flying' | 'landed'

const COACH: CoachStep[] = [
  { target: 'goal', title: tr('Герой и задание'), text: tr('Здесь история и коротко — что сделать. Промах отнимает жизнь, поэтому сначала считай, потом стреляй.') },
  { target: 'calc', title: tr('Дано, формулы, расчёт'), text: tr('Все числа для расчёта, нужные формулы и пошаговая проверка твоих вычислений. Проверка жизни не тратит.') },
  { target: 'fire', title: tr('Ответ и выстрел'), text: tr('Впиши свой ответ или настройку и жми «Огонь» (или пробел), когда расчёт сходится.') },
  { target: 'view', title: tr('Стол и поле'), text: tr('Переключайся между столом решений и полем, чтобы посмотреть на выстрел и покрутить камеру.') },
]

const COACH_FORMAL: CoachStep[] = [
  { target: 'goal', title: tr('Распоряжение и задание'), text: tr('Здесь распоряжение отдела и краткое задание. Неудачный пуск списывает допуск: сначала расчёт, потом пуск.') },
  { target: 'calc', title: tr('Исходные данные и расчёт'), text: tr('Исходные данные, формулы и пошаговая проверка вашего расчёта. Проверка допусков не тратит.') },
  { target: 'fire', title: tr('Ответ и пуск'), text: tr('Введите ответ или настройку и дайте команду «Огонь» (или пробел), когда расчёт сходится.') },
  { target: 'view', title: tr('Стол и полигон'), text: tr('Переключайтесь между столом решений и полигоном, чтобы наблюдать пуск.') },
]

export function LabPage() {
  const { missionId } = useParams()
  const mission = missionId ? findMission(missionId) : undefined
  if (!mission) return <Navigate to="/trebuchet" replace />
  return <MissionView key={mission.id} mission={mission} />
}

function useLabScene(mission: Mission, universe: Universe) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<LabScene | null>(null)
  const [freeCamera, setFreeCamera] = useState(false)
  useEffect(() => {
    if (!canvasRef.current) return
    const scene = new LabScene(canvasRef.current)
    scene.onCameraMode(setFreeCamera)
    const maxX = Math.max(110, ...mission.targets.map((t) => t.x * 1.5))
    // A sector this universe has not built yet falls back to Classic rather than an empty void.
    const env = universe.envFor(mission.chapter) ?? getUniverse('classic').envFor(mission.chapter)!
    scene.setEnvironment(env, mission.targets, maxX, mission.base.world.wind)
    const skin = universe.envFor(mission.chapter) ? universe.machine : 'wood'
    if (mission.base.launcher) scene.setLauncher(mission.base.launcher, skin)
    else scene.setTrebuchet(mission.base.trebuchet, skin)
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [mission, universe])
  return { canvasRef, sceneRef, freeCamera }
}

function MissionView({ mission }: { mission: Mission }) {
  const navigate = useNavigate()
  const universe = useUniverse()
  const told = applyCopy(mission, universe)
  const sigma = universe.id === 'sigma'
  const { canvasRef, sceneRef, freeCamera } = useLabScene(mission, universe)
  const pressAt = useRef<{ x: number; y: number } | null>(null)
  const [retro, setRetro] = useState(universe.retroByDefault)
  const [quality, setQuality] = useState<FxQuality>(defaultQuality)
  useEffect(() => sceneRef.current?.setRetro(retro), [retro, sceneRef, universe])
  // The console may bend gravity (sv_gravity) or forgive misses (god); `played` is the mission as it now runs.
  const { cvars, played, cheated } = useConsoleMission(mission)
  const run = useMissionRun(played, { god: cvars.god })
  const progress = useLabProgress()
  const [values, setValues] = useState<SliderValues>(() => Object.fromEntries(mission.sliders.map((s) => [s.key, s.start])))
  const releaseDeg = values.releaseDeg ?? mission.base.trebuchet.releaseDeg
  const [prediction, setPrediction] = useState<number | null>(null)
  // Every mission opens on the solution desk; the field is for watching the shot.
  const [view, setView] = useState<View>('desk')
  const [code, setCode] = useState(mission.code?.starter ?? '')
  const [phase, setPhase] = useState<Phase>('idle')
  const [incidents, setIncidents] = useState<Array<{ event: FailureEvent; isNew: boolean }>>([])
  const incident = incidents[0] ?? null
  const [journalOpen, setJournalOpen] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const [pythonReady, setPythonReady] = useState(isPythonReady())
  const cues = useRef({ whoosh: false, thud: false })
  const [log, setLog] = useState<ShotLogRow[]>([])
  // The launch the current setting will produce, sketched on the machine (not where computing vx, vy is the task).
  const sheet = useMemo(() => (mission.code?.fn === 'launch_velocity' ? null : launchSheet(withSliders(played, values))), [mission, played, values])
  useEffect(() => sceneRef.current?.setPreview(sheet), [sheet, sceneRef, universe])
  // A launcher slider (its position) moves the tower itself.
  const launcher = useMemo(() => withSliders(mission, values).launcher, [mission, values])
  useEffect(() => {
    if (launcher) sceneRef.current?.setLauncher(launcher, universe.envFor(mission.chapter) ? universe.machine : 'wood')
  }, [launcher, sceneRef, universe, mission.chapter])
  const [intro, setIntro] = useState(true)
  const [coach, setCoach] = useState(false)
  const [slow, setSlow] = useState(false)
  useEffect(() => sceneRef.current?.setSlowMotion(slow), [slow, sceneRef, universe])

  useEffect(() => {
    if (!mission.code) return
    warmUpPython()
    const id = setInterval(() => setPythonReady(isPythonReady()), 500)
    return () => clearInterval(id)
  }, [mission.code])

  useEffect(() => sceneRef.current?.setXray(true), [sceneRef, universe])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !mission.predict) return
    if (mission.predict.quantity === 'landingX') scene.setPrediction(prediction, null)
    else scene.setPrediction(null, prediction === null ? null : { x: 22, y: prediction })
  }, [prediction, mission.predict, sceneRef])

  const finishShot = useCallback(
    (record: ShotRecord) => {
      setPhase('landed')
      if (record.failures.length > 0) {
        setIncidents(record.failures.map((event) => ({ event, isNew: progress.recordIncident(event.id) })))
        if (sigma) {
          playSigma('alarm')
          sceneRef.current?.setAlarm(true)
          setTimeout(() => sceneRef.current?.setAlarm(false), 3500)
        } else playSfx('fail')
      } else if (record.hits.length > 0 || (record.predictionError !== null && mission.predict && Math.abs(record.predictionError) <= mission.predict.tolerance)) {
        playSfx('success')
      }
    },
    [progress, mission.predict, sigma, sceneRef],
  )

  const fire = useCallback(async () => {
    const scene = sceneRef.current
    if (!scene) return
    setIncidents([])
    // On a phone the desk covers the scene: switch to the field to watch the shot.
    if (!window.matchMedia('(min-width: 1024px) and (min-height: 521px)').matches) setView('field')
    const record = await run.fire({ values, code, prediction })
    if (!record) return
    const { shot } = record
    setLog((rows) => [
      ...rows,
      {
        values,
        v0: shot.launch?.speed ?? null,
        alphaDeg: shot.launch?.angleDeg ?? null,
        range: shot.landing?.x ?? null,
        time: shot.landing && shot.releaseT !== null ? shot.landing.t - shot.releaseT : null,
        apex: shot.apex?.y ?? null,
      },
    ])
    const selfHit = record.failures.find((f) => f.id === 'self_hit')
    // This shot's labels hide the predicted value unless this very prediction was right (or the mission is won).
    const predictedRight = record.predictionError !== null && mission.predict !== undefined && Math.abs(record.predictionError) <= mission.predict.tolerance
    const shotSecret = mission.predict && !predictedRight && !run.won ? mission.predict.quantity : null
    cues.current = { whoosh: false, thud: false }
    scene.setShot({ shot, ghost: record.ghost, crewScatterAt: selfHit ? selfHit.t : null, hitIndex: record.hits[0] ?? null, secret: shotSecret })
    setPhase('flying')
    if (sigma) playSigma('hydraulic')
    else playSfx('creak')
    scene.onTimeUpdate((t, done) => {
      if (!cues.current.whoosh && shot.releaseT !== null && t >= shot.releaseT) {
        cues.current.whoosh = true
        playSfx('whoosh')
      }
      if (!cues.current.thud && shot.landing && t >= shot.landing.t) {
        cues.current.thud = true
        if (sigma && !selfHit) playSigma('impactConcrete')
        else playSfx(selfHit ? 'crack' : 'thud')
      }
      if (done) {
        scene.onTimeUpdate(null)
        finishShot(record)
      }
    })
  }, [sceneRef, run, values, code, prediction, finishShot, sigma, mission.predict])

  useEffect(() => {
    // A win under console cheats is not saved.
    if (run.won && !cheated) progress.complete(mission.id, run.stars)
    // progress.complete is stable; only react to a new win
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.won, run.stars, mission.id, cheated])

  // A click places the flag; a drag only turns the camera.
  // Space fires, unless the student is typing a number or code.
  const fireRef = useRef(fire)
  fireRef.current = fire
  // What a prediction asks for stays hidden everywhere until it is predicted right.
  const secret = mission.predict && !run.won ? mission.predict.quantity : null
  const canFire = phase !== 'flying' && (run.lives > 0 || run.won) && (!mission.predict || prediction !== null)
  useMissionBridge({
    current: { id: mission.id, title: told.title, g: mission.base.world.g, lives: run.lives, shots: run.shots },
    fire: () => {
      if (!canFire || intro) return false
      void fireRef.current()
      return true
    },
    refillLives: () => {
      run.refill()
      return true
    },
  })
  useEffect(() => sceneRef.current?.setTimescale(cvars.host_timescale), [cvars.host_timescale, sceneRef, universe])
  // `?clean` (for capturing backdrop frames) hides the distance marks whatever the console says.
  const clean = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('clean')
  useEffect(() => sceneRef.current?.setMarksVisible(cvars.r_drawmarks && !clean), [cvars.r_drawmarks, clean, sceneRef, universe])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.code !== 'Space' || intro || coach || el?.closest('input, textarea, [contenteditable], .monaco-editor, button')) return
      e.preventDefault()
      if (phase !== 'flying' && !mission.code && (run.lives > 0 || run.won) && (!mission.predict || prediction !== null)) void fireRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, mission, run.lives, run.won, prediction, intro, coach])

  const placePrediction = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const down = pressAt.current
    pressAt.current = null
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return
    if (mission.predict?.quantity !== 'landingX' || phase === 'flying') return
    const x = sceneRef.current?.groundXAt(e.clientX, e.clientY)
    if (x === null || x === undefined) return
    setPrediction(Math.round(Math.max(mission.predict.min, Math.min(mission.predict.max, x)) * 2) / 2)
  }

  const next = nextMission(mission.id)
  const showCode = Boolean(mission.code)
  const fireLabel = mission.code ? tr('Огонь (с твоим кодом)') : tr('Огонь')

  const desktop = useIsDesktop()
  const short = useIsShort()
  // Desk and field side by side only on wide screens; elsewhere the desk takes the screen and the field is a tap away.
  const deskWide = useIsWide()
  // On a low landscape phone the right dock has room only for the controls; the numbers scroll on the left.
  const calcInDock = desktop && !showCode && !short
  const chipsInDock = !desktop
  const calc = <CalcPanel secret={secret} mission={played} values={values} log={log} onHighlight={(p) => sceneRef.current?.highlightPreview(p)} />
  const restart = () => {
    run.reset()
    setLog([])
    setPhase('idle')
    sceneRef.current?.setShot(null)
  }
  const feedback =
    phase !== 'landed' ? null : incident ? (
      <IncidentCard
        event={incident.event}
        isNew={incident.isNew}
        fixedLaunch={mission.base.launcher !== undefined}
        onClose={() => setIncidents((q) => q.slice(1))}
        onReplaySlow={() => {
          setPhase('flying')
          sceneRef.current?.replay(0.25)
          sceneRef.current?.onTimeUpdate((_, done) => done && setPhase('landed'))
        }}
      />
    ) : run.lives === 0 && !run.won ? (
      <OutOfLives formal={sigma} onRestart={restart} />
    ) : (
      <ResultBanner
        mission={mission}
        record={run.last}
        won={run.won}
        stars={run.stars}
        onNext={next ? () => navigate(`/trebuchet/${next.id}`) : undefined}
        onFinish={() => navigate('/trebuchet')}
        formal={sigma}
      />
    )
  const chips = <CameraChip free={freeCamera} onAuto={() => sceneRef.current?.autoCamera()} slow={slow} onSlow={() => setSlow(!slow)} compact={short} />
  const placard = (
    <Placard
      shot={run.last?.shot ?? null}
      releaseDeg={releaseDeg}
      secret={secret}
      idleLine={mission.base.launcher ? (sigma ? tr('Пусковая установка заряжена. Огонь — по готовности расчёта.') : tr('Камень лежит в лотке. Посчитай — и жми «Огонь».')) : undefined}
      beamLimit={mission.base.trebuchet.beamStrength}
      movingLabel={universe.terms.movingTarget}
      tell={(line) => tellLine(line, universe)}
      phase={phase}
      movingTargetSpeed={mission.targets.find((t) => t.moving)?.moving?.speed}
    />
  )

  const deskOpen = view === 'desk'
  const answer = showCode ? (
    <div className="h-[460px] max-h-[70vh] shrink-0">
      <CodeDrawer
        code={code}
        onChange={setCode}
        onRun={fire}
        onReset={() => setCode(mission.code!.starter)}
        busy={run.busy || phase === 'flying'}
        error={run.codeError}
        stdout={run.stdout}
        pythonReady={pythonReady}
        runLabel={mission.base.launcher ? tr('▶ Запустить') : undefined}
      />
    </div>
  ) : (
    <ControlPanel
      mission={mission}
      values={values}
      onValue={(key, v) => setValues((cur) => ({ ...cur, [key]: v }))}
      prediction={prediction}
      onPrediction={setPrediction}
      canFire={canFire}
      busy={run.busy}
      onFire={fire}
      fireLabel={fireLabel}
    />
  )
  const desk = (
    <SolutionDesk
      mission={told}
      world={universe.id}
      story={storyFor(mission.id, universe.id)}
      lives={run.lives}
      shots={run.shots}
      feedback={feedback}
      calc={<CalcPanel stacked theory={mission.theory} secret={secret} mission={played} values={values} log={log} onHighlight={(p) => sceneRef.current?.highlightPreview(p)} />}
      answer={answer}
      answerInline={showCode}
      onField={() => setView('field')}
      onReread={() => setIntro(true)}
    />
  )

  return (
    <div className="lab-root fixed inset-0 overflow-hidden" data-universe={universe.id}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block touch-none"
        onPointerDown={(e) => (pressAt.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={placePrediction}
      />

      <div className={`absolute top-0 inset-x-0 z-30 p-2 md:p-3 flex flex-col gap-2 pointer-events-none [&>*]:pointer-events-auto ${deskOpen ? 'bottom-0' : ''}`}>
        <ActBar
          mission={told}
          retro={retro}
          onRetro={() => setRetro(!retro)}
          quality={quality}
          onQuality={(q) => {
            setQuality(q)
            saveQuality(q)
            sceneRef.current?.setQuality(q)
          }}
          view={view}
          onView={setView}
          incidents={progress.incidents.length}
          onJournal={() => setJournalOpen(true)}
          muted={muted}
          onMute={() => {
            setMuted(!muted)
            setMutedState(!muted)
          }}
        />

        {deskOpen && <div className={deskWide ? 'absolute left-3 top-[72px] bottom-3 w-[clamp(380px,44vw,640px)] flex' : 'flex-1 min-h-0 flex'}>{desk}</div>}
        {/* Story column (field view): what just happened and the task. Fades while the stone flies. */}
        {!deskOpen && <div
          className={`w-[min(340px,100%)] md:absolute md:left-3 md:top-[72px] flex flex-col gap-2 overflow-y-auto transition-opacity duration-300 ${
            feedback ? 'max-h-[62vh]' : showCode ? 'max-h-[20vh]' : 'max-h-[38vh]'
          } md:max-h-[calc(100vh-72px-150px)] ${phase === 'flying' ? 'opacity-35 hover:opacity-100' : ''}`}
        >
          {feedback}
          <MissionBrief mission={told} shots={run.shots} hitSoFar={run.hitSoFar} lives={run.lives} onReread={() => setIntro(true)} />
          {!calcInDock && calc}
        </div>}
      </div>

      {/* Field view dock: numbers on top, controls under them; never overlapping. */}
      {!deskOpen && <div
        className={`absolute bottom-0 inset-x-0 p-2 flex flex-col items-end gap-2 pointer-events-none [&>*]:pointer-events-auto md:p-0 md:inset-x-auto md:right-3 md:top-[72px] md:bottom-[96px] ${
          showCode ? 'md:w-[min(460px,calc(100vw-380px))]' : 'md:w-[360px]'
        } transition-opacity duration-300 ${phase === 'flying' ? 'md:opacity-35 md:hover:opacity-100' : ''}`}
      >
        {showCode ? (
          <div className="w-full h-[34vh] md:h-full">
            <CodeDrawer
              code={code}
              onChange={setCode}
              onRun={fire}
              onReset={() => setCode(mission.code!.starter)}
              busy={run.busy || phase === 'flying'}
              error={run.codeError}
              stdout={run.stdout}
              pythonReady={pythonReady}
              runLabel={mission.base.launcher ? tr('▶ Запустить') : undefined}
            />
          </div>
        ) : (
          <>
            {calcInDock && <div className="w-full min-h-0 flex-1 overflow-y-auto">{calc}</div>}
            <div className="w-[min(320px,100%)] md:w-full shrink-0">
              <ControlPanel
                mission={mission}
                values={values}
                onValue={(key, v) => setValues((cur) => ({ ...cur, [key]: v }))}
                prediction={prediction}
                onPrediction={setPrediction}
                canFire={phase !== 'flying' && (run.lives > 0 || run.won) && (!mission.predict || prediction !== null)}
                busy={run.busy}
                onFire={fire}
                fireLabel={fireLabel}
              />
            </div>
          </>
        )}
        {chipsInDock && <div className="self-end max-w-full min-w-0">{chips}</div>}
        <div className="w-full md:hidden">{placard}</div>
      </div>}

      {/* Beside the desk: camera chips stacked over the placard, so a two-line placard never runs into them. */}
      {deskOpen && deskWide && (
        <div className="absolute bottom-0 right-0 p-3 left-[calc(clamp(380px,44vw,640px)+12px)] flex flex-col items-start gap-2 pointer-events-none [&>*]:pointer-events-auto">
          <div className="max-w-full min-w-0">{chips}</div>
          <div className="w-full">{placard}</div>
        </div>
      )}
      {!deskOpen && !chipsInDock && <div className={`absolute left-3 bottom-[96px] ${showCode ? 'max-w-[calc(100vw-500px)]' : 'max-w-[calc(100vw-400px)]'}`}>{chips}</div>}
      {!deskOpen && <div className="hidden md:block absolute bottom-0 inset-x-0 p-3">{placard}</div>}

      {intro && (
        <MissionIntro
          mission={told}
          formal={sigma}
          world={universe.id}
          story={storyFor(mission.id, universe.id)}
          onStart={() => {
            setIntro(false)
            if (!coachDone() && !mission.code) setCoach(true)
          }}
        />
      )}
      {coach && !intro && <CoachMarks steps={sigma ? COACH_FORMAL : COACH} onDone={() => setCoach(false)} />}

      {journalOpen && <IncidentJournal found={progress.incidents} onClose={() => setJournalOpen(false)} />}
      <Link to="/trebuchet" className="sr-only">
        
        {tr("К карте мира")}
      </Link>
    </div>
  )
}
