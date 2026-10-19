"""The v2 score: a 120 BPM hybrid trailer cue, composed in code and cut to the edit (remotion/src/timeline.json).

usage: ../.venv/bin/python score.py ../remotion/src/timeline.json ../remotion/public/audio/score.wav
- Samples: VS Chamber Orchestra: Community Edition (CC0) via lemo-opuscar's sampler (MIT): strings, brass, timpani,
  orchestral percussion. Everything else (kick, claps, hats, synth pulse, bass, braams, risers, sub hits, bells,
  UI ticks) is numpy synthesis written for this video.
- D minor, i-VI-III-VII (Dm Bb F C) for the drive; the drop lands on "Now, let's attack it"; the architecture act
  runs on a mechanical clock texture with a chime per checkpoint and a tick per contract rule; D major for the
  Brain and the close.
- At 120 BPM one beat is exactly 15 frames at 30 fps, so every hit lands on a frame.
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
TOTAL = tl["total"] + 2.0
BEAT = 60.0 / tl.get("bpm", 120)
BAR = 4 * BEAT
S.seed(23)
buf = np.zeros((int(TOTAL * SR), 2), np.float32)
rng = np.random.default_rng(5)


def place(x, at, gain=1.0, pan=0.0):
    if 0 <= at < TOTAL:
        add(buf, np.asarray(x, np.float32), at, gain, pan)


def put(st, at, gain=1.0):
    i = int(at * SR)
    n = min(len(st), len(buf) - i)
    if n > 0 and i >= 0:
        buf[i:i + n] += st[:n] * gain


def smp(events, dur, gain=1.0, at=0.0):
    """Render sampler events (times relative to `at`) and add them."""
    if events:
        put(S.render(events, dur=dur, master=False) * gain, at)


def hz(name):
    return S.hz(name)


# ---------------- synth voices ----------------
def kick(v=1.0):
    d = 0.45
    tt = t_(d)
    f = 45 + 95 * np.exp(-tt / 0.045)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.22)
    click = hp(noise(0.01), 3000) * np.exp(-t_(0.01) / 0.002) * 0.4
    x[: len(click)] += click
    return np.tanh(x * 1.8) * 0.9 * v


def clap(v=1.0):
    d = 0.3
    x = np.zeros(int(d * SR))
    for k, off in enumerate([0.0, 0.011, 0.022]):
        n = bp(noise(0.12), 900, 5200) * np.exp(-t_(0.12) / (0.01 if k < 2 else 0.07))
        i = int(off * SR)
        x[i:i + len(n)] += n[: len(x) - i]
    return x * 0.55 * v


def hat(v=1.0, open_=False):
    d = 0.25 if open_ else 0.06
    return hp(noise(d), 7500) * np.exp(-t_(d) / (0.08 if open_ else 0.012)) * 0.35 * v


def tick(v=1.0, f=2400.0):
    d = 0.05
    tt = t_(d)
    return (np.sin(2 * np.pi * f * tt) * 0.5 + hp(noise(d), 5000) * 0.5) * np.exp(-tt / 0.008) * 0.4 * v


def saw(freq, d, voices=5, detune=0.10, seed=0):
    tt = t_(d)
    out = np.zeros_like(tt)
    for k in range(voices):
        cents = (k - (voices - 1) / 2) * detune * 100 / max(1, (voices - 1) / 2)
        f = freq * 2 ** (cents / 1200)
        ph = (f * tt + np.random.default_rng(seed + k).random()) % 1.0
        out += 2 * ph - 1
    return out / voices


def pluck(freq, d=0.22, v=1.0, bright=2600):
    x = saw(freq, d, voices=3, detune=0.06)
    x = lp(x, bright, 2)
    return x * np.exp(-t_(d) / 0.07) * 0.5 * v


def bass(freq, d, v=1.0):
    tt = t_(d)
    x = lp(saw(freq, d, voices=3, detune=0.05), 320, 2) * 0.8 + np.sin(2 * np.pi * freq * tt) * 0.6
    env = np.minimum(1, tt / 0.005) * np.exp(-tt / (d * 0.8))
    return np.tanh(x * 1.4) * env * 0.6 * v


def sub_hit(f0=62.0, f1=32.0, d=2.4, v=1.0):
    tt = t_(d)
    f = f1 + (f0 - f1) * np.exp(-tt / 0.16)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / (d * 0.32))
    c = hp(noise(0.02), 2000) * np.exp(-t_(0.02) / 0.004) * 0.25
    x[: len(c)] += c
    return np.tanh(x * 1.6) * 0.8 * v


def braam(d=4.0, v=1.0, root=36.71):
    tt = t_(d)
    x = saw(root, d, 7, 0.12) * 0.9 + saw(root * 2, d, 7, 0.12) * 0.7 + saw(root * 3, d, 5, 0.1) * 0.4
    x = np.tanh(x * 2.2)
    k = np.exp(-tt / 0.6)
    y = lp(x, 1500, 2) * k + lp(x, 200, 2) * (1 - k)
    env = np.minimum(1, tt / 0.03) * np.exp(-tt / (d * 0.45))
    return y * env * 0.7 * v


def riser(d=4.0, v=1.0):
    N = int(d * SR)
    n = noise(d + 0.3)
    out = np.zeros(N)
    seg = int(0.1 * SR)
    win = np.hanning(seg)
    for i in range(0, N - seg, seg // 2):
        fc = 250 * (30 ** (i / N))
        out[i:i + seg] += bp(n[max(0, i - 2000): i + seg], fc * 0.75, min(fc * 1.35, 21000))[-seg:] * win
    tt = t_(d)[:N]
    tone = np.sin(2 * np.pi * np.cumsum(110 * (2 ** (2.5 * tt / d))) / SR) * 0.12
    return (out * 0.5 + tone) * (tt / d) ** 2.0 * v


def swell(d=1.5, v=1.0):
    tt = t_(d)
    return lp(noise(d), 3500) * (tt / d) ** 3 * 0.5 * v


def shatter(v=1.0):
    d = 1.6
    tt = t_(d)
    x = hp(noise(d), 2500) * np.exp(-tt / 0.18) * 0.6
    for f in [3100, 4700, 6900, 8300, 5600]:  # glassy partials
        x += np.sin(2 * np.pi * f * tt + rng.random() * 6) * np.exp(-tt / (0.05 + rng.random() * 0.25)) * 0.12
    return x * v


def pad(freqs, d, v=1.0, cutoff=1400):
    tt = t_(d)
    x = sum(saw(f, d, voices=5, detune=0.08, seed=i * 7) for i, f in enumerate(freqs)) / len(freqs)
    x = lp(x, cutoff, 2)
    env = np.minimum(1, tt / 1.2) * np.minimum(1, (d - tt) / 1.4)
    return x * env * 0.33 * v


def bell(freq, d=2.6, v=1.0):
    tt = t_(d)
    idx = 2.2 * np.exp(-tt / 0.5)
    x = np.sin(2 * np.pi * freq * tt + idx * np.sin(2 * np.pi * freq * 3.5 * tt))
    return x * np.exp(-tt / 0.9) * 0.18 * v


def chime(v=1.0):
    """The 'checkpoint passed' sound in the architecture act: two bell partials, the second a beat later."""
    n = int(1.6 * SR)
    a = bell(1174.66, 1.6, 0.9 * v)[:n]
    b = np.pad(bell(1760.0, 1.4, 0.6 * v), (int(0.06 * SR), 0))[:n]
    b = np.pad(b, (0, n - len(b)))
    return a + b


# ---------------- harmony ----------------
CH = {
    "Dm": ["D", "F", "A"], "Bb": ["Bb", "D", "F"], "F": ["F", "A", "C"], "C": ["C", "E", "G"],
    "D": ["D", "F#", "A"], "A": ["A", "C#", "E"], "Bm": ["B", "D", "F#"], "G": ["G", "B", "D"], "Gm": ["G", "Bb", "D"],
}
DRIVE = ["Dm", "Bb", "F", "C"]
DARK = ["Dm", "Dm", "Bb", "C"]
LIFT = ["D", "A", "Bm", "G"]
ORDER = "C C# D D# E F F# G G# A A# B".split()


def notes(ch, octave):
    """Chord tones rising from the root in `octave` (each next tone above the previous)."""
    out = []
    last = -1
    for n in CH[ch]:
        name = n.replace("Bb", "A#").replace("Eb", "D#")
        m = (octave + 1) * 12 + ORDER.index(name)
        while m <= last:
            m += 12
        out.append(m)
        last = m
    return out


def mhz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def chord_at(t, start, prog):
    return prog[int((t - start + 1e-6) // BAR) % len(prog)]


def sidechain(x, at, kicks, depth=0.55, rel=0.16):
    """Pump `x` (placed at `at`) under the given kick times."""
    n = len(x)
    g = np.ones(n)
    tt = np.arange(n) / SR + at
    for k in kicks:
        m = (tt >= k) & (tt < k + 0.6)
        g[m] *= 1 - depth * np.exp(-(tt[m] - k) / rel)
    return x * g


# ---------------- section builders ----------------
def drums(start, end, pattern="drive", v=1.0):
    """pattern: 'pulse' (kick on 1), 'half' (1, 3), 'drive' (1, 2.5, 3 + claps 2, 4 + 8th hats), 'train' (8th kicks)."""
    kicks = []
    t = start
    while t < end - 1e-6:
        if pattern == "pulse":
            ks = [0]
        elif pattern == "half":
            ks = [0, 2]
        elif pattern == "train":
            ks = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]
        else:
            ks = [0, 1.5, 2]
        for b in ks:
            tk = t + b * BEAT
            if tk < end:
                place(kick(v * (0.85 if b else 1.0)), tk, 0.9)
                kicks.append(tk)
        if pattern in ("drive", "train"):
            for b in (1, 3):
                if t + b * BEAT < end:
                    place(clap(v), t + b * BEAT, 0.7, 0.05)
            for e in range(8):
                if t + e * BEAT / 2 < end:
                    place(hat(v * (0.9 if e % 2 else 0.6)), t + e * BEAT / 2, 0.55, 0.3 if e % 2 else -0.3)
        t += BAR
    return kicks


def arp(start, end, prog, octave=3, v=1.0, kicks=(), bright=2600, step=BEAT / 4, gain=0.55):
    """16th-note synth pulse over the chord tones."""
    seg = np.zeros(int((end - start + 1) * SR))
    t = start
    i = 0
    while t < end - 1e-6:
        ch = chord_at(t, start, prog)
        ns = notes(ch, octave)
        ns = ns + [ns[0] + 12]
        f = mhz(ns[[0, 1, 2, 3, 2, 1, 2, 3][i % 8]])
        p = pluck(f, 0.2, v, bright)
        j = int((t - start) * SR)
        seg[j:j + len(p)] += p[: len(seg) - j]
        t += step
        i += 1
    seg = sidechain(seg, start, kicks)
    place(seg, start, gain, 0.15)
    place(np.roll(seg, int(0.012 * SR)), start, gain * 0.64, -0.35)  # a little width


def bassline(start, end, prog, v=1.0, kicks=()):
    seg = np.zeros(int((end - start + 1) * SR))
    t = start
    k = 0
    while t < end - 1e-6:
        root = notes(chord_at(t, start, prog), 1)[0]
        b = bass(mhz(root + (12 if k % 2 else 0)), BEAT / 2 * 0.95, v)
        j = int((t - start) * SR)
        seg[j:j + len(b)] += b[: len(seg) - j]
        t += BEAT / 2
        k += 1
    place(sidechain(seg, start, kicks, depth=0.45), start, 0.85)


def ostinato(start, end, prog, inst="cellos_spic", octave=3, vel=(0.4, 0.6), pan=-0.25, gain=1.0, step=BEAT / 4):
    ev = []
    t = start
    i = 0
    while t < end - 1e-6:
        ns = notes(chord_at(t, start, prog), octave)
        ns = ns + [ns[0] + 12]
        k = (t - start) / max(1e-3, end - start)
        v = vel[0] + (vel[1] - vel[0]) * k + (0.12 if i % 4 == 0 else 0)
        ev.append((t - start, inst, ns[[0, 0, 1, 0, 2, 0, 1, 3][i % 8]], step * 0.9, min(1, v), pan, gain))
        t += step
        i += 1
    smp(ev, end - start + 2, 1.0, start)


def sustain(start, end, inst, pitch, vel=0.5, pan=0.0, gain=1.0, attack=0.6):
    d = end - start
    smp([dict(t=0, inst=inst, pitch=pitch, dur=d, vel=vel, pan=pan, attack=attack)], d + 3, gain, start)


def impact(at, size=1.0):
    """A trailer hit: sub drop + braam (big ones) + timpani + bass drum + crash."""
    place(sub_hit(66, 30, 2.6, size), at, 0.9)
    if size >= 0.8:
        place(braam(3.6, size), at, 0.62 * size)
    ev = [(0, "timpani", "D2", 2.5, min(1, 0.7 + 0.3 * size), 0.0), (0, "bass_drum", None, None, min(1, 0.6 + 0.3 * size), 0.0)]
    if size >= 0.7:
        ev.append((0, "crash", None, None, 0.45 * size, 0.2))
    smp(ev, 4.0, 0.75, at)


def brass_swell(start, bars, chord, gain=0.5):
    for m, inst, pan in zip(notes(chord, 3), ["horn", "horn", "trombone"], [-0.2, 0.2, 0.0]):
        sustain(start, start + bars * BAR, inst, m, vel=0.45, pan=pan, gain=gain, attack=bars * BAR * 0.6)


# ================= arrangement =================
# 0:00 cold open: drone and clock ticks, typing clicks, a short riser, hard silence at the cut, then the turn.
c = cue["cut"]
place(pad([36.71, 73.42], c + 0.4, v=0.6, cutoff=420)[: int(c * SR)], 0.0, 0.9)
for i, tt in enumerate(np.arange(0.5, c - 0.1, BEAT)):
    place(tick(0.8, 2000 if i % 2 else 2600), tt, 0.7, 0.25 if i % 2 else -0.25)
for tt in np.arange(0.75, 3.1, 0.055):  # typing (the hidden line types out)
    place(tick(0.35 + 0.2 * rng.random(), 3200 + 800 * rng.random()), tt + 0.01 * rng.random(), 0.5, rng.uniform(-0.2, 0.2))
place(riser(2.2, 0.8), c - 2.2, 0.6)
place(swell(0.8, 1.0), c - 0.8, 0.6)
place(sub_hit(58, 28, 3.4, 1.0), cue["turn"] - 0.02, 0.95)
sustain(cue["turn"], cue["title"] + 0.5, "contrabass", "D2", vel=0.45, gain=0.8, attack=0.2)
sustain(cue["turn"], cue["title"] + 0.5, "cellos", "D3", vel=0.35, gain=0.6, attack=0.3)
place(swell(1.4, 1.0), cue["title"] - 1.4, 0.75)

# 0:10 title + team: the hit, the mark locks in, the pulse starts filtered.
impact(cue["title"], 0.75)
k_title = drums(cue["title"], cue["layers"], "pulse", 0.8)
arp(cue["title"], cue["layers"], DRIVE, 3, 0.7, k_title, bright=1200)
place(pad([73.42, 87.31, 110.0, 146.83], cue["layers"] - cue["title"] + 1.5, 0.8, 1000), cue["title"], 0.65)

# 0:20 the problem: half-time kicks, bass, slams on each phrase.
k_lay = drums(cue["layers"], cue["act1"], "half", 0.9)
arp(cue["layers"], cue["act1"], DRIVE, 3, 0.8, k_lay, bright=1800)
bassline(cue["layers"], cue["act1"], DRIVE, 0.8, k_lay)
for s in cue["slams"]:
    impact(s, 0.45)
place(swell(1.6, 1.0), cue["act1"] - 1.6, 0.7)

# 0:40 Act 1: the groove; spiccato strings join.
k1 = drums(cue["act1"], cue["act2"], "drive", 0.85)
arp(cue["act1"], cue["act2"], DRIVE, 3, 0.8, k1, bright=2200)
bassline(cue["act1"], cue["act2"], DRIVE, 0.85, k1)
ostinato(cue["act1"] + 2 * BAR, cue["act2"], DRIVE, "cellos_spic", 3, (0.32, 0.45), -0.25, 0.7)
impact(cue["act1"], 0.5)

# 1:02 Act 2: bigger; violins and brass swells; build to the drop.
k2 = drums(cue["act2"], cue["riser"], "drive", 1.0)
arp(cue["act2"], cue["riser"], DRIVE, 3, 0.85, k2, bright=3000)
bassline(cue["act2"], cue["riser"], DRIVE, 0.95, k2)
ostinato(cue["act2"], cue["riser"], DRIVE, "cellos_spic", 3, (0.42, 0.58), -0.25, 0.8)
ostinato(cue["act2"] + 2 * BAR, cue["riser"], DRIVE, "violins_spic", 4, (0.25, 0.42), 0.3, 0.5)
for tb in np.arange(cue["act2"], cue["riser"] - 0.1, 4 * BAR):
    brass_swell(tb, 4, DRIVE[0], 0.4)
impact(cue["act2"], 0.55)
# into the drop: snare roll + riser, then one beat of silence before the drop
place(riser(cue["drop"] - cue["riser"] - 0.5, 1.0), cue["riser"], 0.7)
smp([(0, "snare", "roll", cue["drop"] - cue["riser"] - 0.5, 0.6, 0.0)], cue["drop"] - cue["riser"] + 1, 0.6, cue["riser"])
k_r = drums(cue["riser"], cue["drop"] - 0.5, "drive", 0.9)
arp(cue["riser"], cue["drop"] - 0.5, ["C"], 3, 0.8, k_r, bright=4200)

# 1:32 THE DROP: braam + full hit, then the attack act drives on train kicks.
d0 = cue["drop"]
impact(d0, 1.0)
place(braam(5.0, 1.0), d0, 0.7)
k3 = drums(d0 + BAR, cue["blocked"], "train", 0.95)
bassline(d0 + BAR, cue["blocked"], DARK, 1.0, k3)
arp(d0 + BAR, cue["blocked"], DARK, 3, 0.75, k3, bright=2400)
ostinato(d0 + BAR, cue["blocked"], DARK, "cellos_spic", 3, (0.55, 0.72), -0.25, 0.85)
ostinato(d0 + 2 * BAR, cue["blocked"], DARK, "violins_spic", 4, (0.35, 0.5), 0.3, 0.5)
sustain(d0, cue["blocked"], "contrabass", "D2", vel=0.55, gain=0.7, attack=0.2)
sustain(d0 + BAR, cue["blocked"], "trombone", "D2", vel=0.42, gain=0.5, attack=1.2)
for h in cue["hits"]:
    impact(h - 0.02, 0.6)
impact(cue["refuse"] - 0.02, 1.0)          # "The card refuses it."
for p in ["D3", "A3", "F4"]:
    sustain(cue["refuse"], cue["refuse"] + 4.5, "horn", p, vel=0.5, gain=0.4, attack=0.3)
impact(cue["freeze"] - 0.02, 0.8)           # "...freezes the card."
place(riser(cue["blocked"] - cue["freeze"] - 0.5, 0.6), cue["freeze"] + 0.5, 0.5)

# 2:08 "4 of 4 attacks blocked": resolve to D major.
b = cue["blocked"]
impact(b, 0.7)
for p, inst, pan in [("D3", "horn", -0.3), ("F#3", "horn", 0.0), ("A3", "horn", 0.3), ("D4", "violins", 0.15)]:
    sustain(b, cue["hood"] + 1.0, inst, p, vel=0.5, pan=pan, gain=0.5, attack=0.25)

# 2:12 UNDER THE HOOD: a mechanism. Clock hats, a tight bass ostinato, a chime per checkpoint, a tick per rule.
hd = cue["hood"]
sh = cue["shatter"]
k_h = drums(hd + BAR, sh - 0.1, "pulse", 0.75)
for i, tt in enumerate(np.arange(hd, sh - 0.2, BEAT / 4)):
    place(tick(0.35 if i % 4 else 0.6, 3000 if i % 4 else 2200), tt, 0.5, 0.35 if i % 2 else -0.35)
bassline(hd + BAR, sh - 0.2, DARK, 0.7, k_h)
arp(hd + 4 * BAR, sh - 0.2, DARK, 4, 0.55, k_h, bright=1500, step=BEAT / 2, gain=0.45)
place(pad([73.42, 110.0, 146.83], sh - hd, 0.6, 700), hd, 0.6)
for cp in cue["checkpoints"]:
    place(chime(1.0), cp - 0.02, 0.8, 0.1)
    place(sub_hit(55, 40, 1.0, 0.5), cp - 0.02, 0.45)
for i, r in enumerate(cue["rules"]):
    place(tick(1.0, 1800 + 260 * i), r - 0.01, 0.9)
    place(bell(880.0 * 2 ** (i * 2 / 12), 0.8, 0.6), r, 0.45)
place(riser(max(0.6, sh - (cue["rules"][-1] + 0.4)), 0.8), cue["rules"][-1] + 0.4, 0.55)
impact(sh - 0.02, 1.0)                     # "One rule fails"
place(shatter(1.0), sh, 0.8)
place(swell(1.6, 1.0), cue["brain"] - 1.6, 0.6)

# 3:00 the Brain: warm, curious. D major pad, bells, pizzicato.
br = cue["brain"]
place(pad([73.42, 92.5, 110.0, 146.83], cue["charge"] - br + 1.5, 0.85, 1500), br, 0.7)
impact(br, 0.35)
bells = [587.33, 739.99, 880.0, 1174.66, 880.0, 739.99]
for i, tt in enumerate(np.arange(br + BEAT, cue["charge"], BEAT)):
    if i % 2 == 0:
        place(bell(bells[(i // 2) % len(bells)], 2.2, 0.8), tt, 0.6, 0.4 if i % 4 == 0 else -0.4)
ev = [(tt - br, "violins_pizz", ["D4", "A4", "F#4", "A4"][i % 4], 0.4, 0.35, 0.2) for i, tt in enumerate(np.arange(br + BAR, cue["charge"], BEAT))]
smp(ev, cue["charge"] - br + 2, 0.5, br)
k_b = drums(br + 4 * BAR, cue["charge"], "pulse", 0.6)
arp(br + 2 * BAR, cue["charge"], LIFT, 4, 0.45, k_b, bright=1600, step=BEAT / 2, gain=0.4)

# 3:20 in charge, 3:30 proof: confident, building to the close.
k_c = drums(cue["charge"], cue["proof"], "half", 0.75)
bassline(cue["charge"], cue["proof"], LIFT, 0.7, k_c)
arp(cue["charge"], cue["proof"], LIFT, 3, 0.6, k_c, bright=2000)
k_p = drums(cue["proof"], cue["close"] - 0.5, "drive", 0.8)
bassline(cue["proof"], cue["close"] - 0.5, ["Bb", "C", "Dm", "Dm"], 0.85, k_p)
arp(cue["proof"], cue["close"] - 0.5, ["Bb", "C", "Dm", "Dm"], 3, 0.7, k_p, bright=2600)
ostinato(cue["proof"] + 2 * BAR, cue["close"] - 0.5, ["Bb", "C", "Dm", "Dm"], "cellos_spic", 3, (0.35, 0.55), -0.25, 0.7)
brass_swell(cue["close"] - 2 * BAR, 2, "A", 0.45)
place(riser(2.0, 0.9), cue["close"] - 2.0, 0.6)

# 3:48 close: the last hit, a full D major chord and a long tail.
cl = cue["close"]
impact(cl, 1.0)
smp([(0, "gong", None, None, 0.4, 0.0)], 6.0, 0.6, cl)
for p, inst, pan in [("D2", "contrabass", 0.0), ("D3", "cellos", -0.25), ("A3", "violas", 0.25), ("F#4", "violins", 0.1), ("D4", "horn", -0.1), ("A3", "horn", 0.15)]:
    sustain(cl, cue["end"] + 0.5, inst, p, vel=0.5, pan=pan, gain=0.5, attack=0.3)
place(pad([73.42, 92.5, 110.0, 146.83, 185.0], cue["end"] - cl + 1.5, 0.9, 1800), cl, 0.55)

# ================= master =================
room = S.room(buf, size=0.5, mix=0.18)
room = np.stack([hp(room[:, ch], 30) for ch in range(2)], axis=1)
room = room - 0.35 * np.stack([lp(room[:, ch], 70) for ch in range(2)], axis=1)  # laptop speakers: tame the sub
out = limit(room * 1.0, ceil=0.95)
end = int((cue["end"] + 0.6) * SR)
out = out[:end]
fade = int(1.6 * SR)
out[-fade:] *= np.linspace(1, 0, fade)[:, None]
sf.write(sys.argv[2], out.astype(np.float32), SR)
print("score", sys.argv[2], round(len(out) / SR, 2), "s, peak", round(float(np.abs(out).max()), 3))
