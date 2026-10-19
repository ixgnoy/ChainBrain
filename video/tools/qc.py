"""Check a rendered video before it goes out: length, format, loudness, black frames, frozen picture, silence.

usage: python3 tools/qc.py out/InternationalAI-ChainBrain-DemoVideo.mp4 [--srt out/....srt]
Exit code 1 if any hard rule fails (over 5:00, not 1080p, no audio, peak above -1 dBTP); warnings print but pass.
The checks are ffmpeg's own filters (blackdetect, freezedetect, silencedetect, ebur128).
"""
import json
import re
import subprocess
import sys

if len(sys.argv) < 2:
    print(__doc__)
    sys.exit(2)
path = sys.argv[1]
srt = sys.argv[sys.argv.index("--srt") + 1] if "--srt" in sys.argv else None
fails, warns = [], []


def ff(args):
    return subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *args], capture_output=True, text=True).stderr


probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", path]))
dur = float(probe["format"]["duration"])
v = next((s for s in probe["streams"] if s["codec_type"] == "video"), None)
a = next((s for s in probe["streams"] if s["codec_type"] == "audio"), None)
print(f"{path}\n  length {int(dur // 60)}:{dur % 60:04.1f}, {float(probe['format']['size']) / 1e6:.0f} MB")
if dur > 300:
    fails.append(f"length {dur:.1f} s is over the 5:00 limit")
elif dur > 295:
    warns.append(f"length {dur:.1f} s leaves under 5 s of room")
if not v or (v["width"], v["height"]) != (1920, 1080):
    fails.append("picture is not 1920x1080")
else:
    print(f"  video {v['codec_name']} {v['width']}x{v['height']} {v['r_frame_rate']} {v.get('pix_fmt')}")
if not a:
    fails.append("no audio stream")
else:
    print(f"  audio {a['codec_name']} {a.get('sample_rate')} Hz, {a.get('channels')} ch")
# faststart: the moov atom before mdat lets a review portal start playing at once
head = open(path, "rb").read(1 << 20)
if head.find(b"moov") < 0 or (head.find(b"mdat") >= 0 and head.find(b"moov") > head.find(b"mdat")):
    warns.append("moov atom is not at the front (add -movflags +faststart)")

if a:
    # true peak needs the 4x oversampled meter; integrated loudness and range from the same pass
    out = ff(["-i", path, "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"])
    summary = out[out.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))
    lra = float(re.search(r"LRA:\s+(-?[\d.]+) LU", summary).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary).group(1))
    print(f"  loudness {i:.1f} LUFS, true peak {tp:.1f} dBTP, range {lra:.1f} LU")
    if not -16 <= i <= -13:
        warns.append(f"integrated loudness {i:.1f} LUFS (aim for -14)")
    if tp > -1.0:
        fails.append(f"true peak {tp:.1f} dBTP is above -1 (re-encode with a lower limiter, e.g. -2 dBTP before AAC)")
    sil = re.findall(r"silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)", ff(["-i", path, "-map", "0:a", "-af", "silencedetect=n=-50dB:d=1.5", "-f", "null", "-"]))
    for s, e in sil:
        warns.append(f"silence {float(s):.1f}-{float(e):.1f} s")

blk = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", ff(["-i", path, "-map", "0:v", "-vf", "blackdetect=d=0.5:pix_th=0.06", "-f", "null", "-"]))
for s, e in blk:
    warns.append(f"black picture {float(s):.1f}-{float(e):.1f} s")
frz = re.findall(r"freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)", ff(["-i", path, "-map", "0:v", "-vf", "freezedetect=n=0.002:d=4", "-f", "null", "-"]))
for s, e in frz:
    warns.append(f"picture still for {float(e) - float(s):.1f} s at {float(s):.1f} s")

if srt:
    cues = re.findall(r"(\d\d):(\d\d):(\d\d),(\d+) --> (\d\d):(\d\d):(\d\d),(\d+)\n(.+?)(?:\n\n|\Z)", open(srt, encoding="utf-8").read(), re.S)
    sec = lambda h, m, s, ms: int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000  # noqa: E731
    last = 0.0
    for c in cues:
        st, en, text = sec(*c[:4]), sec(*c[4:8]), c[8].split("\n")[0]
        cps = len(text) / max(0.01, en - st)
        if cps > 17:
            warns.append(f"subtitle at {st:.1f} s reads at {cps:.1f} characters a second")
        if en - st < 1:
            warns.append(f"subtitle at {st:.1f} s shows for under a second")
        if st < last:
            fails.append(f"subtitle at {st:.1f} s overlaps the one before")
        last = en
    if cues and sec(*cues[-1][4:8]) > dur:
        fails.append("the last subtitle runs past the end of the video")
    print(f"  subtitles {len(cues)} cues")

for w in warns:
    print("  warn:", w)
for f in fails:
    print("  FAIL:", f)
print("  ok" if not fails else f"  {len(fails)} failed")
sys.exit(1 if fails else 0)
