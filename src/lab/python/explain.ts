import { tr } from '../../i18n'
/** Plain-Russian hints for the Python errors a beginner meets first. Python's own message stays visible too. */
const RULES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/SyntaxError: expected ':'/, () => tr('После def, if, for и while в конце строки нужно двоеточие.')],
  [/IndentationError|TabError/, () => tr('Сбит отступ: строки внутри функции должны начинаться с одинакового числа пробелов (обычно 4).')],
  [/SyntaxError/, () => tr('Python не смог прочитать строку: проверь скобки, кавычки и знаки между числами.')],
  [/NameError: name '(\w+)' is not defined/, (m) => tr(`Имя «{0}» нигде не задано. Опечатка? Python различает большие и маленькие буквы.`, [m[1]])],
  [/KeyError: '(\w+)'/, (m) => tr(`В словаре нет ключа «{0}». Посмотри, какие ключи есть в state.`, [m[1]])],
  [/ZeroDivisionError/, () => tr('Деление на ноль: проверь знаменатель.')],
  [/TypeError: .*NoneType/, () => tr('Где-то получилось None — обычно это функция без return.')],
  [/TypeError/, () => tr('Действие с неподходящим типом: например, число умножается на строку или словарь.')],
]

export function explainError(message: string): string | null {
  for (const [re, say] of RULES) {
    const m = message.match(re)
    if (m) return say(m)
  }
  return null
}
