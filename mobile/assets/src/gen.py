"""Writes the mark's SVG sources (app icon, splash, Android adaptive layers, favicon): ChainBrain's four tiles, hatch,
vermillion, ink, hatch, drawn like src/ui/BrandMark.tsx. Run by build.sh before rendering the PNGs."""
INK, VER, CANVAS = "#111215", "#F04E23", "#E7E6E2"


def mark(x0, y0, size, mono=False, uid="m"):
    gap = max(2, round(size * 0.08))
    t = (size - gap) / 2
    r = max(1, t * 0.08)
    # big renders get a finer hatch than the in-app mark (which is tiny)
    pitch, sw = (t / 6, t / 16) if size >= 200 else (max(3, t / 4), max(1, t / 12))
    q = pitch / 4
    stroke = "#000" if mono else INK
    defs = (f'<pattern id="{uid}h" patternUnits="userSpaceOnUse" width="{pitch:.2f}" height="{pitch:.2f}">'
            f'<path d="M0,{pitch:.2f} L{pitch:.2f},0 M{-q:.2f},{q:.2f} L{q:.2f},{-q:.2f} M{pitch - q:.2f},{pitch + q:.2f} L{pitch + q:.2f},{pitch - q:.2f}" '
            f'stroke="{stroke}" stroke-width="{sw:.2f}" stroke-linecap="square"/></pattern>')
    tiles = []
    for i, kind in enumerate(["hatch", "ver", "ink", "hatch"]):
        x, y = x0 + (i % 2) * (t + gap), y0 + (i // 2) * (t + gap)
        fill = f"url(#{uid}h)" if kind == "hatch" else ("#000" if mono else (VER if kind == "ver" else INK))
        tiles.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{t:.2f}" height="{t:.2f}" rx="{r:.2f}" fill="{fill}"/>')
    return defs, "\n  ".join(tiles)


def svg(w, h, bg, mk):
    d, tiles = mk
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">\n  <defs>{d}</defs>\n  {bg}\n  {tiles}\n</svg>\n'


files = {
    # app icon: full bleed warm canvas (iOS masks the corners), the mark at about half the size
    "icon.svg": svg(1024, 1024, f'<rect width="1024" height="1024" fill="{CANVAS}"/>', mark(262, 262, 500)),
    # splash mark on a transparent field; the splash background is the canvas colour (app.json)
    "splash.svg": svg(1024, 1024, "", mark(112, 112, 800)),
    # Android adaptive: the mark inside the 66 % safe zone, a canvas background, a monochrome mark
    "android-foreground.svg": svg(512, 512, "", mark(141, 141, 230)),
    "android-background.svg": f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="{CANVAS}"/></svg>\n',
    "android-monochrome.svg": svg(432, 432, "", mark(116, 116, 200, mono=True)),
    # favicon: the mark on a canvas tile
    "favicon.svg": svg(48, 48, f'<rect width="48" height="48" rx="11" fill="{CANVAS}"/>', mark(8, 8, 32)),
}
for name, body in files.items():
    with open(name, "w") as f:
        f.write(body)
