"""Derive the score's hit points in timeline.json from the scene layout and the voice-over's word timings,
so the music follows the voice whenever a line is re-recorded or moved.

usage: python3 tools/cues.py remotion/src/timeline.json remotion/src/vo-words.json
"""
import json
import re
import sys

tl_path, words_path = sys.argv[1], sys.argv[2]
tl = json.load(open(tl_path))
words = json.load(open(words_path))
at = {v["id"]: v["at"] for v in tl["vo"]}
sc = {s["id"]: s for s in tl["scenes"]}
beat = 60.0 / tl.get("bpm", 120)


def word(line, w, nth=0):
    n = 0
    for x in words.get(line, []):
        if re.sub(r"[^a-z0-9-]", "", x["w"].lower()).startswith(w.lower()):
            if n == nth:
                return round(at[line] + x["s"], 3)
            n += 1
    raise SystemExit(f"cues.py: no word '{w}' in line {line}")


def on_beat(t):
    """The beat at or just before t (slams land on the grid, just ahead of the phrase)."""
    return round(int(t / beat + 1e-6) * beat, 3)


c = tl["cues"]
c.update({
    "turn": at["c3"],
    "title": sc["title"]["start"],
    "team": sc["team"]["start"],
    "layers": sc["layers"]["start"],
    "slams": [on_beat(at[k]) for k in ("p1", "p2", "p3", "p4")],
    "act1": sc["act1"]["start"],
    "act2": sc["act2"]["start"],
    "drop": sc["attackTitle"]["start"],
    "riser": sc["attackTitle"]["start"] - 4 * beat * 2,
    "hits": [at[k] for k in ("k2", "k3", "k4", "k5")],
    "refuse": at["k6"],
    "freeze": word("k7", "freezes"),
    "blocked": sc["judges"]["start"],
    "hood": sc["hood"]["start"],
    "checkpoints": [word("h3", "brain"), at["h5"], word("h6", "contract")],
    "rules": [word("h4", w) for w in ("screens", "predicts", "watches", "learns")],
    "shatter": word("h7", "no"),
    "brain": sc["brain"]["start"],
    "charge": sc["charge"]["start"],
    "proof": sc["proof"]["start"],
    "close": sc["close"]["start"],
    "end": tl["total"],
})
json.dump(tl, open(tl_path, "w"), indent=2)
print("cues:", {k: c[k] for k in ("drop", "refuse", "freeze", "rules", "shatter")})
