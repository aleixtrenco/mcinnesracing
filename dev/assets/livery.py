"""Build the data behind "Your brand on the bike".

usage: python3 dev/assets/livery.py [--debug]
(run from the project folder; needs Pillow and numpy)

For every photo in alex-mcinnes-site/source-images/livery-*.jpg it writes a
web copy to assets/img/livery/, and for every place a sponsor's logo can go it
writes one small map (assets/img/livery/map-<id>.webp) that the page uses to
put the logo on that surface:

  red    where the decal goes (soft-edged)
  green  the surface's shading, to multiply over the decal
  blue   its highlights, to screen over the decal

A placement with "erase" also gets assets/img/livery/plate-<id>.webp: that part
of the photo with the old graphics cleaned off, for the logo to be printed on.

It then writes the geometry into the livery-data block in index.html. With
--debug it also writes dev/out/livery-<photo>.jpg showing each area and the
box the logo is fitted into.
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from livery_masks import close, component_at, feather, fill_holes, polygon  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "alex-mcinnes-site"
SRC = SITE / "source-images"
OUT = SITE / "assets" / "img" / "livery"
INDEX = SITE / "index.html"
DEBUG = "--debug" in sys.argv

# The photos. Coordinates below are in each photo's own pixels.
PHOTOS = {
    "side": "livery-side.jpg",
    "fairing": "livery-fairing.jpg",
    "rider": "livery-rider.jpg",
    "front": "livery-front.jpg",
    "tank": "livery-front-tank.jpg",
    "rear-tank": "livery-rear-tank.jpg",
    "rear-fender": "livery-rear-fender.jpg",
}

# What a visitor can look at for each level, in order. "crop" is x0, y0, x1, y1
# and must be 3:4 like the stage and the downloaded sheet's tiles.
VIEWS = {
    "fairing": {"photo": "fairing", "label": "Front fairing"},
    "rider": {"photo": "rider", "label": "Jersey"},
    "panel": {"photo": "side", "label": "Side panel", "crop": [560, 720, 980, 1280]},
    "side": {"photo": "side", "label": "Whole bike"},
    "fork": {"photo": "side", "label": "Fork guard", "crop": [860, 830, 1220, 1310]},
    "front": {"photo": "front", "label": "Front fender"},
    "tank": {"photo": "tank", "label": "Front tank"},
    "rear-tank": {"photo": "rear-tank", "label": "Rear tank"},
    "rear-fender": {"photo": "rear-fender", "label": "Rear fender"},
}
TIERS = {
    "platinum": ["fairing", "rider", "panel", "side"],
    "gold": ["fork", "front", "tank", "side"],
    "silver": ["rear-tank", "rear-fender"],
}

# Where logos go.
#   mask    how to find the surface: "yellow" segments a yellow panel inside
#           box; "sticker" finds the inside of a white-bordered sticker whose
#           border passes through seed; a list of points is a polygon
#   fits    one or more [quad, aspect] boxes the logo can be fitted into; the
#           page uses whichever shows the logo largest (a wide box suits wide
#           logos, a squarer one square logos)
#           quad    corners in the logo's own order (top-left, top-right,
#                   bottom-right, bottom-left)
#           aspect  the box's real width / height, before perspective
#   margin  space kept around the logo inside its box, as a share of the
#           box's height (default 0.08)
#   tone    "light" or "dark" decal ("jersey" is the jersey's navy)
#   match   paint the decal in the surface's own measured colour, so a slot
#           on a panel blends in and only the logo shows
#   erase   print the logo on the real panel instead of a painted decal: the
#           old graphics are cleaned off ("whole" stickers go entirely,
#           "strokes" lose only their lettering), each area refilled from its
#           own surface ("light" or "dark") so the edges between them stay sharp
#   soft    edge softness in px (patches that blend into the surface)
#   shade   [base, blur]: the surface's shading, measured only on pixels of
#           its own colour ("yellow", "dark", "light" or "all") so old logos
#           don't show through; null for an even, flat sticker
#   gloss   [median, threshold, strength, cap]: highlights brighter than
#           threshold (a multiple of the surface's brightness, or a luminance
#           over 10; null with match: anything brighter than the matched
#           colour); optional cap: ignore pixels brighter than this
PLACEMENTS = [
    # Platinum: the front fairing and the jersey.
    {
        "id": "side-fairing", "photo": "side", "tier": "platinum", "label": "Front fairing",
        "mask": {"kind": "yellow", "box": [815, 680, 1035, 875], "close": 9},
        "fits": [[[[846, 768], [935, 726], [1003, 830], [905, 847]], 1.25]],
        "tone": "light", "soft": 1, "shade": ["yellow", 5], "gloss": [5, 1.2, 0.9],
    },
    {
        "id": "fairing", "photo": "fairing", "tier": "platinum", "label": "Front fairing",
        "mask": {"kind": "yellow", "box": [660, 300, 1440, 1230], "close": 31},
        "fits": [[[[906, 598], [1361, 850], [1254, 1042], [799, 790]], 2.3],
                 [[[982, 508], [1332, 702], [1138, 1052], [788, 858]], 1.0]],
        "tone": "light", "soft": 1.5, "shade": ["yellow", 14], "gloss": [9, 1.2, 0.95],
    },
    {
        "id": "jersey", "photo": "rider", "tier": "platinum", "label": "Jersey chest",
        "mask": [[662, 864], [840, 864], [846, 998], [656, 998]],
        "fits": [[[[672, 874], [830, 874], [834, 988], [668, 988]], 1.45]],
        "tone": "jersey", "soft": 7, "shade": ["dark", 10], "gloss": [9, 1.6, 0],
    },
    # Platinum also takes the radiator side panels. The logo is printed on the
    # real panel: the old MotoZone sticker and Dawlati logo are cleaned off it
    # (the panel keeps its white trim, crease and shine), and the logo boxes
    # are the largest that fit its side face below the crease, at each shape,
    # leaning -8 degrees like the Dawlati logo did.
    {
        "id": "side-panel", "photo": "side", "tier": "platinum", "label": "Radiator side panel",
        "mask": [[660, 926], [740, 869], [822, 905], [812, 913], [795, 960], [770, 1032], [730, 1033], [702, 955], [668, 935]],
        "erase": {
            "areas": [
                ["light", [[625, 958], [652, 933], [746, 857], [746, 842], [625, 842]]],  # the white tank
                ["dark", [[662, 928], [745, 860], [878, 856], [860, 878], [812, 912], [790, 960], [768, 1032],
                          [730, 1033], [702, 956], [668, 936]]],  # the black shroud
            ],
            "whole": [[[687, 857], [707, 855], [713, 871], [733, 878], [749, 888], [757, 899], [767, 911], [789, 922],
                       [795, 940], [791, 957], [777, 964], [748, 966], [722, 952], [700, 946], [680, 934], [666, 924],
                       [668, 913], [677, 910], [679, 893], [683, 872]]],  # MotoZone, sticker and all
            "strokes": [[[706, 959], [766, 952], [769, 1004], [709, 1006]]],  # Dawlati
        },
        "fits": [[[[689, 913], [796, 898], [799, 932], [696, 946]], 3.2],
                 [[[698, 910], [792, 897], [796, 940], [706, 953]], 2.2],
                 [[[701, 906], [787, 894], [793, 951], [711, 962]], 1.5],
                 [[[702, 901], [778, 891], [787, 967], [714, 977]], 1.0]],
        "margin": 0.05,
        "tone": "dark", "soft": 1, "shade": ["dark", 20], "gloss": [3, None, 0.8],
    },
    # Gold: the fork guards, front fender and front tank.
    {
        # The whole guard face, white edging included; the logo reads down it.
        "id": "side-fork", "photo": "side", "tier": "gold", "label": "Fork guard",
        "mask": [[941, 1096], [967, 1083], [1030, 1221], [1006, 1258], [1001, 1250]],
        "fits": [[[[968, 1086], [1029, 1221], [1003, 1232], [942, 1098]], 5.2]],
        "margin": 0.05,
        "tone": "dark", "soft": 1, "shade": ["dark", 3], "gloss": [9, 2.5, 0.5],
    },
    {
        # A modest sticker centred on the fender's side (the user found it too big
        # when it filled the whole side).
        "id": "side-front-fender", "photo": "side", "tier": "gold", "label": "Front fender",
        "mask": [[938, 872], [1110, 866], [1114, 902], [941, 910]],
        "fits": [[[[966, 880], [1086, 875], [1086, 895], [966, 900]], 6.0]],
        "tone": "light", "match": True, "soft": 2, "shade": ["light", 4], "gloss": [5, None, 0.5],
    },
    {
        "id": "front-fender", "photo": "front", "tier": "gold", "label": "Front fender",
        "mask": [[130, 1300], [290, 1225], [600, 1210], [655, 1470], [575, 1690], [130, 1700], [95, 1520]],
        "fits": [[[[160, 1262], [600, 1245], [565, 1660], [150, 1676]], 1.05]],
        "tone": "dark", "soft": 10, "shade": ["dark", 14], "gloss": [9, 228, 0.85],
    },
    {
        # The sticker on top of the front tank, seen from the seat.
        "id": "front-tank", "photo": "tank", "tier": "gold", "label": "Front tank",
        "mask": {"kind": "sticker", "box": [240, 960, 990, 1330], "seed": [282, 1180]},
        "fits": [[[[325, 1012], [925, 1022], [905, 1285], [290, 1238]], 2.1]],
        "tone": "light", "soft": 1.5, "shade": None, "gloss": [9, 1.15, 0],
    },
    # Silver: the top slot of the logo stacks on the rear tank and the rear
    # fender (EBC's places today). The panels are seen at an angle, so the
    # aspects allow for the squash measured on the EBC logo in each photo.
    # One slot is too small to see in the whole-bike photo, so Silver shows
    # the two close-ups only.
    {
        "id": "rear-tank", "photo": "rear-tank", "tier": "silver", "label": "Rear tank",
        "mask": [[768, 552], [925, 515], [927, 639], [770, 697]],
        "fits": [[[[768, 552], [925, 515], [927, 639], [770, 697]], 2.1]],
        "tone": "light", "match": True, "soft": 3, "shade": ["light", 6], "gloss": [7, None, 0.5],
    },
    {
        "id": "rear-fender", "photo": "rear-fender", "tier": "silver", "label": "Rear fender",
        "mask": [[545, 1070], [935, 1070], [938, 1156], [542, 1156]],
        "fits": [[[[553, 1073], [927, 1073], [930, 1153], [550, 1153]], 2.2]],
        "tone": "light", "match": True, "soft": 2, "shade": ["light", 8], "gloss": [9, None, 0.7],
    },
]


def luminance(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def in_box(rgb, box, find):
    """Run a segmentation on the box only (much faster) and place it in a full-size mask."""
    x0, y0, x1, y1 = box
    full = np.zeros(rgb.shape[:2], bool)
    full[y0:y1, x0:x1] = find(rgb[y0:y1, x0:x1])
    return full


def yellow_mask(rgb, box, close_size):
    def find(reg):
        r, g, b = (reg[..., i].astype(np.int32) for i in range(3))
        yel = (r > 150) & (g > 95) & (b < 110) & (r - b > 90) & (g - b > 40)
        return fill_holes(close(component_at(yel), close_size))
    return in_box(rgb, box, find)


def sticker_mask(rgb, box, seed):
    """Inside of a white-bordered sticker: fill the border ring, then take the ring away."""
    def find(reg):
        mx, mn = reg.max(axis=2).astype(np.int32), reg.min(axis=2).astype(np.int32)
        white = (mn > 150) & (mx - mn < 50)
        ring = close(component_at(white, (seed[0] - box[0], seed[1] - box[1])), 5)
        inside = fill_holes(ring) & ~close(ring, 3)
        # Pull the edge in a little so no sliver of the old sticker shows.
        img = Image.fromarray(inside.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(5))
        return np.asarray(img) > 127
    return in_box(rgb, box, find)


def median(gray, size):
    """Median filter; large sizes run on a smaller copy, which is plenty for smooth maps."""
    img = Image.fromarray(np.clip(gray, 0, 255).astype(np.uint8))
    step = max(1, size // 9)
    if step > 1:
        small = img.resize((max(img.width // step, 1), max(img.height // step, 1)), Image.BOX)
        small = small.filter(ImageFilter.MedianFilter((size // step) | 1))
        return np.asarray(small.resize(img.size, Image.BILINEAR), np.float32)
    return np.asarray(img.filter(ImageFilter.MedianFilter(size | 1)), np.float32)


def surface(region, lum, base):
    """1.0 where a pixel is the surface's own colour, for measuring its shading."""
    r, g, b = (region[..., i].astype(np.float32) for i in range(3))
    sat = region.max(axis=2).astype(np.float32) - region.min(axis=2)
    if base == "yellow":
        own = (r > 120) & (g > 75) & (b < 120) & (r - b > 70)
    elif base == "dark":
        own = lum < 62
    elif base == "light":
        own = (lum > 140) & (sat < 45)
    else:
        own = np.ones(lum.shape, bool)
    return own.astype(np.float32)


def blur(gray, radius):
    """Near-Gaussian blur of a float map: three box blurs along each axis."""
    a = np.asarray(gray, np.float64)
    size = max(1, int(round(radius * 1.15)))  # three passes of this width ~ a Gaussian of `radius`
    for axis in (0, 1):
        for _ in range(3):
            pad = [(0, 0), (0, 0)]
            pad[axis] = (size, size)
            padded = np.pad(a, pad, mode="edge")
            c = np.cumsum(padded, axis=axis)
            c = np.insert(c, 0, 0, axis=axis)
            n = a.shape[axis]
            hi = np.take(c, np.arange(2 * size + 1, 2 * size + 1 + n), axis=axis)
            lo = np.take(c, np.arange(0, n), axis=axis)
            a = (hi - lo) / (2 * size + 1)
    return a.astype(np.float32)


def grow(mask, px):
    """A boolean mask grown by px pixels."""
    if px <= 0:
        return mask
    return np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(2 * px + 1))) > 0


def pushpull(values, weight):
    """Fill pixels of weight 0 from the weighted ones, coarse to fine (a smooth fill)."""
    if min(weight.shape) <= 2 or weight.min() >= 0.999:
        if weight.sum() > 0:
            mean = (values * weight[..., None]).sum((0, 1)) / weight.sum()
            return values * weight[..., None] + mean * (1 - weight[..., None])
        return values
    h, w = weight.shape
    ph, pw = h + h % 2, w + w % 2
    v = np.zeros((ph, pw, values.shape[2]), np.float32)
    v[:h, :w] = values * weight[..., None]
    wt = np.zeros((ph, pw), np.float32)
    wt[:h, :w] = weight
    vs = v.reshape(ph // 2, 2, pw // 2, 2, -1).sum((1, 3))
    ws = wt.reshape(ph // 2, 2, pw // 2, 2).sum((1, 3))
    coarse = pushpull(vs / np.maximum(ws, 1e-6)[..., None], np.minimum(ws, 1.0))
    up = np.stack([np.asarray(Image.fromarray(coarse[..., c], "F").resize((pw, ph), Image.BILINEAR))
                   for c in range(coarse.shape[2])], axis=-1)[:h, :w]
    return values * weight[..., None] + up * (1 - weight[..., None])


def relax(values, known, iterations):
    """Smooth filled pixels toward their neighbours' average; known pixels stay put."""
    v = values.copy()
    for _ in range(iterations):
        q = np.pad(v, ((1, 1), (1, 1), (0, 0)), mode="edge")
        v = np.where(known[..., None], values, (q[:-2, 1:-1] + q[2:, 1:-1] + q[1:-1, :-2] + q[1:-1, 2:]) / 4)
    return v


def clean(rgb, spec, seed=7):
    """The photo with old graphics taken off a panel, and where it changed.

    Each area is a surface ("light" or "dark") refilled only from its own
    clean pixels, so the edge between two surfaces stays sharp. Stickers in
    "whole" go entirely (their dark backing too); logos in "strokes" lose only
    their lettering, keeping the panel's texture between the strokes.
    """
    h, w = rgb.shape[:2]
    img = rgb.astype(np.float32)
    lum = luminance(img)
    sat = img.max(axis=2) - img.min(axis=2)
    own = {"dark": (lum < 80) & (sat < 30), "light": (lum > 170) & (sat < 40)}
    covers = [(kind, polygon((w, h), pts)) for kind, pts in spec["areas"]]
    first = covers[0][1] > 0.5
    foreign = np.zeros((h, w), bool)
    for k, (kind, cov) in enumerate(covers):
        inside = (cov > 0.5) if k == 0 else (cov > 0.01) & ~first
        foreign |= inside & ~own[kind]
    hole = np.zeros((h, w), bool)
    edge = (covers[0][1] > 0.02) & (covers[0][1] < 0.98)  # where the first area's outline crosses a pixel
    for key, closing in (("whole", 5), ("strokes", 0)):
        for pts in spec.get(key, []):
            roi = grow(polygon((w, h), pts) > 0.01, 2)
            part = roi & foreign
            if closing:
                part = close(part, closing)
            # Under a sticker the edge between two surfaces is redrawn too, smoothly.
            hole |= (grow(part, 1) | (edge & grow(part, 2))) & roi
    ys, xs = np.nonzero(grow(hole, 12))
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sub, sl = img[y0:y1, x0:x1], (slice(y0, y1), slice(x0, x1))
    rng = np.random.default_rng(seed)
    filled = np.zeros_like(sub)
    total = np.zeros(sub.shape[:2], np.float32)
    taken = np.zeros(sub.shape[:2], np.float32)
    for k, (kind, cov) in enumerate(covers):
        # Each area takes its share of a pixel, the first by its outline's
        # coverage and the last whatever is left, so shared edges blend
        # smoothly and no pixel falls between two outlines.
        if k == len(covers) - 1:
            share = 1 - taken
        else:
            share = (cov[sl] if k == 0 else (cov[sl] > 0.01)) * (1 - taken)
        taken = np.minimum(taken + share, 1)
        known = ((cov[sl] > 0.5) & own[kind][sl] & ~hole[sl])
        # Dark panels lean on their darkest pixels: reflections would grey the fill.
        weight = known * (np.exp(-lum[sl] / 15) if kind == "dark" else 1.0)
        part = relax(pushpull(sub, weight.astype(np.float32)), known, 60)
        noise = rng.normal(0, 1, part.shape[:2]).astype(np.float32)
        q = np.pad(noise, 1, mode="edge")
        noise = (4 * q[1:-1, 1:-1] + q[:-2, 1:-1] + q[2:, 1:-1] + q[1:-1, :-2] + q[1:-1, 2:]) / 8
        noise *= (1.5 if kind == "dark" else 3.0) / max(float(noise.std()), 1e-6)
        filled += (part + noise[..., None]) * share[..., None]
        total += share
    filled /= np.maximum(total, 1e-6)[..., None]
    soft = np.maximum(feather(hole[sl].astype(np.float32), 1.2), hole[sl])
    out = sub * (1 - soft[..., None]) + filled * soft[..., None]
    # Dark panels are colourless: keep a quarter of the colour in the cleaned
    # part, which takes out red the old letters bled into the pixels around.
    light = np.zeros(sub.shape[:2], bool)
    for kind, cov in covers:
        if kind == "light":
            light |= cov[sl] > 0.5
    zone = feather(((soft > 0.01) & ~light).astype(np.float32), 2)
    grey = luminance(out)[..., None]
    out = out * (1 - zone[..., None]) + (grey + (out - grey) * 0.25) * zone[..., None]
    cleaned = img.copy()
    cleaned[sl] = np.clip(out, 0, 255)
    changed = np.zeros((h, w), bool)
    changed[sl] = soft > 0.01
    return cleaned, changed


def build(p, rgb):
    h, w = rgb.shape[:2]
    m = p["mask"]
    if isinstance(m, dict) and m["kind"] == "yellow":
        mask = yellow_mask(rgb, m["box"], m["close"]).astype(np.float32)
    elif isinstance(m, dict) and m["kind"] == "sticker":
        mask = sticker_mask(rgb, m["box"], m["seed"]).astype(np.float32)
    else:
        mask = polygon((w, h), m)
    plate = None
    if "erase" in p:
        # The logo is printed onto the panel itself: take the old graphics off,
        # and let the decal cover everything that changed.
        cleaned, changed = clean(rgb, p["erase"])
        mask = np.maximum(mask, grow(changed, 3).astype(np.float32))
        rgb = cleaned.round().astype(np.uint8)
        plate = rgb
    mask = feather(mask, p["soft"])
    ys, xs = np.nonzero(mask > 0.01)
    pad = 2
    x0, y0 = max(int(xs.min()) - pad, 0), max(int(ys.min()) - pad, 0)
    x1, y1 = min(int(xs.max()) + pad + 1, w), min(int(ys.max()) + pad + 1, h)

    # Work on a margin around the area so the filters have context at the edges.
    mg = 40
    cx0, cy0, cx1, cy1 = max(x0 - mg, 0), max(y0 - mg, 0), min(x1 + mg, w), min(y1 + mg, h)
    lum = luminance(rgb[cy0:cy1, cx0:cx1].astype(np.float32))
    inner = mask[cy0:cy1, cx0:cx1] > 0.5

    region = rgb[cy0:cy1, cx0:cx1]
    fill = None
    if p["shade"]:
        base, radius = p["shade"]
        own = surface(region, lum, base)
        # Average only the surface's own pixels, so letters of the old logo
        # don't print into the shading.
        weight = blur(own * 255.0, radius) / 255.0
        known = weight > 0.02

        def smoothed(values):
            out = blur(values * own, radius) / np.maximum(weight, 1e-3)
            fallback = float(np.mean(values[own > 0])) if own.any() else float(values.mean())
            return np.where(known, out, fallback)

        smooth = smoothed(lum)
        if p.get("match"):
            # Paint the decal in a bright reading of the surface's own colour
            # (the mean of its 85th to 95th percentile pixels) and shade it
            # down from there, so the patch takes the panel's tint and light.
            colour = np.stack([smoothed(region[..., i].astype(np.float32)) for i in range(3)], axis=-1)
            lit = smooth[inner]
            lo, hi = np.percentile(lit, [85, 95])
            pick = (lit >= lo) & (lit <= hi)
            rgb_fill = colour[inner][pick].mean(axis=0)
            ref = float(luminance(rgb_fill)) or 1.0
            fill = "#" + "".join(f"{int(round(v)):02x}" for v in np.clip(rgb_fill, 0, 255))
        else:
            ref = float(np.percentile(smooth[inner], 75)) or 1.0
        shade = np.clip(smooth / ref, 0, 1)
        if plate is not None:
            # A black panel's brightness is mostly reflection, not light, so
            # the logo printed on it is only shaded gently.
            shade = 0.85 + 0.15 * shade
    else:
        ref = float(np.percentile(lum[inner], 75)) or 1.0
        smooth = lum
        shade = np.full(lum.shape, 0.97, np.float32)

    gsize, gthresh, gstrength, *cap = p["gloss"]
    # With a cap, anything brighter (a white logo, a bolt head) is left out of
    # the highlights so it can't print through as a smudge.
    glum = median(np.where(lum > cap[0], smooth, lum) if cap else lum, gsize)
    if plate is not None:
        t = float(np.percentile(lum[inner], 40))  # the panel's own reflections, above its base black
    elif gthresh is None:
        t = ref
    else:
        t = gthresh if gthresh > 10 else min(ref * gthresh, 235.0)
    gloss = np.clip((glum - t) / max(255.0 - t, 1.0), 0, 1) * gstrength

    sl = (slice(y0 - cy0, y1 - cy0), slice(x0 - cx0, x1 - cx0))
    packed = np.stack([
        mask[y0:y1, x0:x1] * 255,
        shade[sl] * 255,
        gloss[sl] * 255,
    ], axis=-1)
    Image.fromarray(np.clip(packed, 0, 255).round().astype(np.uint8), "RGB").save(
        OUT / f"map-{p['id']}.webp", lossless=True, method=6)
    data = {
        "id": p["id"], "photo": p["photo"], "tier": p["tier"], "label": p["label"],
        "box": [x0, y0, x1 - x0, y1 - y0],
        "fits": [
            {"quad": [[round(x - x0, 1), round(y - y0, 1)] for x, y in quad], "aspect": aspect}
            for quad, aspect in p["fits"]
        ],
        "tone": p["tone"],
        "map": f"assets/img/livery/map-{p['id']}.webp",
    }
    if plate is not None:
        Image.fromarray(plate[y0:y1, x0:x1]).save(OUT / f"plate-{p['id']}.webp", quality=90, method=6)
        data["plate"] = f"assets/img/livery/plate-{p['id']}.webp"
    if "margin" in p:
        data["margin"] = p["margin"]
    if fill:
        data["fill"] = fill
    return data, mask


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    photos, placements, masks = {}, [], {}
    for pid, name in PHOTOS.items():
        im = Image.open(SRC / name).convert("RGB")
        im.save(OUT / f"photo-{pid}.webp", quality=80, method=6)
        photos[pid] = {"src": f"assets/img/livery/photo-{pid}.webp", "size": list(im.size)}
        rgb = np.asarray(im)
        for p in (p for p in PLACEMENTS if p["photo"] == pid):
            data, mask = build(p, rgb)
            placements.append(data)
            masks.setdefault(pid, []).append((p, mask))
            print(f"{p['id']}: box {data['box']}" + (f", colour {data['fill']}" if "fill" in data else ""))
        if DEBUG and pid in masks:
            dbg = rgb.astype(np.float32).copy()
            for p, mask in masks[pid]:
                tint = np.array([255, 0, 255] if p["tone"] == "light" else [0, 255, 255], np.float32)
                dbg = dbg * (1 - mask[..., None] * 0.55) + tint * mask[..., None] * 0.55
            out = Image.fromarray(dbg.clip(0, 255).astype(np.uint8))
            d = ImageDraw.Draw(out)
            for p, _ in masks[pid]:
                for quad, _aspect in p["fits"]:
                    q = [tuple(pt) for pt in quad]
                    d.line(q + [q[0]], fill=(255, 255, 0), width=3)
                    d.ellipse([q[0][0] - 6, q[0][1] - 6, q[0][0] + 6, q[0][1] + 6], fill=(255, 0, 0))
            dbgdir = ROOT / "dev" / "out"
            dbgdir.mkdir(parents=True, exist_ok=True)
            out.save(dbgdir / f"livery-{pid}.jpg", quality=85)

    # Clear out maps and photos left from placements or photos since renamed.
    keep = ({f"photo-{pid}.webp" for pid in PHOTOS} | {f"map-{p['id']}.webp" for p in PLACEMENTS}
            | {f"plate-{p['id']}.webp" for p in PLACEMENTS if "erase" in p})
    for old in OUT.glob("*.webp"):
        if old.name not in keep:
            old.unlink()
            print("removed", old.name)

    data = {"photos": photos, "views": VIEWS, "tiers": TIERS, "placements": placements}
    block = ('<script type="application/json" id="livery-data">'
             + json.dumps(data, separators=(",", ":")) + "</script>")
    html = INDEX.read_text(encoding="utf-8")
    html, n = re.subn(r'<script type="application/json" id="livery-data">.*?</script>',
                      lambda _: block, html, flags=re.S)
    if n:
        INDEX.write_text(html, encoding="utf-8")
        print("updated livery-data in index.html")
    else:
        print("index.html has no livery-data block yet; data not written")


if __name__ == "__main__":
    main()
