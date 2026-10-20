#!/bin/sh
# Try the owner's recordings without touching the project: import them into a temp folder with tools/voice.py, then
# report each line's match, the real speaking pace per section, and how long the film would run with them.
# usage (from video/): sh overnight/try-recordings.sh [FOOTAGE_DIR]   (default: footage, i.e. footage/voice + footage/face)
set -eu
cd "$(dirname "$0")/.."
IN=${1:-footage}
T=$(mktemp -d)
.venv/bin/python tools/voice.py --in "$IN" --out "$T" | tail -60
python3 - "$T" <<'PY'
import json, os, re, subprocess, sys, shutil
T = sys.argv[1]
words = json.load(open("remotion/src/vo-words.json"))
out = json.load(open(f"{T}/vo-words.json")) if os.path.exists(f"{T}/vo-words.json") else {}
new = {i: w for i, w in out.items() if words.get(i) != w}  # only the lines the takes replaced
if not new:
    sys.exit("no lines imported")
src = open("tools/voice.py").read()
sections = json.loads("{" + re.search(r"SECTIONS = \{(.*?)\n\}", src, re.S).group(1).rstrip().rstrip(",") + "}")
print("\npace per section (words a minute while speaking):")
for k, ids in sections.items():
    got = [i for i in ids if i in new]
    if got:
        w = sum(len(new[i]) for i in got); d = sum(new[i][-1]["e"] for i in got)
        flag = "  <- slow: the film may pass 5:00" if w / d * 60 < 138 else ""
        print(f"  {k}: {w / d * 60:5.0f} wpm over {len(got)}/{len(ids)} lines{flag}")
merged = {**words, **new}
os.makedirs(f"{T}/edit", exist_ok=True)
shutil.copy("remotion/src/edit.json", f"{T}/edit/edit.json")
shutil.copy(f"{T}/face.json", f"{T}/edit/face.json") if os.path.exists(f"{T}/face.json") else json.dump({}, open(f"{T}/edit/face.json", "w"))
json.dump(merged, open(f"{T}/edit/w.json", "w"))
r = subprocess.run(["python3", "tools/layout.py", f"{T}/edit/edit.json", f"{T}/edit/w.json", f"{T}/edit/t.json"], capture_output=True, text=True)
print("\nwith these takes (other lines keep the preview voice):", [l.strip() for l in r.stdout.splitlines() if "total" in l])
PY
rm -rf "$T"
