import { tr } from './index'

/**
 * Messages that are written in Russian outside the app's code — by the Python harness in Pyodide and by
 * the accounts server — translated when shown. Each Python pattern turns the dynamic parts into placeholders.
 */
const PYTHON: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/step\(\) должна вернуть словарь, а вернула (\w+) \(шаг (\d+)\)/, (m) => tr('step() должна вернуть словарь, а вернула {0} (шаг {1})', [m[1], m[2]])],
  [/в словаре, который вернула step\(\), нет ключа '(\w+)' \(шаг (\d+)\)/, (m) => tr("в словаре, который вернула step(), нет ключа '{0}' (шаг {1})", [m[1], m[2]])],
  [/beam_moment\(\) должна вернуть число, а вернула (\w+)/, (m) => tr('beam_moment() должна вернуть число, а вернула {0}', [m[1]])],
  [/launch_velocity\(\) должна вернуть пару \(vx, vy\)/, () => tr('launch_velocity() должна вернуть пару (vx, vy)')],
  [/не найдена функция ([\w(), ]+\))/, (m) => tr('не найдена функция {0}', [m[1]])],
  [/не найдена переменная (\w+)/, (m) => tr('не найдена переменная {0}', [m[1]])],
  [/(\w+) должна быть числом, а сейчас это (\w+)/, (m) => tr('{0} должна быть числом, а сейчас это {1}', [m[1], m[2]])],
  [/(\w+) получилась (\S+) — так не бывает, проверь деление/, (m) => tr('{0} получилась {1} — так не бывает, проверь деление', [m[1], m[2]])],
]

export function localizePythonError(message: string): string {
  for (const [re, say] of PYTHON) {
    const m = message.match(re)
    if (m) return message.replace(m[0], say(m))
  }
  return message
}

/** Every message the accounts server can send (worker/), listed so the key extractor sees them. */
export const SERVER_MESSAGES = [
  tr('Не удалось создать аккаунт'),
  tr('Неверное имя или пароль'),
  tr('Неверный запрос'),
  tr('Нет такого адреса'),
  tr('Нужно войти заново'),
  tr('Сервер не справился. Попробуй ещё раз.'),
  tr('Слишком много попыток. Подожди 10 минут.'),
  tr('Это имя уже занято — выбери другое'),
  tr('Имя: от 3 до 24 символов — буквы, цифры, точка, дефис или подчёркивание'),
  tr('Неверный журнал провалов'),
  tr('Неверный формат прогресса'),
  tr('Неизвестная вселенная'),
  tr('Нет данных прогресса'),
  tr('Нужны имя и пароль'),
  tr('Пароль: от 6 до 128 символов'),
  tr('Слишком много миссий'),
]

/** A server error in the current language (the server answers in Russian, which is the key). */
export function localizeServerError(message: string): string {
  return tr(message)
}
