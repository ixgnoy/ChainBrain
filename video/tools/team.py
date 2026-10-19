"""Square head-and-shoulders crops of the team photos for the end card.

usage: .venv/bin/python tools/team.py footage/teammate remotion/public/team
The photos live in footage/teammate (git-ignored); the crops go to remotion/public/team (git-ignored).
"""
import os
import sys

from PIL import Image

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for name in sorted(os.listdir(src)):
    stem, ext = os.path.splitext(name)
    if ext.lower() not in (".jpg", ".jpeg", ".png"):
        continue
    im = Image.open(os.path.join(src, name)).convert("RGB")
    w, h = im.size
    side = int(min(w, h * 0.75) * 0.86)
    left = (w - side) // 2
    top = int(h * 0.03)
    im.crop((left, top, left + side, top + side)).resize((600, 600), Image.LANCZOS).save(os.path.join(out, f"{stem.lower()}.jpg"), quality=92)
    print("team", stem.lower())
