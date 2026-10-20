"""ElevenLabs voice-over: text to speech with character timestamps (POST /v1/text-to-speech/{voice_id}/with-timestamps).

usage (run from video/):
  .venv/bin/python tts/eleven.py check                                   # key works? plan, characters left, models
  .venv/bin/python tts/eleven.py voices [search words]                   # voices in your account
  .venv/bin/python tts/eleven.py audition OUT_DIR VOICE_ID[,VOICE_ID...] # the same line in each voice + OUT_DIR/audition.mp3
  .venv/bin/python tts/eleven.py lines tts/lines.json remotion/public/audio/vo remotion/src/vo-words.json [--only id,id]

The API key comes from ELEVENLABS_API_KEY in the shell, or from video/.env (a line ELEVENLABS_API_KEY=...).
It is sent only in the xi-api-key header and is never printed. video/.env is git-ignored.
Voice, model and settings live in tts/eleven.json. Each line's request is cached by a hash of what was sent, so
re-running only spends credits on lines whose text, voice, model or settings changed.
"""
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from difflib import SequenceMatcher

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(HERE)
API = "https://api.elevenlabs.io"
CONFIG = os.path.join(HERE, "eleven.json")
AUDITION = "Now, let's attack it. We fool the agent on purpose, and force a transfer out. The card refuses it. The balance doesn't move."


def load_key():
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    env = os.path.join(VIDEO, ".env")
    if not key and os.path.exists(env):
        for line in open(env, encoding="utf-8"):
            m = re.match(r"\s*(?:export\s+)?ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$", line)
            if m:
                key = m.group(1).strip().strip("'\"")
    if not key:
        sys.exit("No ElevenLabs key. Put a line ELEVENLABS_API_KEY=... in video/.env (git-ignored), or export it in the shell.")
    return key


KEY = None


class SoftFail(Exception):
    pass


def api(method, path, body=None, query=None, tries=5, soft=False):
    global KEY
    KEY = KEY or load_key()
    url = API + path + ("?" + urllib.parse.urlencode(query) if query else "")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"xi-api-key": KEY, "Content-Type": "application/json", "Accept": "application/json"})
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                return json.loads(r.read().decode()), dict(r.headers)
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:600]
            if e.code == 401:
                sys.exit(f"ElevenLabs rejected the key (401). Check ELEVENLABS_API_KEY and its permissions. {detail}")
            if e.code in (429, 500, 502, 503, 504) and attempt < tries - 1:
                time.sleep(2 ** attempt * 1.5)
                continue
            if soft:
                raise SoftFail(f"HTTP {e.code}")
            sys.exit(f"ElevenLabs {method} {path} failed: HTTP {e.code} {detail}")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:  # a read timeout is not a URLError
            if attempt < tries - 1:
                time.sleep(2 ** attempt)
                continue
            sys.exit(f"ElevenLabs unreachable: {e}")


def config():
    return json.load(open(CONFIG, encoding="utf-8"))


def tts_models():
    models, _ = api("GET", "/v1/models")
    return {m["model_id"]: m for m in models if m.get("can_do_text_to_speech")}


def pick_model(cfg, models):
    for m in [cfg.get("model_id"), cfg.get("fallback_model_id"), "eleven_multilingual_v2"]:
        if m and m in models:
            if m != cfg.get("model_id"):
                print(f"note: {cfg.get('model_id')} is not available to this key; using {m}")
            return m
    sys.exit("None of the configured models can do text to speech for this key.")


def subscription():
    """Plan and character usage; {} when the key may not read it (a key limited to text to speech)."""
    try:
        s, _ = api("GET", "/v1/user/subscription", soft=True)
        return s
    except SoftFail:
        return {}


def synth(text, voice_id, model_id, cfg, previous_text=None, next_text=None):
    body = {
        "text": text,
        "model_id": model_id,
        "voice_settings": cfg.get("voice_settings"),
        "seed": cfg.get("seed"),
        "apply_text_normalization": "auto",
    }
    if previous_text:
        body["previous_text"] = previous_text
    if next_text:
        body["next_text"] = next_text
    res, _ = api("POST", f"/v1/text-to-speech/{voice_id}/with-timestamps", body, {"output_format": cfg.get("output_format", "mp3_44100_128")})
    return base64.b64decode(res["audio_base64"]), res.get("alignment") or res.get("normalized_alignment")


def mp3_to_wav(mp3_path, wav_path):
    """48 kHz mono WAV with leading/trailing silence trimmed; returns the seconds trimmed at the start."""
    import numpy as np
    import soundfile as sf

    raw = wav_path + ".raw.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3_path, "-ac", "1", "-ar", "48000", raw], check=True)
    a, sr = sf.read(raw, dtype="float32")
    os.remove(raw)
    nz = np.where(np.abs(a) > (np.abs(a).max() if len(a) else 0) * 0.02)[0]
    lead = 0.0
    if len(nz):
        i0 = max(0, nz[0] - int(0.03 * sr))
        a = a[i0: nz[-1] + int(0.08 * sr)]
        lead = i0 / sr
    sf.write(wav_path, a, sr)
    return lead, len(a) / sr


def words_from_alignment(al, lead):
    """Group character timings into words: [(word, start, end)], shifted by the trimmed lead."""
    out, cur, s, e = [], "", None, None
    for ch, cs, ce in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                out.append((cur, s - lead, e - lead))
            cur, s = "", None
            continue
        if s is None:
            s = cs
        cur += ch
        e = ce
    if cur:
        out.append((cur, s - lead, e - lead))
    return out


def align_words(display, spoken):
    """Map the subtitle's words onto the spoken words' times (matched words exact, the rest interpolated)."""
    key = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
    times = [None] * len(display)
    for a, b, n in SequenceMatcher(None, [key(w) for w in display], [key(w[0]) for w in spoken], autojunk=False).get_matching_blocks():
        for k in range(n):
            times[a + k] = (spoken[b + k][1], spoken[b + k][2])
    known = [i for i, t in enumerate(times) if t]
    t0, t1 = spoken[0][1], spoken[-1][2]
    for i in range(len(display)):
        if times[i]:
            continue
        prev = max([k for k in known if k < i], default=None)
        nxt = min([k for k in known if k > i], default=None)
        s0 = times[prev][1] if prev is not None else t0
        e0 = times[nxt][0] if nxt is not None else t1
        gap = [k for k in range(len(display)) if (prev is None or k > prev) and (nxt is None or k < nxt)]
        j = gap.index(i)
        step = (e0 - s0) / max(1, len(gap))
        times[i] = (s0 + step * j, s0 + step * (j + 1))
    return [{"w": w, "s": round(max(0.0, t[0]), 3), "e": round(max(0.0, t[1]), 3)} for w, t in zip(display, times)]


def cmd_check():
    s = subscription()
    if s:
        print(f"key ok · tier {s.get('tier')} · characters used {s.get('character_count')} of {s.get('character_limit')}")
    else:
        print("key ok (it cannot read the subscription, which is fine)")
    for mid, m in tts_models().items():
        print(f"  {mid:28s} {m.get('name', '')}  (max {m.get('maximum_text_length_per_request', '?')} chars)")


def cmd_voices(search):
    q = {"page_size": 100, "include_total_count": "true"}
    if search:
        q["search"] = search
    res, _ = api("GET", "/v2/voices", query=q)
    for v in res.get("voices", []):
        lb = v.get("labels") or {}
        tags = ", ".join(x for x in [lb.get("gender"), lb.get("age"), lb.get("accent"), lb.get("descriptive"), lb.get("use_case")] if x)
        print(f"{v['voice_id']}  {v.get('name', ''):22s} {v.get('category', ''):10s} {tags}")


def cmd_audition(out_dir, ids):
    cfg = config()
    model = pick_model(cfg, tts_models())
    os.makedirs(out_dir, exist_ok=True)
    names = {}
    res, _ = api("GET", "/v2/voices", query={"page_size": 100})
    for v in res.get("voices", []):
        names[v["voice_id"]] = re.sub(r"[^A-Za-z0-9]+", "-", v.get("name", v["voice_id"])).strip("-")
    files = []
    for vid in ids:
        audio, _ = synth(AUDITION, vid, model, cfg)
        f = os.path.join(out_dir, f"{len(files) + 1:02d}-{names.get(vid, vid)}.mp3")
        open(f, "wb").write(audio)
        files.append(f)
        print(f"{f}  ({vid})")
    # one file: each voice, then 0.9 s of silence
    parts, inputs = [], []
    for i, f in enumerate(files):
        inputs += ["-i", f, "-f", "lavfi", "-t", "0.9", "-i", "anullsrc=r=44100:cl=mono"]
        parts += [f"[{2 * i}:a]aresample=44100,aformat=channel_layouts=mono[a{i}]", f"[{2 * i + 1}:a]anull[s{i}]"]
    cat = "".join(f"[a{i}][s{i}]" for i in range(len(files)))
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(parts) + f";{cat}concat=n={2 * len(files)}:v=0:a=1", "-c:a", "libmp3lame", "-q:a", "3", os.path.join(out_dir, "audition.mp3")], check=True)
    print("model", model, "->", os.path.join(out_dir, "audition.mp3"))


def cmd_lines(lines_path, out_dir, words_path, only):
    cfg = config()
    if not cfg.get("voice_id"):
        sys.exit("Set voice_id in tts/eleven.json first (pick one with: tts/eleven.py voices, then audition).")
    model = pick_model(cfg, tts_models())
    lines = json.load(open(lines_path, encoding="utf-8"))
    os.makedirs(out_dir, exist_ok=True)
    before = subscription().get("character_count")
    words = json.load(open(words_path)) if os.path.exists(words_path) else {}
    dur_path = os.path.join(out_dir, "dur.json")
    dur = json.load(open(dur_path)) if os.path.exists(dur_path) else {}
    spoken = [L.get("say_eleven", L["text"]) for L in lines]
    # tempo: a time-stretch after generation (pitch kept), for voices or models that ignore voice_settings.speed
    # (eleven_v4 does). The cache key leaves it out: changing it re-derives the WAVs from the saved MP3s, no API call.
    tempo = float(cfg.get("tempo", 1.0))

    def timed(words_1x, d):
        """Word times at this tempo, kept inside the kept audio (the API's last word runs to the end of the untrimmed
        file, trailing silence included; the WAV is trimmed, so an unclamped line would look ~0.5 s longer than it is)."""
        out = []
        for w in words_1x:
            s_, e_ = min(w["s"] / tempo, d), min(w["e"] / tempo, d)
            out.append({"w": w["w"], "s": round(s_, 3), "e": round(max(e_, s_), 3)})
        return out

    def stretch(wav_path, words_1x, d_1x):
        if abs(tempo - 1.0) > 1e-3:
            tmp = wav_path + ".tmp.wav"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav_path, "-af", f"atempo={tempo}", "-ar", "48000", "-ac", "1", tmp], check=True)
            os.replace(tmp, wav_path)
        return timed(words_1x, d_1x / tempo), d_1x / tempo

    for i, L in enumerate(lines):
        if only and L["id"] not in only:
            continue
        text = spoken[i]
        prev_t = spoken[i - 1] if i > 0 else None
        next_t = spoken[i + 1] if i + 1 < len(lines) else None
        sig = hashlib.sha256(json.dumps([text, prev_t, next_t, cfg.get("voice_id"), model, cfg.get("voice_settings"), cfg.get("seed")]).encode()).hexdigest()[:16]
        meta_path = os.path.join(out_dir, f"{L['id']}.eleven.json")
        wav = os.path.join(out_dir, f"{L['id']}.wav")
        mp3 = os.path.join(out_dir, f"{L['id']}.mp3")
        meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
        if meta.get("sig") == sig and os.path.exists(wav):
            if abs(meta.get("tempo", 1.0) - tempo) < 1e-3:
                if meta.get("words_1x"):  # timings come from the take itself, so an interrupted run can't leave them stale
                    import soundfile as _sf
                    d_now = _sf.info(wav).duration
                    words[L["id"]] = timed(meta["words_1x"], d_now)
                    dur[L["id"]] = round(d_now, 3)
                print(f"{L['id']}\tcached")
                continue
            if os.path.exists(mp3):  # same take, new tempo: rebuild from the saved MP3
                base = meta.get("words_1x") or [{"w": w["w"], "s": w["s"] * meta.get("tempo", 1.0), "e": w["e"] * meta.get("tempo", 1.0)} for w in words.get(L["id"], [])]
                _, d1 = mp3_to_wav(mp3, wav)
                words[L["id"]], dur[L["id"]] = stretch(wav, base, d1)
                meta.update({"tempo": tempo, "words_1x": base})
                json.dump(meta, open(meta_path, "w"), indent=1)
                print(f"{L['id']}\tre-timed to tempo {tempo}")
                continue
        audio, al = synth(text, cfg["voice_id"], model, cfg, prev_t, next_t)
        open(mp3, "wb").write(audio)
        lead, d = mp3_to_wav(mp3, wav)
        sw = words_from_alignment(al, lead) if al else []
        base = align_words(L["text"].split(), sw) if sw else []
        words[L["id"]], d = stretch(wav, base, d)
        dur[L["id"]] = round(d, 3)
        json.dump({"sig": sig, "model": model, "voice_id": cfg["voice_id"], "text": text, "tempo": tempo, "words_1x": base}, open(meta_path, "w"), indent=1)
        n = len(L["text"].split())
        print(f"{L['id']}\t{d:6.2f}s\t{n / d * 60:5.0f} wpm\t{L['text'][:70]}")
    json.dump(dur, open(dur_path, "w"), indent=1)
    json.dump(words, open(words_path, "w"), indent=0)
    after = subscription().get("character_count")
    if before is not None and after is not None:
        print(f"characters spent this run: {after - before}")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)
    c = sys.argv[1]
    if c == "check":
        cmd_check()
    elif c == "voices":
        cmd_voices(" ".join(sys.argv[2:]))
    elif c == "audition" and len(sys.argv) >= 4:
        cmd_audition(sys.argv[2], sys.argv[3].split(","))
    elif c == "lines" and len(sys.argv) >= 5:
        only = None
        if "--only" in sys.argv:
            only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
        cmd_lines(sys.argv[2], sys.argv[3], sys.argv[4], only)
    else:
        print(__doc__)
        sys.exit(2)
