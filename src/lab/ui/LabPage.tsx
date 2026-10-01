import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { isMuted, playSfx, setMuted } from '../audio/sfx'
import type { FailureEvent } from '../failures/types'
import { findMission, nextMission } from '../levels'
import type { Mission } from '../levels/types'
import { isPythonReady, warmUpPython } from '../python/runStudent'
import { LabScene } from '../scene/LabScene'
import { createRange } from '../scene/environments/range'
import { createWorkshop } from '../scene/environments/workshop'
import { useLabProgress } from '../state/labProgress'
import { ActBar, type Act } from './ActBar'
import { CodeDrawer } from './CodeDrawer'
import { ControlPanel } from './ControlPanel'
import { IncidentCard } from './IncidentCard'
import { IncidentJournal } from './IncidentJournal'
import { MissionBrief } from './MissionBrief'
import { Placard } from './Placard'
import { ResultBanner } from './ResultBanner'
import { TheoryPanel } from './TheoryPanel'
import { useMissionRun, type ShotRecord } from './useMissionRun'
import './lab.css'

const ENVIRONMENTS = { workshop: createWorkshop, range: createRange }
type Phase = 'idle' | 'flying' | 'landed'

export function LabPage() {
  const { missionId } = useParams()
  const mission = missionId ? findMission(missionId) : undefined
  if (!mission) return <Navigate to="/trebuchet" replace />
  return <MissionView key={mission.id} mission={mission} />
}

function useLabScene(mission: Mission) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<LabScene | null>(null)
  useEffect(() => {
    if (!canvasRef.current) return
    const scene = new LabScene(canvasRef.current)
    const maxX = Math.max(110, ...mission.targets.map((t) => t.x * 1.5))
    scene.setEnvironment(ENVIRONMENTS[mission.env], mission.targets, maxX)
    scene.setTrebuchet(mission.base.trebuchet)
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [mission])
  return { canvasRef, sceneRef }
}

function MissionView({ mission }: { mission: Mission }) {
  const navigate = useNavigate()
  const { canvasRef, sceneRef } = useLabScene(mission)
  const run = useMissionRun(mission)
  const progress = useLabProgress()
  const [releaseDeg, setReleaseDeg] = useState(mission.sliders[0]?.start ?? mission.base.trebuchet.releaseDeg)
  const [prediction, setPrediction] = useState<number | null>(null)
  const [act, setAct] = useState<Act>(mission.code ? 'build' : 'see')
  const [code, setCode] = useState(mission.code?.starter ?? '')
  const [phase, setPhase] = useState<Phase>('idle')
  const [incidents, setIncidents] = useState<Array<{ event: FailureEvent; isNew: boolean }>>([])
  const incident = incidents[0] ?? null
  const [journalOpen, setJournalOpen] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const [pythonReady, setPythonReady] = useState(isPythonReady())
  const cues = useRef({ whoosh: false, thud: false })

  useEffect(() => {
    if (!mission.code) return
    warmUpPython()
    const id = setInterval(() => setPythonReady(isPythonReady()), 500)
    return () => clearInterval(id)
  }, [mission.code])

  useEffect(() => sceneRef.current?.setXray(act === 'understand'), [act, sceneRef])

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
        playSfx('fail')
      } else if (record.hits.length > 0 || (record.predictionError !== null && mission.predict && Math.abs(record.predictionError) <= mission.predict.tolerance)) {
        playSfx('success')
      }
    },
    [progress, mission.predict],
  )

  const fire = useCallback(async () => {
    const scene = sceneRef.current
    if (!scene) return
    setIncidents([])
    const record = await run.fire({ releaseDeg, code, prediction })
    if (!record) return
    const { shot } = record
    const selfHit = record.failures.find((f) => f.id === 'self_hit')
    cues.current = { whoosh: false, thud: false }
    scene.setShot({ shot, ghost: record.ghost, crewScatterAt: selfHit ? selfHit.t : null, hitIndex: record.hits[0] ?? null })
    setPhase('flying')
    playSfx('creak')
    scene.onTimeUpdate((t, done) => {
      if (!cues.current.whoosh && shot.releaseT !== null && t >= shot.releaseT) {
        cues.current.whoosh = true
        playSfx('whoosh')
      }
      if (!cues.current.thud && shot.landing && t >= shot.landing.t) {
        cues.current.thud = true
        playSfx(selfHit ? 'crack' : 'thud')
      }
      if (done) {
        scene.onTimeUpdate(null)
        finishShot(record)
      }
    })
  }, [sceneRef, run, releaseDeg, code, prediction, finishShot])

  useEffect(() => {
    if (run.won) progress.complete(mission.id, run.stars)
    // progress.complete is stable; only react to a new win
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.won, run.stars, mission.id])

  const placePrediction = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mission.predict?.quantity !== 'landingX' || phase === 'flying') return
    const x = sceneRef.current?.groundXAt(e.clientX, e.clientY)
    if (x === null || x === undefined) return
    setPrediction(Math.round(Math.max(mission.predict.min, Math.min(mission.predict.max, x)) * 2) / 2)
  }

  const next = nextMission(mission.id)
  const showCode = act === 'build' && mission.code
  const fireLabel = mission.code ? 'Огонь (с твоим кодом)' : 'Огонь'

  return (
    <div className="lab-root fixed inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" onPointerDown={placePrediction} />

      <div className="absolute top-0 inset-x-0 p-2 md:p-3 flex flex-col items-start gap-2 pointer-events-none [&>*]:pointer-events-auto">
        <div className="w-full">
          <ActBar
            mission={mission}
            act={act}
            onAct={setAct}
            incidents={progress.incidents.length}
            onJournal={() => setJournalOpen(true)}
            muted={muted}
            onMute={() => {
              setMuted(!muted)
              setMutedState(!muted)
            }}
          />
        </div>
        <div className="w-[min(340px,100%)] flex flex-col gap-2 max-h-[38vh] md:max-h-[calc(100vh-260px)] overflow-y-auto">
          <MissionBrief mission={mission} shots={run.shots} hitSoFar={run.hitSoFar} />
          {act === 'understand' && <TheoryPanel formulas={mission.theory} />}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-2 flex flex-col items-end gap-2 pointer-events-none [&>*]:pointer-events-auto md:static md:p-0">
        {showCode ? (
          <div className="w-full h-[50vh] md:absolute md:right-3 md:top-[64px] md:bottom-[96px] md:w-[460px] md:h-auto">
            <CodeDrawer
              code={code}
              onChange={setCode}
              onRun={fire}
              onReset={() => setCode(mission.code!.starter)}
              busy={run.busy || phase === 'flying'}
              error={run.codeError}
              stdout={run.stdout}
              pythonReady={pythonReady}
            />
          </div>
        ) : (
          <div className="w-[min(320px,100%)] md:absolute md:right-3 md:bottom-[96px]">
            <ControlPanel
              mission={mission}
              releaseDeg={releaseDeg}
              onReleaseDeg={setReleaseDeg}
              prediction={prediction}
              onPrediction={setPrediction}
              canFire={phase !== 'flying' && (!mission.predict || prediction !== null)}
              busy={run.busy}
              onFire={fire}
              fireLabel={fireLabel}
            />
          </div>
        )}
        <div className="w-full md:absolute md:bottom-0 md:inset-x-0 md:p-3">
          <Placard
            shot={run.last?.shot ?? null}
            releaseDeg={mission.sliders.length > 0 ? releaseDeg : mission.base.trebuchet.releaseDeg}
            phase={phase}
            movingTargetSpeed={mission.targets.find((t) => t.moving)?.moving?.speed}
          />
        </div>
      </div>

      {incident && phase === 'landed' && (
        <div className="absolute inset-x-2 bottom-[140px] md:bottom-auto md:top-[64px] md:left-1/2 md:-translate-x-1/2 md:w-[420px] z-20">
          <IncidentCard
            event={incident.event}
            isNew={incident.isNew}
            onClose={() => setIncidents((q) => q.slice(1))}
            onReplaySlow={() => {
              setPhase('flying')
              sceneRef.current?.replay(0.25)
              sceneRef.current?.onTimeUpdate((_, done) => done && setPhase('landed'))
            }}
          />
        </div>
      )}

      {phase === 'landed' && !incident && (
        <ResultBanner
          mission={mission}
          record={run.last}
          won={run.won}
          stars={run.stars}
          onNext={next ? () => navigate(`/trebuchet/${next.id}`) : undefined}
        />
      )}

      {journalOpen && <IncidentJournal found={progress.incidents} onClose={() => setJournalOpen(false)} />}
      <Link to="/trebuchet" className="sr-only">
        К карте мира
      </Link>
    </div>
  )
}
