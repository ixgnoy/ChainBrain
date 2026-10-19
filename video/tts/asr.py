"""Check every voice-over line with Whisper and keep its word timings for the subtitles.

usage: .venv/bin/python tts/asr.py tts/lines.json remotion/public/audio/vo remotion/src/vo-words.json
Prints each line whose transcript differs from the script (after normalising), and writes
{id: [{"w": word, "s": start, "e": end}, ...]} using the SCRIPT's words (the subtitles show the script, not
Whisper's spelling), timed by aligning Whisper's words to them in order.
"""
import json
import re
import sys
from difflib import SequenceMatcher

import soundfile as sf
import soxr
from faster_whisper import WhisperModel

lines = json.load(open(sys.argv[1], encoding="utf-8"))
vo_dir, out = sys.argv[2], sys.argv[3]
model = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace("-", " "))
result, bad = {}, []
for L in lines:
    a, sr = sf.read(f"{vo_dir}/{L['id']}.wav", dtype="float32")
    a = soxr.resample(a, sr, 16000)  # decode ourselves: this PyAV build breaks faster-whisper's own decoder
    segs, _ = model.transcribe(a, word_timestamps=True, language="en", beam_size=5)
    heard = [w for s in segs for w in s.words]
    said = " ".join(w.word.strip() for w in heard)
    ratio = SequenceMatcher(None, norm(said), norm(L.get("say", L["text"]))).ratio()
    if ratio < 0.92:
        bad.append((L["id"], round(ratio, 2), said))
    # map the script's words onto Whisper's timings proportionally by character position
    script = L["text"].split()
    if heard:
        t0, t1 = heard[0].start, heard[-1].end
        total = sum(len(w) for w in script) or 1
        acc, words = 0, []
        hs = [(h.start, h.end) for h in heard]
        for w in script:
            a = acc / total
            acc += len(w)
            b = acc / total
            # nearest heard word boundaries for the start and end fractions
            i = min(int(a * len(hs)), len(hs) - 1)
            j = min(max(int(b * len(hs)) - 1, i), len(hs) - 1)
            words.append({"w": w, "s": round(hs[i][0], 3), "e": round(hs[j][1], 3)})
        result[L["id"]] = words
    print(f"{L['id']}\t{ratio:.2f}\t{said}")
json.dump(result, open(out, "w"), indent=0)
print("\nlines to check:", bad if bad else "none")
