"""Cut real app UI elements out of the phone stills (tools/ui-stills.sh) for the problem and architecture acts.

usage: .venv/bin/python tools/crops.py   (from video/)
Each crop is (name, still, x0, y0, x1, y1) in fractions of the 1206x2622 frame. Output: remotion/public/ui/crops/<name>.png
"""
import os

from PIL import Image

SRC = "remotion/public/ui"
OUT = os.path.join(SRC, "crops")
CROPS = [
    ("wallet", "home", 0.036, 0.163, 0.967, 0.372),
    ("stack", "home", 0.036, 0.505, 0.967, 0.905),
    ("cheque", "cheque", 0.045, 0.100, 0.955, 0.650),
    ("slide", "cheque", 0.035, 0.760, 0.965, 0.850),
    ("card", "create", 0.115, 0.226, 0.885, 0.444),
    ("rules", "create", 0.035, 0.680, 0.965, 0.835),
    ("paid", "paid", 0.035, 0.598, 0.965, 0.842),
    ("question", "paid", 0.035, 0.170, 0.965, 0.300),
    ("haggle", "haggle", 0.035, 0.354, 0.965, 0.566),
    ("radar", "radar-card", 0.035, 0.368, 0.965, 0.692),
    ("sentinel-ok", "sentinel", 0.035, 0.226, 0.965, 0.430),
    ("sentinel", "sentinel", 0.035, 0.453, 0.965, 0.705),
    ("blocked", "blocked", 0.035, 0.616, 0.965, 0.782),
    ("guarded", "guarded", 0.035, 0.376, 0.965, 0.720),
    ("preflight", "guarded", 0.035, 0.548, 0.965, 0.622),
    ("remembers", "remembers", 0.035, 0.750, 0.965, 0.955),
    ("brainmap", "brain-map", 0.0, 0.245, 1.0, 0.695),
]
os.makedirs(OUT, exist_ok=True)
for name, still, x0, y0, x1, y1 in CROPS:
    im = Image.open(os.path.join(SRC, f"{still}.jpg")).convert("RGB")
    W, H = im.size
    box = (round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H))
    c = im.crop(box)
    c.save(os.path.join(OUT, f"{name}.png"))
    print(f"{name:12s} {c.size[0]}x{c.size[1]}  from {still}")

# hosted explorer pages (tools/shots/explorer-stills.json probes, 2x): the transaction panels
for name, page, x0, y0, x1, y1 in [
    ("ex-success", "ex-success", 0.012, 0.120, 0.580, 0.550),  # hash, status success, block 11
    ("ex-transfer", "ex-success", 0.012, 0.815, 0.700, 0.950),  # Transfer · to Seller: DataLite · value HK$2.30
    ("ex-reverted", "ex-reverted", 0.012, 0.120, 0.580, 0.550),  # hash, status reverted, block 13
]:
    im = Image.open(os.path.join("footage/probe", f"{page}.png")).convert("RGB")
    W, H = im.size
    c = im.crop((round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H)))
    c.save(os.path.join(OUT, f"{name}.png"))
    print(f"{name:12s} {c.size[0]}x{c.size[1]}  from the hosted explorer")
