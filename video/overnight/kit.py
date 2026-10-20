"""Write overnight/recording-kit-v41.html: the main checkout's (git-ignored) kit with this branch's changed lines
swapped in and highlighted.  usage: python3 video/overnight/kit.py"""
import html
import json
import re
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(HERE)
KIT = "/Users/user/Workspace/Projects/shenzhen/chainbrain-github/video/out/recording-kit.html"
s = open(KIT, encoding="utf-8").read()
old = {l["id"]: l["text"] for l in json.loads(subprocess.check_output(["git", "-C", VIDEO, "show", "9bcd289:video/tts/lines.json"]))}
new = {l["id"]: l["text"] for l in json.load(open(os.path.join(VIDEO, "tts/lines.json"), encoding="utf-8"))}
missing = []
ids = list(new)
for i, text in new.items():
    if old.get(i) == text:
        continue
    if i not in old:
        # a new line: a new list item after the previous line's item, about 2.6 words a second
        prev = new[ids[ids.index(i) - 1]]
        at = s.find(html.escape(prev, quote=True)) if html.escape(prev, quote=True) in s else s.find(html.escape(prev, quote=False))
        end = s.find("</li>", at) + len("</li>")
        secs = round(len(text.split()) / 2.6, 1)
        s = s[:end] + f'<li><span class="sec">{secs}s</span><span class="txt"><mark title="new in v4.1">{html.escape(text, quote=False)}</mark></span></li>' + s[end:]
        continue
    for cand in (old[i], html.escape(old[i], quote=False), html.escape(old[i])):
        if cand in s:
            s = s.replace(cand, '<mark title="changed in v4.1">' + html.escape(text, quote=False) + "</mark>")
            break
    else:
        missing.append(i)
s = s.replace("<style>", "<style>mark{background:#ffe9a8;padding:0 2px;border-radius:3px}", 1)
s = s.replace("Voice recording kit</h1>", "Voice recording kit (v4.1)</h1><p><mark>Highlighted</mark> lines changed in v4.1 for accuracy (video/overnight/research/script-v41.md). Read those words. Leave 3 seconds of silence at the start of every file: the clean-up measures your room from it. To hold the pace, read along with <b>teleprompter.html</b> (same folder), which moves through the lines at 145 words a minute.</p>", 1)
# changed lines get a fresh target length at 150 words a minute (the kit's other targets are the v4 voice's)
s = re.sub(
    r'<span class="sec">[\d.]+s</span><span class="txt"><mark title="([^"]+)">([^<]+)</mark>',
    lambda m: f'<span class="sec">{len(m.group(2).split()) / 2.5:.1f}s</span><span class="txt"><mark title="{m.group(1)}">{m.group(2)}</mark>',
    s,
)
s = s.replace(
    "The video has about 8 seconds of room under the 5-minute limit, so keep a brisk, natural pace.",
    "At 145 words a minute the film runs about 4:49 (tools/pace.py), so keep a brisk, natural pace of 145 to 150, and keep the on-camera intro to about 5 seconds. With both an intro and a closing clip it runs 4:56 at 145 and 4:51 at 150, so lean towards 150 (check with tools/pace.py --face).",
)
# the last line as its own audio file, so the film never ends on the synthetic voice when there is no closing clip
if "10-last-line.m4a" not in s:
    z1 = html.escape(new["z1"], quote=False)
    sec = (f'<section><h2><span class="file">10-last-line.m4a</span>The last line (record it even if you film it)'
           f'<span class="tot">about 3 s</span></h2><ol><li><span class="sec">3.0s</span><span class="txt">{z1}</span></li></ol>'
           f'<p class="sub">If you also film close.mov, the clip is used instead.</p></section>')
    s = s.replace("</main>", sec + "</main>", 1) if "</main>" in s else s + sec

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
