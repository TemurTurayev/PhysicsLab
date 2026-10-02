import type { MissionCode } from './types'

export const LAUNCH_VELOCITY_CODE: MissionCode = {
  fn: 'launch_velocity',
  starter: `import math

def launch_velocity(speed, angle_deg):
    """Раскладывает скорость вылета на горизонтальную и вертикальную части.

    speed     — скорость камня в момент отпуска, м/с
    angle_deg — угол вылета над горизонтом, в градусах
    """
    vx = speed * math.cos(angle_deg)
    vy = speed * math.sin(angle_deg)
    return (vx, vy)
`,
  reference: `import math

def launch_velocity(speed, angle_deg):
    a = math.radians(angle_deg)
    return (speed * math.cos(a), speed * math.sin(a))
`,
}

export const STEP_CODE: MissionCode = {
  fn: 'step',
  starter: `G = 9.81  # ускорение свободного падения, м/с²

def step(state, dt):
    """Один шаг полёта камня длиной dt секунд (dt = 1/240 с)."""
    x, y = state["x"], state["y"]
    vx, vy = state["vx"], state["vy"]

    # 1) Сила тяжести меняет вертикальную скорость.
    #    Допиши строку: как изменится vy за время dt?
    # vy = ...

    # 2) Скорость меняет положение.
    x = x + vx * dt
    y = y + vy * dt

    return {"x": x, "y": y, "vx": vx, "vy": vy}
`,
  reference: `G = 9.81

def step(state, dt):
    vy = state["vy"] - G * dt
    vx = state["vx"]
    return {"x": state["x"] + vx * dt, "y": state["y"] + vy * dt, "vx": vx, "vy": vy}
`,
}

export const BEAM_MOMENT_CODE: MissionCode = {
  fn: 'beam_moment',
  starter: `G = 9.81   # ускорение свободного падения, м/с²
L2 = 1.2   # короткое плечо: от оси до противовеса, м

def beam_moment(mc):
    """Момент силы, которым противовес массой mc (кг) давит на балку у оси, Н·м.

    Мастер добавляет противовес, пока этот момент не больше 11 500 Н·м.
    """
    return 0  # допиши формулу
`,
  reference: `G = 9.81
L2 = 1.2

def beam_moment(mc):
    return mc * G * L2
`,
}

const AIR_CONSTANTS = (m: number, r: number, wind: number) => `import math

G = 9.81
M = ${m}       # масса снаряда, кг
R = ${r}      # радиус снаряда, м
RHO = 1.225   # плотность воздуха, кг/м³
CD = 0.47     # коэффициент сопротивления шара
WIND = ${wind}  # ветер вдоль x, м/с (минус — встречный)
K = RHO * CD * math.pi * R**2 / (2 * M)   # «сила» торможения, 1/м
`

export const DRAG_CODE: MissionCode = {
  fn: 'step',
  starter: `${AIR_CONSTANTS(12.0, 0.15, -12.0)}
def step(state, dt):
    """Один шаг полёта длиной dt секунд (dt = 1/240 с)."""
    x, y = state["x"], state["y"]
    vx, vy = state["vx"], state["vy"]

    # Скорость камня ОТНОСИТЕЛЬНО ВОЗДУХА
    ux, uy = vx - WIND, vy
    u = math.hypot(ux, uy)

    # Ускорение. Сейчас здесь только сила тяжести.
    # Допиши сопротивление воздуха: a = -K * u * (ux, uy)
    ax = 0.0
    ay = -G

    vx = vx + ax * dt
    vy = vy + ay * dt
    x = x + vx * dt
    y = y + vy * dt
    return {"x": x, "y": y, "vx": vx, "vy": vy}
`,
  reference: `${AIR_CONSTANTS(12.0, 0.15, -12.0)}
def step(state, dt):
    vx, vy = state["vx"], state["vy"]
    ux, uy = vx - WIND, vy
    u = math.hypot(ux, uy)
    vx += -K * u * ux * dt
    vy += (-G - K * u * uy) * dt
    return {"x": state["x"] + vx * dt, "y": state["y"] + vy * dt, "vx": vx, "vy": vy}
`,
}

export const SUBSTEP_CODE: MissionCode = {
  fn: 'step',
  dt: 0.5,
  starter: `${AIR_CONSTANTS(0.6, 0.3, 0.0)}
N = 1  # сколько маленьких шагов делать внутри одного большого

def step(state, dt):
    """Старый вычислитель вызывает step() всего 2 раза в секунду: dt = 0.5 с."""
    x, y = state["x"], state["y"]
    vx, vy = state["vx"], state["vy"]
    h = dt / N
    for _ in range(N):
        u = math.hypot(vx, vy)
        ax = -K * u * vx
        ay = -G - K * u * vy
        vx = vx + ax * h
        vy = vy + ay * h
        x = x + vx * h
        y = y + vy * h
    return {"x": x, "y": y, "vx": vx, "vy": vy}
`,
  reference: `${AIR_CONSTANTS(0.6, 0.3, 0.0)}
N = 50
def step(state, dt):
    x, y, vx, vy = state["x"], state["y"], state["vx"], state["vy"]
    h = dt / N
    for _ in range(N):
        u = math.hypot(vx, vy)
        vx += -K * u * vx * h
        vy += (-G - K * u * vy) * h
        x += vx * h
        y += vy * h
    return {"x": x, "y": y, "vx": vx, "vy": vy}
`,
}

export const MAGIC_G_CODE: MissionCode = {
  fn: 'step',
  starter: `def step(state, dt):
    """Один шаг полёта. В state есть x, y, vx, vy и g — ускорение
    свободного падения там, где идёт испытание, м/с²."""
    x, y = state["x"], state["y"]
    vx, vy = state["vx"], state["vy"]

    vy = vy - 9.81 * dt   # «проверено на Земле»

    x = x + vx * dt
    y = y + vy * dt
    return {"x": x, "y": y, "vx": vx, "vy": vy}
`,
  reference: `def step(state, dt):
    g = state["g"]
    vy = state["vy"] - g * dt
    vx = state["vx"]
    return {"x": state["x"] + vx * dt, "y": state["y"] + vy * dt, "vx": vx, "vy": vy}
`,
}
