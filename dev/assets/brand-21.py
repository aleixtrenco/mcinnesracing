"""The number 21 in the style of Alex's MC INNES RACING logo, as a one-colour SVG.

usage: python3 dev/assets/brand-21.py source/brand/mcinnes-racing-logo.png alex-mcinnes-site/assets/img/number-21.svg

The logo's lettering isn't a font we have, so the digits are built from the
logo's own letters: the 2 is the logo's S mirrored left to right, and the 1 is
the I's stem with a diagonal flag, separated by a stencil slit at the angle of
the N's diagonal, the way the N separates its strokes. Both are traced like the
logo (see brand-logo.py), so edges and corners match. The SVG fills with
currentColor and its viewBox spans exactly the letters' cap height.
"""
import math
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import potrace

src, out = sys.argv[1], sys.argv[2]
logo = Image.open(src).convert("L")
ink = (np.asarray(logo).astype(np.float32) - 26) / (255 - 26)  # charcoal background -> 0, white -> 1
ink = ink.clip(0, 1)

TOP, BOT = 69, 141              # the cap height of MC INNES, in the logo's pixels
CAP = BOT - TOP + 1
S_COLS = (515, 589)             # the S
STEM = 20                       # stroke width of the I
SLIT = 5                        # stencil slit, measured across like the N's
ANGLE = 53                      # the N's diagonal, in degrees from horizontal
FLAG_W, FLAG_H = 24, 34         # the 1's flag: width along the cap line, height
LETTER_GAP = 11                 # the logo's space between letters

two = ink[TOP:BOT + 1, S_COLS[0]:S_COLS[1]][:, ::-1]

# The 1, drawn at 8x and scaled down so its edges are anti-aliased like the scan.
k = 8
run = 1 / math.tan(math.radians(ANGLE))
x_flag = run * FLAG_H                      # leaves room for the flag's lower-left corner
x_stem = x_flag + FLAG_W - 16
width = int(math.ceil(x_stem + STEM)) + 1
img = Image.new("L", (width * k, CAP * k), 0)
d = ImageDraw.Draw(img)
P = lambda pts: [(x * k, y * k) for x, y in pts]
d.polygon(P([(x_flag, 0), (x_flag + FLAG_W, 0), (x_flag + FLAG_W - run * FLAG_H, FLAG_H), (x_flag - run * FLAG_H, FLAG_H)]), fill=255)
cut = x_flag + FLAG_W + SLIT               # the stem's top is cut along x = cut - run * y
y_left = (cut - x_stem) / run
y_right = max(0.0, (cut - x_stem - STEM) / run)
d.polygon(P([(x_stem, y_left), (x_stem + STEM, y_right), (x_stem + STEM, CAP), (x_stem, CAP)]), fill=255)
one = np.asarray(img.resize((width, CAP), Image.LANCZOS), np.float32) / 255.0
cols = np.nonzero(one.max(0) > 0.05)[0]
one = one[:, cols.min():cols.max() + 1]

pad = 3
canvas = np.zeros((CAP + 2 * pad, two.shape[1] + LETTER_GAP + one.shape[1] + 2 * pad), np.float32)
canvas[pad:pad + CAP, pad:pad + two.shape[1]] = two
x1 = pad + two.shape[1] + LETTER_GAP
canvas[pad:pad + CAP, x1:x1 + one.shape[1]] = np.maximum(canvas[pad:pad + CAP, x1:x1 + one.shape[1]], one)

# Trace as the logo was: upscale, soften, threshold.
up_k = 6
bitmap = Image.fromarray((canvas * 255).astype(np.uint8))
up = bitmap.resize((bitmap.width * up_k, bitmap.height * up_k), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
bw = np.asarray(up) > 128
plist = potrace.Bitmap(~bw).trace(turdsize=60, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                                   alphamax=0.6, opticurve=True, opttolerance=0.2)
parts = []
for curve in plist:
    sp = curve.start_point
    path = [f"M{sp.x / up_k:.1f} {sp.y / up_k:.1f}"]
    for seg in curve.segments:
        if seg.is_corner:
            path.append(f"L{seg.c.x / up_k:.1f} {seg.c.y / up_k:.1f}L{seg.end_point.x / up_k:.1f} {seg.end_point.y / up_k:.1f}")
        else:
            path.append(f"C{seg.c1.x / up_k:.1f} {seg.c1.y / up_k:.1f} {seg.c2.x / up_k:.1f} {seg.c2.y / up_k:.1f} "
                        f"{seg.end_point.x / up_k:.1f} {seg.end_point.y / up_k:.1f}")
    path.append("Z")
    parts.append("".join(path))
w = canvas.shape[1] - 2 * pad
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{pad} {pad} {w} {CAP}" fill="currentColor" fill-rule="evenodd">'
       f'<path d="{"".join(parts)}"/></svg>\n')
open(out, "w").write(svg)
print(out, len(svg), "bytes", "viewBox", pad, pad, w, CAP, "aspect", round(w / CAP, 3), "paths", len(plist))
