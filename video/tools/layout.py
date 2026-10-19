"""Lay out the edit: remotion/src/edit.json + the voice-over's word timings -> remotion/src/timeline.json.

Scene lengths round up to the beat (120 BPM: 0.5 s = 15 frames), so every cut lands on the grid the score uses.

Scenes
- custom scenes give `len` in seconds, or "auto": the last line's end plus `tail`;
- phone scenes list footage segments [src, from, to, rate?, tag?] and last as long as their footage plus `pad`.

Keeping the picture on the words (so what is said is what is shown)
- voice anchors: `at` (seconds into the scene), `after` (another line's end plus `gap`), or picture-led
  `seg` + `word` + `off`: the line is placed so that `word` is spoken `off` seconds after footage segment `seg` starts;
- voice-led cuts: `cuts: {"<seg>": {"line", "word", "lead"}}` moves the start of footage segment <seg> to `lead`
  seconds before that word (the segment before it is trimmed or extended to meet it). Lines used by cuts must be
  placed with `at` / `after`;
- `fit`: the first segments are trimmed so each cut lands on a word of one line (one beat of picture per phrase).
Keeps the existing `cues` block (tools/cues.py rewrites it).

usage: python3 tools/layout.py remotion/src/edit.json remotion/src/vo-words.json remotion/src/timeline.json
"""
import json
import math
import re
import sys

edit_path, words_path, tl_path = sys.argv[1:4]
edit = json.load(open(edit_path))
words = json.load(open(words_path))
try:
    old = json.load(open(tl_path))
except FileNotFoundError:
    old = {}
BEAT = 0.5


def rate(s):
    return s[3] if len(s) > 3 else 1


def seglen(s):
    return (s[2] - s[1]) / rate(s)


def wt(line, w):
    if not w:
        return 0.0
    for x in words[line]:
        if re.sub(r"[^a-z0-9-]", "", x["w"].lower()).startswith(w.lower()):
            return x["s"]
    raise SystemExit(f"layout.py: no word '{w}' in {line}")


def dur(line):
    return words[line][-1]["e"]


def starts_of(segs):
    out, a = [], 0.0
    for s in segs:
        out.append(a)
        a += seglen(s)
    return out, a


scenes, vo, t = [], [], 0.0
for sc in edit["scenes"]:
    segs = [list(s) for s in sc.get("segs", [])]
    if segs and sc.get("fit"):
        f = sc["fit"]
        marks = [f["lead"] + wt(f["line"], w) for w in f["words"]] + [f["lead"] + dur(f["line"]) + f["tail"]]
        marks[0] = 0.0
        for i in range(len(f["words"])):
            s = segs[i]
            s[2] = round(s[1] + (marks[i + 1] - marks[i]) * rate(s), 3)
    rel = {}
    # 1. lines placed by time or after another line
    for v in sc["vo"]:
        if "at" in v:
            rel[v["id"]] = v["at"]
        elif "after" in v:
            rel[v["id"]] = rel[v["after"]] + dur(v["after"]) + v.get("gap", 0.4)
    # 2. voice-led cuts: a segment starts on a word
    for k, c in sorted(sc.get("cuts", {}).items(), key=lambda kv: int(kv[0])):
        i = int(k)
        starts, _ = starts_of(segs)
        target = rel[c["line"]] + wt(c["line"], c.get("word")) - c.get("lead", 0.0)
        prev = segs[i - 1]
        new_len = target - starts[i - 1]
        if new_len <= 0.3:
            raise SystemExit(f"layout.py: cut {sc['id']}#{i} leaves segment {i - 1} {new_len:.2f}s")
        was = seglen(prev)
        prev[2] = round(prev[1] + new_len * rate(prev), 3)
        if new_len > was + 0.05:
            print(f"note: {sc['id']} segment {i - 1} extended {was:.2f}s -> {new_len:.2f}s (check the footage still fits)")
    starts, a = starts_of(segs) if segs else ([], 0.0)
    # 3. picture-led lines: a word lands on a segment start
    for v in sc["vo"]:
        if "seg" in v:
            rel[v["id"]] = starts[v["seg"]] + v.get("off", 0.0) - wt(v["id"], v.get("word"))
    # resolve `after` lines that follow picture-led ones
    for v in sc["vo"]:
        if "after" in v and v["after"] in rel and v["id"] not in rel:
            rel[v["id"]] = rel[v["after"]] + dur(v["after"]) + v.get("gap", 0.4)
    last_end = max([rel[v["id"]] + dur(v["id"]) for v in sc["vo"]] or [0.0])
    if segs:
        raw = max(a + sc.get("pad", 0.0), last_end + sc.get("tail", 0.0))
    elif sc["len"] == "auto":
        raw = last_end + sc.get("tail", 1.0)
    else:
        raw = sc["len"]
    n = math.ceil(raw / BEAT - 1e-6) * BEAT
    if segs and n > a:  # fill to the beat: the last segment runs on (or holds, when its rate is low)
        last = segs[-1]
        last[2] = round(last[2] + (n - a) * rate(last), 3)
    for v in sc["vo"]:
        r = rel[v["id"]]
        if r < 0:
            print(f"warning: {v['id']} starts {r:.2f}s before {sc['id']}")
        if r + dur(v["id"]) > n + 0.05:
            print(f"warning: {v['id']} ends {r + dur(v['id']) - n:.2f}s past the end of {sc['id']}")
        vo.append({"id": v["id"], "at": round(t + r, 3)})
    scenes.append({"id": sc["id"], "start": round(t, 3), "end": round(t + n, 3), **({"segs": segs} if segs else {})})
    t += n

vo.sort(key=lambda v: v["at"])
for a_, b_ in zip(vo, vo[1:]):
    if a_["at"] + dur(a_["id"]) > b_["at"] - 0.15:
        print(f"warning: {a_['id']} runs into {b_['id']}")

tl = {"fps": 30, "bpm": 120, "total": round(t, 3), "scenes": scenes, "vo": vo, "cues": old.get("cues", {})}
json.dump(tl, open(tl_path, "w"), indent=1)
m, s = divmod(t, 60)
print(f"total {int(m)}:{s:04.1f}  ({len(scenes)} scenes, {len(vo)} lines)")
for sc in scenes:
    print(f"  {sc['id']:<8} {sc['start']:7.2f} – {sc['end']:7.2f}  ({sc['end'] - sc['start']:.1f}s)")
