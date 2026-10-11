"""Merge translator output files ({"ru": {"en": .., "uz": ..}}) into src/i18n/en.json and uz.json.

Usage: python3 scripts/i18n-merge.py <out-file>...   Existing translations are kept unless a file overrides them.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src" / "i18n"
keys = set(json.loads((ROOT / "keys.json").read_text()))
dicts = {lang: json.loads((ROOT / f"{lang}.json").read_text()) for lang in ("en", "uz")}


def parse(text: str) -> dict:
    """The model's reply: the first {...} block, tolerant of fences or prose around it."""
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M)
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start : end + 1])


for path in sys.argv[1:]:
    try:
        data = parse(Path(path).read_text())
    except (ValueError, json.JSONDecodeError) as e:
        print(f"{path}: cannot parse ({e})")
        continue
    unknown = 0
    for ru, tr in data.items():
        if ru not in keys or not isinstance(tr, dict):
            unknown += 1
            continue
        for lang in ("en", "uz"):
            if isinstance(tr.get(lang), str) and tr[lang].strip():
                dicts[lang][ru] = tr[lang]
    print(f"{path}: {len(data)} entries, {unknown} not matching a key")

for lang, d in dicts.items():
    d = {k: v for k, v in sorted(d.items()) if k in keys}
    (ROOT / f"{lang}.json").write_text(json.dumps(d, ensure_ascii=False, indent=1) + "\n")
    print(lang, "covered", len(d), "of", len(keys))
