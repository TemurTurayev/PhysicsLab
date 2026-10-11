"""Turn on-screen text into speakable text: numbers, units, ± and code names become words.

The neural voices read digits and Latin poorly (Silero skips them entirely), so every line goes
through here before synthesis. Russian and Uzbek numbers agree with the unit that follows.
"""
import re

from num2words import num2words

UZ_ONES = ['nol', 'bir', 'ikki', 'uch', "to'rt", 'besh', 'olti', 'yetti', 'sakkiz', "to'qqiz"]
UZ_TENS = ['', "o'n", 'yigirma', "o'ttiz", 'qirq', 'ellik', 'oltmish', 'yetmish', 'sakson', "to'qson"]


def uz_int(n: int) -> str:
    if n < 10:
        return UZ_ONES[n]
    if n < 100:
        t, o = divmod(n, 10)
        return UZ_TENS[t] + (' ' + UZ_ONES[o] if o else '')
    h, r = divmod(n, 100)
    head = 'yuz' if h == 1 else UZ_ONES[h] + ' yuz'
    return head + (' ' + uz_int(r) if r else '')


def uz_num(s: str) -> str:
    if ',' in s or '.' in s:
        a, b = re.split('[,.]', s)
        frac = {1: "o'ndan", 2: 'yuzdan'}[len(b)]
        return f'{uz_int(int(a))} butun {frac} {uz_int(int(b))}'
    return uz_int(int(s))


def ru_plural(n: str, one: str, few: str, many: str) -> str:
    if ',' in n or '.' in n:
        return few  # «одна целая пять десятых метра»
    k = int(n)
    if k % 10 == 1 and k % 100 != 11:
        return one
    if 2 <= k % 10 <= 4 and not 12 <= k % 100 <= 14:
        return few
    return many


def ru_num(s: str) -> str:
    return num2words(float(s.replace(',', '.')) if ',' in s or '.' in s else int(s), lang='ru')


def en_num(s: str) -> str:
    return num2words(float(s.replace(',', '.')) if ',' in s or '.' in s else int(s), lang='en')


UNITS = {
    'ru': {'м/с²': ('метр в секунду в квадрате', 'метра в секунду в квадрате', 'метров в секунду в квадрате'),
           'м/с': ('метр в секунду', 'метра в секунду', 'метров в секунду'),
           'м': ('метр', 'метра', 'метров'), 'с': ('секунда', 'секунды', 'секунд'), 'кг': ('килограмм', 'килограмма', 'килограммов')},
    'en': {'m/s²': 'meters per second squared', 'm/s': 'meters per second', 'm': 'meters', 's': 'seconds', 'kg': 'kilograms'},
    'uz': {'m/s²': 'metr sekund kvadratga', 'm/s': 'metr sekundiga', 'm': 'metr', 's': 'soniya', 'da': 'soniya', 'kg': 'kilogramm'},
}
CODE = {
    'ru': {'step()': 'степ', 'fall_time': 'фол тайм', 'launch_velocity': 'лонч велосити', 'beam_moment': 'бим момент',
           'ЭМУ-3': 'Э-М-У три', 'ЭВМ-2': 'Э-В-М два', '№1': 'номер один', ' g = ': ' же равно ', ' = ': ' равно ', '±': 'плюс-минус '},
    'en': {'step()': 'step', 'fall_time': 'fall time', 'launch_velocity': 'launch velocity', 'beam_moment': 'beam moment',
           'EMU-3': 'E M U three', 'EVM-2': 'E V M two', 'No. 1': 'number one', ' = ': ' equals ', '±': 'plus or minus '},
    'uz': {'step()': 'step', 'fall_time': 'fol taym', 'launch_velocity': 'lonch velositi', 'beam_moment': 'bim moment',
           'EMU-3': 'E-M-U uch', 'EHM-2': 'E-H-M ikki', '1-sonli': 'birinchi', 'John': 'Jon', 'Doe': 'Dou', ' g = ': ' ge teng ', ' = ': ' teng ', '±': 'plyus-minus '},
}
NUM = r'\d+(?:[.,]\d+)?'


def speakable(text: str, lang: str) -> str:
    s = text
    for a, b in CODE[lang].items():
        s = s.replace(a, b)
    s = re.sub(r'[()]', ', ', s)
    units = UNITS[lang]
    alt = '|'.join(re.escape(u) for u in sorted(units, key=len, reverse=True))

    def with_unit(m: re.Match) -> str:
        n, u = m.group(1), m.group(2)
        if lang == 'ru':
            words = ru_num(n)
            if u == 'с':  # секунда is feminine: «одна», «две»
                words = re.sub(r'(один|два)$', lambda w: {'один': 'одна', 'два': 'две'}[w.group(1)], words)
            return f'{words} {ru_plural(n, *units[u])}'
        if lang == 'en':
            unit = units[u][:-1] if n == '1' else units[u]
            return f'{en_num(n)} {unit}'
        return f'{uz_num(n)} {units[u]}'

    s = re.sub(rf'({NUM})\s?({alt})(?![\wа-яА-ЯёЁ])', with_unit, s)
    spell = {'ru': ru_num, 'en': en_num, 'uz': uz_num}[lang]
    s = re.sub(NUM, lambda m: spell(m.group(0)), s)
    if lang == 'uz':  # suffixes written apart from a number/code stay attached in speech
        s = re.sub(r"(metr|soniya|moment) (dagi|dan|da|ga|ni)\b", r"\1\2", s)
    return re.sub(r'\s+([,.])', r'\1', re.sub(r'\s+', ' ', s)).replace(',,', ',').strip()


UZ_CYR = [("o'", 'ў'), ("o‘", 'ў'), ("g'", 'ғ'), ("g‘", 'ғ'), ('sh', 'ш'), ('ch', 'ч'), ('ng', 'нг'), ('yo', 'ё'), ('yu', 'ю'),
          ('ya', 'я'), ('ye', 'е'), ('a', 'а'), ('b', 'б'), ('d', 'д'), ('e', 'е'), ('f', 'ф'), ('g', 'г'), ('h', 'ҳ'),
          ('i', 'и'), ('j', 'ж'), ('k', 'к'), ('l', 'л'), ('m', 'м'), ('n', 'н'), ('o', 'о'), ('p', 'п'), ('q', 'қ'),
          ('r', 'р'), ('s', 'с'), ('t', 'т'), ('u', 'у'), ('v', 'в'), ('x', 'х'), ('y', 'й'), ('z', 'з'), ("'", 'ъ'), ('’', 'ъ')]


def uz_to_cyrillic(text: str) -> str:
    """Uzbek Latin → Cyrillic for the MMS voice, which was trained on Cyrillic script."""
    s = re.sub(r'\be', 'э', text.lower())
    for a, b in UZ_CYR:
        s = s.replace(a, b)
    return s
