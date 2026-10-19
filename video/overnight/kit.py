"""Write overnight/recording-kit-v41.html: the main checkout's (git-ignored) kit with this branch's changed lines
swapped in and highlighted.  usage: python3 video/overnight/kit.py"""
import html
import json
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(HERE)
KIT = "/Users/user/Workspace/Projects/shenzhen/chainbrain-github/video/out/recording-kit.html"
s = open(KIT, encoding="utf-8").read()
old = {l["id"]: l["text"] for l in json.loads(subprocess.check_output(["git", "-C", VIDEO, "show", "9bcd289:video/tts/lines.json"]))}
new = {l["id"]: l["text"] for l in json.load(open(os.path.join(VIDEO, "tts/lines.json"), encoding="utf-8"))}
missing = []
for i, text in new.items():
    if old.get(i) == text:
        continue
    for cand in (old[i], html.escape(old[i], quote=False), html.escape(old[i])):
        if cand in s:
            s = s.replace(cand, '<mark title="changed in v4.1">' + html.escape(text, quote=False) + "</mark>")
            break
    else:
        missing.append(i)
s = s.replace("<style>", "<style>mark{background:#ffe9a8;padding:0 2px;border-radius:3px}", 1)
s = s.replace("Voice recording kit</h1>", "Voice recording kit (v4.1)</h1><p><mark>Highlighted</mark> lines changed in v4.1 for accuracy (video/overnight/research/script-v41.md). Read those words. Leave 3 seconds of silence at the start of every file: the clean-up measures your room from it.</p>", 1)
# the audio review's coaching (research/audio.md, section 4) at the end of the kit
import re  # noqa: E402

md = open(os.path.join(HERE, "research/audio.md"), encoding="utf-8").read()
md = md[md.index("## 4. Coaching"): md.index("## 5.")].split("\n", 1)[1].strip()
inline = lambda t: re.sub(r"`([^`]+)`", r"<code>\1</code>", re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html.escape(t, quote=False)))  # noqa: E731
parts = []
for block in md.split("\n\n"):
    rows = block.split("\n")
    if all(r.startswith("- ") for r in rows[1:]) and len(rows) > 1:
        parts.append(f"<p>{inline(rows[0])}</p><ul>" + "".join(f"<li>{inline(r[2:])}</li>" for r in rows[1:]) + "</ul>")
    elif all(r.startswith("- ") for r in rows):
        parts.append("<ul>" + "".join(f"<li>{inline(r[2:])}</li>" for r in rows) + "</ul>")
    else:
        parts.append(f"<p>{inline(' '.join(rows))}</p>")
s = s.replace("</body>", '<section><h2>Delivery coaching</h2>' + "".join(parts) + "</section></body>") if "</body>" in s else s + '<section><h2>Delivery coaching</h2>' + "".join(parts) + "</section>"
open(os.path.join(HERE, "recording-kit-v41.html"), "w", encoding="utf-8").write(s)
print("recording-kit-v41.html:", sum(old.get(i) != t for i, t in new.items()), "lines changed; not found in kit:", missing)
