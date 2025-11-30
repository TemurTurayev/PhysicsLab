/**
 * Interactive parameter configurations for missions with sliders
 */

export interface InteractiveParameter {
    name: string;
    label: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    unit?: string;
}

export interface MissionInteractiveConfig {
    missionId: string;
    parameters: InteractiveParameter[];
    codeTemplate: (params: Record<string, number>) => string;
}

/**
 * Mission 5.1.2: Linear Functions (y = kx + b)
 * Interactive parameters: k (slope), b (y-intercept)
 */
export const mission5_1_2_interactive: MissionInteractiveConfig = {
    missionId: '5-1-2',
    parameters: [
        {
            name: 'k',
            label: 'Наклон (k)',
            min: -3,
            max: 3,
            step: 0.1,
            defaultValue: 2,
            unit: '',
        },
        {
            name: 'b',
            label: 'Сдвиг (b)',
            min: -5,
            max: 5,
            step: 0.5,
            defaultValue: 0,
            unit: '',
        },
    ],
    codeTemplate: (params) => `from mathlab import *

# Интерактивная линейная функция
# y = kx + b

# Параметры управляются слайдерами:
k = ${params.k}  # Наклон (slope)
b = ${params.b}  # Сдвиг по Y (y-intercept)

# Создаём функцию с текущими параметрами
f = Function(f"{k}*x + {b}")

# Визуализация
canvas = Canvas(x_range=(-5, 5), y_range=(-10, 10))
canvas.plot(f, color="blue", name=f"y = {k}x {'+ ' if b >= 0 else ''}{b}")

# Отметим ключевые точки
canvas.mark_point(0, b, label=f"y-intercept: {b}", color="green")
if abs(k) > 0.01:  # Избегаем деления на ноль
    x_intercept = -b / k
    if -5 <= x_intercept <= 5:
        canvas.mark_point(x_intercept, 0, label=f"x-intercept: {x_intercept:.1f}", color="red")

canvas.show()

# Информация
print(f"Функция: y = {k}x {'+ ' if b >= 0 else ''}{b}")
print(f"Наклон: {k}")
print(f"Y-intercept: {b}")
if abs(k) > 0.01:
    print(f"X-intercept: {-b/k:.2f}")
`,
};

/**
 * Mission 5.1.3: Quadratic Functions (y = ax² + bx + c)
 * Interactive parameters: a, b, c
 */
export const mission5_1_3_interactive: MissionInteractiveConfig = {
    missionId: '5-1-3',
    parameters: [
        {
            name: 'a',
            label: 'Коэффициент a',
            min: -2,
            max: 2,
            step: 0.1,
            defaultValue: 1,
            unit: '',
        },
        {
            name: 'b',
            label: 'Коэффициент b',
            min: -5,
            max: 5,
            step: 0.5,
            defaultValue: 0,
            unit: '',
        },
        {
            name: 'c',
            label: 'Коэффициент c',
            min: -5,
            max: 5,
            step: 0.5,
            defaultValue: 0,
            unit: '',
        },
    ],
    codeTemplate: (params) => `from mathlab import *
import math

# Интерактивная квадратичная функция
# y = ax² + bx + c

# Параметры управляются слайдерами:
a = ${params.a}  # Определяет направление и "ширину" параболы
b = ${params.b}  # Сдвигает вершину по горизонтали
c = ${params.c}  # Сдвигает параболу по вертикали

# Создаём функцию
if abs(a) < 0.01:
    f = Function(f"{b}*x + {c}")  # Линейная, если a ≈ 0
else:
    f = Function(f"{a}*x**2 + {b}*x + {c}")

# Визуализация
canvas = Canvas(x_range=(-5, 5), y_range=(-10, 10))
canvas.plot(f, color="blue", name=f"y = {a}x² {'+ ' if b >= 0 else ''}{b}x {'+ ' if c >= 0 else ''}{c}")

# Вершина параболы
if abs(a) >= 0.01:
    vertex_x = -b / (2 * a)
    vertex_y = a * vertex_x**2 + b * vertex_x + c
    if -5 <= vertex_x <= 5 and -10 <= vertex_y <= 10:
        canvas.mark_point(vertex_x, vertex_y, label=f"Вершина", color="red")

# Точка пересечения с осью Y
canvas.mark_point(0, c, label=f"({0}, {c})", color="green")

canvas.show()

# Информация
print(f"Функция: y = {a}x² {'+ ' if b >= 0 else ''}{b}x {'+ ' if c >= 0 else ''}{c}")
print(f"Направление: {'вверх ⤴' if a > 0 else 'вниз ⤵' if a < 0 else 'линейная ➡'}")
if abs(a) >= 0.01:
    print(f"Вершина: ({vertex_x:.2f}, {vertex_y:.2f})")
`,
};

/**
 * Get interactive config for a mission
 */
export function getInteractiveConfig(missionId: string): MissionInteractiveConfig | null {
    const configs = [mission5_1_2_interactive, mission5_1_3_interactive];
    return configs.find((config) => config.missionId === missionId) || null;
}
