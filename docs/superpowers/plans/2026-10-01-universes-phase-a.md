# Вселенные, фаза A — план реализации

> Исполнение: Claude — дирижёр, ревью и всё, что касается данных, текстов и интеграции; agy (Gemini 3.8 Flash)
> — текстуры, окружение и звук по контрактам. Каждый результат agy: `npx tsc -b`, `npx vitest run`, ревью диффа, скриншоты.
> Тесты пишутся по гейту test-audit: у каждого теста есть контракт, который больше никто не охраняет.

**Цель:** выбор вселенной перед обучением и первая глава мира «Комплекс» (НИИ «Сигма-7») по спеке
`docs/superpowers/specs/2026-10-01-universes-design.md`, разделы 3–8, фаза A.

**Архитектура:** вселенная — это объект `Universe`, который знает окружение для главы, текстовый
оверлей миссий, скин интерфейса, звуковой пакет и вид машины. Физика и `levels/` не меняются.

**Стек:** без новых зависимостей, кроме `@fontsource/share-tech-mono` и `@fontsource/barlow-condensed` (OFL).

---

## Файлы

```
src/lab/universe/types.ts        Universe, UniverseId, MissionCopy
src/lab/universe/classic.ts      окружения «Классики», пустой оверлей
src/lab/universe/sigma.ts        «Комплекс»: окружение главы 1, оверлей текстов главы 1, скин, звук
src/lab/universe/copy.ts         applyCopy(mission, universe)
src/lab/universe/index.ts        UNIVERSES, getUniverse(id)
src/lab/universe/universe.test.ts
src/lab/universe/UniversePicker.tsx
src/lab/scene/textures/industrial.ts            [agy]
src/lab/scene/environments/sigma/testChamber.ts [agy]
src/lab/audio/packs/sigma.ts                    [agy]
src/lab/scene/retroPass.ts       пониженное разрешение + квантование с дизерингом + строки развёртки
src/lab/ui/sigma.css             скин «терминал» под [data-universe="sigma"]
Изменить: state/labProgress.ts (universe, setUniverse), scene/trebuchetModel.ts (скин 'steel'),
          scene/LabScene.ts (retro on/off, alarm hook), ui/LabPage.tsx, ui/WorldMap.tsx,
          ui/IncidentCard.tsx (заголовок протокола), ui/IncidentJournal.tsx («Архив протоколов»).
```

## Задачи

### A1. Модель вселенной и оверлей текстов (TDD) [Claude]
`types.ts`:
```ts
export type UniverseId = 'classic' | 'sigma'
export interface MissionCopy { title?: string; brief?: string; goal?: string; hints?: string[] }
export interface Universe {
  id: UniverseId
  name: string
  tagline: string
  envFor(chapter: number): EnvironmentFactory | null  // null = сектор закрыт в этой вселенной
  copy: Record<string, MissionCopy>                    // по id миссии
  chapterTitles: Record<number, string>
  machine: 'wood' | 'steel'
  terms: { journal: string; incident: string }         // «Журнал инцидентов» / «Архив протоколов»
}
```
Тесты: `applyCopy` заменяет только заданные поля и возвращает исходную миссию, если оверлея нет;
`envFor` «Комплекса» даёт окружение главе 1 и `null` главам 2–3; **запрещённые слова** (Half-Life,
Black Mesa, Aperture, HEV, Combine, лямбда, λ, Valve, Freeman) не встречаются ни в одной строке
вселенной «Комплекс».

### A2. Выбор хранится в прогрессе [Claude]
`labProgress`: поле `universe: UniverseId | null` (null = ещё не выбирал), `setUniverse(id)`.
Тест: выбор сохраняется, а `reset()` его не стирает (выбор — настройка, а не прогресс).

### A3. Экран выбора и переключатель [Claude]
`UniversePicker` на `/trebuchet`, если `universe === null`: две большие карточки-превью
(«Классика» — тёплый закат над мастерской; «Комплекс» — бетон, полосы, терминал), подписи и кнопка.
В шапке карты мира — переключатель вселенной. В «Комплексе» закрытые главы показываются как
«Сектор на реконструкции — пройди в Классике».

### A4. Текстуры и Испытательная камера 3 [agy, отдан]
Контракт — `EnvironmentFactory` без изменений, плюс `group.userData.setAlarm(on)` для маячков.
Проверка: tsc, отсутствие запрещённых имён в файле, скриншоты 1440/375, рубрика ≥ 8.

### A5. ЭМУ-3: стальной скин машины [Claude]
`createTrebuchet(p, skin = 'wood')`: при `'steel'` — рама и балка из `steelPanel`, противовес из
`concreteDark` в стальном каркасе, праща — трос. Геометрия и `pose()` те же.

### A6. Скин интерфейса «терминал» [Claude]
`sigma.css`: переопределение токенов `lab.css` под `[data-universe="sigma"]` (фосфорный зелёный,
оранжевый сигнальный, шрифты Share Tech Mono / Barlow Condensed), строки развёртки на панелях,
`prefers-reduced-motion` гасит мерцание. `IncidentCard` и `IncidentJournal` берут термины из `universe.terms`.

### A7. Ретро-проход [Claude]
`retroPass.ts`: рендер сцены в цель 0,5× с `NearestFilter`, полноэкранный шейдер: квантование до
5 бит на канал с упорядоченным дизерингом Байера 4×4 и слабыми строками развёртки. Переключатель
«ЭЛТ» в шапке (по умолчанию включён в «Комплексе», выключен в «Классике»).

### A8. Звук «Комплекса» [agy, отдан] + подключение [Claude]
В `LabPage` звуковые события берутся из пакета вселенной: спуск → `hydraulic`, удар → `impactConcrete`,
провал → `alarm` + маячки `setAlarm(true)` на 3 с, начало миссии → `chime`. Фон — по кнопке.

### A9. Тексты главы 1 для «Комплекса» [Claude]
Оверлей для 1-1…1-4: брифинги от лица руководителя отдела, цели в терминах испытаний,
подсказки — те же по смыслу. Физические числа не меняются.

### A10. Проверка [Claude]
`npx vitest run`, `npx eslint src/lab`, `npm run build`; браузер: выбор вселенной → миссия 1-1 в
камере → ранний отпуск → сирена, маячки, «Протокол инцидента» → попадание; переключение обратно
в «Классику» без перезагрузки; 375 px; рубрика сцены ≥ 8; коммит и push.
