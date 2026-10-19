"""Lay out the v3 edit: remotion/src/edit.json + the voice-over's word timings -> remotion/src/timeline.json.

Scene lengths round up to the beat (120 BPM: 0.5 s = 15 frames), so every cut lands on the grid the score uses.
A phone scene lasts as long as its footage (plus `pad`); with `fit`, its first segments are trimmed so each cut lands
on a word of the line (one beat of picture per phrase). Keeps the existing `cues` block (tools/cues.py rewrites it).

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


def seglen(s):
    return (s[2] - s[1]) / (s[3] if len(s) > 3 else 1)


def wt(line, w):
    for x in words[line]:
        if re.sub(r"[^a-z0-9-]", "", x["w"].lower()).startswith(w):
            return x["s"]
    raise SystemExit(f"layout.py: no word '{w}' in {line}")


def dur(line):
    return words[line][-1]["e"]


scenes, vo, t = [], [], 0.0
for sc in edit["scenes"]:
    segs = sc.get("segs")
    if segs and sc.get("fit"):
        f = sc["fit"]
        marks = [f["lead"] + wt(f["line"], w) for w in f["words"]] + [f["lead"] + dur(f["line"]) + f["tail"]]
        marks[0] = 0.0
        for i in range(len(f["words"])):
            s = segs[i]
            s[2] = round(s[1] + (marks[i + 1] - marks[i]) * (s[3] if len(s) > 3 else 1), 3)
    if segs:
        starts, a = [], 0.0
        for s in segs:
            starts.append(a)
            a += seglen(s)
        raw = a + sc.get("pad", 0.0)
    else:
        raw = sc["len"]
    n = math.ceil(raw / BEAT - 1e-6) * BEAT
    if segs and n > raw:  # stretch the last segment's footage to fill to the beat
        last = segs[-1]
        last[2] = round(last[2] + (n - a) * (last[3] if len(last) > 3 else 1), 3)
    rel = {}
    for v in sc["vo"]:
        if "at" in v:
            r = v["at"]
        elif "seg" in v:
            r = starts[v["seg"]] + v.get("off", 0.0)
        else:
            r = rel[v["after"]] + dur(v["after"]) + v.get("gap", 0.4)
        rel[v["id"]] = r
        end = r + dur(v["id"])
        if end > n + 0.05:
            print(f"warning: {v['id']} ends {end - n:.2f}s past the end of {sc['id']}")
        vo.append({"id": v["id"], "at": round(t + r, 3)})
    scenes.append({"id": sc["id"], "start": round(t, 3), "end": round(t + n, 3), **({"segs": segs} if segs else {})})
    t += n

for a, b in zip(vo, vo[1:]):
    if a["at"] + dur(a["id"]) > b["at"] - 0.15:
        print(f"warning: {a['id']} runs into {b['id']}")

tl = {"fps": 30, "bpm": 120, "total": round(t, 3), "scenes": scenes, "vo": vo, "cues": old.get("cues", {})}
json.dump(tl, open(tl_path, "w"), indent=1)
m, s = divmod(t, 60)
print(f"total {int(m)}:{s:04.1f}  ({len(scenes)} scenes, {len(vo)} lines)")
for sc in scenes:
    print(f"  {sc['id']:<8} {sc['start']:7.2f} – {sc['end']:7.2f}  ({sc['end'] - sc['start']:.1f}s)")
