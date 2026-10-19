"""How long the film runs if the voice is read at a given pace: scales every line's word timings to N words a minute
and runs tools/layout.py. Use it before recording (the owner's pace) and after any script change.

usage (from video/): python3 tools/pace.py remotion/src/vo-words.json remotion/src/edit.json 140 145 150
"""
import json
import subprocess
import sys
import tempfile
if len(sys.argv) < 4:
    sys.exit(__doc__)
words_path, edit, wpm_list = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3:]]
W=json.load(open(words_path)); S=tempfile.mkdtemp()
for wpm in wpm_list:
    out={}
    for i,ws in W.items():
        dur=ws[-1]['e']; target=len(ws)/wpm*60*1.0
        k=max(target/dur,1e-3) if dur>0 else 1
        out[i]=[{**w,'s':w['s']*k,'e':w['e']*k} for w in ws]
    json.dump(out,open(f'{S}/w_{int(wpm)}.json','w'))
    r=subprocess.run(['python3','tools/layout.py',edit,f'{S}/w_{int(wpm)}.json',f'{S}/t_{int(wpm)}.json'],capture_output=True,text=True)
    print(wpm,'wpm:',[l for l in r.stdout.splitlines() if 'total' in l], r.stderr[-300:])
