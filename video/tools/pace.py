"""How long the film runs if the voice is read at a given pace: scales every line's word timings to N words a minute
and runs tools/layout.py. Use it before recording (the owner's pace) and after any script change.

usage (from video/):
  python3 tools/pace.py remotion/src/vo-words.json remotion/src/edit.json 140 145 150
  python3 tools/pace.py remotion/src/vo-words.json remotion/src/edit.json 145 --face intro=5 close=3
--face simulates on-camera clips of those lengths in seconds (intro, close, team), as tools/voice.py would add them.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

args = sys.argv[1:]
if len(args) < 3:
    sys.exit(__doc__)
face = {}
if "--face" in args:
    i = args.index("--face")
    for kv in args[i + 1:]:
        k, v = kv.split("=")
        face[k] = {"len": float(v), "line": {"intro": "i1", "close": "z1", "team": "t1"}[k]}
    args = args[:i]
words_path, edit, wpms = args[0], args[1], [float(x) for x in args[2:]]
W = json.load(open(words_path))
S = tempfile.mkdtemp()
shutil.copy(edit, os.path.join(S, "edit.json"))  # layout.py reads face.json next to the edit
json.dump(face, open(os.path.join(S, "face.json"), "w"))
for wpm in wpms:
    out = {}
    for i, ws in W.items():
        k = len(ws) / wpm * 60 / ws[-1]["e"] if ws and ws[-1]["e"] > 0 else 1
        out[i] = [{**w, "s": w["s"] * k, "e": w["e"] * k} for w in ws]
    if "intro" in face:
        out.setdefault("i1", [{"w": "hi", "s": 0.2, "e": face["intro"]["len"] - 0.4}])
    json.dump(out, open(os.path.join(S, "w.json"), "w"))
    r = subprocess.run(["python3", "tools/layout.py", os.path.join(S, "edit.json"), os.path.join(S, "w.json"), os.path.join(S, "t.json")], capture_output=True, text=True)
    total = [l.strip() for l in r.stdout.splitlines() if "total" in l]
    print(f"{wpm:.0f} wpm{', clips ' + str({k: v['len'] for k, v in face.items()}) if face else ''}: {total[0] if total else r.stderr[-300:]}")
shutil.rmtree(S)
