#!/usr/bin/env python3
"""Build the site's responsive images from the originals in source-images/.

Usage (from the site folder):
    pip install Pillow          # once; needs Pillow 11.2+ for AVIF
    python3 tools/make-images.py

Drop a new original into source-images/ with the same name (hero.jpg,
helmet.jpg, dust.jpg, portrait.jpg, contact.jpg, camel.jpg, dune-run.jpg,
rocks.jpg, reel-poster.jpg) and run the script again. It writes AVIF, WebP
and JPEG files at several widths into assets/img/, regenerates the social
share image, and refreshes the blurred placeholders inlined in index.html.

If a new photo frames the rider differently, adjust its "focal" point below:
(0, 0) is the top-left corner, (1, 1) the bottom-right. Mobile crops are cut
around that point.
"""

import base64
import io
import re
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source-images"
OUT = ROOT / "assets" / "img"
INDEX = ROOT / "index.html"

# Widths must match the srcset lists in index.html. Files are always written
# under these names; a source smaller than a width is saved at its own size
# rather than upscaled, so the HTML never needs editing.
IMAGES = {
    # The six photos of the hero slideshow, in their own sets: wide for laptops
    # and tablets, and a square crop for phones cut around "square" (the
    # horizontal focal point; the square takes the photo's full height).
    # Slide 1, Alex small in a sea of dunes (also the share image).
    "hero": {"focal": (0.415, 0.62), "wide": [960, 1440, 1920, 2560], "square": 0.41},
    # Helmet and goggles close up, plate number side on: hero slide.
    "helmet": {"focal": (0.55, 0.35), "wide": [960, 1440, 1920], "square": 0.55},
    # At speed in the dust, plate 21: hero slide (the first hero, from the deck).
    "dust": {"focal": (0.61, 0.6), "wide": [960, 1440, 1920, 2560], "square": 0.61},
    # Helmet portrait for the "Why 2026" section.
    "portrait": {"focal": (0.5, 0.35), "wide": [480, 720, 1040]},
    # Alex on the bike in the dunes, a portrait photo: contact section.
    "contact": {"focal": (0.47, 0.45), "wide": [960, 1440, 1920, 2560], "tall": [640, 960, 1280]},
    # Riding past a camel, plate 21: a hero slide.
    "camel": {"focal": (0.5, 0.55), "wide": [640, 960, 1280, 1920], "square": 0.44},
    # The opening shot of the film, shown until it plays: reach section.
    "reel-poster": {"focal": (0.5, 0.5), "wide": [720]},
    # Racing down a dune towards the camera, partner logos on show: a hero slide.
    "dune-run": {"focal": (0.52, 0.58), "wide": [960, 1440, 1920], "square": 0.53},
    # Sand and rock from above: the night-graded backdrop for the Dakar
    # countdown and a hero slide.
    "rocks": {"focal": (0.36, 0.72), "wide": [960, 1440, 1920], "tall": [640, 960, 1280], "square": 0.45},
}
SQUARE = [480, 720, 960]
TALL_RATIO = 4 / 5
QUALITY = {"avif": 52, "webp": 78, "jpg": 80}


def crop_to_ratio(im, ratio, focal):
    """Largest crop of `im` with width/height == ratio, centred on focal."""
    w, h = im.size
    if w / h > ratio:
        cw, ch = round(h * ratio), h
    else:
        cw, ch = w, round(w / ratio)
    fx, fy = focal
    left = min(max(round(fx * w - cw / 2), 0), w - cw)
    top = min(max(round(fy * h - ch / 2), 0), h - ch)
    return im.crop((left, top, left + cw, top + ch))


def save_set(im, name, widths):
    written = []
    for target in widths:
        width = min(target, im.width)
        size = (width, round(im.height * width / im.width))
        frame = im.resize(size, Image.LANCZOS) if size != im.size else im
        frame.save(OUT / f"{name}-{target}.avif", quality=QUALITY["avif"])
        frame.save(OUT / f"{name}-{target}.webp", quality=QUALITY["webp"], method=6)
        frame.save(OUT / f"{name}-{target}.jpg", quality=QUALITY["jpg"], optimize=True, progressive=True)
        written.append(size)
    return written


def placeholder(im):
    """Tiny blurred WebP as a data URI, shown while the real photo loads."""
    tiny = im.copy()
    tiny.thumbnail((32, 32))
    buf = io.BytesIO()
    tiny.save(buf, "WEBP", quality=40)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    lqip = {}
    for name, cfg in IMAGES.items():
        path = next((p for p in SRC.glob(f"{name}.*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}), None)
        if not path:
            print(f"skip {name}: no source-images/{name}.jpg")
            continue
        im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
        print(name, "wide", save_set(im, name, cfg["wide"]))
        lqip[name] = placeholder(im)
        if "tall" in cfg:
            tall = crop_to_ratio(im, TALL_RATIO, cfg["focal"])
            print(name, "tall", save_set(tall, f"{name}-tall", cfg["tall"]))
            lqip[f"{name}-tall"] = placeholder(tall)
        if "square" in cfg:
            square = crop_to_ratio(im, 1.0, (cfg["square"], 0.5))
            print(name, "square", save_set(square, f"{name}-sq", SQUARE))
            lqip[f"{name}-sq"] = placeholder(square)
        if name == "hero":
            og = crop_to_ratio(im, 1200 / 630, cfg["focal"]).resize((1200, 630), Image.LANCZOS)
            og.save(ROOT / "og-image.jpg", quality=82, optimize=True, progressive=True)

    if lqip and INDEX.exists():
        rules = "\n".join(f"      --lqip-{k}: url({v});" for k, v in lqip.items())
        block = f"<style id=\"lqip\">\n    :root {{\n{rules}\n    }}\n  </style>"
        html = INDEX.read_text(encoding="utf-8")
        html, n = re.subn(r"<style id=\"lqip\">.*?</style>", block, html, flags=re.S)
        if n:
            INDEX.write_text(html, encoding="utf-8")
            print("updated placeholders in index.html")


if __name__ == "__main__":
    main()
