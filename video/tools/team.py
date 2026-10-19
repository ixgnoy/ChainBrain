"""Portrait (3:4) crops of the team photos for the team slide, framed alike: the eye line sits at 38% of the
frame height and the face spans about 57% of its width, so the three portraits line up.

usage: .venv/bin/python tools/team.py footage/teammate remotion/public/team
The photos live in footage/teammate (git-ignored); the crops go to remotion/public/team (git-ignored).
Face positions were measured by hand on each photo (fractions of the image: eye line y, face centre x, face width).
"""
import os
import sys

from PIL import Image

FACES = {
    "chin-jun-quan": (0.42, 0.50, 0.49),
    "tan-hao-wen": (0.31, 0.49, 0.50),
    "wong-yong-xi": (0.37, 0.50, 0.44),
}
EYE_LINE, FACE_SHARE, OUT = 0.38, 0.57, (600, 800)

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for name in sorted(os.listdir(src)):
    stem, ext = os.path.splitext(name)
    key = stem.lower()
    if ext.lower() not in (".jpg", ".jpeg", ".png") or key not in FACES:
        continue
    im = Image.open(os.path.join(src, name)).convert("RGB")
    w, h = im.size
    eye_y, cx, fw = FACES[key]
    cw = fw * w / FACE_SHARE
    ch = cw * 4 / 3
    left = max(0.0, min(w - cw, cx * w - cw / 2))
    top = max(0.0, min(h - ch, eye_y * h - EYE_LINE * ch))
    box = tuple(round(v) for v in (left, top, left + cw, top + ch))
    im.crop(box).resize(OUT, Image.LANCZOS).save(os.path.join(out, f"{key}.jpg"), quality=92)
    print("team", key, box)
