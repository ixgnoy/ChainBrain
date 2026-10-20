"""Kokoro offline voice-over: .venv/bin/python tts/tts.py lines.json out_dir

lines.json = [{"id": "b01", "text": "...", "voice": "am_michael", "speed": 0.95}, ...]
Writes out_dir/<id>.wav (24 kHz mono, leading/trailing silence trimmed) and out_dir/dur.json.
Model files live in tts/models/ (kokoro-v1.0.onnx, voices-v1.0.bin from the kokoro-onnx v1.0 release).
Adapted from lemo-opuscar core/tts/tts.py (MIT, Lemomo); see video/CREDITS.md.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

if len(sys.argv) < 3:
    print(__doc__)
    sys.exit(2)

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "models", "kokoro-v1.0.onnx")
VOICES = os.path.join(HERE, "models", "voices-v1.0.bin")
if not (os.path.exists(MODEL) and os.path.exists(VOICES)):
    sys.exit("tts.py: Kokoro model missing; run video/build.sh setup (downloads kokoro-v1.0.onnx and voices-v1.0.bin)")

from kokoro_onnx import Kokoro  # noqa: E402

lines = json.load(open(sys.argv[1], encoding="utf-8"))
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
k = Kokoro(MODEL, VOICES)
avail = set(k.get_voices())
dur = {}
only = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else None
for L in lines:
    if only and L["id"] not in only:
        continue
    voice = L.get("voice", "am_michael")
    if voice == "team":  # a line the team says on camera (tools/voice.py imports it): a stand-in until then
        voice = "af_heart"
    if voice not in avail:
        sys.exit(f"tts.py: unknown voice {voice}; available: {', '.join(sorted(avail))}")
    a, sr = k.create(L.get("say", L["text"]), voice=voice, speed=L.get("speed", 0.95), lang=L.get("lang", "en-us"))
    nz = np.where(np.abs(a) > np.abs(a).max() * 0.02)[0]
    if len(nz):
        a = a[max(0, nz[0] - int(0.03 * sr)): nz[-1] + int(0.08 * sr)]
    sf.write(os.path.join(out, L["id"] + ".wav"), a, sr)
    dur[L["id"]] = round(len(a) / sr, 3)
    words = len(L["text"].split())
    print(f'{L["id"]}\t{dur[L["id"]]:6.2f}s\t{words / dur[L["id"]] * 60:5.0f} wpm\t{L["text"][:70]}')
prev = {}
dj = os.path.join(out, "dur.json")
if os.path.exists(dj):
    prev = json.load(open(dj))
prev.update(dur)
json.dump(prev, open(dj, "w"), indent=1)
