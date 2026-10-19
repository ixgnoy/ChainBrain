"""The v4 score: a 120 BPM hybrid trailer cue, composed in code and cut to the edit (remotion/src/timeline.json).

usage: ../.venv/bin/python score.py ../remotion/src/timeline.json ../remotion/public/audio/score.wav
- Samples: VS Chamber Orchestra: Community Edition (CC0) via lemo-opuscar's sampler (MIT): strings, brass, timpani,
  orchestral percussion. Everything else (kick, claps, hats, synth pulse, bass, braams, risers, sub hits, bells,
  UI ticks) is numpy synthesis written for this video.
- v4 arc: a Morse-key hook, a slam on the 9%, D minor (Dm Bb F C) drive through the product, a mechanism texture
  for the payment X-ray (bells for the keys, ticks for the checks, eight rising bells for the card's checks, a chord
  when it settles), the drop on "Now, let's break it", half a second of silence before "The card says no." and the
  film's biggest hit on "no", the mechanism again for the layers, a warm bed for the HKMA, D major for the team.
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


# ================= arrangement (v3) =================
def beep(d, f=720.0, v=1.0):
    """One Morse pulse: a soft-edged sine, the way a radio key sounds."""
    n = int((d + 0.02) * SR)
    t = np.arange(n) / SR
    env = np.minimum(1, np.minimum(t / 0.006, (d + 0.02 - t) / 0.012)).clip(0, 1)
    return ((np.sin(2 * np.pi * f * t) + 0.12 * np.sin(4 * np.pi * f * t)) * env * 0.5 * v).astype(np.float32)


def fall(d=2.4, f0=420.0, f1=48.0, v=1.0):
    """A falling tone under the draining balance."""
    n = int(d * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return ((np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.linspace(0.2, 1, n) ** 0.5 * np.linspace(1, 0.6, n) * 0.4 * v).astype(np.float32)


# 0:00 hook: a low drone, the Morse key, then a hard cut to the balance falling to zero.
c = cue["cut"]
place(pad([36.71, 73.42], c + 0.4, v=0.55, cutoff=380)[: int(c * SR)], 0.0, 0.9)
for st, d, dash in cue["morse"]:
    place(beep(d, 700.0, 1.0), st, 0.55, 0.0)
place(riser(1.6, 0.6), c - 1.6, 0.4)
place(sub_hit(58, 28, 2.4, 1.0), c, 0.9)
place(fall(2.6, 420, 46, 1.0), c + 0.2, 0.7)
z = c + 2.6  # the counter hits zero
impact(z, 0.8)
place(braam(3.2, 0.8), z, 0.5)

# 0:12 the trust gap: a tick as 74% counts up, a slam on "nine".
for i in range(8):
    place(tick(0.7, 2600 + 120 * i), cue["stat"] + 0.5 + i * 0.13, 0.5, 0.2 if i % 2 else -0.2)
impact(cue["nine"] - 0.03, 0.85)
place(swell(1.6, 1.0), cue["card"] - 1.6, 0.6)
if cue.get("intro") is not None:  # the founder's intro on camera: a soft held chord, nothing rhythmic
    place(pad([73.42, 110.0, 146.83], cue["card"] - cue["intro"] + 0.5, 0.6, 900), cue["intro"], 0.5)

# 0:21 the card: the theme begins, filtered; a hit as the card arrives.
k_c = drums(cue["card"], cue["what"], "pulse", 0.7)
arp(cue["card"], cue["what"], DRIVE, 3, 0.6, k_c, bright=1100)
place(pad([73.42, 87.31, 110.0, 146.83], cue["what"] - cue["card"] + 1.5, 0.8, 1000), cue["card"], 0.6)
impact(cue["give"] - 0.05, 0.5)

# 0:28 what the AI Card is: half-time groove; a hit per agent card, a chime on FISCO, a bell on the watcher.
k_w = drums(cue["what"], cue["get"], "half", 0.85)
arp(cue["what"], cue["get"], DRIVE, 3, 0.75, k_w, bright=1800)
bassline(cue["what"], cue["get"], DRIVE, 0.8, k_w)
for a_ in cue["agents"]:
    impact(a_ - 0.03, 0.3)
place(chime(1.0), cue["fisco"] - 0.02, 0.7, 0.1)
place(bell(880.0, 2.0, 0.8), cue["watcher"], 0.5, -0.2)
place(swell(1.6, 1.0), cue["get"] - 1.6, 0.6)

# 0:46 get one, then the first payment: the groove; spiccato strings join; a hit when the card goes live.
k1 = drums(cue["get"], cue["xray"] - 0.5, "drive", 0.85)
arp(cue["get"], cue["xray"] - 0.5, DRIVE, 3, 0.8, k1, bright=2200)
bassline(cue["get"], cue["xray"] - 0.5, DRIVE, 0.85, k1)
ostinato(cue["get"] + 2 * BAR, cue["xray"] - 0.5, DRIVE, "cellos_spic", 3, (0.32, 0.45), -0.25, 0.7)
impact(cue["get"], 0.5)
impact(cue["live"] - 0.03, 0.55)
impact(cue["pays"] - 0.02, 0.3)
place(swell(1.2, 1.0), cue["scan"] - 1.0, 0.5)

# 1:20 THE X-RAY: the band drops out under a scan; a mechanism (clock ticks, tight bass) carries the payment
# from box to box; bells for the keys, ticks for the checks, the token's question, eight rising bells, a chord
# when it settles, then the pull-back to the whole system.
xs = cue["scan"]
impact(xs, 0.45)
place(sub_hit(48, 30, 1.6, 0.8), xs, 0.6)
mech_end = cue["contrast"] - 0.2
k_x = drums(xs + BAR, mech_end, "pulse", 0.6)
for i, tt in enumerate(np.arange(xs + 1.0, mech_end, BEAT / 4)):
    place(tick(0.28 if i % 4 else 0.5, 3000 if i % 4 else 2200), tt, 0.42, 0.35 if i % 2 else -0.35)
bassline(xs + BAR, mech_end, DARK, 0.6, k_x)
place(pad([73.42, 110.0, 146.83], mech_end - xs, 0.55, 800), xs, 0.5)
for i, k in enumerate(cue["keys"]):
    place(bell([739.99, 880.0, 587.33][i], 1.8, 0.8), k - 0.02, 0.5, [-0.3, 0.3, 0.0][i])
place(tick(1.0, 1900), cue["quote"] - 0.01, 0.8)
for i, ck in enumerate(cue["checks"]):
    place(tick(1.0, 2000 + 300 * i), ck - 0.01, 0.8)
    place(bell(1174.66 * 2 ** (i * 2 / 12), 0.9, 0.55), ck, 0.4)
place(chime(0.9), cue["signs"] - 0.02, 0.6)
place(sub_hit(55, 36, 1.2, 0.6), cue["sends"] - 0.02, 0.5)
# "Many agent wallets…": the mechanism stops; only a held pad under the comparison
place(pad([73.42, 87.31, 110.0], cue["asks"] - cue["contrast"] + 0.6, 0.6, 600), cue["contrast"], 0.45)
# the token asks the card: a hit, then eight rising bells as the checks tick
impact(cue["asks"] - 0.02, 0.6)
scale = [587.33, 659.25, 739.99, 783.99, 880.0, 987.77, 1108.73, 1174.66]
for i in range(8):
    place(bell(scale[i], 1.2, 0.7), cue["eight"] + 0.15 + i * 0.3, 0.42, -0.3 + 0.085 * i)
# all eight pass: a D major chord, the money lands, the hash
pa = cue["pass"]
impact(pa - 0.02, 0.7)
for p, inst, pan in [("D3", "horn", -0.2), ("F#3", "horn", 0.0), ("A3", "horn", 0.2), ("D4", "violins", 0.1)]:
    sustain(pa, cue["use2"] + 0.5, inst, p, vel=0.48, pan=pan, gain=0.45, attack=0.25)
impact(cue["hash"] - 0.02, 0.4)
place(swell(1.8, 1.0), cue["pullback"], 0.5)
place(pad([73.42, 92.5, 110.0, 146.83, 185.0], cue["use2"] - cue["pullback"] + 1.0, 0.8, 1600), cue["pullback"], 0.5)

# 2:13 use it: the groove comes back; a small accent on each new beat; build to the drop.
riser_at = cue["drop"] - 4.0
k2 = drums(cue["use2"], riser_at, "drive", 1.0)
arp(cue["use2"], riser_at, DRIVE, 3, 0.85, k2, bright=3000)
bassline(cue["use2"], riser_at, DRIVE, 0.95, k2)
ostinato(cue["use2"], riser_at, DRIVE, "cellos_spic", 3, (0.42, 0.58), -0.25, 0.8)
ostinato(cue["use2"] + 2 * BAR, riser_at, DRIVE, "violins_spic", 4, (0.25, 0.42), 0.3, 0.5)
for tb in np.arange(cue["use2"], riser_at - 0.1, 4 * BAR):
    brass_swell(tb, 4, DRIVE[0], 0.4)
impact(cue["use2"], 0.5)
for ub in cue["use2_beats"]:
    impact(ub - 0.02, 0.28)
place(riser(cue["drop"] - riser_at - 0.5, 1.0), riser_at, 0.7)
smp([(0, "snare", "roll", cue["drop"] - riser_at - 0.5, 0.6, 0.0)], cue["drop"] - riser_at + 1, 0.6, riser_at)
k_r = drums(riser_at, cue["drop"] - 0.5, "drive", 0.9)
arp(riser_at, cue["drop"] - 0.5, ["C"], 3, 0.8, k_r, bright=4200)

# 2:37 THE DROP on "Now, let's break it", then the attacks drive on train kicks.
d0 = cue["drop"]
impact(d0, 1.0)
place(braam(4.5, 1.0), d0, 0.7)
hush = cue["no"] - 0.55  # silence before "No."
k3 = drums(cue["attack"], hush, "train", 0.95)
bassline(cue["attack"], hush, DARK, 1.0, k3)
arp(cue["attack"], hush, DARK, 3, 0.75, k3, bright=2400)
ostinato(cue["attack"], hush, DARK, "cellos_spic", 3, (0.55, 0.72), -0.25, 0.85)
ostinato(cue["attack"] + BAR, hush, DARK, "violins_spic", 4, (0.35, 0.5), 0.3, 0.5)
sustain(d0, hush, "contrabass", "D2", vel=0.55, gain=0.7, attack=0.2)
for h in cue["hits"]:
    impact(h - 0.02, 0.6)
place(riser(hush - cue["fool"], 0.9), cue["fool"], 0.6)

# 2:54 "The card says no.": half a second of nothing, then the biggest hit of the film.
nn = cue["no"]
impact(nn - 0.02, 1.0)
place(sub_hit(62, 26, 4.0, 1.0), nn - 0.02, 1.0)
place(shatter(1.0), nn, 0.6)
for p, inst, pan in [("D2", "contrabass", 0.0), ("D3", "cellos", -0.2), ("A3", "horn", 0.2), ("F4", "violins", 0.1)]:
    sustain(nn + 0.4, cue["why"] + 0.5, inst, p, vel=0.45, pan=pan, gain=0.45, attack=1.2)
place(pad([73.42, 110.0, 146.83], cue["why"] - nn, 0.6, 700), nn + 0.5, 0.5)
impact(cue["because"] - 0.03, 0.45)

# 3:03 why it held: the mechanism again under the layers; a tick per layer; the stamp hits on "taken over";
# two bells for the on-chain layers that hold.
wy = cue["why"]
k_y = drums(wy + 0.5, cue["stolen"], "pulse", 0.65)
bassline(wy + 0.5, cue["stolen"], DARK, 0.65, k_y)
for i, tt in enumerate(np.arange(wy + 0.5, cue["stolen"] - 0.2, BEAT / 4)):
    place(tick(0.25 if i % 4 else 0.45, 3000 if i % 4 else 2200), tt, 0.38, 0.35 if i % 2 else -0.35)
for i in range(6):
    place(tick(0.9, 1800 + 160 * i), cue["layers"] + i * 0.18, 0.6, -0.25 + 0.1 * i)
for i in range(2):
    place(bell([880.0, 1174.66][i], 1.6, 0.8), cue["last"] + i * 0.25, 0.5, 0.15)
impact(cue["taken"] - 0.03, 0.8)
place(sub_hit(52, 30, 2.0, 0.8), cue["taken"] - 0.03, 0.6)

# 3:18 if a key is stolen: sparse; a soft hit per card.
place(pad([73.42, 87.31, 110.0], cue["watch"] - cue["stolen"] + 0.5, 0.6, 700), cue["stolen"], 0.45)
for sh in cue["stolen_hits"]:
    impact(sh - 0.03, 0.3)
    place(bell(739.99, 1.4, 0.6), sh, 0.35)

# 3:29 the watcher: pulse and ticks; a hit when it freezes the card.
wt = cue["watch"]
k_h = drums(wt, cue["only"] - 0.1, "pulse", 0.75)
for i, tt in enumerate(np.arange(wt, cue["only"] - 0.2, BEAT / 4)):
    place(tick(0.3 if i % 4 else 0.55, 3000 if i % 4 else 2200), tt, 0.45, 0.35 if i % 2 else -0.35)
bassline(wt, cue["only"] - 0.2, DARK, 0.7, k_h)
arp(wt + 2 * BAR, cue["only"] - 0.2, DARK, 4, 0.55, k_h, bright=1500, step=BEAT / 2, gain=0.45)
impact(cue["freeze"] - 0.03, 0.8)
place(swell(1.2, 1.0), cue["only"] - 1.2, 0.5)

# 3:45 stricter, never looser: a bright bell, then a low hit on "looser".
impact(cue["only"], 0.4)
place(bell(1174.66, 2.4, 1.0), cue["stricter"], 0.7, 0.15)
place(bell(1760.0, 2.0, 0.7), cue["stricter"] + 0.08, 0.5, -0.15)
impact(cue["looser"] + 0.2, 0.75)
place(sub_hit(50, 30, 2.0, 0.8), cue["looser"] + 0.2, 0.6)

# 3:51 the HKMA's four principles: a warm D major bed; a chime per principle; resolve on "all four".
hk = cue["hkma"]
place(pad([73.42, 92.5, 110.0, 146.83], cue["proof"] - hk + 1.0, 0.8, 1300), hk, 0.55)
k_k = drums(hk + BAR, cue["proof"] - 0.3, "pulse", 0.5)
arp(hk + BAR, cue["proof"] - 0.3, LIFT, 4, 0.45, k_k, bright=1400, step=BEAT / 2, gain=0.4)
for i, pr in enumerate(cue["principles"]):
    place(chime(0.8), pr - 0.02, 0.5, -0.3 + 0.2 * i)
for p, inst, pan in [("D3", "horn", -0.2), ("F#3", "horn", 0.0), ("A3", "horn", 0.2)]:
    sustain(cue["four"], cue["proof"] + 0.4, inst, p, vel=0.45, pan=pan, gain=0.4, attack=0.2)
impact(cue["four"] - 0.02, 0.45)

# 4:08 proof: confident drive; a tick per rejected row; hits on the 63 and the 462.
pr = cue["proof"]
k_p = drums(pr, cue["team"] - 0.3, "drive", 0.8)
bassline(pr, cue["team"] - 0.3, ["Bb", "C", "Dm", "Dm"], 0.85, k_p)
arp(pr, cue["team"] - 0.3, ["Bb", "C", "Dm", "Dm"], 3, 0.7, k_p, bright=2600)
ostinato(pr + 2 * BAR, cue["team"] - 0.3, ["Bb", "C", "Dm", "Dm"], "cellos_spic", 3, (0.35, 0.55), -0.25, 0.7)
impact(pr, 0.5)
for i in range(7):
    place(tick(1.0, 2200 + 140 * i), cue["rejected"] + i * 0.12, 0.7, -0.3 + 0.1 * i)
impact(cue["attacks"] - 0.03, 0.6)
impact(cue["tests"] - 0.03, 0.5)

# 4:29 the team: lift to D major, lighter and warmer.
tm = cue["team"]
place(pad([73.42, 92.5, 110.0, 146.83], cue["close"] - tm + 1.0, 0.85, 1700), tm, 0.6)
team_end = cue.get("closeface") or cue["close"]  # the closing line on camera gets a bare bed
k_t = drums(tm + BAR, team_end - 0.5, "pulse", 0.55)
arp(tm, team_end - 0.5, LIFT, 4, 0.5, k_t, bright=2000, step=BEAT / 2, gain=0.45)
brass_swell(team_end - 2 * BAR, 2, "A", 0.4)
if cue.get("closeface") is not None:
    place(swell(1.4, 1.0), cue["close"] - 1.4, 0.45)
else:
    place(riser(2.0, 0.9), cue["close"] - 2.0, 0.55)

# 4:38 close: the last hit, a full D major chord and a long tail.
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
# the hush before "No.": the room's reverb and the strings' tails would fill it, so gate the finished score to
# true silence from the end of the riser until the hit (20 ms fades)
a, b, f = int((hush + 0.03) * SR), int((nn - 0.03) * SR), int(0.02 * SR)
if b - a > 2 * f:
    out[a:a + f] *= np.linspace(1, 0, f)[:, None]
    out[a + f:b - f] = 0
    out[b - f:b] *= np.linspace(0, 1, f)[:, None]
sf.write(sys.argv[2], out.astype(np.float32), SR)
print("score", sys.argv[2], round(len(out) / SR, 2), "s, peak", round(float(np.abs(out).max()), 3))
