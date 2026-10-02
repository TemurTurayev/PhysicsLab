/** Plain-Russian hints for the Python errors a beginner meets first. Python's own message stays visible too. */
const RULES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/SyntaxError: expected ':'/, () => 'После def, if, for и while в конце строки нужно двоеточие.'],
  [/IndentationError|TabError/, () => 'Сбит отступ: строки внутри функции должны начинаться с одинакового числа пробелов (обычно 4).'],
  [/SyntaxError/, () => 'Python не смог прочитать строку: проверь скобки, кавычки и знаки между числами.'],
  [/NameError: name '(\w+)' is not defined/, (m) => `Имя «${m[1]}» нигде не задано. Опечатка? Python различает большие и маленькие буквы.`],
  [/KeyError: '(\w+)'/, (m) => `В словаре нет ключа «${m[1]}». Посмотри, какие ключи есть в state.`],
  [/ZeroDivisionError/, () => 'Деление на ноль: проверь знаменатель.'],
  [/TypeError: .*NoneType/, () => 'Где-то получилось None — обычно это функция без return.'],
  [/TypeError/, () => 'Действие с неподходящим типом: например, число умножается на строку или словарь.'],
]

export function explainError(message: string): string | null {
  for (const [re, say] of RULES) {
    const m = message.match(re)
    if (m) return say(m)
  }
  return null
}
