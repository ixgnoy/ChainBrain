"""Import the team's own voice: split each recorded section into its lines, clean the audio, and time every word,
so the edit (tools/layout.py) cuts on the spoken words exactly as it did with the synthetic voice.

usage: .venv/bin/python tools/voice.py            import everything found, write the outputs
       .venv/bin/python tools/voice.py --dry      report only
       .venv/bin/python tools/voice.py --in DIR --out DIR   other input / output folders (for a test run)
inputs (git-ignored, see out/recording-kit.html):
  footage/voice/NN-name.(m4a|wav|mp3|aac|caf)   one file per section, its lines read in order
  footage/face/{intro,close,team}.(mov|mp4)      on-camera clips, each optional
outputs:
  remotion/public/audio/vo/<id>.wav, and those lines' word timings merged into remotion/src/vo-words.json
  remotion/public/footage/face-<clip>.mp4 + remotion/src/face.json (trim, length, line) for the on-camera scenes
  tts/lines.json: the clips' lines (i1 intro, z1 close, t1 team) take the words actually said
A line read more than once keeps its last reading before the next line starts.
"""
import glob
import json
import os
import re
import subprocess
import sys
from difflib import SequenceMatcher

import numpy as np
import soundfile as sf
import soxr
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
DRY = "--dry" in sys.argv
arg = lambda flag, default: sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default
IN = arg("--in", "footage")
OUT = arg("--out", None)  # None: the real outputs below
VO_DIR = f"{OUT}/vo" if OUT else "remotion/public/audio/vo"
FOOT_DIR = OUT if OUT else "remotion/public/footage"
if OUT:
    os.makedirs(VO_DIR, exist_ok=True)
SR = 48000
# "10" is the last line as audio too: a close.mov clip, when there is one, replaces it.
# (overnight/teleprompter.py and try-recordings.sh read this dict as JSON: keep comments out of it)
SECTIONS = {
    "01": ["m1", "m2", "m3"],
    "02": ["n1", "n2", "n3", "n4"],
    "03": ["g1", "g2", "g3", "u0", "u1"],
    "04": ["x1", "x2", "x3", "x4", "x5", "x6a", "x6", "x7"],
    "05": ["u2", "u4", "u3", "r1"],
    "06": ["k1", "k2", "k3", "k4", "k5"],
    "07": ["y1", "y2", "y3", "w1", "w1b", "w2", "w3"],
    "08": ["h1", "h2", "f1", "f2", "f3"],
    "09": ["t1"],
    "10": ["z1"],
}
CLIPS = {"intro": "i1", "close": "z1", "team": "t1"}
# Phone-voice clean-up (video/overnight/research/clean-chain.txt): rumble cut, FFT denoise at the file's own measured
# noise floor, a gentle expander for the pauses, less mud, a little presence, de-ess, levelling and a peak limiter.
# No loudnorm here: tools/mix.py levels each line and the final mix is normalised to -14 LUFS.
CLEAN = (
    "highpass=f=90:poles=2,afftdn=nr=14:nf={nf}:tn=1:tr=1,"
    "agate=threshold=0.004:ratio=1.8:range=0.18:attack=12:release=260:knee=3,"
    "equalizer=f=200:t=q:w=0.9:g=-1.5,equalizer=f=3200:t=q:w=1.1:g=2,deesser=i=0.4:m=0.5:f=0.5:s=o,"
    "acompressor=threshold=-24dB:ratio=2.5:attack=10:release=160:makeup=3,alimiter=limit=0.89:attack=3:release=50"
)
_NF = {}


def noise_floor(path):
    """The room's level in dBFS: the quietest tenth of 100 ms windows in the first 20 s (leave 3 s of silence at the
    start of each take), clamped to -55..-35 for afftdn's nf."""
    if path not in _NF:
        cmd = ["ffmpeg", "-v", "error", "-t", "20", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"]
        x = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32)
        win = x[: len(x) // 1600 * 1600].reshape(-1, 1600)
        db = 20 * np.log10(np.sqrt((win.astype(np.float64) ** 2).mean(axis=1)) + 1e-9)
        _NF[path] = float(min(-35.0, max(-55.0, np.percentile(db, 10) - 1)))
        print(f"  noise floor {os.path.basename(path)}: {_NF[path]:.0f} dBFS")
    return _NF[path]

lines = json.load(open("tts/lines.json", encoding="utf-8"))
TEXT = {L["id"]: L["text"] for L in lines}
# the recording kit's wording where it differs from the synthetic script (the intro clip now names ChainBrain)
KIT = {
    "n1": "We give your AI its own card.",
    "t1": "That's the three of us. Jun Quan and Hao Wen from Universiti Malaya, and Yong Xi from Universiti Putra Malaysia.",
}
TEXT.update(KIT)
# Whisper's spellings of our names and terms, put right in lines said in our own words
FIXES = [
    (r"\bchain ?brain\b", "ChainBrain"),
    (r"\b(jun|june)[ -]?(quan|chuen|chuan|kwan|kuan|chen|chun)\b", "Jun Quan"),
    (r"\b(hao|how)[ -]?(wen|when|win|wan)\b", "Hao Wen"),
    (r"\b(yong|young)[ -]?(xi|shee|she|si|see|sea|shi)\b", "Yong Xi"),
    (r"\bfisco\b", "FISCO"),
    (r"\bbcos\b", "BCOS"),
]


def fix_names(text):
    for pat, rep_ in FIXES:
        text = re.sub(pat, rep_, text, flags=re.I)
    return text
words_path = "remotion/src/vo-words.json"
out_words = f"{OUT}/vo-words.json" if OUT else words_path
out_lines = f"{OUT}/lines.json" if OUT else "tts/lines.json"
out_face = f"{OUT}/face.json" if OUT else "remotion/src/face.json"
WORDS = json.load(open(words_path))
model = WhisperModel("small.en", device="cpu", compute_type="int8")

ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def spell(n):
    """Integers as words, so "63" (Whisper) matches "sixty-three" (script)."""
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if n < 1000:
        return ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + spell(n % 100))
    return spell(n // 1000) + " thousand" + ("" if n % 1000 == 0 else " " + spell(n % 1000))


def tokens(text):
    """Comparable tokens: lower case, no punctuation, hyphens split, numbers spelled out, 'and' dropped."""
    out = []
    for raw in text.replace("-", " ").split():
        k = re.sub(r"[^a-z0-9]", "", raw.lower())
        if not k or k == "and":
            continue
        if k.isdigit():
            out += [t for t in spell(int(k)).split() if t != "and"]
        else:
            out.append(k)
    return out


def decode(path, start=None, end=None):
    cmd = ["ffmpeg", "-v", "error"]
    if start is not None:
        cmd += ["-ss", f"{start:.3f}", "-to", f"{end:.3f}"]
    cmd += ["-i", path, "-af", CLEAN.format(nf=round(noise_floor(path))), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).copy()


def hear(x):
    """Whisper's words with times as comparable tokens (a number may expand to several), plus the raw words."""
    segs, _ = model.transcribe(soxr.resample(x, SR, 16000), word_timestamps=True, language="en", beam_size=5)
    out, raw = [], []
    for s in segs:
        for w in s.words:
            raw.append(w.word.strip())
            for t in tokens(w.word):
                out.append({"t": t, "s": w.start, "e": w.end, "w": w.word.strip()})
    return out, raw


def readings(script, heard, lo):
    """Every place the line is read in heard[lo:], as (start, end, score): local best windows scoring >= 0.6."""
    n = len(script)
    best = {}
    for j in range(lo, len(heard)):
        for L in range(max(1, int(n * 0.7)), int(n * 1.35) + 2):
            if j + L > len(heard):
                break
            r = SequenceMatcher(None, script, [h["t"] for h in heard[j:j + L]], autojunk=False).ratio()
            if r > best.get(j, (0, 0))[0]:
                best[j] = (r, L)
    found = []
    for j in sorted(best):
        r, L = best[j]
        if r < 0.6:
            continue
        if found and j < found[-1][1]:  # overlaps the previous window: keep the better one
            if r > found[-1][2]:
                found[-1] = (j, j + L, r)
            continue
        found.append((j, j + L, r))
    return found


def times_for(display, heard_slice, t0):
    """The script's words timed from Whisper's (matched words take Whisper's times; the rest are interpolated)."""
    disp = display.split()
    keys = [" ".join(tokens(w)) for w in disp]
    hk = [h["t"] for h in heard_slice]
    flat, owner = [], []
    for i, k in enumerate(keys):
        for t in k.split():
            flat.append(t)
            owner.append(i)
    times = [None] * len(disp)
    for a, b, n in SequenceMatcher(None, flat, hk, autojunk=False).get_matching_blocks():
        for k in range(n):
            i = owner[a + k]
            h = heard_slice[b + k]
            s, e = h["s"] - t0, h["e"] - t0
            times[i] = (min(s, times[i][0]), max(e, times[i][1])) if times[i] else (s, e)
    t_first = heard_slice[0]["s"] - t0
    t_last = heard_slice[-1]["e"] - t0
    known = [i for i, t in enumerate(times) if t]
    for i in range(len(disp)):
        if times[i]:
            continue
        prev = max([k for k in known if k < i], default=None)
        nxt = min([k for k in known if k > i], default=None)
        s0 = times[prev][1] if prev is not None else t_first
        e0 = times[nxt][0] if nxt is not None else t_last
        gap = [k for k in range(len(disp)) if (prev is None or k > prev) and (nxt is None or k < nxt)]
        j = gap.index(i)
        step = (e0 - s0) / max(1, len(gap))
        times[i] = (s0 + step * j, s0 + step * (j + 1))
    return [{"w": w, "s": round(max(0.0, t[0]), 3), "e": round(max(0.0, t[1]), 3)} for w, t in zip(disp, times)]


def level(x):
    """10 ms frame levels (dB) and the speech threshold: 35 dB under the loud frames."""
    hop = SR // 100
    n = len(x) // hop
    rms = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    return db, np.percentile(db, 95) - 35


def onset(db, thr, t0, t1):
    """First 10 ms frame of speech in [t0, t1] (s), else t0. Whisper often starts a word inside the pause before it."""
    a, b = max(0, int(t0 * 100)), min(len(db), int(t1 * 100))
    hit = np.nonzero(db[a:b] > thr)[0]
    return (a + hit[0]) / 100 if len(hit) else t0


def offset(db, thr, t0, t1):
    """Last 10 ms frame of speech in [t0, t1] (s), else t1."""
    a, b = max(0, int(t0 * 100)), min(len(db), int(t1 * 100))
    hit = np.nonzero(db[a:b] > thr)[0]
    return (a + hit[-1] + 1) / 100 if len(hit) else t1


def fade(y, ms=12):
    n = min(len(y) // 2, int(SR * ms / 1000))
    if n:
        y[:n] *= np.linspace(0, 1, n)
        y[-n:] *= np.linspace(1, 0, n)
    return y


report, new_words = [], {}

# ── the voice files: one per section
for path in sorted(glob.glob(f"{IN}/voice/*")):
    m = re.match(r"(\d\d)", os.path.basename(path))
    if not m or m.group(1) not in SECTIONS:
        print("skip (not a section file):", path)
        continue
    ids = SECTIONS[m.group(1)]
    x = decode(path)
    heard, _ = hear(x)
    db, thr = level(x)
    cursor = 0
    prev_end = 0.0
    for n, lid in enumerate(ids):
        script = tokens(TEXT[lid])
        mine = readings(script, heard, cursor)
        if not mine:
            report.append((lid, "MISSING", 0, 0))
            continue
        nxt = readings(tokens(TEXT[ids[n + 1]]), heard, mine[0][0] + 1) if n + 1 < len(ids) else []
        limit = nxt[0][0] if nxt else len(heard)
        before = [r for r in mine if r[0] < limit] or mine[:1]
        j0, j1, score = before[-1]  # the last reading before the next line: retakes win
        cursor = j1
        nxt_s = heard[j1]["s"] if j1 < len(heard) else len(x) / SR
        s = max(prev_end, onset(db, thr, max(prev_end, heard[j0]["s"] - 0.3), heard[j0]["e"]) - 0.12)
        e = min(nxt_s - 0.05, offset(db, thr, heard[j1 - 1]["s"], min(nxt_s, heard[j1 - 1]["e"] + 0.6)) + 0.25)
        prev_end = e
        y = fade(x[int(s * SR): int(e * SR)].copy())
        new_words[lid] = times_for(TEXT[lid], heard[j0:j1], s)
        if not DRY:
            sf.write(f"{VO_DIR}/{lid}.wav", y, SR, subtype="PCM_16")
        target = WORDS.get(lid, [{"e": 0}])[-1]["e"]
        report.append((lid, f"{len(before)} take(s)" if len(before) > 1 else "ok", round(len(y) / SR, 2), round(score, 2), round(target, 1)))

# ── the on-camera clips: the video is trimmed to its words; its audio becomes that clip's line
face = {}
for clip, lid in CLIPS.items():
    src = next(iter(sorted(glob.glob(f"{IN}/face/{clip}.*"))), None)
    if not src:
        continue
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src], capture_output=True, text=True, check=True).stdout)
    full = decode(src)
    heard, raw = hear(full)
    if not heard:
        report.append((lid, f"no speech in {clip}", 0, 0))
        continue
    db, thr = level(full)
    a = max(0.0, onset(db, thr, 0.0, heard[0]["e"]) - 0.45)
    b = min(dur, offset(db, thr, heard[-1]["s"], dur) + 0.7)
    said = re.sub(r"\s+", " ", " ".join(raw)).strip()
    if clip != "close":  # the intro and team lines are said in their own words: subtitles follow what was said
        TEXT[lid] = fix_names(said[0].upper() + said[1:])
    elif SequenceMatcher(None, tokens(said), tokens(TEXT[lid])).ratio() < 0.8:
        report.append((lid, f"close clip says: {said!r}", 0, 0))
    y = full[int(a * SR): int(b * SR)].copy()
    new_words[lid] = times_for(TEXT[lid], heard, a)
    face[clip] = {"src": f"footage/face-{clip}.mp4", "len": round(b - a, 3), "line": lid}
    if not DRY:
        sf.write(f"{VO_DIR}/{lid}.wav", fade(y), SR, subtype="PCM_16")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-i", src, "-t", f"{b - a:.3f}",
                        "-vf", "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p",
                        "-an", "-c:v", "libx264", "-crf", "16", f"{FOOT_DIR}/face-{clip}.mp4"], check=True)
    report.append((lid, f"{clip} clip, trimmed {a:.2f}-{b:.2f}s", round(b - a, 2), 1.0))

# ── write
for row in report:
    print("  ".join(str(v) for v in row))
if DRY:
    print("dry run: nothing written")
    sys.exit(0)
WORDS.update(new_words)
json.dump(WORDS, open(out_words, "w"), indent=0)
for L in lines:
    if L["id"] in new_words:  # only lines actually imported take new wording
        L["text"] = TEXT[L["id"]]
    if L["id"] in new_words:
        L.pop("say_eleven", None)  # the team's own reading: no respelling for the synthetic voice
if "intro" in face and CLIPS["intro"] not in {L["id"] for L in lines}:
    # lines.json stays in playing order (the subtitles page through it in order): the intro plays before the card
    at = next(i for i, L in enumerate(lines) if L["id"] == "n1")
    lines.insert(at, {"id": CLIPS["intro"], "voice": "team", "speed": 1.0, "text": TEXT[CLIPS["intro"]]})
json.dump(lines, open(out_lines, "w"), indent=1, ensure_ascii=False)
json.dump(face, open(out_face, "w"), indent=1)
print(f"imported {len(new_words)} lines; clips: {', '.join(face) or 'none'}")
