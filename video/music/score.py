"""The cinematic score, composed in code and timed to the edit (remotion/src/timeline.json).

usage: ../.venv/bin/python score.py ../remotion/src/timeline.json ../remotion/public/audio/score.wav
Instruments: VSCO 2 Community Edition samples (CC0, via lemo-opuscar's sampler, MIT) for strings, brass and
timpani; numpy synthesis for the sub hits, risers, the braam at the drop and the soft bells of the Brain section.
Key D minor at 100 BPM; the drop lands on "Now, let's attack it", resolving to D major for the Brain and the close.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import sampler as S  # noqa: E402
from lib.sfx import SR, add, bp, hp, limit, lp, noise, t_  # noqa: E402

tl = json.load(open(sys.argv[1]))
cue = tl["cues"]
TOTAL = tl["total"] + 1.5
BEAT = 0.6  # 100 BPM
BAR = 4 * BEAT
S.seed(11)
buf = np.zeros((int(TOTAL * SR), 2), np.float32)


def place(x, at, gain=1.0, pan=0.0):
    if at < 0 or at >= TOTAL:
        return
    add(buf, x.astype(np.float32), at, gain, pan)


def stereo_place(st, at, gain=1.0):
    i = int(at * SR)
    n = min(len(st), len(buf) - i)
    if n > 0:
        buf[i:i + n] += st[:n] * gain


def render(events, dur):
    return S.render(events, dur=dur, master=False)


# ---------- synth parts ----------
def sub_hit(f0=62.0, f1=34.0, d=2.6, v=1.0):
    tt = t_(d)
    f = f1 + (f0 - f1) * np.exp(-tt / 0.18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-tt / (d * 0.32))
    click = hp(noise(0.02), 2000) * np.exp(-t_(0.02) / 0.004) * 0.25
    x[: len(click)] += click
    return np.tanh(x * 1.6) * 0.8 * v


def riser(d=6.0, v=1.0):
    """Filtered noise sweeping up (overlap-added band-passed slices) plus a rising tone."""
    N = int(d * SR)
    n = noise(d + 0.3)
    out = np.zeros(N)
    seg = int(0.1 * SR)
    win = np.hanning(seg)
    for i in range(0, N - seg, seg // 2):
        fc = 250 * (30 ** (i / N))
        chunk = bp(n[max(0, i - 2000): i + seg], fc * 0.75, min(fc * 1.35, 21000))[-seg:]
        out[i:i + seg] += chunk * win
    tt = t_(d)[:N]
    env = (tt / d) ** 2.0
    tone = np.sin(2 * np.pi * np.cumsum(110 * (2 ** (2.5 * tt / d))) / SR) * 0.12
    return (out * 0.5 + tone) * env * v


def reverse_swell(d=2.0, v=1.0):
    tt = t_(d)
    x = lp(noise(d), 3500) * (tt / d) ** 3
    return x * 0.5 * v


def saw(freq, d, voices=7, detune=0.12):
    tt = t_(d)
    out = np.zeros_like(tt)
    for k in range(voices):
        cents = (k - (voices - 1) / 2) * detune * 100 / ((voices - 1) / 2)
        f = freq * 2 ** (cents / 1200)
        ph = (f * tt + np.random.default_rng(k).random()) % 1.0
        out += 2 * ph - 1
    return out / voices


def braam(d=4.5, v=1.0):
    tt = t_(d)
    x = saw(36.71, d) * 0.9 + saw(73.42, d) * 0.7 + saw(110.0, d) * 0.45  # D1, D2, A2
    x = np.tanh(x * 2.2)
    # filter opens fast then closes: two-stage low-pass blend as a cheap sweep
    bright = lp(x, 1600, 2)
    dark = lp(x, 220, 2)
    k = np.exp(-tt / 0.7)
    y = bright * k + dark * (1 - k)
    env = np.minimum(1, tt / 0.03) * np.exp(-tt / (d * 0.45))
    return y * env * 0.7 * v


def pad(freqs, d, v=1.0, cutoff=1400):
    tt = t_(d)
    x = sum(saw(f, d, voices=5, detune=0.08) for f in freqs) / len(freqs)
    x = lp(x, cutoff, 2)
    env = np.minimum(1, tt / 1.6) * np.minimum(1, (d - tt) / 1.8)
    return x * env * 0.35 * v


def bell(freq, d=2.8, v=1.0):
    tt = t_(d)
    idx = 2.2 * np.exp(-tt / 0.5)
    x = np.sin(2 * np.pi * freq * tt + idx * np.sin(2 * np.pi * freq * 3.5 * tt))
    return x * np.exp(-tt / 0.9) * 0.18 * v


def tick(v=1.0):
    d = 0.05
    return hp(noise(d), 6000) * np.exp(-t_(d) / 0.006) * 0.25 * v


# ---------- arrangement ----------
D_MIN = ["D3", "F3", "A3", "D4", "A3", "F3", "D3", "A2"]
D_MIN_HI = ["D4", "F4", "A4", "D5", "A4", "F4", "D4", "A3"]
B_FLAT = ["Bb2", "D3", "F3", "Bb3", "F3", "D3", "Bb2", "F2"]
C_MAJ = ["C3", "E3", "G3", "C4", "G3", "E3", "C3", "G2"]
D_MAJ = ["D3", "F#3", "A3", "D4", "A3", "F#3", "D3", "A2"]


def ostinato(start, end, chords, inst="cellos_spic", vel=(0.35, 0.55), pan=-0.25, gain=1.0, hi=False):
    """16th-note string ostinato, one chord per bar, velocity rising across the span."""
    ev = []
    t = start
    bar = 0
    step = BEAT / 2  # eighth notes (the 16ths read too busy under speech)
    while t < end - 0.01:
        notes = chords[bar % len(chords)]
        for i in range(8):
            tt = t + i * step
            if tt >= end:
                break
            k = (tt - start) / max(1e-3, end - start)
            v = vel[0] + (vel[1] - vel[0]) * k
            accent = 0.12 if i % 4 == 0 else 0.0
            ev.append((tt - start, inst, notes[i % len(notes)], step * 0.9, min(1, v + accent), pan, gain))
        t += BAR
        bar += 1
    if ev:
        stereo_place(render(ev, end - start + 2), start)


def sustain(start, end, inst, pitch, vel=0.5, pan=0.0, gain=1.0, attack=0.8):
    d = end - start
    ev = [dict(t=0, inst=inst, pitch=pitch, dur=d, vel=vel, pan=pan, attack=attack)]
    stereo_place(render(ev, d + 3) * gain, start)


def timp(at, pitch="D2", vel=0.8, gain=1.0):
    stereo_place(render([(0, "timpani", pitch, 2.5, vel, 0.0)], 3.5) * gain, at)


# 0:00 cold open: a low tension bed and a clock-like tick, gone at the hard cut.
cut = cue["cut"]
place(pad([36.71, 73.42], cut + 0.5, v=0.55, cutoff=500)[: int(cut * SR)], 0.0, 0.9)
for i, tt in enumerate(np.arange(0.9, cut - 0.2, BEAT)):
    place(tick(0.7 + 0.3 * (i % 2 == 0)), tt, 0.8, 0.3 if i % 2 else -0.3)
place(reverse_swell(1.2, 0.8), cut - 1.2, 0.8)
# the turn: one deep hit and a held cello note under "Unless it never held your wallet."
place(sub_hit(55, 30, 3.5, 0.9), cue["turn"] - 0.15, 0.9)
sustain(cue["turn"], cue["title"] + 1.5, "cellos", "D2", vel=0.45, gain=0.9)
place(reverse_swell(2.0, 0.7), cue["title"] - 2.0, 0.7)

# 0:12 title and team: a warm pad opens, sparse low strings.
t0 = cue["title"]
place(pad([73.42, 110.0, 146.83, 174.61], cue["layers"] - t0 + 2, v=0.9, cutoff=1100), t0, 0.8)
timp(t0, "D2", 0.55, 0.8)
sustain(t0, cue["layers"] + 1, "contrabass", "D2", vel=0.4, gain=0.8)

# 0:28 problem and two layers: the ostinato starts quietly.
ostinato(cue["layers"], cue["act1"], [D_MIN, D_MIN, B_FLAT, C_MAJ], vel=(0.25, 0.4), gain=0.75)
sustain(cue["layers"], cue["act1"], "violas", "A3", vel=0.3, pan=0.3, gain=0.5, attack=2.0)

# 0:54 Act 1: fuller, with a timpani pulse every bar.
ostinato(cue["act1"], cue["act2"], [D_MIN, B_FLAT, C_MAJ, D_MIN], vel=(0.38, 0.5), gain=0.85)
ostinato(cue["act1"] + 4 * BAR, cue["act2"], [D_MIN_HI], inst="violins_spic", vel=(0.2, 0.32), pan=0.35, gain=0.5)
for tt in np.arange(cue["act1"], cue["act2"], BAR):
    timp(tt, "D2", 0.45, 0.6)
sustain(cue["act1"], cue["act2"], "cellos", "D3", vel=0.35, pan=-0.2, gain=0.5, attack=1.5)

# 1:18 Act 2: brass swells join; build towards the drop.
ostinato(cue["act2"], cue["drop"], [D_MIN, B_FLAT, C_MAJ, D_MIN], vel=(0.45, 0.62), gain=0.9)
ostinato(cue["act2"], cue["drop"], [D_MIN_HI], inst="violins_spic", vel=(0.28, 0.45), pan=0.35, gain=0.55)
for tt in np.arange(cue["act2"], cue["drop"] - 0.1, BAR):
    timp(tt, "D2", 0.5, 0.65)
    timp(tt + 2 * BEAT, "A1", 0.35, 0.45)
for i, tt in enumerate(np.arange(cue["act2"] + 2 * BAR, cue["drop"] - BAR, 2 * BAR)):
    sustain(tt, tt + 2 * BAR, "horn", ["D3", "F3", "A3"][i % 3], vel=0.38, pan=0.15, gain=0.6, attack=1.2)
place(riser(cue["drop"] - cue["riser"], 0.9), cue["riser"], 0.75)
place(reverse_swell(1.6, 1.0), cue["drop"] - 1.6, 0.9)

# 1:55 the drop: braam, sub and a full hit, then a driving low ostinato under the attacks.
d0 = cue["drop"]
place(braam(5.5, 1.0), d0, 0.72)
place(sub_hit(70, 32, 3.0, 1.0), d0, 0.85)
stereo_place(render([(0, "bass_drum", None, None, 0.9, 0.0), (0, "crash", None, None, 0.6, 0.2), (0, "timpani", "D2", 2.5, 0.95, 0.0)], 4.0), d0, 0.72)
sustain(d0, cue["blocked"], "contrabass", "D2", vel=0.55, gain=0.75, attack=0.3)
sustain(d0 + BAR, cue["blocked"], "trombone", "D2", vel=0.45, gain=0.55, attack=1.5)
ostinato(d0 + BAR, cue["blocked"], [D_MIN, D_MIN, B_FLAT, D_MIN], vel=(0.5, 0.7), gain=0.85)
ostinato(d0 + 2 * BAR, cue["blocked"], [D_MIN_HI], inst="violins_spic", vel=(0.35, 0.55), pan=0.35, gain=0.55)
for tt in np.arange(d0 + BAR, cue["blocked"] - 0.1, BEAT):
    place(tick(0.6), tt + BEAT / 2, 0.6, 0.25)
for h in cue["hits"]:
    timp(h - 0.05, "D2", 0.85, 0.8)
    place(sub_hit(60, 34, 1.6, 0.6), h - 0.05, 0.55)
# "The card refuses it": the hardest hit, then a held brass chord
r = cue["refuse"]
place(braam(4.0, 0.8), r - 0.05, 0.8)
place(sub_hit(70, 30, 2.6, 1.0), r - 0.05, 0.95)
stereo_place(render([(0, "bass_drum", None, None, 0.95, 0.0), (0, "timpani", "D2", 2.5, 1.0, 0.0)], 4.0), r - 0.05, 0.9)
for p in ["D3", "A3", "F4"]:
    sustain(r, cue["sentinel"] + 2, "horn", p, vel=0.5, gain=0.45, attack=0.4)
# Sentinel: rising tension into the scoreboard
place(riser(cue["blocked"] - cue["sentinel"], 0.7), cue["sentinel"], 0.55)

# 2:34 "4 of 4 attacks blocked": resolution to D major.
b = cue["blocked"]
stereo_place(render([(0, "timpani", "D2", 2.5, 0.9, 0.0), (0, "crash", None, None, 0.45, -0.2)], 4.0), b, 0.8)
place(sub_hit(55, 34, 2.0, 0.6), b, 0.6)
for p, pan in [("D3", -0.3), ("F#3", 0.0), ("A3", 0.3), ("D4", 0.15)]:
    sustain(b, cue["brain"] + 3, "horn" if p != "D4" else "violins", p, vel=0.45, pan=pan, gain=0.5, attack=0.3)

# 2:40 the Brain: warm and curious, bells over a soft pad, light pizzicato.
br = cue["brain"]
place(pad([73.42, 92.5, 110.0, 146.83], cue["charge"] - br + 2, v=0.8, cutoff=1500), br, 0.75)
bell_notes = [587.33, 739.99, 880.0, 1174.66, 880.0, 739.99]
for i, tt in enumerate(np.arange(br + 1.2, cue["charge"], BEAT)):
    if i % 2 == 0:
        place(bell(bell_notes[(i // 2) % len(bell_notes)], 2.4, 0.8), tt, 0.7, 0.4 if i % 4 == 0 else -0.4)
ev = []
for i, tt in enumerate(np.arange(br + BAR, cue["charge"], BEAT)):
    ev.append((tt - br, "violins_pizz", ["D4", "A4", "F#4", "A4"][i % 4], 0.4, 0.35, 0.2))
stereo_place(render(ev, cue["charge"] - br + 2), br, 0.5)

# 3:05 in charge and 3:18 proof: confident, steady pulse in D major.
ostinato(cue["charge"], cue["close"], [D_MAJ, D_MAJ, B_FLAT, C_MAJ], vel=(0.3, 0.45), gain=0.65)
sustain(cue["charge"], cue["close"], "cellos", "D3", vel=0.32, pan=-0.2, gain=0.45, attack=2.0)
for tt in np.arange(cue["proof"], cue["close"], BAR):
    timp(tt, "D2", 0.4, 0.5)
place(reverse_swell(2.2, 0.8), cue["close"] - 2.2, 0.8)

# 3:39 close: a final full chord and a long tail.
c = cue["close"]
stereo_place(render([(0, "timpani", "D2", 3.5, 0.95, 0.0), (0, "bass_drum", None, None, 0.7, 0.0), (0, "gong", None, None, 0.4, 0.0)], 6.0), c, 0.85)
place(sub_hit(55, 30, 3.0, 0.7), c, 0.7)
for p, inst, pan in [("D2", "contrabass", 0.0), ("D3", "cellos", -0.25), ("A3", "violas", 0.25), ("F#4", "violins", 0.1), ("D4", "horn", -0.1)]:
    sustain(c, cue["end"] + 0.5, inst, p, vel=0.5, pan=pan, gain=0.55, attack=0.4)
place(pad([73.42, 92.5, 110.0, 146.83, 185.0], cue["end"] - c + 1.5, v=0.9, cutoff=1800), c, 0.6)

# ---------- master ----------
room = S.room(buf, size=0.55, mix=0.22)
# laptop speakers: trim the sub below ~35 Hz and shelve the lows down ~4 dB so the strings carry the score
room = np.stack([hp(room[:, c], 32) for c in range(2)], axis=1)
room = room - 0.4 * np.stack([lp(room[:, c], 75) for c in range(2)], axis=1)
out = limit(room * 1.1, ceil=0.95)
fade = int(1.4 * SR)
end = int(cue["end"] * SR) + int(0.6 * SR)
out = out[:end]
out[-fade:] *= np.linspace(1, 0, fade)[:, None]
sf.write(sys.argv[2], out.astype(np.float32), SR)
print("score", sys.argv[2], round(len(out) / SR, 2), "s, peak", round(float(np.abs(out).max()), 3))
