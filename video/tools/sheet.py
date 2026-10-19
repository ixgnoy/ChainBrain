"""Contact sheet of a clip with timestamps, for finding moments in long screen recordings.

usage: .venv/bin/python tools/sheet.py clip.mp4 out.jpg start end step [cols] [thumb_w]
"""
import subprocess
import sys

from PIL import Image, ImageDraw

clip, out = sys.argv[1], sys.argv[2]
start, end, step = float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
cols = int(sys.argv[6]) if len(sys.argv) > 6 else 8
tw = int(sys.argv[7]) if len(sys.argv) > 7 else 220
times = []
t = start
while t <= end + 1e-6:
    times.append(t)
    t += step
thumbs = []
for t in times:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", clip, "-frames:v", "1", "-vf", f"scale={tw}:-2", "-f", "image2pipe", "-vcodec", "png", "-"],
        capture_output=True,
    ).stdout
    from io import BytesIO

    im = Image.open(BytesIO(raw)).convert("RGB") if raw else Image.new("RGB", (tw, int(tw * 2.17)), "black")
    d = ImageDraw.Draw(im)
    label = f"{int(t // 60)}:{t % 60:05.2f}"
    d.rectangle([0, 0, 92, 18], fill="black")
    d.text((4, 3), label, fill="yellow")
    thumbs.append(im)
w, h = thumbs[0].size
rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), "white")
for i, im in enumerate(thumbs):
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out, quality=85)
print(out, len(thumbs), "frames")
