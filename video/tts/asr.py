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
    # align the script's words to Whisper's words: matched words take Whisper's times, the rest are interpolated
    script = L["text"].split()
    if heard:
        key = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
        hk = [key(h.word) for h in heard]
        sk = [key(w) for w in script]
        times = [None] * len(script)
        for a, b, n in SequenceMatcher(None, sk, hk, autojunk=False).get_matching_blocks():
            for k in range(n):
                times[a + k] = (heard[b + k].start, heard[b + k].end)
        t_end = heard[-1].end
        known = [i for i, t in enumerate(times) if t]
        for i in range(len(script)):
            if times[i]:
                continue
            prev = max([k for k in known if k < i], default=None)
            nxt = min([k for k in known if k > i], default=None)
            s0 = times[prev][1] if prev is not None else heard[0].start
            e0 = times[nxt][0] if nxt is not None else t_end
            gap = [k for k in range(len(script)) if (prev is None or k > prev) and (nxt is None or k < nxt)]
            j = gap.index(i)
            step = (e0 - s0) / max(1, len(gap))
            times[i] = (s0 + step * j, s0 + step * (j + 1))
        result[L["id"]] = [{"w": w, "s": round(t[0], 3), "e": round(t[1], 3)} for w, t in zip(script, times)]
    print(f"{L['id']}\t{ratio:.2f}\t{said}")
json.dump(result, open(out, "w"), indent=0)
print("\nlines to check:", bad if bad else "none")
