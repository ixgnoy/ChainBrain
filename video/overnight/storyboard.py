"""Write overnight/storyboard.html: before (v4) and after frames for every prototype, with the lines they change.

usage: python3 video/overnight/storyboard.py   (frames live in video/overnight/frames/, 960 px JPEGs)
"""
import html
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(HERE, "storyboard.json"), encoding="utf-8"))

css = """
:root{--bg:#0d0e10;--panel:#16171b;--text:#f2f1ee;--muted:#8c8d95;--red:#f04e23;--blue:#9dcaff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 -apple-system,system-ui,sans-serif}
main{max-width:1500px;margin:0 auto;padding:32px 16px 80px}h1{font-size:28px;margin:0 0 6px}
.lead{color:var(--muted);margin:0 0 28px}section{background:var(--panel);border-radius:14px;padding:20px;margin:0 0 26px}
h2{font-size:20px;margin:0 0 4px}.meta{color:var(--muted);font-size:13px;margin:0 0 14px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 14px}
figure{margin:0}img{width:100%;display:block;border-radius:8px}figcaption{color:var(--muted);font-size:12px;margin-top:4px}
.lines{font-size:14px;border-collapse:collapse;width:100%;margin-top:6px}.lines td{padding:6px 8px;border-top:1px solid #26272c;vertical-align:top}
.old{color:var(--muted);text-decoration:line-through;text-decoration-color:var(--red)}.new{color:var(--blue)}
.tag{display:inline-block;font-size:12px;padding:1px 8px;border-radius:99px;background:#24252b;margin-right:6px}
@media (max-width:760px){.pair{grid-template-columns:1fr}}
"""
out = [f"<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Overnight storyboard</title><style>{css}</style><main>"]
out.append("<h1>Overnight storyboard</h1><p class=lead>Before (v4, from the delivered MP4) and after (rendered on branch video-overnight) for each prototype. Frames are 960 px; times are seconds in each cut (v4.1 runs shorter, so times differ).</p>")
for p in P:
    out.append(f"<section><h2>{html.escape(p['title'])}</h2><p class=meta><span class=tag>{html.escape(p['when'])}</span><span class=tag>{html.escape(p['status'])}</span>commits {html.escape(', '.join(p['commits']))}</p>")
    if p.get("note"):
        out.append(f"<p>{html.escape(p['note'])}</p>")
    for a, b in p.get("pairs", []):
        out.append(f"<div class=pair><figure><img loading=lazy src='frames/{a}'><figcaption>before: {a}</figcaption></figure><figure><img loading=lazy src='frames/{b}'><figcaption>after: {b}</figcaption></figure></div>")
    if p.get("lines"):
        out.append("<table class=lines>")
        for lid, old, new in p["lines"]:
            out.append(f"<tr><td>{html.escape(lid)}</td><td class=old>{html.escape(old)}</td><td class=new>{html.escape(new)}</td></tr>")
        out.append("</table>")
    out.append("</section>")
# contact sheets of the whole branch preview (1 frame every 3 s, half resolution)
out.append("<section><h2>The whole branch preview, one frame every 3 s</h2>")
for i in range(4):
    out.append(f"<figure><img loading=lazy src='frames/preview-sheet{i}.jpg'></figure>")
out.append("</section>")
# the full current voice-over, for the owner's approval of the script with the frames
lines = json.load(open(os.path.join(HERE, "..", "tts", "lines.json"), encoding="utf-8"))
out.append("<section><h2>The full voice-over on this branch</h2><p class=meta>Read this with the frames above before the final render. Changed lines are marked in the recording kit.</p><table class=lines>")
for l in lines:
    out.append(f"<tr><td>{html.escape(l['id'])}</td><td class=new>{html.escape(l['text'])}</td></tr>")
out.append("</table></section>")
out.append("</main>")
open(os.path.join(HERE, "storyboard.html"), "w", encoding="utf-8").write("\n".join(out))
print("storyboard.html:", len(P), "prototypes")
