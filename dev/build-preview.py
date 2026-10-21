"""Bundle the site into one self-contained HTML file for previewing.

usage: python3 dev/build-preview.py [site-dir] [out.html]
(defaults: alex-mcinnes-site and alex-mcinnes-preview.html)
"""
import base64
import json
import re
import sys
from pathlib import Path

site = Path(sys.argv[1] if len(sys.argv) > 1 else "alex-mcinnes-site")
out = Path(sys.argv[2] if len(sys.argv) > 2 else "alex-mcinnes-preview.html")


def data_uri(rel, mime):
    return f"data:{mime};base64," + base64.b64encode((site / rel).read_bytes()).decode()


html = (site / "index.html").read_text(encoding="utf-8")
css = (site / "assets/css/site.css").read_text(encoding="utf-8")
js = (site / "assets/js/site.js").read_text(encoding="utf-8")

MIME = {".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp"}
# Every asset the stylesheet points at (fonts, textures, the Dakar mask) becomes a data URI.
css = re.sub(r'url\("\.\./([^"]+)"\)', lambda m: 'url("' + data_uri("assets/" + m.group(1), MIME[Path(m.group(1)).suffix]) + '")', css)

# Head: drop preloads and the touch icon, inline the favicon, styles and script.
html = re.sub(r'\s*<link rel="preload"[^>]*>', "", html, flags=re.S)
html = re.sub(r'\s*<link rel="apple-touch-icon"[^>]*>', "", html)
html = html.replace('href="favicon.svg"', 'href="' + data_uri("favicon.svg", "image/svg+xml") + '"')
html = html.replace('<link rel="stylesheet" href="assets/css/site.css">', "<style>\n" + css + "\n</style>")
html = html.replace('  <script src="assets/js/site.js" defer></script>\n', "")
html = html.replace("</body>", "<script>\n" + js + "\n</script>\n</body>")


# The one WebP of each photo the preview keeps: (wide crop, tall crop for portrait screens).
PREVIEW = {
    "portrait": ("portrait-720.webp", None),
    "rocks": ("rocks-1440.webp", "rocks-tall-960.webp"),
    "contact": ("contact-1920.webp", "contact-tall-960.webp"),
}
# The hero slideshow keeps a wide photo and the square phone crop of each slide.
SLIDE_WIDE = {"camel": "camel-1280.webp"}


def picture(block):
    """Keep one WebP per crop: the tall (or square) crop for phones, the wide one otherwise."""
    img = re.search(r"<img\b.*?>", block, flags=re.S).group(0)
    name = re.search(r'src="assets/img/([\w-]+?)-\d+\.jpg"', img).group(1)
    parts = [re.search(r"<picture[^>]*>", block).group(0)]
    if "-sq-" in block:
        wide = SLIDE_WIDE.get(name, f"{name}-1440.webp")
        parts.append(f'<source media="(max-width: 699px)" srcset="{data_uri(f"assets/img/{name}-sq-720.webp", "image/webp")}">')
    else:
        wide, tall = PREVIEW[name]
        if tall:
            parts.append(f'<source media="(max-aspect-ratio: 1/1)" srcset="{data_uri("assets/img/" + tall, "image/webp")}">')
    img = re.sub(r'\s(srcset|sizes)="[^"]*"', "", img)
    img = re.sub(r'\ssrc="[^"]*"', f' src="{data_uri("assets/img/" + wide, "image/webp")}"', img)
    parts.append(img)
    parts.append("</picture>")
    return "\n".join(parts)


blocks = re.findall(r"<picture\b.*?</picture>", html, flags=re.S)
slides = [b for b in blocks if "-sq-" in b]
assert len(slides) == 6 and len(blocks) - len(slides) == len(PREVIEW), (len(slides), len(blocks))
for block in blocks:
    html = html.replace(block, picture(block))

# The film: the H.264 version plays everywhere, and its poster frame.
video = re.search(r"<video\b.*?</video>", html, flags=re.S).group(0)
slim = re.sub(r"\s*<source\b[^>]*>", "", video)
slim = slim.replace("</video>", f'  <source src="{data_uri("assets/video/reel-720.mp4", "video/mp4")}" type="video/mp4">\n              </video>')
slim = re.sub(r'poster="([^"]+)"', lambda m: f'poster="{data_uri(m.group(1), "image/webp")}"', slim)
html = html.replace(video, slim)

# "Your brand on the bike": its photos (smaller copies; the page scales them back
# up to the size its coordinates use) and its surface maps.
def small_webp(rel, width=1000, quality=72, scale=None):
    from io import BytesIO
    from PIL import Image
    im = Image.open(site / rel)
    scale = scale or width / im.width
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    buf = BytesIO()
    im.save(buf, "WEBP", quality=quality, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


block = re.search(r'(<script type="application/json" id="livery-data">)(.*?)(</script>)', html, flags=re.S)
if block:
    livery = json.loads(block.group(2))
    small = {}
    for photo in livery["photos"].values():
        small[photo["src"]] = small_webp(photo["src"])
        photo["src"] = small[photo["src"]]
    for pl in livery["placements"]:
        pl["map"] = data_uri(pl["map"], "image/webp")
        if "plate" in pl:
            # The cleaned panel is shrunk like its photo, so the two match in sharpness.
            photo = livery["photos"][pl["photo"]]
            pl["plate"] = small_webp(pl["plate"], quality=85, scale=1000 / photo["size"][0])
    html = html.replace(block.group(0), block.group(1) + json.dumps(livery, separators=(",", ":")) + block.group(3))
    for rel, uri in small.items():
        html = html.replace(f'src="{rel}"', f'src="{uri}"')

for logo in re.findall(r'src="(assets/img/(?:partners|media|team)/[\w-]+\.(?:webp|svg))"', html):
    html = html.replace(f'src="{logo}"', f'src="{data_uri(logo, MIME[Path(logo).suffix])}"')

leftover = re.findall(r'(?:src|href|srcset|poster)="(?!data:|https?:|mailto:|tel:|#)[^"]+"', html)
assert not leftover, leftover
out.write_text(html, encoding="utf-8")
print(out, round(out.stat().st_size / 1024), "KB")
