"""Write overnight/teleprompter.html: the v4.1 script, one recording file per screen, with a line highlight that moves
at a chosen pace (default 145 words a minute) and a timer against the section's target, so the owner records at a
pace that keeps the film under 5:00 (see tools/pace.py).  usage: python3 video/overnight/teleprompter.py
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(HERE)
lines = {l["id"]: l["text"] for l in json.load(open(os.path.join(VIDEO, "tts/lines.json"), encoding="utf-8"))}
src = open(os.path.join(VIDEO, "tools/voice.py"), encoding="utf-8").read()
sections = json.loads("{" + re.search(r"SECTIONS = \{(.*?)\n\}", src, re.S).group(1).replace("'", '"').rstrip().rstrip(",") + "}")
# the recording kit's own wording where it differs (tools/voice.py KIT): the intro clip names ChainBrain
kit = dict(re.findall(r'^\s+"(n1|t1)": "(.*)",$', src.split("KIT = {", 1)[1].split("}", 1)[0], re.M))
lines.update(kit)
names = {"01": "01-hook", "02": "02-card", "03": "03-first-payment", "04": "04-xray", "05": "05-use-it", "06": "06-break-it",
         "07": "07-why-it-held", "08": "08-hkma-proof", "09": "09-team"}
data = [{"file": names[k] + ".m4a", "lines": [{"id": i, "text": lines[i]} for i in ids]} for k, ids in sections.items()]

page = """<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Teleprompter v4.1</title>
<style>
:root{--bg:#0b0c0e;--text:#f2f1ee;--muted:#7d7e86;--hi:#9dcaff;--warn:#f04e23}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:18px/1.5 -apple-system,system-ui,sans-serif}
header{position:sticky;top:0;background:#0b0c0ef0;padding:12px 16px;display:flex;flex-wrap:wrap;gap:14px;align-items:center;border-bottom:1px solid #222}
header b{font-size:20px}button,select,input{font:inherit;background:#1b1c20;color:var(--text);border:1px solid #333;border-radius:8px;padding:6px 12px}
main{max-width:900px;margin:0 auto;padding:24px 16px 50vh}.line{font-size:clamp(26px,4vw,40px);line-height:1.35;margin:0 0 28px;color:var(--muted);transition:color .2s}
.line.on{color:var(--text)}.line.done{color:#4a4b52}.id{font:12px ui-monospace,monospace;color:#555;display:block}
#clock{font:600 22px ui-monospace,monospace}.over{color:var(--warn)}.tip{color:var(--muted);font-size:14px}
</style>
<header><b id=file></b><button id=prev>&larr;</button><button id=go>Start (space)</button><button id=next>&rarr;</button>
<label>pace <input id=wpm type=number min=120 max=170 value=145 style="width:4.5em"> wpm</label>
<span id=clock>0.0 s</span><span class=tip id=target></span></header>
<main id=m></main>
<script>
const D=__DATA__;let s=0,t0=null,raf=null;
const words=t=>t.split(/\\s+/).length;
function plan(){const w=+document.getElementById('wpm').value;let t=3.0;/* 3 s of room tone first */
 return D[s].lines.map(l=>{const a=t,d=words(l.text)/w*60;t+=d+1.0;return{a,b:a+d}})}
function target(){const p=plan();return p[p.length-1].b}
function draw(){const m=document.getElementById('m');m.innerHTML='';D[s].lines.forEach(l=>{const p=document.createElement('p');p.className='line';
 p.innerHTML='<span class=id>'+l.id+'</span>'+l.text;m.appendChild(p)});document.getElementById('file').textContent=(s+1)+'/'+D.length+'  '+D[s].file;
 document.getElementById('target').textContent='target about '+target().toFixed(1)+' s incl. 3 s room tone; leave 1 s between lines';}
function tick(){const el=(performance.now()-t0)/1000,p=plan(),ps=[...document.querySelectorAll('.line')];
 ps.forEach((n,i)=>{n.className='line'+(el>=p[i].a&&el<p[i].b+0.6?' on':el>=p[i].b+0.6?' done':'')});
 const on=ps.find(n=>n.classList.contains('on'));if(on)on.scrollIntoView({block:'center',behavior:'smooth'});
 const c=document.getElementById('clock');c.textContent=el.toFixed(1)+' s'+(el<3?'  (room tone)':'');c.className=el>target()*1.1?'over':'';
 raf=requestAnimationFrame(tick)}
function go(){if(raf){cancelAnimationFrame(raf);raf=null;document.getElementById('go').textContent='Start (space)';return}
 t0=performance.now();document.getElementById('go').textContent='Stop (space)';tick()}
function move(d){if(raf)go();s=Math.max(0,Math.min(D.length-1,s+d));draw();window.scrollTo(0,0)}
document.getElementById('go').onclick=go;document.getElementById('prev').onclick=()=>move(-1);document.getElementById('next').onclick=()=>move(1);
document.getElementById('wpm').onchange=draw;
addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();go()}if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1)});
draw();
</script>
"""
open(os.path.join(HERE, "teleprompter.html"), "w", encoding="utf-8").write(page.replace("__DATA__", json.dumps(data, ensure_ascii=False)))
print("teleprompter.html:", len(data), "sections,", sum(len(d["lines"]) for d in data), "lines")
