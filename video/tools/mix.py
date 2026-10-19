"""Mix the voice-over over the score and master it for online playback.

usage: .venv/bin/python tools/mix.py remotion/src/timeline.json remotion/public/audio out.wav
- each VO line (remotion/public/audio/vo/<id>.wav, 24 kHz) is levelled to the same loudness and placed at its cue;
- the score (remotion/public/audio/score.wav) is ducked under the voice so it never sits closer than 14 dB to it,
  except on the key hits listed in timeline cues.punch;
- the result is normalised to -14 LUFS integrated, -2.5 dBTP (AAC adds up to ~1 dB of overshoot; the delivered file must stay under -1), with ffmpeg's two-pass loudnorm.
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf
import soxr
from scipy.ndimage import uniform_filter1d

SR = 48000
tl = json.load(open(sys.argv[1]))
audio_dir, out = sys.argv[2], sys.argv[3]
N = int((tl["total"] + 0.5) * SR)

score, sr = sf.read(os.path.join(audio_dir, "score.wav"), dtype="float32", always_2d=True)
assert sr == SR
music = np.zeros((N, 2), np.float32)
music[: min(N, len(score))] = score[:N]

vo = np.zeros(N, np.float32)
VO_RMS_DB = -19.0
for cue in tl["vo"]:
    x, r = sf.read(os.path.join(audio_dir, "vo", f"{cue['id']}.wav"), dtype="float32")
    x = soxr.resample(x, r, SR)
    rms = np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2)) if np.any(np.abs(x) > 0.01) else 1e-3
    x = x * (10 ** (VO_RMS_DB / 20) / rms)
    i = int(cue["at"] * SR)
    n = min(len(x), N - i)
    vo[i:i + n] += x[:n]

# sidechain: where the voice is active, cap the music's short-term level at (voice level - 14 dB)
win = int(0.3 * SR)
vo_env = np.sqrt(np.maximum(0, uniform_filter1d(vo ** 2, win)))
active = vo_env > 10 ** (-40 / 20)
active = uniform_filter1d(active.astype(np.float32), int(0.25 * SR)) > 0.01  # bridge short gaps between words
m_env = np.sqrt(np.maximum(0, uniform_filter1d((music ** 2).mean(axis=1), win))) + 1e-9
cap = 10 ** ((VO_RMS_DB - 14) / 20)
g_target = np.where(active, np.minimum(1.0, cap / m_env), 1.0).astype(np.float32)
# smooth: fast attack (80 ms), slow release (600 ms)
g = np.empty_like(g_target)
a_att = np.exp(-1.0 / (0.08 * SR))
a_rel = np.exp(-1.0 / (0.6 * SR))
prev = 1.0
for i in range(0, N, 64):  # block-wise for speed
    tgt = float(g_target[i:i + 64].min())
    coef = a_att if tgt < prev else a_rel
    prev = coef ** 64 * prev + (1 - coef ** 64) * tgt
    g[i:i + 64] = prev
# punch-through: on the film's key hits (cues.punch: [start, length]) the music may rise to 3 dB over the voice,
# with a 15 ms rise and a 350 ms fall, so the hit lands even while a word is being spoken
cap_hit = 10 ** ((VO_RMS_DB + 3) / 20)
for st, ln in tl["cues"].get("punch", []):
    a, b = int(st * SR), int((st + ln) * SR)
    if a >= N:
        continue
    b = min(b, N)
    gp = np.minimum(1.0, cap_hit / m_env[a:b])
    n = b - a
    shape = np.minimum(1, np.minimum(np.arange(n) / (0.015 * SR), (n - np.arange(n)) / (0.35 * SR))).clip(0, 1)
    g[a:b] = np.maximum(g[a:b], g[a:b] + (gp - g[a:b]).clip(0) * shape)
mix = music * g[:, None] * 0.9 + vo[:, None]
tmp = out + ".pre.wav"
sf.write(tmp, mix, SR, subtype="FLOAT")

# two-pass loudnorm
p1 = subprocess.run(["ffmpeg", "-hide_banner", "-i", tmp, "-af", "loudnorm=I=-14:TP=-2.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
j = json.loads(p1[p1.rindex("{"): p1.rindex("}") + 1])
af = (
    "loudnorm=I=-14:TP=-2.5:LRA=11:linear=true:"
    f"measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}"
)
# loudnorm can't always reach its peak target in linear mode, and the AAC encode then adds about 1.3 dB of
# overshoot: a limiter at -4 dBFS, run at 4x the sample rate so it sees inter-sample peaks, keeps the MP4 under -1 dBTP
af += f",aresample={SR * 4},alimiter=limit=0.63:attack=1:release=60:level=disabled,aresample={SR}"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", af, "-ar", str(SR), "-c:a", "pcm_s16le", out], check=True)
os.remove(tmp)
print("mix", out, "input", j["input_i"], "LUFS ->", "-14 target")
