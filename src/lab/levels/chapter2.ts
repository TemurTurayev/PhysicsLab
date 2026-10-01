import { DEFAULT_TREBUCHET, EARTH } from '../sim/types'
import { STEP_CODE } from './code'
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

export const CHAPTER_2: Chapter = {
  id: 2,
  title: 'Полигон',
  env: 'range',
  tagline: 'Открытое поле и разметка через каждые 10 метров. Здесь полёт камня превращается в формулу.',
  missions: [
    {
      id: '2-1',
      chapter: 2,
      order: 1,
      kind: 'tune',
      env: 'range',
      title: 'Угол и дальность',
      brief:
        'Каждый выстрел ставит точку на графике «угол вылета → дальность». Найди вершину этой кривой. Учебники говорят, что лучший угол 45°. Проверь, так ли это здесь.',
      goal: 'Добрось до флажка на 73 м (±1,5 м) — это предел машины.',
      sliders: [release(100)],
      base,
      targets: [{ x: 73, r: 1.5 }],
      hints: [
        '45° — лучший угол, только если камень вылетает с уровня земли.',
        'Наш камень вылетает с высоты около 13 м. Ему выгоднее лететь более полого.',
      ],
      theory: ['R(\\alpha) = \\dfrac{v^2\\sin 2\\alpha}{g}\;\\text{(с земли)}'],
      requires: ['1-4'],
    },
    {
      id: '2-2',
      chapter: 2,
      order: 2,
      kind: 'predict',
      env: 'range',
      title: 'Это парабола',
      brief:
        'Без воздуха камень летит по параболе y = ax² + bx + c — той самой из миссии 5.1.3. Угол отпуска 120°, табличка покажет скорость и угол вылета. Предскажи, на какую высоту поднимется камень.',
      goal: 'Предскажи высоту вершины с точностью ±3 м.',
      sliders: [],
      base: { ...base, trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 120 } },
      targets: [],
      predict: { quantity: 'apexY', label: 'Высота вершины', tolerance: 3, min: 0, max: 60 },
      hints: [
        'В вершине вертикальная скорость равна нулю.',
        'Подъём над точкой вылета: h = v_y² / (2g). Не забудь прибавить высоту, с которой камень вылетел.',
      ],
      theory: ['y(x) = y_0 + x\\tan\\alpha - \\dfrac{g\\,x^2}{2v^2\\cos^2\\alpha}', 'h_{\\max} = y_0 + \\dfrac{v_y^2}{2g}'],
      requires: ['2-1'],
    },
    {
      id: '2-3',
      chapter: 2,
      order: 3,
      kind: 'write',
      env: 'range',
      title: 'Свой полёт',
      brief:
        'Дальше камень летит по твоему коду. Функция step() двигает его на крошечный шаг времени dt, и так 240 раз в секунду. Сейчас в ней нет гравитации. Посмотри, что будет, а потом допиши одну строку.',
      goal: 'Напиши step() так, чтобы камень попал во флажок на 73 м.',
      sliders: [],
      base: { ...base, trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 110 } },
      targets: [{ x: 73, r: 3 }],
      code: STEP_CODE,
      hints: [
        'Ускорение — это изменение скорости за единицу времени: Δv = a·dt.',
        'Сила тяжести направлена вниз, а ось y вверх. Значит, vy уменьшается.',
        'vy = vy - G * dt',
      ],
      theory: ['v_y \\leftarrow v_y - g\\,\\Delta t', 'y \\leftarrow y + v_y\\,\\Delta t'],
      requires: ['2-2'],
    },
    {
      id: '2-4',
      chapter: 2,
      order: 4,
      kind: 'challenge',
      env: 'range',
      title: 'Стрельбище',
      brief:
        'Мишень на тележке стартует в 40 м и уезжает со скоростью 4 м/с. Камень летит несколько секунд, и за это время тележка успевает отъехать. Целься туда, где тележка будет.',
      goal: 'Попади в движущуюся тележку.',
      sliders: [release(110)],
      base,
      targets: [{ x: 40, r: 2.5, moving: { speed: 4 } }],
      hints: [
        'Тележка трогается в момент отпуска. Табличка показывает время полёта t — за него тележка проедет 4·t метров.',
        'Нужна дальность ≈ 40 + 4·t. Подходят два угла отпуска: один около 96°, другой около 120°.',
      ],
      theory: ['x_{\\text{мишени}}(t) = 40 + 4t', 'x_{\\text{камня}}(t_{\\text{пад}}) = x_{\\text{мишени}}(t_{\\text{пад}})'],
      requires: ['2-3'],
    },
  ],
}
