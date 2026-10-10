import type { Universe } from './types'

/** The words of a universe without its 3D scenes, so light pages (home) can name worlds without loading three.js. */
export type UniverseMeta = Pick<Universe, 'id' | 'name' | 'tagline' | 'chapterTitles' | 'chapterTaglines'>

export const CLASSIC_META: UniverseMeta = {
  id: 'classic',
  name: 'Классика',
  tagline: 'Двор плотника, поле, замок на закате, горный перевал и Луна. Дерево, верёвка и камень.',
  chapterTitles: { 1: 'Мастерская', 2: 'Полигон', 3: 'Осада', 4: 'Перевал', 5: 'Луна' },
  chapterTaglines: {},
}

export const SIGMA_META: UniverseMeta = {
  id: 'sigma',
  name: 'Комплекс',
  tagline: 'НИИ «Сигма-7», 1998 год. Бетон, гул ламп, протоколы испытаний. Вы — новый стажёр отдела прикладной механики.',
  chapterTitles: { 1: 'Испытательная камера 3', 2: 'Наземный полигон', 3: 'Испытание на разрушение', 4: 'Аэродинамический зал', 5: 'Станция «Сигма-Л»' },
  chapterTaglines: {
    1: 'Бетонный бокс под землёй, гул ламп и смотровое окно. Здесь стажёр получает допуск к установке ЭМУ-3.',
    2: 'Наземный полигон в пустыне: плато, вышка наблюдения и разметка до горизонта.',
    3: 'Ангар разрушающих испытаний: бетонные стены-мишени и предел прочности конструкции.',
    4: 'Сектор В: четыре гигантских вентилятора гонят поток навстречу снаряду. Воздух больше не пустота.',
    5: 'Экспериментальный лунный полигон. g = 1,62 м/с², вакуум и Земля над горизонтом. Тот же расчёт — другой мир.',
  },
}

export const UNIVERSE_META: UniverseMeta[] = [CLASSIC_META, SIGMA_META]
