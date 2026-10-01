/**
 * Python glue that runs inside Pyodide around the student's code.
 * The student's module is executed first; the harness then calls their function
 * and returns plain JSON so the worker never leaks Python proxies.
 */
export const HARNESS = String.raw`
import json, math

def _check_state(s, i):
    if not isinstance(s, dict):
        raise TypeError(f"step() должна вернуть словарь, а вернула {type(s).__name__} (шаг {i})")
    for k in ("x", "y", "vx", "vy"):
        if k not in s:
            raise KeyError(f"в словаре, который вернула step(), нет ключа '{k}' (шаг {i})")
    return {k: float(s[k]) for k in ("x", "y", "vx", "vy")}

def _run_step(init, dt, max_steps):
    if "step" not in globals():
        raise NameError("не найдена функция step(state, dt)")
    s = dict(init)
    out = [dict(s)]
    for i in range(1, max_steps + 1):
        s = _check_state(step(dict(s), dt), i)
        out.append(s)
        if s["y"] <= 0 and s["vy"] < 0:
            break
        if not all(math.isfinite(v) and abs(v) < 1e6 for v in s.values()):
            break
    return json.dumps(out)

def _run_launch(speed, angle_deg):
    if "launch_velocity" not in globals():
        raise NameError("не найдена функция launch_velocity(speed, angle_deg)")
    v = launch_velocity(speed, angle_deg)
    if not (isinstance(v, (tuple, list)) and len(v) == 2):
        raise TypeError("launch_velocity() должна вернуть пару (vx, vy)")
    return json.dumps([float(v[0]), float(v[1])])
`

/** Pulls the student's line number out of a Pyodide traceback ("File \"<exec>\", line 7"). */
export function parseErrorLine(traceback: string): number | null {
  const matches = [...traceback.matchAll(/File "<exec>", line (\d+)/g)]
  const last = matches.at(-1)
  return last ? Number(last[1]) : null
}

/** Last non-empty line of a traceback: "TypeError: ...". */
export function parseErrorMessage(traceback: string): string {
  const lines = traceback.trim().split('\n').filter((l) => l.trim() !== '')
  return lines.at(-1) ?? traceback
}
