"""Find where each phone cut of the edit sits in a new take of the same auto-play run, by matching frames.

usage (from video/): python3 tools/retime.py OLD.mp4 NEW.mp4 remotion/src/edit.json SRC [SRC ...]
  SRC is the edit's source key for OLD (e.g. AP). Prints, for every segment that uses it, the old [from, to], the
  best-matching start in NEW, the vertical shift of the content and the match error. Nothing is written: copy the
  numbers into edit.json (with the new take under its own key) after checking stills.
The comparison runs on small grey frames at 10 fps. The chat can sit lower in the new take (without the ask dock the
app drops the room it kept for it), so each candidate is compared at several vertical shifts of the content, leaving
out the fixed header and the composer.
"""
import json
import subprocess
import sys

import numpy as np

FPS, W, H = 10, 60, 130
TOP, BOT = 14, 104  # rows compared: below the header, above the composer (130 rows = the full screen)
SHIFTS = range(0, 15)  # new content may sit up to 14 rows (~280 px) lower


def frames(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={FPS},scale={W}:{H},format=gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)


old_path, new_path, edit_path, *srcs = sys.argv[1:]
old, new = frames(old_path), frames(new_path)
print(f"old {len(old) / FPS:.1f}s, new {len(new) / FPS:.1f}s")
for sc in json.load(open(edit_path))["scenes"]:
    for i, s in enumerate(sc.get("segs") or []):
        if s[0] not in srcs:
            continue
        a, b = s[1], s[2]
        n = max(3, min(int((b - a) * FPS), 20))
        win = old[int(a * FPS): int(a * FPS) + n, TOP:BOT]
        lo, hi = max(0, int((a - 25) * FPS)), min(len(new) - n, int((a + 70) * FPS))
        best = (1e18, 0, 0)
        for k in range(lo, hi):
            cand = new[k:k + n]
            for sh in SHIFTS:
                e = float(np.mean((cand[:, TOP + sh:BOT + sh] - win) ** 2))
                if e < best[0]:
                    best = (e, k, sh)
        e, k, sh = best
        print(f"{sc['id']:7s} seg {i}: old {a:7.2f}-{b:7.2f}  new start {k / FPS:7.2f}  shift {k / FPS - a:+7.2f}  down {sh * 2622 / H:4.0f}px  err {e:7.1f}")
