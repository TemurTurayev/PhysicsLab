import { DEFAULT_TREBUCHET, EARTH } from '../sim/types'
import { BEAM_MOMENT_CODE } from './code'
import type { Chapter, SliderSpec } from './types'

/** Chapter 3 trebuchet: real timber with real limits. Numbers tuned with scripts/tune.ts. */
const SIEGE_TREBUCHET = { ...DEFAULT_TREBUCHET, beamStrength: 11500, slingStrength: 2600 }
const base = { trebuchet: SIEGE_TREBUCHET, world: EARTH }

const counterweight = (start: number): SliderSpec => ({
  key: 'mc',
  label: 'Масса противовеса',
  min: 300,
  max: 2000,
  step: 25,
  unit: 'кг',
  start,
})
const release = (start: number): SliderSpec => ({
  key: 'releaseDeg',
  label: 'Угол отпуска пращи',
  min: 60,
  max: 180,
  step: 1,
  unit: '°',
  start,
})

export const CHAPTER_3: Chapter = {
  id: 3,
  title: 'Осада',
  env: 'siege',
  tagline: 'Закат, ров и каменные стены. Чтобы бросить дальше, нужен тяжёлый противовес — но дерево не бесконечно прочное.',
  missions: [
    {
      id: '3-1',
      chapter: 3,
      order: 1,
      kind: 'tune',
      env: 'siege',
      title: 'Тяжелее — дальше?',
      brief:
        'Угол отпуска выставлен (110°). Меняй только массу противовеса. Следи за строкой «Нагрузка балки» на табличке: при 100% дерево не выдержит.',
      goal: 'Попади в стену в 110 м.',
      sliders: [counterweight(600)],
      base: { ...base, trebuchet: { ...SIEGE_TREBUCHET, releaseDeg: 110 } },
      targets: [{ x: 110, r: 0.5, h: 10, label: 'Стена' }],
      hints: [
        'Угол закреплён, двигаешь массу противовеса. Блок «Пуск при …» в панели «Данные для расчёта» пересчитывается для каждой массы.',
        'Стена стоит в 110 м и высотой 10 м. Время до стены: t = (110 − x₀) / (v₀·cos α). Высота в этот момент: y = y₀ + v₀·sin α·t − g·t²/2.',
        'Если y больше 10 м — камень перелетит стену, убавь массу. Если камень падает раньше стены (R < 110 м) — добавь. Следи за нагрузкой балки: больше 100 % — балка сломается.',
      ],
      theory: ['E_{\\text{пот}} = m_c\\,g\\,\\Delta h', 'M = F \\cdot L_2'],
      requires: ['2-4'],
    },
    {
      id: '3-2',
      chapter: 3,
      order: 2,
      kind: 'predict',
      env: 'siege',
      title: 'Вдвое тяжелее — вдвое дальше?',
      brief:
        'При 600 кг камень летит на 73 м. Мастер поставил 1100 кг — почти вдвое больше. Поставь флажок: куда упадёт камень? Подумай, пропорциональна ли дальность массе.',
      goal: 'Предскажи место падения с точностью ±12 м.',
      sliders: [],
      base: { ...base, trebuchet: { ...SIEGE_TREBUCHET, mc: 1100, releaseDeg: 110 } },
      targets: [],
      predict: { quantity: 'landingX', label: 'Камень упадёт на', tolerance: 12, min: 0, max: 250 },
      hints: [
        'Противовес уже 1100 кг. Числа для расчёта — в панели «Данные для расчёта», блок «Пуск при …».',
        'Посчитай время t = (v₀·sin α + √((v₀·sin α)² + 2·g·y₀)) / g, затем R = x₀ + v₀·cos α · t.',
        'Заметь: противовес почти вдвое тяжелее, а v₀ выросла меньше. Часть энергии уходит на разгон самой балки.',
      ],
      theory: ['\\eta = \\dfrac{\\tfrac12 m_p v^2}{m_c g \\Delta h}'],
      requires: ['3-1'],
    },
    {
      id: '3-3',
      chapter: 3,
      order: 3,
      kind: 'write',
      env: 'siege',
      title: 'Момент силы',
      brief:
        'Мастер грузит противовес, пока твоя функция beam_moment говорит, что момент на балке не больше 11 500 Н·м. Сейчас функция возвращает 0 — посмотри, чем это кончится, а потом напиши правильную формулу.',
      goal: 'Напиши beam_moment так, чтобы мастер выбрал безопасный противовес и попал в стену в 132 м.',
      sliders: [],
      base: { ...base, trebuchet: { ...SIEGE_TREBUCHET, releaseDeg: 110 } },
      targets: [{ x: 132, r: 1, h: 12, label: 'Стена' }],
      code: BEAM_MOMENT_CODE,
      hints: [
        'Момент силы — это сила, умноженная на плечо: M = F · L.',
        'Сила, с которой противовес давит вниз, — его вес: F = m · g.',
        'return mc * G * L2',
      ],
      theory: ['M = F \\cdot L_2 = m_c\\,g\\,L_2', 'M \\le M_{\\max} = 11\\,500\\ \\text{Н·м}'],
      requires: ['3-2'],
    },
    {
      id: '3-4',
      chapter: 3,
      order: 4,
      kind: 'challenge',
      env: 'siege',
      title: 'Штурм',
      brief:
        'Ворота в 95 м и башня в 140 м. Теперь у тебя оба рычага: противовес и момент отпуска. Не перегрузи балку — запасной нет.',
      goal: 'Попади в ворота и в башню.',
      sliders: [counterweight(800), release(110)],
      base,
      targets: [
        { x: 95, r: 0.5, h: 6, label: 'Ворота' },
        { x: 140, r: 0.5, h: 16, label: 'Башня' },
      ],
      hints: [
        'Для каждой цели проверяй высоту у стены по числам из панели «Данные для расчёта»: t = (x_стены − x₀) / (v₀·cos α), y = y₀ + v₀·sin α·t − g·t²/2.',
        'Ворота: 95 м, высота 6 м — нужно y от 0 до 6 м у ворот. Башня: 140 м, высота 16 м — камень должен пройти над воротами (y > 6 м в 95 м) и прийти к башне ниже 16 м.',
        'Масса противовеса задаёт силу броска, угол отпуска — крутизну. Подбери массу под дальность, затем угол под высоту. Нагрузка балки — не больше 100 %.',
      ],
      theory: [],
      requires: ['3-3'],
    },
  ],
}
