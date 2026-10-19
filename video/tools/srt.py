"""Write the .srt that matches the burned-in subtitles (same paging rules as remotion/src/components/Subtitles.tsx).

usage: python3 tools/srt.py remotion/src out.srt
"""
import json
import re
import sys

src, out = sys.argv[1], sys.argv[2]
tl = json.load(open(f"{src}/timeline.json"))
lines = json.load(open(f"{src}/vo-lines.json"))
words = json.load(open(f"{src}/vo-words.json"))
at = {v["id"]: v["at"] for v in tl["vo"]}
pages = []
for line in lines:
    t0, ws = at.get(line["id"]), words.get(line["id"])
    if t0 is None or not ws:
        continue
    cur = []

    def flush():
        global cur
        if cur:
            pages.append({"text": " ".join(w["w"] for w in cur), "start": t0 + cur[0]["s"] - 0.05, "end": t0 + cur[-1]["e"] + 0.3})
        cur = []

    for i, w in enumerate(ws):
        cur.append(w)
        chars = len(" ".join(x["w"] for x in cur))
        rest = len(ws) - i - 1
        punct = re.search(r"[.,:;?!]$", w["w"]) is not None
        end = re.search(r"[.?!]$", w["w"]) is not None
        if (end and chars >= 20 and rest > 0) or (punct and chars >= 45 and rest >= 3) or chars >= 84:
            flush()
    flush()
for a, b in zip(pages, pages[1:] + [None]):
    a["end"] = max(a["end"], a["start"] + len(a["text"]) / 17)  # readable for non-native viewers: at most ~17 characters a second
    if b:
        a["end"] = min(a["end"], b["start"] - 0.02)


def ts(s):
    ms = round(s * 1000)
    return f"{ms // 3600000:02d}:{ms % 3600000 // 60000:02d}:{ms % 60000 // 1000:02d},{ms % 1000:03d}"


with open(out, "w", encoding="utf-8") as f:
    for i, p in enumerate(pages, 1):
        f.write(f"{i}\n{ts(p['start'])} --> {ts(p['end'])}\n{p['text']}\n\n")
cps = max(len(p["text"]) / max(0.1, p["end"] - p["start"]) for p in pages)
print(out, len(pages), "subtitles; fastest", round(cps, 1), "characters per second")
