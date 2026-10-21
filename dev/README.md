# Development tools

Run everything from the project folder (the one holding `CLAUDE.md`). The
browser checks use Playwright with Chromium. Claude's cloud containers already
have both. Anywhere else, run `npm install playwright` and
`npx playwright install chromium` once.

## Serve the site

```bash
python3 -m http.server 8123 --bind 127.0.0.1 --directory alex-mcinnes-site
```

The checks below open http://127.0.0.1:8123/.

## Checks

| Command | What it checks |
| --- | --- |
| `node dev/screens.js http://127.0.0.1:8123/ dev/out/screens mobile --mid` | Screenshots each section, plus a frame mid-transition. Views: `mobile`, `tablet`, `laptop`, `desktop`. |
| `node dev/stack-modes.js dev/out/stack motion` | Stacking on a phone: the covered section must hold still while the next slides over. Modes: `motion`, `calm` (reduced motion), `nojs` (scripts stripped). Add `1440 900` for desktop. |
| `node dev/present.js http://127.0.0.1:8123/ dev/out/present 1280 720` | Steps through all 18 presenter stops, screenshots each one and reports any that don't fit. It opens the site with `?team`, which shows the Present button. |
| `node dev/links.js dev/out` | The logo, nav links and back button land on the right section |
| `node dev/overflow.js` | No sideways scrolling at 390, 768, 820 and 1024 px |
| `node dev/checks.js http://127.0.0.1:8123/ dev/out` | Reduced motion, no JavaScript, first-load weight, LCP, CLS, headings, alt text, touch targets |
| `node dev/livery.js dev/out/livery source/partner-logos/ebc.png` | "Your brand on the bike": every level and view, with the stand-in and then with the given logo, plus the downloaded preview sheet |
| `node dev/partner-links.js dev/out` | Each partner tile opens the right website in a new tab (answered locally, nothing is fetched) |

The top bar is hidden on the opening screen, so tests that click it scroll down first.

## Single-file preview

One HTML file with everything inlined, for previewing on any device:

```bash
python3 dev/build-preview.py                 # writes alex-mcinnes-preview.html
node dev/check-preview.js                    # laptop and phone: fonts, images, errors
node dev/check-preview-nojs.js               # phone with scripts off: sections still stack
```

The preview carries the film as H.264 only, which Playwright's Chromium can't
play (it has no H.264 decoder). Check the film in the preview with Chrome,
Safari or Edge. On the served site, Chromium plays the AV1 version.

## Packaging

```bash
cd .. && zip -qr alex-mcinnes-racing.zip alex-mcinnes-racing -x '*.DS_Store' '*.zip' '*/__pycache__/*' 'alex-mcinnes-racing/dev/out/*' 'alex-mcinnes-racing/alex-mcinnes-preview.html'
```

## Asset scripts (`dev/assets/`)

These made the current assets. You only need them to change one.

| Script | Makes |
| --- | --- |
| `brand-logo.py source/brand/mcinnes-racing-logo.png alex-mcinnes-site/assets/img/mcinnes-racing.svg` | The MC INNES RACING logo for the top bar: a one-colour SVG traced from Alex's logo file. Needs the `potracer` package. |
| `brand-21.py source/brand/mcinnes-racing-logo.png alex-mcinnes-site/assets/img/number-21.svg` | The 21 beside the logo, built from the logo's own letters (the 2 is its S mirrored, the 1 its I with a flag at the N's angle) and traced the same way. |
| `livery.py [--debug]` | Everything behind "Your brand on the bike": web copies of the livery photos, one map per logo position and the data block in `index.html`. With `--debug`, outlines in `dev/out/livery-*.jpg`. |
| `trim-fonts.py source/fonts alex-mcinnes-site/assets/fonts` | The two trimmed web fonts. Needs `pip install fonttools brotli`. |
| `textures.py dev/out/tex` | Seamless sand, night-sand and paper textures. Copy them into `alex-mcinnes-site/assets/img/texture/`. |
| `partner-logos.py source/partner-logos source/partner-logos/dragon-energy.pdf dev/out/logos` | White partner logos from the official files. Needs `pdftocairo` (poppler). |
| `dakar-and-media-logos.py <workdir> alex-mcinnes-site` | The stand-in Dakar logo and the broadcaster logos, from the deck's images. Needs the `potracer` package. |

The photo pipeline is in the site itself: `alex-mcinnes-site/tools/make-images.py`.

### The Arabic line's font

`assets/fonts/noto-kufi-arabic-tagline.woff2` holds only the letters of the
Arabic line in "A winner made in the UAE". The full font (Noto Kufi Arabic
Black, OFL) is in `source/fonts/`. After changing the Arabic text, rebuild it
with the new text:

```bash
python3 -c 'from fontTools import subset
o = subset.Options(); o.layout_features = ["*"]; o.flavor = "woff2"; o.name_IDs = ["*"]
f = subset.load_font("source/fonts/noto-kufi-arabic-900.woff2", o)
s = subset.Subsetter(o); s.populate(text="من الإمارات إلى داكار "); s.subset(f)
subset.save_font(f, "alex-mcinnes-site/assets/fonts/noto-kufi-arabic-tagline.woff2", o)'
```
