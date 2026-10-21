"""Turn the official partner logos into plate-white marks on transparency.

usage: python3 dev/assets/partner-logos.py source/partner-logos source/partner-logos/dragon-energy.pdf dev/out/logos
The site uses ims-full as ims.webp. Copy the results into alex-mcinnes-site/assets/img/partners/.
Source files: dawlati.jpg, ebc.png, ims.png, motozone.png, rk.png, 100percent.png, dewalt.png, apina.png.
Each logo gets its own rule for which parts are "ink", so the white version
keeps the letterforms readable on the dark partner wall.
"""
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

src, pdf, out = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
WHITE = (246, 243, 238)
HEIGHT = 320  # output height in px: crisp at ~100 CSS px on 3x screens


def rgba(path):
    im = Image.open(path)
    im = im.convert("RGBA")
    a = np.asarray(im, np.float32)
    return a[..., :3], a[..., 3] / 255.0


def finish(alpha, name, pad=6):
    """Write a white mark with the given alpha (0..1), trimmed and scaled."""
    alpha = np.clip(alpha, 0, 1)
    ys, xs = np.nonzero(alpha > 0.04)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    alpha = alpha[y0:y1, x0:x1]
    h, w = alpha.shape
    img = np.zeros((h, w, 4), np.uint8)
    img[..., :3] = WHITE
    img[..., 3] = (alpha * 255).round().astype(np.uint8)
    im = Image.fromarray(img, "RGBA")
    scale = HEIGHT / h
    if scale < 1:
        im = im.resize((round(w * scale), HEIGHT), Image.LANCZOS)
    canvas = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), WHITE + (0,))
    canvas.paste(im, (pad, pad))
    canvas.save(out / f"{name}.webp", lossless=True, method=6)
    print(f"{name}: {canvas.size[0]}x{canvas.size[1]}  {(out / f'{name}.webp').stat().st_size // 1024} KB")


def smooth(lo, hi, v):
    return np.clip((v - lo) / (hi - lo), 0, 1)


def drop_specks(alpha, min_area):
    """Remove stray dots: ink islands smaller than min_area pixels."""
    ink = alpha > 0.3
    seen = np.zeros_like(ink)
    h, w = ink.shape
    keep = np.zeros_like(ink)
    for y0, x0 in zip(*np.nonzero(ink)):
        if seen[y0, x0]:
            continue
        stack, part = [(y0, x0)], []
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop()
            part.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and ink[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(part) >= min_area:
            ys, xs = zip(*part)
            keep[ys, xs] = True
    # Keep the soft edge around every island that stays.
    grown = keep.copy()
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
        grown |= np.roll(np.roll(keep, dy, axis=0), dx, axis=1)
    return alpha * grown


# Dawlati: dark grey mark on black.
rgb, a = rgba(src / "dawlati.jpg")
finish(smooth(10, 26, rgb.mean(axis=2)), "dawlati")

# EBC Brakes: blue and red on white. Ink = anything that isn't white.
rgb, a = rgba(src / "ebc.png")
finish(smooth(30, 170, 255 - rgb.min(axis=2)) * a, "ebc")

# RK Takasago Chain: red and navy on white/transparent.
rgb, a = rgba(src / "rk.png")
finish(smooth(30, 170, 255 - rgb.min(axis=2)) * a, "rk")

# MotoZone: red letters with a black 3D outline on transparency.
# The red letters become white; the black extrusion drops out into the dark wall.
rgb, a = rgba(src / "motozone.png")
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
redness = smooth(40, 120, r - (g + b) / 2)
light = smooth(150, 220, rgb.min(axis=2))
finish(np.maximum(redness, light) * a, "motozone")

# IMS: red letters, white outline, black diamond on white.
rgb, a = rgba(src / "ims.png")
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
red = smooth(40, 120, r - (g + b) / 2)
dark = smooth(60, 20, rgb.max(axis=2))          # black diamond and outlines
# Variant A: letters only.
finish(red * a, "ims-letters")
# Variant B: full mark, white outline knocked out.
finish(np.maximum(red, dark) * a, "ims-full")

# 100%: a white badge on a black square, inside a white margin. Only the
# white inside the square is ink.
rgb, a = rgba(src / "100percent.png")
grey = rgb.mean(axis=2)
dark = grey < 60
rows = np.nonzero(dark.mean(axis=1) > 0.5)[0]
cols = np.nonzero(dark.mean(axis=0) > 0.5)[0]
inside = np.zeros(grey.shape, bool)
inside[rows.min() + 4:rows.max() - 3, cols.min() + 4:cols.max() - 3] = True
finish(smooth(60, 200, grey) * inside, "100percent")

# DeWalt: yellow on near-black. Ink = how yellow a pixel is.
rgb, a = rgba(src / "dewalt.png")
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
finish(smooth(30, 170, (r + g) / 2 - b), "dewalt")

# Apina Designs: white artwork on black, with a small red crossbar on the
# first A. Ink = light or red, without the stray dots in the source file.
rgb, a = rgba(src / "apina.png")
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
light = smooth(50, 200, rgb.mean(axis=2))
red = smooth(40, 120, r - (g + b) / 2)
finish(drop_specks(np.maximum(light, red), 12), "apina")

# Dragon Energy: vector. Drop the black backing card, make every shape white,
# and crop the viewBox to the artwork.
svg_path = out / "dragon-src.svg"
subprocess.run(["pdftocairo", "-svg", pdf, str(svg_path)], check=True)
svg = svg_path.read_text()
paths = re.findall(r"<path [^>]*/>", svg)
background = [p for p in paths if 'fill="rgb(6.27' in p]
for p in background:
    svg = svg.replace(p, "")
svg = re.sub(r'fill="rgb\([^"]*\)"', 'fill="#F6F3EE"', svg)
# Find the artwork bounds from a transparent render of the PDF at 2 px/pt.
subprocess.run(["pdftocairo", "-png", "-r", "144", "-transp", "-singlefile", pdf, str(out / "dragon-render")], check=True)
ren = np.asarray(Image.open(out / "dragon-render.png").convert("RGB"), np.float32)
ink = (ren.max(axis=2) > 60)  # red and white artwork, not the near-black card
ys, xs = np.nonzero(ink)
s = 72 / 144
x0, y0, x1, y1 = xs.min() * s - 2, ys.min() * s - 2, xs.max() * s + 2, ys.max() * s + 2
svg = re.sub(r'width="[^"]*" height="[^"]*" viewBox="[^"]*"',
             f'width="{x1 - x0:.1f}" height="{y1 - y0:.1f}" viewBox="{x0:.2f} {y0:.2f} {x1 - x0:.2f} {y1 - y0:.2f}"', svg, count=1)
svg = re.sub(r"<\?xml[^>]*>\s*", "", svg)
(out / "dragon-energy.svg").write_text(svg)
print(f"dragon-energy.svg: {x1 - x0:.0f}x{y1 - y0:.0f} pt  {len(svg) // 1024} KB")
