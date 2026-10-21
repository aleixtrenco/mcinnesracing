"""Trim the two variable fonts to the weights, widths and characters the site uses.

usage: python3 dev/assets/trim-fonts.py source/fonts alex-mcinnes-site/assets/fonts
Needs fontTools with WOFF2 support (pip install fonttools brotli).

The inputs are Google Fonts' Latin files: Saira Italic and Archivo, both
variable in width and weight. If new copy needs characters outside the set
below (other accented letters, Arabic for a translation), add them here, or
download the fuller files from Google Fonts first.
"""
import os
import sys
import tempfile

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

src, dst = sys.argv[1], sys.argv[2]

# Basic Latin, Latin-1, curly quotes, dashes, ellipsis, bullet, trademark, minus, multiply.
UNICODES = list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + [
    0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2022, 0x2122, 0x2212, 0x00D7,
]
FEATURES = ["kern", "liga", "calt", "tnum", "lnum", "case", "ccmp", "locl", "mark", "mkmk"]


def trim(name_in, name_out, limits):
    font = TTFont(os.path.join(src, name_in))
    font = instancer.instantiateVariableFont(font, limits)
    font.flavor = None
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "font.ttf")
        font.save(path)
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = FEATURES
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        f = TTFont(path)
        s = subset.Subsetter(opts)
        s.populate(unicodes=UNICODES)
        s.subset(f)
        f.flavor = "woff2"
        out = os.path.join(dst, name_out)
        f.save(out)
    print(out, os.path.getsize(out), "bytes")


trim("saira-italic-latin.woff2", "saira-italic-display.woff2", {"wdth": (62.5, 100), "wght": (700, 900)})
trim("archivo-latin.woff2", "archivo-text.woff2", {"wdth": (100, 125), "wght": (400, 800)})
