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
