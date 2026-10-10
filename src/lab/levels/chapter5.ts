import { tr } from '../../i18n'
import { DEFAULT_TREBUCHET, EARTH } from '../sim/types'
import { MAGIC_G_CODE } from './code'
import type { Chapter, SliderSpec } from './types'

/** Bonus chapter: the same machine under 1/6 of the gravity. No air on the Moon. */
const MOON = { ...EARTH, g: 1.62, drag: false, wind: 0 }

const release = (start: number): SliderSpec => ({
  key: 'releaseDeg',
  label: tr('Угол отпуска пращи'),
  min: 60,
  max: 180,
  step: 1,
  unit: '°',
  start,
})

export const CHAPTER_5: Chapter = {
  id: 5,
  title: tr('Луна'),
  env: 'moon',
  tagline: tr('Бонус. Тот же требушет, но гравитация в шесть раз слабее и воздуха нет. Что изменится — и что нет?'),
  missions: [
    {
      id: '5-1',
      chapter: 5,
      order: 1,
      kind: 'predict',
      env: 'moon',
      title: tr('Требушет на Луне'),
      brief:
        tr('На Земле при угле 110° требушет бросал на 73 м. Здесь g = 1,62 м/с² — в шесть раз меньше. Камень весит меньше, но и противовес тянет слабее. Поставь флажок: куда упадёт камень?'),
      goal: tr('Предскажи место падения с точностью ±8 м.'),
      sliders: [],
      base: { trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 110 }, world: MOON },
      targets: [],
      predict: { quantity: 'landingX', label: tr('Камень упадёт на'), tolerance: 8, min: 0, max: 500 },
      hints: [
        tr('g = 1,62 м/с². Блок «Пуск при …» в панели «Данные для расчёта» уже посчитан для Луны: v₀ там меньше, чем на Земле.'),
        tr('Подставь в формулы с g = 1,62: t = (v₀·sin α + √((v₀·sin α)² + 2·g·y₀)) / g, затем R = x₀ + v₀·cos α · t.'),
        tr('Проверь себя: R ∝ v₀²/g. Скорость меньше в √6 раз, значит v₀² меньше в 6 раз — как и g. Дальность почти не меняется.'),
      ],
      theory: ['v \\propto \\sqrt{g}', 'R \\propto \\dfrac{v^2}{g} \\propto \\dfrac{g}{g} = \\text{const}'],
      requires: ['4-4'],
    },
    {
      id: '5-2',
      chapter: 5,
      order: 2,
      kind: 'predict',
      env: 'moon',
      title: tr('Медленный полёт'),
      brief:
        tr('Камень упал туда же, где и на Земле. Но кое-что всё же изменилось — посмотри, как неторопливо он летел. На Земле полёт длился 3,7 с. Сколько он продлится здесь?'),
      goal: tr('Предскажи время полёта с точностью ±1 с.'),
      sliders: [],
      base: { trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 110 }, world: MOON },
      targets: [],
      predict: { quantity: 'flightTime', label: tr('Полёт продлится'), unit: tr('с'), tolerance: 1, min: 0, max: 20 },
      hints: [
        tr('Время полёта: t = (v₀·sin α + √((v₀·sin α)² + 2·g·y₀)) / g. Числа — в панели «Данные для расчёта», g = 1,62 м/с².'),
        tr('Посчитай v₀·sin α, его квадрат и 2·g·y₀, извлеки корень, сложи и раздели на g.'),
        tr('Проверь себя: время полёта ∝ v₀/g. Скорость меньше в √6 раз, а g — в 6 раз, значит время больше в √6 ≈ 2,45 раза, чем на Земле.'),
      ],
      theory: ['t \\propto \\dfrac{v}{g} \\propto \\dfrac{\\sqrt g}{g} = \\dfrac{1}{\\sqrt g}'],
      requires: ['5-1'],
    },
    {
      id: '5-3',
      chapter: 5,
      order: 3,
      kind: 'fix',
      env: 'moon',
      title: tr('Магическое число'),
      brief:
        tr('Код полёта привезли с Земли: он отлично работал в долине. Здесь он отправляет камень совсем не туда. В state приходит g этого мира — но код его не читает. Найди «магическое число» и замени его параметром.'),
      goal: tr('Почини step(), чтобы камень лёг на мишень в 73 м.'),
      sliders: [],
      base: { trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: 110 }, world: MOON },
      targets: [{ x: 73, r: 3 }],
      code: MAGIC_G_CODE,
      hints: [
        tr('Число 9.81 верно только на Земле.'),
        tr('g = state["g"], а затем vy = vy - g * dt'),
      ],
      theory: [tr('v_y \\leftarrow v_y - g\\,\\Delta t,\\quad g = g_{\\text{мира}}')],
      requires: ['5-2'],
    },
    {
      id: '5-4',
      chapter: 5,
      order: 4,
      kind: 'challenge',
      env: 'moon',
      title: tr('Лунный тир'),
      brief:
        tr('Мишень на тележке стартует в 40 м и едет со скоростью 3 м/с, трогаясь в момент отпуска. На Земле она успела бы проехать немного. Но здесь камень летит в два с половиной раза дольше.'),
      goal: tr('Попади в движущуюся мишень.'),
      sliders: [release(110)],
      base: { trebuchet: DEFAULT_TREBUCHET, world: MOON },
      targets: [{ x: 40, r: 2.5, moving: { speed: 3 } }],
      hints: [
        tr('Мишень трогается в момент отпуска и едет 3 м/с. Нужно R = 40 + 3·t, где t — время полёта.'),
        tr('На Луне полёт долгий, поэтому мишень уезжает далеко. По числам из панели «Данные для расчёта» посчитай t = (v₀·sin α + √((v₀·sin α)² + 2·g·y₀)) / g (g = 1,62) и R = x₀ + v₀·cos α · t.'),
        tr('Сравни R с 40 + 3·t и двигай слайдер. Подходят два угла: крутая и пологая траектории.'),
      ],
      theory: [tr('x_{\\text{мишени}}(t) = 40 + 3t')],
      requires: ['5-3'],
    },
  ],
}
