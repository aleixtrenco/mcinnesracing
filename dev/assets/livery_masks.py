"""Mask helpers for the livery tool: segmentation, hole filling, components."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def to_img(mask):
    # .copy(): images made from arrays share the buffer and floodfill would edit a throwaway copy
    return Image.fromarray(mask.astype(np.uint8) * 255).copy()


def fill_holes(mask):
    inv = to_img(~mask)
    w, h = inv.size
    padded = Image.new("L", (w + 2, h + 2), 255)
    padded.paste(inv, (1, 1))
    ImageDraw.floodfill(padded, (0, 0), 128)
    outside = np.asarray(padded)[1:-1, 1:-1] == 128
    return ~outside


def component_at(mask, seed=None):
    ys, xs = np.nonzero(mask)
    if seed is None:
        cy, cx = int(np.median(ys)), int(np.median(xs))
    else:
        cx, cy = seed
    if not mask[cy, cx]:
        k = np.argmin((ys - cy) ** 2 + (xs - cx) ** 2)
        cy, cx = int(ys[k]), int(xs[k])
    m = to_img(mask)
    ImageDraw.floodfill(m, (cx, cy), 128)
    return np.asarray(m) == 128


def close(mask, size):
    m = to_img(mask).filter(ImageFilter.MaxFilter(size)).filter(ImageFilter.MinFilter(size))
    return np.asarray(m) > 127


def open_(mask, size):
    m = to_img(mask).filter(ImageFilter.MinFilter(size)).filter(ImageFilter.MaxFilter(size))
    return np.asarray(m) > 127


def polygon(size, pts, supersample=4):
    """Anti-aliased polygon mask (float 0..1) of image size (w, h)."""
    w, h = size
    big = Image.new("L", (w * supersample, h * supersample), 0)
    ImageDraw.Draw(big).polygon([(x * supersample, y * supersample) for x, y in pts], fill=255)
    return np.asarray(big.resize((w, h), Image.LANCZOS), np.float32) / 255.0


def feather(mask, radius):
    """Soften a float mask's edge by blurring it."""
    if radius <= 0:
        return mask
    img = Image.fromarray((np.clip(mask, 0, 1) * 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), np.float32) / 255.0
