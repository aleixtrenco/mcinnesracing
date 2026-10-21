"""Seamless sand textures: fine grain, scattered grains, wind ripples, soft mottling.

usage: python3 dev/assets/textures.py <outdir>
Writes sand-light.jpg, sand-dark.jpg and paper.jpg for alex-mcinnes-site/assets/img/texture/.
All noise is built in the frequency domain, so every tile wraps without seams.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

out = sys.argv[1]
N = 512
rng = np.random.default_rng(21)


def periodic_noise(n, beta, lo=1, hi=None):
    """Tileable noise with a 1/f^beta spectrum, band-limited to [lo, hi] cycles per tile."""
    fx = np.fft.fftfreq(n) * n
    fy = np.fft.rfftfreq(n) * n
    f = np.sqrt(fx[:, None] ** 2 + fy[None, :] ** 2)
    amp = np.zeros_like(f)
    band = f >= lo
    if hi is not None:
        band &= f <= hi
    amp[band] = 1.0 / f[band] ** beta
    phase = rng.uniform(0, 2 * np.pi, f.shape)
    field = np.fft.irfft2(amp * np.exp(1j * phase), s=(n, n))
    field -= field.mean()
    return field / (np.abs(field).max() + 1e-9)


def blur(a, r):
    im = Image.fromarray(((a - a.min()) / (np.ptp(a) + 1e-9) * 255).astype(np.uint8))
    # wrap-pad so the blur stays seamless
    pad = int(r * 3) + 2
    tiled = np.pad(np.array(im), pad, mode="wrap")
    b = np.array(Image.fromarray(tiled).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32)[pad:-pad, pad:-pad]
    return (b / 255.0) * (np.ptp(a)) + a.min()


def ripples(k=24, slant=3, warp=0.55):
    y, x = np.mgrid[0:N, 0:N] / N
    w = periodic_noise(N, 2.2, lo=1, hi=6)
    phase = 2 * np.pi * (k * y + slant * x + warp * w)
    m = np.mod(phase, 2 * np.pi) / (2 * np.pi)          # 0..1 across one ripple
    crest = np.exp(-((m - 0.78) ** 2) / 0.004)            # thin lit crest
    lee = -np.exp(-((m - 0.86) ** 2) / 0.006)             # shadow just past it
    r = 0.55 * np.sin(phase) + 1.0 * crest + 0.9 * lee
    strength = 0.5 + 0.5 * periodic_noise(N, 2.0, lo=1, hi=4)
    return r * strength


def grains(p_dark, p_light):
    u = rng.random((N, N))
    g = np.zeros((N, N), np.float32)
    g[u < p_dark] = -1.0
    g[(u >= p_dark) & (u < p_dark + p_light)] = 1.0
    # a few grains two pixels wide
    big = rng.random((N, N)) < p_dark * 0.25
    g[big] = -1.0
    g[np.roll(big, 1, axis=1)] = -0.8
    return g


def colourise(base, lum, warm=(1.0, 0.88, 0.7), cool=(1.0, 0.97, 0.9)):
    base = np.array(base, np.float32)
    lum = lum[..., None]
    dark = np.clip(-lum, 0, None) * np.array(warm, np.float32)
    light = np.clip(lum, 0, None) * np.array(cool, np.float32)
    img = base[None, None, :] - dark + light
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def save(img, name, q):
    path = f"{out}/{name}"
    if name.endswith(".jpg"):
        img.save(path, "JPEG", quality=q, optimize=True, progressive=True)
    else:
        img.save(path, "WEBP", quality=q, method=6)
    import os
    print(name, os.path.getsize(path) // 1024, "KB")


mottle = periodic_noise(N, 1.8, lo=1, hi=24)
fine = blur(rng.normal(0, 1, (N, N)).astype(np.float32), 0.6)
fine /= np.abs(fine).std() * 3

# Light sand (dust haze #E4DDD1)
lum = 9.0 * mottle + 7.5 * ripples(k=18, slant=2) + 9.0 * fine + 26.0 * grains(0.03, 0.02)
save(colourise((228, 221, 209), lum), "sand-light.jpg", 84)

# Night sand (desert shadow #1C1611): faint ripples, lighter grains
lum_d = 4.0 * mottle + 3.0 * ripples(k=16, slant=-2) + 4.5 * fine + 26.0 * np.clip(grains(0.0, 0.02), 0, None)
save(colourise((28, 22, 17), lum_d, warm=(1, 1, 1), cool=(1.0, 0.86, 0.66)), "sand-dark.jpg", 80)

# Roadbook paper (#FBFAF7): grain only
lum_p = 3.0 * mottle + 4.5 * fine + 12.0 * grains(0.01, 0.0)
save(colourise((251, 250, 247), lum_p), "paper.jpg", 80)
