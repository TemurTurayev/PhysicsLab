import type { StudentError, StudentJob, WorkerResponse } from './protocol'

const TIMEOUT_MS = 3000
const LOAD_TIMEOUT_MS = 60000
let worker: Worker | null = null
let pythonReady = false
let nextId = 1

function spawn(): Worker {
  if (worker) return worker
  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  w.addEventListener('message', (ev: MessageEvent) => {
    if ((ev.data as { ready?: boolean }).ready) pythonReady = true
  })
  worker = w
  return w
}

/** Starts loading Pyodide in the background so the first Run feels instant. */
export function warmUpPython(): void {
  spawn()
}

export function isPythonReady(): boolean {
  return pythonReady
}

export type StudentResult = Exclude<WorkerResponse, { ok: false }> | { ok: false; error: StudentError; stdout: string }

const timeoutResult = (loading: boolean): StudentResult => ({
  ok: false,
  stdout: '',
  error: loading
    ? { kind: 'load', line: null, message: 'Python не загрузился за минуту. Проверь интернет и попробуй ещё раз.' }
    : { kind: 'timeout', line: null, message: 'Код не закончил работу за 3 секунды — возможно, бесконечный цикл.' },
})

/**
 * Runs student code in a worker. An infinite loop cannot freeze the page: the
 * 3-second budget starts once Pyodide is loaded; after it the worker is killed
 * and a fresh one is started on the next run.
 */
export function runStudent(code: string, job: StudentJob): Promise<StudentResult> {
  const w = spawn()
  const id = nextId++
  return new Promise((resolve) => {
    const startedAt = performance.now()
    let runStartedAt: number | null = pythonReady ? startedAt : null
    const finish = (result: StudentResult) => {
      clearInterval(timer)
      w.removeEventListener('message', onMessage)
      resolve(result)
    }
    const timer = setInterval(() => {
      const now = performance.now()
      if (runStartedAt === null && pythonReady) runStartedAt = now
      const expired = runStartedAt === null ? now - startedAt > LOAD_TIMEOUT_MS : now - runStartedAt > TIMEOUT_MS
      if (!expired) return
      w.terminate()
      worker = null
      pythonReady = false
      finish(timeoutResult(runStartedAt === null))
    }, 100)
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as WorkerResponse | { ready: true }
      if ('ready' in data || data.id !== id) return
      finish(data)
    }
    w.addEventListener('message', onMessage)
    w.postMessage({ id, code, job })
  })
}
