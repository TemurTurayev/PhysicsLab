# PhysicsLab v1 «Требушет» — план реализации

> Исполнение: Claude (Opus) — дирижёр и ревьюер; рабочая сила — `agy` (Gemini 3.8 Flash High) по одной задаче
> за раз, строго по контрактам ниже. Физику (`sim/`, `failures/`) пишет Claude сам: Flash ошибается
> в арифметике. Каждый результат agy проверяется: `npx tsc -b`, `npx vitest run`, ревью диффа, скриншоты.

**Цель:** движок лаборатории + система провалов + главы 1–2 (8 миссий, 2 окружения) по спеке
`docs/superpowers/specs/2026-10-01-trebuchet-lab-design.md`.

**Архитектура:** чистая детерминированная физика в `src/lab/sim` считает всю траекторию заранее;
Three.js-сцена рисует её как функцию времени; детекторы провалов читают траекторию; код ученика
выполняется в Pyodide внутри Web Worker и возвращает траекторию в том же формате.

**Стек:** React 19, Vite 7, TypeScript 5.9, three 0.183, Pyodide 0.29 (worker), Monaco, zustand, Vitest 3.

---

## Файлы

```
src/lab/
  sim/types.ts            SimParams, ArmState, FlightSample, ShotResult
  sim/trebuchet.ts        RK4-механизм (балка+противовес+праща), фаза до и после отпуска
  sim/flight.ts           RK4-полёт: гравитация, квадратичное сопротивление, ветер
  sim/shot.ts             simulateShot(params) → ShotResult (механизм → полёт → приземление)
  sim/*.test.ts
  failures/types.ts       FailureId, FailureEvent
  failures/detect.ts      detectFailures(result, mission) → FailureEvent[]
  failures/catalog.ts     тексты разборов и «как в жизни» для каждого FailureId
  failures/*.test.ts
  python/worker.ts        Web Worker: Pyodide + harness
  python/harness.py.ts    Python-обвязка как строка: цикл step(), сбор массивов
  python/runStudent.ts    API главного потока: runStudentStep(code, init, opts) с таймаутом
  levels/types.ts         Mission, Chapter, MissionKind, Environment id
  levels/chapter1.ts      миссии 1–4
  levels/chapter2.ts      миссии 5–8
  levels/index.ts         порядок, prerequisites, поиск по id
  state/labProgress.ts    zustand+persist: пройденные миссии, звёзды, инциденты, прогнозы
  scene/LabScene.ts       класс-оркестратор: renderer, camera, loop, setShot(), seek(t)
  scene/trebuchetModel.ts процедурная 3D-модель, pose(armAngle, slingAngle, released)
  scene/effects.ts        след, призрак, пыль удара, флажок прогноза
  scene/crew.ts           манекены-расчёт, анимация «разбежались»
  scene/environments/types.ts, workshop.ts, range.ts
  audio/sfx.ts            Web Audio: скрип, свист, удар; mute
  ui/LabPage.tsx, ui/WorldMap.tsx, ui/Placard.tsx, ui/ControlPanel.tsx, ui/ActBar.tsx,
  ui/IncidentCard.tsx, ui/IncidentJournal.tsx, ui/CodeDrawer.tsx, ui/MissionBrief.tsx
Изменить: src/App.tsx (маршруты /lab, /lab/:missionId), src/pages/HomePage.tsx (вход в Мир 1),
          vite.config.ts (test-конфиг vitest), package.json (скрипт "test").
```

Отклонение от спеки: прогресс лаборатории — отдельный стор `state/labProgress.ts`, а не расширение
`useProgressStore` (меньше связность, старые миссии не трогаем).

---

## Физическая модель (источник истины для Task 2)

Система координат: x — вперёд к цели, y — вверх, ось вращения P = (0, H).
Обобщённые координаты: θ — угол длинного плеча от +x, φ — абсолютный угол пращи.

- кончик длинного плеча A = P + L1(cos θ, sin θ); противовес C = P − L2(cos θ, sin θ);
  снаряд B = A + Ls(cos φ, sin φ).
- балка: масса ma, длина L1+L2, Ia = ma(L1³+L2³)/(3(L1+L2)), центр масс на d = (L1−L2)/2 по длинному плечу.
- M11 = Ia + mc·L2² + mp·L1²; M12 = mp·L1·Ls·cos(θ−φ); M22 = mp·Ls²
- Vθ = g·cos θ·(ma·d − mc·L2 + mp·L1); Vφ = g·mp·Ls·cos φ
- M11θ̈ + M12φ̈ = −mp·L1·Ls·sin(θ−φ)·φ̇² − Vθ + Qθ
- M12θ̈ + M22φ̈ = +mp·L1·Ls·sin(θ−φ)·θ̇² − Vφ + Qφ
- Земля под снарядом — штраф-пружина: при yB < r сила F = (0, k(r−yB) − c·ẏB), k = 2·10⁵ Н/м,
  c = 2·10³ Н·с/м; Qθ = F·∂B/∂θ, Qφ = F·∂B/∂φ, ∂B/∂θ = L1(−sin θ, cos θ), ∂B/∂φ = Ls(−sin φ, cos φ).
- Отпуск: первый шаг, где θ ≤ θ_release (рука идёт от 220° вниз к 90° и дальше).
  Не дошла за 4 с → провал `no_release`.
- После отпуска: одна степень свободы, (Ia + mc·L2²)θ̈ = −g·cos θ·(ma·d − mc·L2) − b·θ̇, b = 400.
- RK4, dt = 1/2000 с; наружу отдаются сэмплы каждые 1/120 с.

Полёт: dv/dt = (0, −g) − (ρ·Cd·A/(2m))·|v−w|·(v−w), ρ = 1,225, Cd = 0,47, A = π r²; RK4, dt = 1/240 с,
стоп при y ≤ 0 (точка приземления — линейная интерполяция) или t > 60 с.

---

## Задачи

### Task 0: тестовая инфраструктура [Claude]
- [ ] `vite.config.ts`: блок `test: { environment: 'node', include: ['src/**/*.test.ts'] }`
      (импорт `defineConfig` из `vitest/config`). `package.json`: `"test": "vitest run"`.
- [ ] `npx vitest run` → «No test files found», без ошибки конфигурации. Коммит `chore: vitest`.

### Task 1: типы sim [Claude]
`src/lab/sim/types.ts`:
```ts
export interface TrebuchetParams {
  L1: number; L2: number; Ls: number; H: number;   // м
  ma: number; mc: number; mp: number; r: number;   // кг, кг, кг, м
  theta0Deg: number; releaseDeg: number;           // начальный угол и угол отпуска
}
export interface WorldParams { g: number; drag: boolean; wind: number }   // wind: м/с по x
export interface SimParams { trebuchet: TrebuchetParams; world: WorldParams }
export interface ArmSample { t: number; theta: number; phi: number; released: boolean }
export interface FlightSample { t: number; x: number; y: number; vx: number; vy: number }
export interface ShotResult {
  arm: ArmSample[];             // весь механизм, включая качание после отпуска
  flight: FlightSample[];       // пусто, если no_release
  released: boolean;
  releaseT: number | null;
  launch: { speed: number; angleDeg: number } | null;
  landing: { x: number; t: number } | null;
  apex: { x: number; y: number } | null;
}
```

### Task 2: механизм требушета (TDD) [Claude]
Тесты `src/lab/sim/trebuchet.test.ts`:
1. Без земли (H = 20, снаряд висит) и без демпфирования полная энергия T+V сохраняется ≤ 0,5 % за 2 с.
2. При releaseDeg = 999 (недостижимо) `released === false` после 4 с.
3. Стандартные параметры дают отпуск с vx > 0 и скоростью 20–80 м/с.
4. При раннем отпуске (releaseDeg = 200) угол вылета > 75° или vx ≤ 0.
Реализация по разделу «Физическая модель». Экспорт `simulateArm(p: TrebuchetParams, g: number)` →
`{ arm, release: { t, x, y, vx, vy } | null }`. Коммит `feat(sim): trebuchet mechanism`.

### Task 3: полёт (TDD) [Claude]
Тесты `flight.test.ts`: без воздуха дальность совпадает с v²·sin 2θ/g ≤ 0,5 % (старт с y = 0);
вершина совпадает с v²·sin²θ/(2g); с сопротивлением дальность меньше; попутный ветер увеличивает
дальность. `simulateFlight(start, world, mp, r)` → `FlightSample[]`. Коммит `feat(sim): projectile flight`.

### Task 4: simulateShot + тюнинг [Claude]
`shot.ts` склеивает механизм и полёт, считает launch, landing, apex. Тест: детерминизм (два вызова
дают равные результаты). Скрипт `scripts/tune.ts` (`npx tsx`) печатает таблицу releaseDeg → дальность
для дефолтов, чтобы расставить мишени глав 1–2 на реально достижимые дистанции. Коммит.

### Task 5: провалы (TDD) [Claude]
`failures/types.ts`:
```ts
export type FailureId = 'early_release' | 'self_hit' | 'late_release' | 'no_release' | 'short' | 'long'
  | 'no_gravity' | 'gravity_up' | 'exploded' | 'degrees_radians';
export interface FailureEvent { id: FailureId; t: number; numbers: Record<string, number> }
```
`detect.ts`: `detectFailures(result, ctx: { targetX?: number; targetR?: number; g: number })`.
- `no_release`: !released. `self_hit`: landing.x < 3. `early_release`: angle > 70° или vx ≤ 0.
- `late_release`: angle < 8°. `short`/`long`: |landing.x − targetX| > targetR, знак и ошибка в numbers.
- `exploded`: NaN/Infinity или |x|, |y| > 1e5. `no_gravity`: средний ay по первым 20 сэмплам ≈ 0
  (|ay| < 0,1g). `gravity_up`: ay > 0,5g. `degrees_radians` определяет миссия (Task 9) и передаёт
  в ctx флаг `angleLooksLikeDegrees`.
Тесты: каждый детектор срабатывает на своём синтетическом результате и молчит на эталонном выстреле.
`catalog.ts` (контент, agy пишет черновик, Claude проверяет факты): для каждого id —
`{ title, what(numbers), why, realLife }`, на русском. Коммит.

### Task 6: Python в worker [Claude]
- `harness.py.ts`: Python-строка, которая принимает state и dt, вызывает пользовательский
  `step(state, dt)` до приземления или `max_steps`, собирает списки x, y, vx, vy и возвращает JSON.
  Проверка: step вернул dict с ключами x, y, vx, vy, иначе понятная ошибка.
- `worker.ts`: `loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.0/full/' })`,
  сообщения `{ id, code, init, dt, maxSteps }` → `{ id, ok, samples | error: { message, line } }`.
- `runStudent.ts`: создаёт worker лениво; таймаут 3 с → `terminate()`, новый worker, ошибка `timeout`.
- Проверка: e2e в браузере (Task 13); unit-тест на парсинг строки ошибки из traceback. Коммит.

### Task 7: прогресс [Claude]
`state/labProgress.ts` — zustand + persist (`physicslab-lab-v1`): `completed: Record<id, stars>`,
`incidents: FailureId[]`, `complete(id, stars)`, `recordIncident(id) → boolean` (true, если впервые).
Тест на recordIncident. Коммит.

### Task 8: миссии [Claude: механика; agy: тексты]
`levels/types.ts`:
```ts
export type MissionKind = 'tune' | 'predict' | 'write' | 'fix' | 'challenge';
export type EnvironmentId = 'workshop' | 'range';
export interface Target { x: number; r: number; moving?: { speed: number } }
export interface Mission {
  id: string; chapter: 1 | 2; order: number; kind: MissionKind; env: EnvironmentId;
  title: string; brief: string; goal: string;
  sliders: Array<{ key: 'releaseDeg'; min: number; max: number; step: number }>;
  base: SimParams; targets: Target[];
  code?: { starter: string; reference: string; fn: 'step' | 'release_angle' };
  hints: string[]; unlocks: string[]; theory: string[];   // KaTeX
}
```
Восемь миссий по разделу 6.1 спеки, дистанции из таблицы Task 4. Коммит.

### Task 9: 3D-сцена ядро [Claude]
`scene/LabScene.ts`: `new LabScene(canvas)`, `setEnvironment(id)`, `setShot(result, ghost?)`,
`seek(t)`, `play()/pause()`, `setSpeed(x)`, `onGroundClick(cb)` (raycast для флажка прогноза),
`dispose()`. Камера: общий план → сопровождение снаряда → общий план приземления. DPR ≤ 2,
адаптивное разрешение при fps < 45. Коммит.

### Task 10: модели и окружения [agy, по одной задаче]
Контракт окружения (`environments/types.ts`):
```ts
export interface Environment {
  group: THREE.Group; fog: THREE.Fog | null; background: THREE.Color | THREE.Texture;
  update(t: number): void; dispose(): void;
  palette: { accent: string; ground: string };
}
export type EnvironmentFactory = (opts: { targets: Target[]; maxX: number }) => Environment;
```
10a `trebuchetModel.ts` — `createTrebuchet(p: TrebuchetParams)` → `{ group, pose(theta, phi, released), dispose }`:
дерево (рама A-образная, балка, противовес-ящик с камнями), верёвка пращи (линия/трубка), снаряд-камень.
10b `workshop.ts` — утро, тёплый косой свет, двор с верстаками, бочками, забор, мишени-тюки сена.
10c `range.ts` — полдень, поле, разметка каждые 25 м с табличками, флажки, далёкие холмы.
10d `crew.ts` — 3 деревянных манекена, `scatter(t)` при self_hit. 10e `effects.ts`. 10f `audio/sfx.ts`.
Правила для agy: только процедурная геометрия, без внешних ассетов; без shell-команд кроме
`npx tsc -b`; не трогать файлы вне задачи. Claude проверяет tsc, дифф, скриншоты 1440 и 360 px.

### Task 11: UI [agy черновики, Claude интеграция]
`LabPage` (сцена на весь экран, слева бриф, справа ControlPanel, снизу Placard, ActBar сверху),
`Placard` (живые числа ShotResult простым языком), `IncidentCard` (разбор провала: что, почему,
как в жизни, кнопка «повторить в замедлении»), `IncidentJournal`, `CodeDrawer` (Monaco, выезжает снизу,
Run → runStudent → сцена), `WorldMap` (две главы, узлы миссий, замки по prerequisites, счётчик
найденных инцидентов). Стиль: тёмный приборный интерфейс, моно-цифры, янтарный акцент.

### Task 12: маршруты и вход [Claude]
`App.tsx`: `/lab` → WorldMap, `/lab/:missionId` → LabPage. Карточка «Мир 1: Требушет» на HomePage.

### Task 13: проверка [Claude]
- `npx vitest run` зелёный, покрытие `sim/` и `failures/` ≥ 80 % (`npx vitest run --coverage`).
- `npm run build` без ошибок.
- Браузер: миссия 1 — ранний отпуск → карточка → журнал → попадание; миссия 7 — код без гравитации →
  провал `no_gravity`; правильный код → попадание; `while True` → таймаут без зависания.
- Скриншоты первого кадра двух окружений (десктоп и 360 px), оценка 1–10, правки до 8+.
- Коммит, push ветки `feat/lab-v1`, PR.
