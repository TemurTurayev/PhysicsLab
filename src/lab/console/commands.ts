import { tr } from '../../i18n'
/**
 * The developer console: a tiny command language in the spirit of old PC shooters.
 * Pure logic — the app passes in what a command may touch (navigation, the open mission, settings).
 * Cheats change the physics only after `sv_cheats 1`, and a mission played with cheats is not scored.
 */

export interface Cvars {
  sv_cheats: boolean
  sv_gravity: number | null // m/s²; null = the mission's own g
  host_timescale: number
  god: boolean
  r_drawmarks: boolean
}

export const DEFAULT_CVARS: Cvars = { sv_cheats: false, sv_gravity: null, host_timescale: 1, god: false, r_drawmarks: true }

export interface ConsoleHost {
  missions: Array<{ id: string; title: string; open: boolean }>
  current: { id: string; title: string; g: number; lives: number; shots: number } | null
  go: (path: string) => void
  fire: () => boolean
  refillLives: () => boolean
  setMusic: (on: boolean) => void
  setUniverse: (id: 'classic' | 'sigma') => void
}

export interface Result {
  lines: string[]
  cvars: Cvars
  clear?: boolean
  cheated?: boolean // the command bent the physics or the rules of the current mission
}

const HELP = [
  tr('Команды:'),
  tr('  help, cmdlist         — этот список'),
  tr('  maps                  — все миссии; map <id> — открыть миссию (например, map 2-3)'),
  tr('  status                — текущая миссия, g, жизни'),
  tr('  host_timescale <x>    — скорость времени (0.1–4), 1 = норма'),
  tr('  r_drawmarks 0|1       — таблички с метрами на поле'),
  tr('  music 0|1             — фоновая музыка'),
  tr('  universe classic|sigma — сменить вселенную'),
  tr('  disconnect            — к карте миссий; quit — на главную'),
  tr('  clear, echo <текст>'),
  tr('Читы (нужен sv_cheats 1, миссия не засчитывается):'),
  tr('  sv_gravity <м/с²>     — своя гравитация (9.81 Земля, 3.71 Марс, 1.62 Луна)'),
  tr('  god                   — промахи не отнимают жизни'),
  tr('  impulse 101           — вернуть все жизни'),
  tr('  +attack               — выстрел'),
]

const num = (s: string | undefined) => (s !== undefined && s.trim() !== '' && Number.isFinite(Number(s.replace(',', '.'))) ? Number(s.replace(',', '.')) : null)
const show = (name: string, v: unknown) => `"${name}" = "${typeof v === 'boolean' ? (v ? 1 : 0) : v}"`

export const COMMANDS = ['help', 'cmdlist', 'maps', 'map', 'status', 'host_timescale', 'r_drawmarks', 'music', 'universe', 'disconnect', 'quit', 'clear', 'echo', 'sv_cheats', 'sv_gravity', 'god', 'impulse', '+attack'] as const

/** Run one line of input. Unknown commands answer like the classics did. */
export function runCommand(input: string, cvars: Cvars, host: ConsoleHost): Result {
  const [cmd = '', ...args] = input.trim().split(/\s+/)
  const name = cmd.toLowerCase()
  const say = (...lines: string[]): Result => ({ lines, cvars })
  const needCheats = (): Result | null => (cvars.sv_cheats ? null : say(tr(`Нельзя использовать «{0}» без sv_cheats 1`, [name])))

  switch (name) {
    case '':
      return say()
    case 'help':
    case 'cmdlist':
      return say(...HELP)
    case 'clear':
      return { lines: [], cvars, clear: true }
    case 'echo':
      return say(args.join(' '))
    case 'maps':
      return say(...host.missions.map((m) => `  ${m.id.padEnd(5)} ${m.open || cvars.sv_cheats ? m.title : tr('— закрыта —')}`))
    case 'map': {
      const m = host.missions.find((x) => x.id === args[0])
      if (!m) return say(tr(`map: нет миссии «{0}». Список: maps`, [args[0] ?? '']))
      if (!m.open && !cvars.sv_cheats) return say(tr(`map: миссия {0} ещё закрыта (или sv_cheats 1)`, [m.id]))
      host.go(`/trebuchet/${m.id}`)
      return say(tr(`Загрузка {0} «{1}»…`, [m.id, m.title]))
    }
    case 'disconnect':
      host.go('/trebuchet')
      return say(tr('Отключено.'))
    case 'quit':
      host.go('/')
      return say(tr('Выход в главное меню.'))
    case 'status': {
      const c = host.current
      if (!c) return say(tr('Миссия не загружена. map <id>'))
      const g = cvars.sv_gravity ?? c.g
      return say(tr(`миссия: {0} «{1}»`, [c.id, c.title]), tr(`g: {0} м/с²{1}`, [g, cvars.sv_gravity !== null ? ' (sv_gravity)' : '']), tr(`жизни: {0}, выстрелов: {1}`, [c.lives, c.shots]), tr(`читы: {0}`, [cvars.sv_cheats ? tr('вкл') : tr('выкл')]))
    }
    case 'host_timescale': {
      const v = num(args[0])
      if (v === null) return say(show('host_timescale', cvars.host_timescale))
      const t = Math.max(0.1, Math.min(4, v))
      return { lines: [show('host_timescale', t)], cvars: { ...cvars, host_timescale: t } }
    }
    case 'r_drawmarks': {
      const v = num(args[0])
      if (v === null) return say(show('r_drawmarks', cvars.r_drawmarks))
      return { lines: [], cvars: { ...cvars, r_drawmarks: v !== 0 } }
    }
    case 'music': {
      const v = num(args[0])
      if (v === null) return say('music 0|1')
      host.setMusic(v !== 0)
      return say(v !== 0 ? tr('Музыка включена.') : tr('Музыка выключена.'))
    }
    case 'universe': {
      const u = args[0]
      if (u !== 'classic' && u !== 'sigma') return say('universe classic|sigma')
      host.setUniverse(u)
      return say(tr(`Вселенная: {0}`, [u]))
    }
    case 'sv_cheats': {
      const v = num(args[0])
      if (v === null) return say(show('sv_cheats', cvars.sv_cheats))
      const on = v !== 0
      // Turning cheats off also puts the world back the way it was.
      return { lines: [show('sv_cheats', on)], cvars: on ? { ...cvars, sv_cheats: true } : { ...cvars, sv_cheats: false, sv_gravity: null, god: false } }
    }
    case 'sv_gravity': {
      const v = num(args[0])
      if (v === null) return say(show('sv_gravity', cvars.sv_gravity ?? host.current?.g ?? 9.81))
      const blocked = needCheats()
      if (blocked) return blocked
      if (v <= 0 || v > 100) return say(tr('sv_gravity: от 0.1 до 100 м/с²'))
      return { lines: [show('sv_gravity', v)], cvars: { ...cvars, sv_gravity: v }, cheated: true }
    }
    case 'god': {
      const blocked = needCheats()
      if (blocked) return blocked
      const god = !cvars.god
      return { lines: [god ? 'godmode ON' : 'godmode OFF'], cvars: { ...cvars, god }, cheated: god }
    }
    case 'impulse': {
      if (args[0] !== '101') return say(tr('impulse: неизвестный номер'))
      const blocked = needCheats()
      if (blocked) return blocked
      return host.refillLives() ? { lines: [tr('Жизни восстановлены.')], cvars, cheated: true } : say(tr('Сначала открой миссию.'))
    }
    case '+attack':
      return host.fire() ? say() : say(tr('Сейчас выстрелить нельзя.'))
    default:
      return say(tr(`Неизвестная команда: {0}`, [cmd]))
  }
}

/** Tab completion: the single command that starts with the prefix, or the common list. */
export function complete(prefix: string): string[] {
  const p = prefix.trim().toLowerCase()
  return p ? COMMANDS.filter((c) => c.startsWith(p)) : []
}
