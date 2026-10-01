/// <reference lib="webworker" />
import { loadPyodide, type PyodideInterface } from 'pyodide'
import { HARNESS, parseErrorLine, parseErrorMessage } from './harness'
import type { WorkerRequest, WorkerResponse } from './protocol'

const INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.0/full/'
let ready: Promise<PyodideInterface> | null = null

function boot(): Promise<PyodideInterface> {
  ready ??= loadPyodide({ indexURL: INDEX_URL })
  return ready
}

async function handle(req: WorkerRequest): Promise<WorkerResponse> {
  let stdout = ''
  let py: PyodideInterface
  try {
    py = await boot()
  } catch (e) {
    ready = null
    return { id: req.id, ok: false, error: { message: String(e), line: null, kind: 'load' }, stdout }
  }
  py.setStdout({ batched: (s: string) => (stdout += s + '\n') })
  const globals = py.globals.get('dict')()
  try {
    py.runPython(HARNESS, { globals })
    py.runPython(req.code, { globals, filename: '<exec>' })
    const { job } = req
    if (job.kind === 'step') {
      const call = `_run_step(${JSON.stringify(job.init)}, ${job.dt}, ${job.maxSteps})`
      const samples = JSON.parse(py.runPython(call, { globals }) as string)
      return { id: req.id, ok: true, kind: 'step', samples, stdout }
    }
    const velocity = JSON.parse(py.runPython(`_run_launch(${job.speed}, ${job.angleDeg})`, { globals }) as string)
    return { id: req.id, ok: true, kind: 'launch', velocity, stdout }
  } catch (e) {
    const tb = e instanceof Error ? e.message : String(e)
    return { id: req.id, ok: false, error: { message: parseErrorMessage(tb), line: parseErrorLine(tb), kind: 'python' }, stdout }
  } finally {
    globals.destroy()
  }
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  self.postMessage(await handle(ev.data))
}
boot().then(
  () => self.postMessage({ ready: true }),
  () => {
    ready = null
  },
)
