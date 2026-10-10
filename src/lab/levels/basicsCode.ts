import type { MissionCode } from './types'

/** First Python: variables and one line of arithmetic. The number becomes the launcher's speed. */
export const SPEED_VARIABLE_CODE: MissionCode = {
  fn: 'value',
  name: 'speed',
  sets: 'speed',
  starter: `# Камень вылетает из лотка горизонтально и летит ровно 2 секунды.
# Флажок стоит в 34 м от лотка.

distance = 34   # метры
time = 2        # секунды

# Допиши строку: скорость = расстояние / время
speed = 0
`,
  reference: `distance = 34
time = 2
speed = distance / time
`,
}

/** Functions and the math module: the fall time from the previous steps, now written as code. */
export const SPEED_FUNCTION_CODE: MissionCode = {
  fn: 'value',
  name: 'speed_for',
  args: [28],
  sets: 'speed',
  starter: `import math

G = 9.81   # ускорение свободного падения, м/с²
H = 12     # высота вышки, м


def fall_time(h):
    """Сколько секунд камень падает с высоты h (м)."""
    return 0   # допиши: t = корень из (2·h / G), корень — это math.sqrt(...)


def speed_for(distance):
    """С какой скоростью бросить горизонтально, чтобы улететь на distance метров."""
    return distance / fall_time(H)
`,
  reference: `import math

G = 9.81
H = 12


def fall_time(h):
    return math.sqrt(2 * h / G)


def speed_for(distance):
    return distance / fall_time(H)
`,
}
