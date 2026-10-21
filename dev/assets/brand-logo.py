"""Alex's MC INNES RACING logo as a one-colour SVG, traced from the file he sent.

usage: python3 dev/assets/brand-logo.py source/brand/mcinnes-racing-logo.png alex-mcinnes-site/assets/img/mcinnes-racing.svg

The original is white on charcoal. The SVG fills with currentColor, so the
page sets its colour (ink in the top bar).
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
import potrace

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("L")
# Upscale and soften before tracing, so edges come out smooth but corners stay sharp.
k = 6
up = im.resize((im.width * k, im.height * k), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
bw = np.asarray(up) > 128
bmp = potrace.Bitmap(~bw)  # this library traces the False pixels
plist = bmp.trace(turdsize=60, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=0.6, opticurve=True, opttolerance=0.2)
parts = []
for curve in plist:
    sp = curve.start_point
    d = [f"M{sp.x / k:.1f} {sp.y / k:.1f}"]
    for seg in curve.segments:
        if seg.is_corner:
            d.append(f"L{seg.c.x / k:.1f} {seg.c.y / k:.1f}L{seg.end_point.x / k:.1f} {seg.end_point.y / k:.1f}")
        else:
            d.append(f"C{seg.c1.x / k:.1f} {seg.c1.y / k:.1f} {seg.c2.x / k:.1f} {seg.c2.y / k:.1f} {seg.end_point.x / k:.1f} {seg.end_point.y / k:.1f}")
    d.append("Z")
    parts.append("".join(d))
ys, xs = np.nonzero(np.asarray(im) > 128)
pad = 2
x0, y0, x1, y1 = xs.min() - pad, ys.min() - pad, xs.max() + 1 + pad, ys.max() + 1 + pad
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1 - x0} {y1 - y0}" fill="currentColor" fill-rule="evenodd">'
       f'<path d="{"".join(parts)}"/></svg>\n')
open(out, "w").write(svg)
print(out, len(svg) // 1024, "KB", "viewBox", x0, y0, x1 - x0, y1 - y0, "aspect", round((x1 - x0) / (y1 - y0), 3), "paths", len(plist))
