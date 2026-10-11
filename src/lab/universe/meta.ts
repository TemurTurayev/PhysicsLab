import { tr } from '../../i18n'
import type { Universe } from './types'

/** The words of a universe without its 3D scenes, so light pages (home) can name worlds without loading three.js. */
export type UniverseMeta = Pick<Universe, 'id' | 'name' | 'tagline' | 'chapterTitles' | 'chapterTaglines'>

export const CLASSIC_META: UniverseMeta = {
  id: 'classic',
  name: tr('Классика'),
  tagline: tr('Двор плотника, поле, замок на закате, горный перевал и Луна. Дерево, верёвка и камень.'),
  chapterTitles: { 0: tr('Основы'), 1: tr('Мастерская'), 2: tr('Полигон'), 3: tr('Осада'), 4: tr('Перевал'), 5: tr('Луна') },
  chapterTaglines: {},
}

export const SIGMA_META: UniverseMeta = {
  id: 'sigma',
  name: tr('Комплекс'),
  tagline: tr('НИИ «Сигма-7», 1998 год. Бетон, гул ламп, протоколы испытаний. Вы — новый стажёр отдела прикладной механики.'),
  chapterTitles: { 0: tr('Вводный курс'), 1: tr('Испытательная камера 3'), 2: tr('Наземный полигон'), 3: tr('Испытание на разрушение'), 4: tr('Аэродинамический зал'), 5: tr('Станция «Сигма-Л»') },
  chapterTaglines: {
    0: tr('Учебный полигон для стажёров: координаты, скорость, падение, тригонометрия и первые программы на Python. Без этого курса к ЭМУ-3 не допускают.'),
    1: tr('Бетонный бокс под землёй, гул ламп и смотровое окно. Здесь стажёр получает допуск к установке ЭМУ-3.'),
    2: tr('Наземный полигон в пустыне: плато, вышка наблюдения и разметка до горизонта.'),
    3: tr('Ангар разрушающих испытаний: бетонные стены-мишени и предел прочности конструкции.'),
    4: tr('Сектор В: четыре гигантских вентилятора гонят поток навстречу снаряду. Воздух больше не пустота.'),
    5: tr('Экспериментальный лунный полигон. g = 1,62 м/с², вакуум и Земля над горизонтом. Тот же расчёт — другой мир.'),
  },
}

export const UNIVERSE_META: UniverseMeta[] = [CLASSIC_META, SIGMA_META]
