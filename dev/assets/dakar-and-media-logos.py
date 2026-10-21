"""Dakar logo (traced to SVG from the deck) and broadcaster logos (white, transparent).

usage: python3 dev/assets/dakar-and-media-logos.py <workdir> <site>
<workdir> must hold the deck images: pdfimages -j source/2026_Pitch_Deck.pdf <workdir>/deck/imgs/img
Writes the stand-in Dakar logo and the broadcaster logos straight into the site.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
import potrace

S, SITE = sys.argv[1], sys.argv[2]
s = 1600 / 1117

# ---- Dakar: redness mask -> upscale -> smooth -> threshold -> trace
cal = Image.open(f"{S}/deck/imgs/img-006.jpg").convert("RGB")
box = tuple(round(v * s) for v in (128, 785, 232, 890))
crop = np.asarray(cal.crop(box), np.float32)
R, G = crop[..., 0], crop[..., 1]
score = np.clip((R - 192) / 40, 0, 1) * np.clip((R - G - 60) / 40, 0, 1)
mask = Image.fromarray((score * 255).astype(np.uint8))
up = mask.resize((mask.width * 6, mask.height * 6), Image.LANCZOS).filter(ImageFilter.GaussianBlur(2.0))
bw = np.asarray(up) > 128
bmp = potrace.Bitmap(~bw)
plist = bmp.trace(turdsize=40, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.3)
h, w = bw.shape
parts = []
for curve in plist:
    sp = curve.start_point
    d = [f"M{sp.x:.1f} {sp.y:.1f}"]
    for seg in curve.segments:
        if seg.is_corner:
            d.append(f"L{seg.c.x:.1f} {seg.c.y:.1f}L{seg.end_point.x:.1f} {seg.end_point.y:.1f}")
        else:
            d.append(f"C{seg.c1.x:.1f} {seg.c1.y:.1f} {seg.c2.x:.1f} {seg.c2.y:.1f} {seg.end_point.x:.1f} {seg.end_point.y:.1f}")
    d.append("Z")
    parts.append("".join(d))
ys, xs = np.nonzero(bw)
x0, y0, x1, y1 = xs.min() - 4, ys.min() - 4, xs.max() + 4, ys.max() + 4
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1 - x0} {y1 - y0}" fill="currentColor" fill-rule="evenodd">'
       f'<path d="{"".join(parts)}"/></svg>')
open(f"{SITE}/assets/img/dakar-logo.svg", "w").write(svg)
print("dakar svg", len(svg) // 1024, "KB", "viewBox", x0, y0, x1 - x0, y1 - y0, "paths", len(plist))

# ---- Broadcasters: white marks on dark -> white with alpha
med = Image.open(f"{S}/deck/imgs/img-005.jpg").convert("RGB")
for name, b in {"eurosport": (1140, 425, 1435, 480), "saudia": (1520, 415, 1790, 490), "rally-raid-network": (1145, 485, 1365, 578)}.items():
    bb = tuple(round(v * s) for v in b)
    a = np.asarray(med.crop(bb), np.float32).mean(axis=2)
    alpha = np.clip((a - 95) / 110, 0, 1)
    out = np.zeros(a.shape + (4,), np.uint8)
    out[..., :3] = (246, 243, 238)
    out[..., 3] = (alpha * 255).astype(np.uint8)
    im = Image.fromarray(out, "RGBA")
    im = im.crop(im.getbbox())
    im.save(f"{SITE}/assets/img/media/{name}.webp", quality=90, method=6)
    print(name, im.size)
