import { DEFAULT_TREBUCHET, EARTH } from '../sim/types'
import { DRAG_CODE, SUBSTEP_CODE } from './code'
import type { Chapter, SliderSpec } from './types'

/** Chapter 4: the air is on. Numbers tuned with scripts/tune.ts-style sweeps (see levels.test.ts). */
const HEADWIND = { ...EARTH, drag: true, wind: -12 }
const STILL_AIR = { ...EARTH, drag: true }

const release = (start: number): SliderSpec => ({
  key: 'releaseDeg',
  label: 'Угол отпуска пращи',
  min: 60,
  max: 180,
  step: 1,
  unit: '°',
  start,
})

export const CHAPTER_4: Chapter = {
  id: 4,
  title: 'Перевал',
  env: 'pass',
  tagline: 'Высокогорный перевал, туман и ветер в лицо. Воздух больше не пустота — он тормозит каждый бросок.',
  missions: [
    {
      id: '4-1',
      chapter: 4,
      order: 1,
      kind: 'tune',
      env: 'pass',
      title: 'Встречный ветер',
      brief:
        'В долине требушет бросал на 73 м. Здесь навстречу дует ветер 12 м/с, и воздух тормозит камень. Найди лучший угол заново — он уже не тот, что в штиль. Следи за флюгером: он показывает, куда и как сильно дует.',
      goal: 'Добрось до мишени на 60 м (±1,5 м).',
      sliders: [release(104)],
      base: { trebuchet: DEFAULT_TREBUCHET, world: HEADWIND },
      targets: [{ x: 60, r: 1.5 }],
      hints: [
        'Против ветра выгоднее лететь ниже: чем дольше камень в воздухе, тем дольше его тормозит ветер.',
        'Предел в этот ветер — около 61 м. Ищи между 106° и 112°.',
      ],
      theory: ['\\vec a = \\vec g - k\\,|\\vec u|\\,\\vec u,\\quad \\vec u = \\vec v - \\vec w', 'k = \\dfrac{\\rho\\, C_d\\, \\pi r^2}{2m}'],
      requires: ['3-4'],
    },
    {
      id: '4-2',
      chapter: 4,
      order: 2,
      kind: 'predict',
      env: 'pass',
      title: 'Камень и соломенный шар',
      brief:
        'Ветер стих. Каменное ядро 12 кг при угле 104° летит на 62 м. Теперь в праще соломенный шар: 2 кг и вдвое больше в радиусе. Он вылетит даже быстрее. Поставь флажок: где он упадёт?',
      goal: 'Предскажи место падения шара с точностью ±5 м.',
      sliders: [],
      base: { trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 104, mp: 2, r: 0.3 }, world: STILL_AIR },
      targets: [],
      predict: { quantity: 'landingX', label: 'Шар упадёт на', tolerance: 5, min: 0, max: 100 },
      hints: [
        'k = ρ·Cd·π·r² / (2m): площадь выросла в 4 раза, масса упала в 6 раз. Во сколько раз сильнее торможение?',
        'В 24 раза сильнее, чем у камня. Шар упадёт гораздо ближе — примерно на полпути.',
      ],
      theory: ['k_{\\text{шар}} / k_{\\text{камень}} = \\dfrac{r_ш^2 / m_ш}{r_к^2 / m_к} = \\dfrac{4}{1/6} = 24'],
      requires: ['4-1'],
    },
    {
      id: '4-3',
      chapter: 4,
      order: 3,
      kind: 'write',
      env: 'pass',
      title: 'Сопротивление воздуха',
      brief:
        'Снова встречный ветер 12 м/с. Твоя step() считает только гравитацию — как будто воздуха нет. Запусти и посмотри, где окажется камень. Потом допиши торможение: оно направлено против скорости камня относительно воздуха.',
      goal: 'Допиши step() так, чтобы камень лёг на мишень в 61 м.',
      sliders: [],
      base: { trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 110 }, world: HEADWIND },
      targets: [{ x: 61, r: 2 }],
      code: DRAG_CODE,
      hints: [
        'Ускорение от воздуха: ax = −K·u·ux, ay = −K·u·uy. Гравитация остаётся в ay.',
        'ax = -K * u * ux',
        'ay = -G - K * u * uy',
      ],
      theory: ['a_x = -K\\,u\\,u_x', 'a_y = -g - K\\,u\\,u_y', 'u = \\sqrt{u_x^2 + u_y^2}'],
      requires: ['4-2'],
    },
    {
      id: '4-4',
      chapter: 4,
      order: 4,
      kind: 'fix',
      env: 'pass',
      title: 'Неустойчивый шаг',
      brief:
        'Лёгкий соломенный шар (0,6 кг) и старый полевой вычислитель: он вызывает step() всего дважды в секунду. Формулы в коде правильные, но в расчёте шар вдруг разворачивается и летит назад быстрее, чем летел вперёд. Почини расчёт, не трогая физику.',
      goal: 'Сделай расчёт устойчивым, чтобы шар лёг на мишень в 13 м.',
      sliders: [],
      base: { trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 100, mp: 0.6, r: 0.3 }, world: STILL_AIR },
      targets: [{ x: 13.2, r: 1.5 }],
      code: SUBSTEP_CODE,
      hints: [
        'Метод Эйлера устойчив для торможения, только пока K·|v|·h < 2. Сейчас h = 0,5 с — слишком много.',
        'Внутри step() уже есть цикл на N маленьких шагов. Сколько их нужно?',
        'Попробуй N = 50: шаг станет 0,01 с.',
      ],
      theory: ['v_{n+1} = v_n + a(v_n)\\,h', 'K\\,|v|\\,h < 2 \\;\\Rightarrow\\; \\text{устойчиво}'],
      requires: ['4-3'],
    },
  ],
}
