# Narration clips

Briefings and the complex's announcements are pre-rendered with open TTS models into `public/voice/<lang>/<world>/<id>.mp3`.
After editing a story, a goal or a notice, re-render (only changed lines are synthesised):

```bash
for L in ru en uz; do LOCALE=$L npx vite-node scripts/voice/dump.ts; done
~/.cache/plab-tts/.venv/bin/python scripts/voice/gen.py
```

Environment (once): a Python 3.12 venv in `~/.cache/plab-tts` with `piper-tts pyworld "setuptools<70" numpy scipy soundfile num2words torch transformers`,
the Piper voices `en_US-ljspeech-high`, `en_US-john-medium`, `ru_RU-denis-medium` (from rhasspy/piper-voices) and Silero `v4_ru.pt`, `v4_uz.pt` (models.silero.ai, checksums pinned in gen.py).

- `normalize.py` — numbers, units, ± and code names to words (ru/en/uz).
- `fx.py` — `facility` (the complex's synthetic announcer: quantised flat pitch, metallic double, hard room) and `narrator` (the classic storyteller: deeper, wider melody, hall).
