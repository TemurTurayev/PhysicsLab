/** The first-mission tour is shown once per browser. */
const DONE_KEY = 'physicslab-coach-done'

export function coachDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1'
  } catch {
    return true
  }
}

export function markCoachDone(): void {
  try {
    localStorage.setItem(DONE_KEY, '1')
  } catch {
    // private mode: the tour may show again next time, which is harmless
  }
}

