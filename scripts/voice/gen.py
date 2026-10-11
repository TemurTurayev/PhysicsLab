"""Render the narration clips: public/voice/<lang>/<world>/<id>.mp3.

Run from the project root with the TTS environment (see README.md in this folder):
    for L in ru en uz; do LOCALE=$L npx vite-node scripts/voice/dump.ts; done
    ~/.cache/plab-tts/.venv/bin/python scripts/voice/gen.py
Only clips whose text changed are re-rendered (hashes in scripts/voice/hashes.json).

Voices (all open models, credited in the app):
  complex announcer — en: Piper LJSpeech (public domain); ru: Silero «xenia», uz: Silero «dilnavoz» (CC BY-NC 4.0)
  classic narrator  — en: Piper «john» (public domain); ru: Piper «denis» (CC0); uz: Meta MMS-TTS uzb (CC BY-NC 4.0)
"""
import hashlib
import io
import json
import os
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
from fx import facility, narrator  # noqa: E402
from normalize import speakable, uz_to_cyrillic  # noqa: E402

MODELS = Path(os.environ.get('PLAB_TTS', Path.home() / '.cache/plab-tts'))
OUT = Path('public/voice')
HASHES = Path('scripts/voice/hashes.json')
VERSION = 'v1'
# Silero ships models as torch packages (pickle inside), so only the exact files from models.silero.ai load.
SILERO_SHA256 = {
    'v4_ru': '896ab96347d5bd781ab97959d4fd6885620e5aab52405d3445626eb7c1414b00',
    'v4_uz': '46c7977beccf2f3c9f730de281f8efefe60ee8f293a2047e89aebe567b3ed4d7',
}

_cache: dict = {}


def piper(model: str, text: str) -> tuple[np.ndarray, int]:
    from piper import PiperVoice
    if model not in _cache:
        _cache[model] = PiperVoice.load(str(MODELS / f'{model}.onnx'))
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        _cache[model].synthesize_wav(text, w)
    buf.seek(0)
    return sf.read(buf)


def silero(pack: str, speaker: str, text: str) -> tuple[np.ndarray, int]:
    import torch
    if pack not in _cache:
        path = MODELS / f'{pack}.pt'
        if hashlib.sha256(path.read_bytes()).hexdigest() != SILERO_SHA256[pack]:
            raise RuntimeError(f'{path} does not match the pinned checksum; re-download from models.silero.ai')
        _cache[pack] = torch.package.PackageImporter(str(path)).load_pickle('tts_models', 'model')
    extra = {'put_accent': True, 'put_yo': True} if pack == 'v4_ru' else {}
    audio = _cache[pack].apply_tts(text=text, speaker=speaker, sample_rate=48000, **extra)
    return audio.numpy(), 48000


def mms_uz(text: str) -> tuple[np.ndarray, int]:
    import torch
    from transformers import AutoTokenizer, VitsModel
    name = 'facebook/mms-tts-uzb-script_cyrillic'
    if name not in _cache:
        _cache[name] = (VitsModel.from_pretrained(name), AutoTokenizer.from_pretrained(name))
    model, tok = _cache[name]
    torch.manual_seed(0)
    with torch.no_grad():
        wav = model(**tok(uz_to_cyrillic(text), return_tensors='pt')).waveform[0].numpy()
    return wav, model.config.sampling_rate


def synth(world: str, lang: str, text: str) -> tuple[np.ndarray, int]:
    if world == 'sigma':
        if lang == 'en':
            return piper('en_US-ljspeech-high', text)
        return silero('v4_ru', 'xenia', text) if lang == 'ru' else silero('v4_uz', 'dilnavoz', text)
    if lang == 'en':
        return piper('en_US-john-medium', text)
    return piper('ru_RU-denis-medium', text) if lang == 'ru' else mms_uz(text)


def encode(x: np.ndarray, sr: int, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', '-',
                    '-ar', '24000', '-b:a', '48k', str(path)], input=pcm, check=True)


def main() -> None:
    hashes = json.loads(HASHES.read_text()) if HASHES.exists() else {}
    try:
        render_all(hashes)
    finally:
        HASHES.write_text(json.dumps(hashes, indent=1, sort_keys=True) + '\n')


def render_all(hashes: dict) -> None:
    for lang in ['ru', 'en', 'uz']:
        lines = json.loads(Path(f'scripts/voice/lines-{lang}.json').read_text())
        for clip, text in lines.items():
            world = clip.split('/')[0]
            spoken = speakable(text, lang)
            key = f'{lang}/{clip}'
            digest = hashlib.sha1(f'{VERSION}|{spoken}'.encode()).hexdigest()[:12]
            path = OUT / f'{key}.mp3'
            if hashes.get(key) == digest and path.exists():
                continue
            x, sr = synth(world, lang, spoken)
            x = x.mean(1) if x.ndim > 1 else x
            seed = int(digest[:6], 16)
            encode(facility(x, sr, seed) if world == 'sigma' else narrator(x, sr, seed), sr, path)
            hashes[key] = digest
            print(key, f'{len(x) / sr:.1f}s')


if __name__ == '__main__':
    main()
