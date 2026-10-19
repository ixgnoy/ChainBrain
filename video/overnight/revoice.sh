#!/bin/sh
# Preview voice for changed lines (Kokoro, offline): overnight/revoice.sh id1,id2,...
# Merges the clips, word timings and durations, then rebuilds the timeline and music cues.
set -eu
cd "$(dirname "$0")/.."
S=$(mktemp -d)
python3 -c "import json,sys;ids=set(sys.argv[1].split(','));json.dump([l for l in json.load(open('tts/lines.json')) if l['id'] in ids],open('$S/lines.json','w'))" "$1"
.venv/bin/python tts/tts.py "$S/lines.json" "$S/vo" >/dev/null 2>&1
.venv/bin/python tts/asr.py "$S/lines.json" "$S/vo" "$S/words.json" 2>&1 | tail -1
cp "$S"/vo/*.wav remotion/public/audio/vo/
python3 - "$S" <<'PY'
import json,sys
S=sys.argv[1]
O=json.load(open('remotion/src/vo-words.json'));O.update(json.load(open(f'{S}/words.json')))
open('remotion/src/vo-words.json','w').write(json.dumps(O,ensure_ascii=False,indent=0))
D=json.load(open('remotion/public/audio/vo/dur.json'));D.update(json.load(open(f'{S}/vo/dur.json')));json.dump(D,open('remotion/public/audio/vo/dur.json','w'),indent=1)
PY
python3 tools/layout.py remotion/src/edit.json remotion/src/vo-words.json remotion/src/timeline.json | grep total
python3 tools/cues.py remotion/src/timeline.json remotion/src/vo-words.json >/dev/null
rm -rf "$S"
