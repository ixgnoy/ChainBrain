"""Storyboard for approval before the final render: real frames of the current cut, each with the line it plays
under (the words already said by that frame in white), then the full voice-over, with the wording at --since struck
through where a line changed. A voice-only track of the cut is written beside the page.

usage (from video/): .venv/bin/python tools/board.py out/storyboard.html [--since REV] [--scale 0.5]
Frames come from remotion/scripts/stills.mjs (one bundle). The page is self-contained (frames inlined); the voice
track is <page>-voice.mp3.
"""
import base64
import html
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
import soxr

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
if len(sys.argv) < 2 or sys.argv[1].startswith("--"):
    sys.exit(__doc__)
arg = lambda flag, default: sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default
OUT = sys.argv[1]
SINCE = arg("--since", "HEAD")
SCALE = arg("--scale", "0.5")

T = json.load(open("remotion/src/timeline.json"))
W = json.load(open("remotion/src/vo-words.json"))
LINES = json.load(open("tts/lines.json", encoding="utf-8"))
TEXT = {L["id"]: L["text"] for L in LINES}
FACE = json.load(open("remotion/src/face.json"))
try:
    OLD = {L["id"]: L["text"] for L in json.loads(subprocess.run(["git", "show", f"{SINCE}:video/tts/lines.json"], capture_output=True, text=True, check=True).stdout)}
except subprocess.CalledProcessError:
    OLD = {}

# what each scene shows (keep in step with SCRIPT.md); a scene missing here shows its id only
SCENES = {
    "hook": ("Hook", "Black. 4 May 2026, one post on X. Dots and dashes light with the Morse key and decode into \"SEND ALL\" (labelled an illustration). Hard cut: a counter runs up to US$150,000+ sent away by one AI agent (OECD AI Incidents Monitor)."),
    "stat": ("The trust gap", "74% would let an agent handle routine tasks; then 9%, in vermillion, would let it buy on its own (Accenture, June 2026)."),
    "intro": ("Hello", "Your intro clip in the film's phone frame, your words set large as you say them, with your name and university above. The bottom subtitle steps aside for this line."),
    "card": ("The AI Card", "The ChainBrain mark, then the AI Card rises out of the dark."),
    "what": ("What it is", "Three cards fan out on the names (Claude, ChatGPT, ours), fold into one and flip to the contract's rules; the FISCO BCOS logo lands; the real Brain map arrives as the second AI."),
    "get": ("Get one", "Phone: describe the job, the card builds itself live, slide to approve, created and funded (x30)."),
    "use1": ("The first payment", "Phone: it asks one question; it pays test versions of Exa and CoinGecko on its own, over x402 (logos)."),
    "xray": ("X-ray of that payment", "One board in four lanes (your phone, our server, the seller, FISCO BCOS); the camera follows the payment: keys, the seller's price over x402, the server checks, the signature, the token asking the card, its eight checks, the real hosted-chain hash, then the whole system."),
    "use2": ("Use it", "Phone: above your limit you co-sign (Nansen); an unlisted seller is refused and the agent re-plans or asks you; it negotiates HK$12.00 down to HK$8.80; cancel mid-task and take back what's left."),
    "breakT": ("The drop", "\"Let's break it.\", centred, on a warm stage."),
    "attack": ("Break it", "Phone with the attack rail: a hidden order (read as data, ignored), a request for your data (refused), a fake admin (refused)."),
    "money": ("The card says no", "The fourth attack: a fooled agent sends test money; the order stops dead at the AI Card; half a second of silence, then \"No.\"; the phone's notice beside the real reverted transaction."),
    "why": ("Why it held", "Eight layers with their icons; each demo attack sits at the layer that stops it; six on our server, two on-chain that hold even if our server is taken over."),
    "stolen": ("If a key is stolen", "Four cards: the agent key (still capped), our server, the guardian key (can only freeze), your owner key (never leaves your phone)."),
    "watch": ("The watcher", "Phone: the Brain; Radar blocks TradeWire (risk 9/10); it learns how you buy; repeated attempts freeze the card; only you can unfreeze it."),
    "only": ("Only stricter", "\"Stricter.\" in blue; \"Never looser.\" struck through."),
    "hkma": ("The HKMA's four ideas", "Carmen Chu, HKMA, October 2026: anchored to intent, kill switches, A.I. versus A.I., secure boundaries, each mapped to a ChainBrain feature. Footer: our mapping, not a regulatory approval."),
    "proof": ("Proof", "Our hosted FISCO BCOS chain: 7 of 7 forbidden attempts rejected, each with its hash; 63 attacks, HK$0 lost; 462 automated tests passed."),
    "team": ("The team", "Three portraits: Chin Jun Quan and Tan Hao Wen (Universiti Malaya), Wong Yong Xi (Universiti Putra Malaysia). Music only now: the team line isn't voiced."),
    "closeface": ("The last line", "Your closing clip in the phone frame; the line set large as you say it, \"card\" in vermillion."),
    "close": ("End card", "The mark, 链AI脑, where to try it, FinTechathon 2026, then a fade to black. With your closing clip just before, it no longer repeats the line."),
}
FLAG = {"intro": "new", "closeface": "new", "team": "changed", "close": "changed"}

vo = sorted(T["vo"], key=lambda v: v["at"])
scenes = T["scenes"]
scene_of = lambda t: next((s for s in scenes if s["start"] <= t < s["end"]), scenes[-1])
end_of = lambda v: v["at"] + W[v["id"]][-1]["e"]

# one frame just after each line ends (its picture landed, its subtitle still up), one more mid-line for long lines; a frame for scenes
# without a line and for long tails after the last line (the held hash, the reverted transfer, the proof)
frames = set()
for i, v in enumerate(vo):
    if not W.get(v["id"]):
        continue
    a, e = v["at"], end_of(v)
    nxt = vo[i + 1]["at"] if i + 1 < len(vo) else T["total"]
    if e - a > 5.0:
        frames.add((round(a + (e - a) * 0.45, 2), v["id"]))
    frames.add((round(max(a + 0.3, min(e + 0.15, nxt - 0.35, scene_of(a)["end"] - 0.1)), 2), v["id"]))
for sc in scenes:
    inside = [v for v in vo if sc["start"] <= v["at"] < sc["end"] and W.get(v["id"])]
    if not inside:
        frames.add((round(sc["start"] + min(3.0, (sc["end"] - sc["start"]) * 0.6), 2), ""))
    elif sc["end"] - end_of(inside[-1]) >= 1.4:
        frames.add((round(sc["end"] - 0.6, 2), ""))
frames = sorted(frames)

tmp = tempfile.mkdtemp()
print(f"rendering {len(frames)} frames")
subprocess.run(["node", "scripts/stills.mjs", tmp, SCALE, *[f"{t:.2f}" for t, _ in frames]], cwd="remotion", check=True, stdout=subprocess.DEVNULL)

# a voice-only track at the cut's timings, each line levelled the way tools/mix.py levels it
sr = 48000
buf = np.zeros(int((T["total"] + 1) * sr), dtype=np.float32)
for v in vo:
    y, r = sf.read(f"remotion/public/audio/vo/{v['id']}.wav", dtype="float32")
    y = y.mean(axis=1) if y.ndim > 1 else y
    y = soxr.resample(y, r, sr) if r != sr else y
    loud = np.abs(y) > 0.01
    y = y * (10 ** (-19 / 20) / (np.sqrt(np.mean(y[loud] ** 2)) if loud.any() else 1e-3))
    i = int(v["at"] * sr)
    n = min(len(y), len(buf) - i)
    buf[i:i + n] += y[:n]
wav = os.path.join(tmp, "voice.wav")
sf.write(wav, buf[: int(T["total"] * sr)], sr, subtype="FLOAT")
mp3 = os.path.splitext(OUT)[0] + "-voice.mp3"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "48000", "-ac", "1", "-b:a", "96k", mp3], check=True)

tc = lambda s: f"{int(s // 60)}:{s % 60:04.1f}"
esc = html.escape


def spoken(lid, t):
    """The line with the words already said by time t in white."""
    if not lid:
        return "<p class=vo><span class=quiet>(music, no voice)</span></p>"
    at = next(v["at"] for v in vo if v["id"] == lid)
    ws = W[lid]
    said = sum(1 for w in ws if at + w["s"] <= t)
    words = [esc(w["w"]) for w in ws]
    return f"<p class=vo>“<b>{' '.join(words[:said])}</b>{' ' if said and said < len(words) else ''}<span>{' '.join(words[said:])}</span>”</p>"


def badge(kind):
    return f"<span class='badge {kind}'>{kind.upper()}</span>" if kind else ""


placed = [v["id"] for v in vo]
n_words = sum(len(W[i]) for i in placed if W.get(i))
changed = [i for i in placed if i in OLD and OLD[i] != TEXT.get(i)]
new = [i for i in placed if i not in OLD]
css = """
:root{--bg:#0A0B0D;--panel:#141519;--text:#F2F1EE;--muted:#8C8D95;--faint:#5b5c63;--line:rgba(255,255,255,.09);--ver:#F04E23;--blue:#9DCAFF;--green:#22C55E;--amber:#F5B544}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
header,main{max-width:1500px;margin:0 auto;padding:0 16px}header{padding-top:32px}h1{margin:0 0 6px;font-size:32px;letter-spacing:-.02em}
.sub{color:var(--muted);margin:0 0 18px}.sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin:18px 0 6px}
.box{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 18px}.box h3{margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.box ul{margin:0;padding-left:18px}.box li{margin:3px 0}.ask{border-color:rgba(245,181,68,.5)}.ask h3{color:var(--amber)}audio{width:100%;margin-top:8px}
section{margin-top:30px}h2{font-size:21px;margin:0 0 4px;border-top:1px solid var(--line);padding-top:16px}.range{font-size:14px;color:var(--muted);font-weight:500;margin-left:8px}
.pic{color:var(--muted);margin:0 0 12px;max-width:1100px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}
figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden}img{width:100%;display:block;aspect-ratio:16/9;background:#000}
figcaption{padding:9px 13px 12px}.meta{display:flex;align-items:center;gap:8px}.tc{font:600 13px ui-monospace,Menlo,monospace;color:var(--muted)}
.badge{font:700 11px ui-monospace,Menlo,monospace;letter-spacing:.08em;padding:2px 8px;border-radius:20px}.badge.new{background:var(--blue);color:#0A0B0D}
.badge.changed{background:rgba(34,197,94,.16);color:var(--green);border:1px solid rgba(34,197,94,.5)}
.vo{margin:6px 0 0;font-size:15px}.vo b{font-weight:500;color:var(--text)}.vo span{color:var(--faint)}.quiet{font-style:italic}
table{border-collapse:collapse;width:100%;margin-top:8px;font-size:15px}td{padding:7px 8px;border-top:1px solid var(--line);vertical-align:top}
td.t{font:600 13px ui-monospace,Menlo,monospace;color:var(--muted);white-space:nowrap}td.id{font:13px ui-monospace,Menlo,monospace;color:var(--muted)}
.was{display:block;color:var(--faint);text-decoration:line-through;text-decoration-color:rgba(240,78,35,.6);font-size:14px;margin-top:2px}
@media (max-width:600px){.grid{grid-template-columns:1fr}h1{font-size:26px}}
"""
out = [f"<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>ChainBrain storyboard</title><style>{css}</style></head><body>"]
out.append(f"<header><h1>ChainBrain demo video: storyboard</h1><p class=sub>Real frames of the current cut, {tc(T['total'])} long, {len(placed)} lines, {n_words} words. Each frame shows the line it plays under; the words already said by that frame are in white.</p>")
clips = ", ".join(k for k in FACE) or "none"
out.append("<div class=sum>")
out.append(f"<div class=box><h3>In this cut</h3><ul><li>Script v4.2: {len(changed)} lines reworded to sound more natural, {len(new)} new.</li><li>Your on-camera clips ({esc(clips)}) in the film's phone frame, your words set large as you say them.</li><li>The team slide plays with music only; the end card opens on the mark.</li></ul></div>")
out.append(f"<div class=box><h3>Voice</h3>Your ElevenLabs clone, 7% faster with the pitch kept; your clips use your own recorded sound. Voice only, at the film's timings (music comes with the final mix):<audio controls preload=none src='{esc(os.path.basename(mp3))}'></audio></div>")
out.append("<div class='box ask'><h3>Your call</h3>Approve and I'll compose the music, mix and render the final video. Or tell me what to change: a frame, a line or the pace.</div>")
out.append("</div></header><main>")
for sc in scenes:
    fs = [(t, lid) for t, lid in frames if sc["start"] <= t < sc["end"]]
    if not fs:
        continue
    title, pic = SCENES.get(sc["id"], (sc["id"], ""))
    out.append(f"<section><h2>{esc(title)}<span class=range>{tc(sc['start'])}–{tc(sc['end'])}</span> {badge(FLAG.get(sc['id'], ''))}</h2><p class=pic>{esc(pic)}</p><div class=grid>")
    for t, lid in fs:
        b64 = base64.b64encode(open(os.path.join(tmp, f"{t:.2f}.jpg"), "rb").read()).decode()
        kind = "new" if lid and lid not in OLD else "changed" if lid in changed else ""
        out.append(f"<figure><img loading=lazy alt='frame at {tc(t)}' src='data:image/jpeg;base64,{b64}'><figcaption><div class=meta><span class=tc>{tc(t)}</span>{badge(kind)}</div>{spoken(lid, t)}</figcaption></figure>")
    out.append("</div></section>")
out.append(f"<section><h2>The full voice-over<span class=range>in playing order; the wording at {esc(SINCE)} is struck through where a line changed</span></h2><table>")
for L in LINES:
    v = next((x for x in vo if x["id"] == L["id"]), None)
    when = tc(v["at"]) if v else "not used"
    was = f"<span class=was>{esc(OLD[L['id']])}</span>" if L["id"] in OLD and OLD[L["id"]] != L["text"] else ""
    kind = "new" if L["id"] not in OLD else "changed" if was else ""
    out.append(f"<tr><td class=t>{when}</td><td class=id>{esc(L['id'])}</td><td>{esc(L['text'])} {badge(kind)}{was}</td></tr>")
out.append("</table></section></main></body></html>")
open(OUT, "w", encoding="utf-8").write("\n".join(out))
print(f"{OUT}: {len(frames)} frames, {os.path.getsize(OUT) / 1e6:.1f} MB; voice: {mp3}")
