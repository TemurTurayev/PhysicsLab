import { DEFAULT_TREBUCHET, EARTH } from '../sim/types'
import { LAUNCH_VELOCITY_CODE } from './code'
import type { Chapter, SliderSpec } from './types'

const base = { trebuchet: DEFAULT_TREBUCHET, world: EARTH }
const release = (start: number): SliderSpec => ({
  key: 'releaseDeg',
  label: 'Угол отпуска пращи',
  min: 60,
  max: 180,
  step: 1,
  unit: '°',
  start,
})

export const CHAPTER_1: Chapter = {
  id: 1,
  title: 'Мастерская',
  env: 'workshop',
  tagline: 'Утро во дворе плотника. Требушет собран — пора понять, как он бросает.',
  missions: [
    {
      id: '1-1',
      chapter: 1,
      order: 1,
      kind: 'tune',
      env: 'workshop',
      title: 'Первый выстрел',
      brief:
        'Противовес падает, длинная рука взлетает и раскручивает пращу. Камень улетает в тот момент, когда петля пращи соскальзывает с крюка. Этот момент задаёт угол руки, при котором праща раскрывается.',
      goal: 'Попади в тюк сена в 66 м.',
      sliders: [release(150)],
      base,
      targets: [{ x: 66, r: 3 }],
      hints: [
        'Смотри на табличку: угол вылета камня важнее угла руки.',
        'Если камень летит назад, праща раскрывается слишком рано. Уменьши угол отпуска.',
        'Попадают два угла: около 104° и около 116°. Почему два — узнаешь на Полигоне.',
      ],
      theory: ['\\theta_{\\text{руки}} \\downarrow \\Rightarrow \\text{отпуск позже}'],
      requires: [],
    },
    {
      id: '1-2',
      chapter: 1,
      order: 2,
      kind: 'predict',
      env: 'workshop',
      title: 'Где отпустить',
      brief:
        'Мастер уже выставил угол отпуска 120°. Перед выстрелом поставь флажок туда, куда, по-твоему, упадёт камень. Подсказка: в прошлой миссии ты видел, как угол руки связан с дальностью.',
      goal: 'Предскажи место падения с точностью ±6 м.',
      sliders: [],
      base: { ...base, trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 120 } },
      targets: [],
      predict: { quantity: 'landingX', label: 'Камень упадёт на', tolerance: 6, min: 0, max: 100 },
      hints: [
        'При 120° камень уходит выше, чем при 110°, но дальность меньше.',
        'В прошлой миссии 116° давали около 68 м. Здесь угол ещё больше.',
      ],
      theory: [],
      requires: ['1-1'],
    },
    {
      id: '1-3',
      chapter: 1,
      order: 3,
      kind: 'fix',
      env: 'workshop',
      title: 'Градусы и радианы',
      brief:
        'Подмастерье написал функцию, которая раскладывает скорость вылета на две части: вперёд (vx) и вверх (vy). Требушет работает идеально, а камень летит куда попало. Найди ошибку.',
      goal: 'Почини launch_velocity, чтобы камень попал в тюк в 73 м.',
      sliders: [],
      base: { ...base, trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 110 } },
      targets: [{ x: 73, r: 3 }],
      code: LAUNCH_VELOCITY_CODE,
      hints: [
        'Посмотри, в каких единицах math.cos ждёт угол.',
        'В Python есть функция math.radians(градусы).',
      ],
      theory: ['v_x = v\\cos\\alpha', 'v_y = v\\sin\\alpha', '\\alpha_{\\text{рад}} = \\alpha_{\\circ}\\cdot\\dfrac{\\pi}{180}'],
      requires: ['1-2'],
    },
    {
      id: '1-4',
      chapter: 1,
      order: 4,
      kind: 'challenge',
      env: 'workshop',
      title: 'Мастер двора',
      brief: 'Три тюка на разных дистанциях. Меняй только угол отпуска. Чем меньше выстрелов, тем больше звёзд.',
      goal: 'Попади во все три тюка: 47, 62 и 71 м.',
      sliders: [release(130)],
      base,
      targets: [
        { x: 47, r: 2.5 },
        { x: 62, r: 2.5 },
        { x: 71, r: 2.5 },
      ],
      hints: ['Дальше 73 м этот требушет не бросает. Ближние цели проще сбить поздним отпуском.'],
      theory: [],
      requires: ['1-3'],
    },
  ],
}
