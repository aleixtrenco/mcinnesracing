# Alex McInnes Racing website

A one-page portfolio and sponsorship pitch for Alex McInnes, built from the
January 2026 pitch deck. The same page doubles as a live presentation: press
**Present** and it becomes a full-screen, click-through pitch.

Plain HTML, CSS and JavaScript. No framework, no build step, no server code.

## Preview it

From this folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from the folder
also works.

To check it on a phone, put it online (next section) and open the link in
Safari or Chrome. The file previewers in phone apps (Files, mail, chat
attachments) often block scripts or show a still page, so they don't show the
site as visitors will see it.

## Put it online

Any static host works:

- **Netlify:** drag this folder onto https://app.netlify.com/drop
- **Vercel, Cloudflare Pages, GitHub Pages:** point the project at this folder
- **Existing web hosting (cPanel and similar):** upload the folder's contents to the web root

The site assumes it will live at `https://mcinnesracing.com/` (the domain in the
deck's email address). If it goes somewhere else, replace that address in
`index.html` (canonical link, `og:url`, `og:image`, the JSON-LD block),
`robots.txt` and `sitemap.xml`.

## What's on the page

1. **Hero:** six photos of Alex slide past one after another (about six and a
   half seconds each), with his name racing in across each one. The name
   moves for every photo, to the top, the bottom or a corner, so it never
   covers Alex. The words, buttons and Dakar countdown sit on a slim dark band
   under the photos. A small control at the bottom right pauses the photos or
   jumps to one; on phones a sideways swipe also moves between them, and the
   name sits under the photo.
2. **Rider profile:** Alex's story, from the north of Scotland, where
   professional rally-raid riders almost never come from, to growing up in
   Dubai, beside a rider card (race plate, flags, key numbers, titles).
3. **A winner made in the UAE:** the Emirati angle for UAE sponsors. An Arabic
   line ("From the Emirates to Dakar"), Alex's wins as a results board (P1,
   P2, record), and three points: raised in the UAE, a safe choice for UAE
   brands, and giving back.
4. **The road to Dakar:** the career as a rally roadbook, one box per season,
   with the Dakar logo.
5. **Why partner with Alex in 2026.**
6. **Who sees your brand:** social reach, beside a short black-and-white film
   that plays muted while it's on screen. Buttons pause it and turn the sound on.
7. **On screen and in print:** broadcasters, a news-outlet ticker and event stamps.
8. **Already on board:** the nine current partners.
9. **Your brand on the bike:** a sponsor picks Platinum, Gold or Silver and adds
   their logo. It appears where that level's logos go on the bike and Alex's
   kit. They can download the preview, or ask about that level: the button
   opens a WhatsApp chat with the level filled in, and email is offered too.
10. **2026 season:** the racing programme.
11. **Dakar Rally 2027:** live trip-meter countdown over a night-graded photo of
    sand and rock.
12. **Let's talk:** email, WhatsApp, phone and Instagram.

The top bar carries Alex's race number and the MC INNES RACING logo, both in
ink. The logo (`assets/img/mcinnes-racing.svg`) is traced from his logo file.
The logo has no font file, so the 21 (`assets/img/number-21.svg`) is built
from the logo's own letters: the 2 is its S mirrored and the 1 is its I with a
stencil-cut flag. The bar stays hidden on the opening screen, so the photos
run to the top, and slides in as you scroll down (or when you press Tab).

As you scroll, each section pins when its end reaches the bottom of the screen
and the next one slides over it, while the covered one darkens and shrinks back
into the page. Phones get the same effect, with a little more shrink so it
reads on a small screen.

- **Reduced motion:** visitors who have asked their device for reduced motion
  (on iPhone: Settings > Accessibility > Motion > Reduce Motion) still get the
  stacking and the darkening, because the page only moves as far as they
  scroll. The shrinking, the sliding reveals and the dune parallax are
  replaced by gentle fades.
- **Scripts blocked:** if a previewer or browser blocks JavaScript, current
  Chrome, Edge and Safari (26 and later) still stack the sections and reveal
  the content as you scroll, using CSS alone. Other browsers show a plain,
  complete page.

## Presenter mode

- **Only for Alex's team:** visitors don't see the Present buttons. To show
  them on a computer, open the site once with `?team` at the end of the
  address (for example `https://mcinnesracing.com/?team`). That browser then
  shows them on every visit; `?team=off` hides them again. This only hides
  the buttons, it isn't a password.
- **Start:** the **Present** button in the top bar (scroll down a little first:
  the bar is hidden on the opening screen), or **Present the pitch** in the
  footer or mobile menu. It opens full screen at the first stop.
- **Move:** arrow keys, Page Up / Page Down (what most presentation clickers
  send), Space, mouse wheel or swipe. Home and End jump to the first and last
  stop. F toggles full screen. Esc exits.
- **Link straight into it:** `https://mcinnesracing.com/#present`, or
  `#present-7` to open at stop 7.
- **18 stops:** hero, rider profile, made in the UAE, one per roadbook season
  (2021 to 2027, each highlighted in turn), why 2026, reach, media coverage,
  partners, your brand on the bike, the 2026 season, the Dakar countdown,
  contact. You can add a prospect's logo live on the "Your brand on the bike"
  slide.
- The layout scales to the screen's height, so every stop fits a laptop, a
  720p projector or a 4K TV.
- The hero photos keep sliding on the first slide, and the film and the Dakar
  backdrop are on the slides too.

## On phones

Phones get a leaner page. The riding photos are all in the hero slideshow, so
the photo behind the Dakar countdown is left out on phones, where it would sit
behind the words. On a phone the name sits under the hero photos instead of on
them, and no words sit over a photo anywhere.

## Before launch: swap in the real files

### Photos

One photo is still cut out of the PDF deck: `portrait.jpg`, the helmet portrait
for "Why partner with Alex". It is low resolution and only a stand-in. All the
others are originals.

The hero slideshow, in order:

| Slide | File | Also used in |
| --- | --- | --- |
| 1 | `hero.jpg`, Alex small between towering dunes (also the share image) | |
| 2 | `helmet.jpg`, helmet and goggles close up | |
| 3 | `camel.jpg`, riding past a camel | |
| 4 | `dust.jpg`, at speed in the dust (the first hero) | |
| 5 | `rocks.jpg`, down a red dune beside a wall of rock | the Dakar backdrop |
| 6 | `dune-run.jpg`, racing down a dune towards the camera | |

1. Put the original portrait in `source-images/` as `portrait.jpg` (any size,
   bigger is better).

   To change any other photo, save the new one over the file with the same
   name:
   - Hero photos fill a wide frame on laptops and a square one on phones. In
     `index.html`, each slide's `--pos` says which part shows in the wide frame
     (for example `41% 32%`: left to right, then top to bottom). The square
     phone crop is cut around the `square` point in `tools/make-images.py`
     (0 is the left edge, 1 the right). To change the order, move the slides
     in `index.html` and renumber their `--i`.
   - Each hero slide also says where the name may go and where Alex is:
     `data-name` lists places to try in order (`top`, `bottom`, or a corner:
     `tl`, `tr`, `bl`, `br`; each with `ink` or `light` lettering), and
     `data-subjects` gives Alex's box in the photo as left, top, right and
     bottom fractions (0 to 1; boxes separated by `;`). The page uses the first
     place that keeps the name off every box on the visitor's screen. For a new
     photo, update both.
   - `contact.jpg` is a portrait (upright) photo: on laptops it fills the right
     of the screen, on phones it sits under the contact panel.
2. Install Pillow once (`pip install Pillow`), then run:

   ```bash
   python3 tools/make-images.py
   ```

This writes every size in AVIF, WebP and JPEG, the social share image
(`og-image.jpg`) and the blurred loading placeholders. No HTML edits are needed.
If a new photo frames Alex somewhere else, change its `focal` point at the top
of the script. That point decides where the phone and tablet crops are cut.

### Your brand on the bike

The levels and where their logos go:

| Level | Where the logo goes | Views shown |
| --- | --- | --- |
| Platinum | The front fairing, both radiator side panels and the chest of Alex's jersey | Front fairing, jersey, side panel close-up, whole bike |
| Gold | Both fork guards, the front fender and the front tank | Fork guard close-up, front fender, front tank, whole bike |
| Silver | The rear tank and the rear fender | Rear tank, rear fender |

- **How it works:**
  - The visitor's logo never leaves their device: the page reads the file and
    draws the preview itself.
  - On the radiator side panel (Platinum) the logo is printed onto the real
    panel: the old MotoZone sticker and Dawlati logo are cleaned off the
    photo, so the panel keeps its white trim, crease and shine. The logo is as
    large as the panel's side face allows, in a wide, medium or square box to
    suit its shape. On the fork (Gold) it runs down the whole guard.
  - Silver's logo takes the top slot in the logo stacks on the rear tank and
    the rear fender (where EBC is in the photos), painted in the panel's own
    colour so only the logo shows. One slot is too small to see in a photo of
    the whole bike, so Silver shows the two close-ups.
  - A logo saved on a plain background (a white JPG, say) has that
    background removed. The visitor can untick this.
  - Where a logo's colours would disappear into a panel (a dark logo on a
    black panel), it is shown in white, or in ink on light panels. Light and
    dark parts swap, as in a reversed logo, so a badge keeps its lettering.
- **Changing it:**
  - The photos are `source-images/livery-*.jpg`.
  - The levels, views and positions are in `dev/assets/livery.py` in the
    project folder. It finds each panel in the photos and works out its
    shading and gloss.
  - After changing a photo or a position, run
    `python3 dev/assets/livery.py --debug` from the project folder and check
    the outlines it draws in `dev/out/`.
  - Change the level descriptions in `index.html` to match.

### The film

The film in "Who sees your brand" is in `assets/video/` in two versions: AV1
(`reel-720.webm`, smaller) for browsers that support it and H.264
(`reel-720.mp4`) for everything else. Both are 720 × 1280, cut so the loop
runs without the black frames at the end. To use a new vertical film (9:16,
ideally 10 to 20 seconds), install ffmpeg and run, from this folder:

```bash
ffmpeg -i new-film.mp4 -vf "scale=720:1280,format=yuv420p" -c:v libx264 -preset slow -crf 28 -movflags +faststart -c:a aac -b:a 128k assets/video/reel-720.mp4
ffmpeg -i new-film.mp4 -vf "scale=720:1280,format=yuv420p" -c:v libsvtav1 -preset 6 -crf 38 -c:a libopus -b:a 96k assets/video/reel-720.webm
ffmpeg -ss 3 -i new-film.mp4 -frames:v 1 -q:v 2 source-images/reel-poster.jpg
python3 tools/make-images.py
```

The last two lines make the still shown before the film plays, from the frame
3 seconds in. The film never starts by itself for visitors who ask for reduced
motion or have data saving on. They press play.

### The Dakar logo

`assets/img/dakar-logo.svg` is traced from the small red logo in the deck. It
is a stand-in, not the official file. Get the official logo from the organiser
(A.S.O.), with permission to use it if you don't already have it, and save a
one-colour SVG over that file. The site colours it automatically, red on sand
and white on dark. If the new file has different proportions, update
`aspect-ratio: 566 / 769` under `.dakar-mark` in `assets/css/site.css`.

### Partner and broadcaster logos

The nine partner logos in `assets/img/partners/` are made from each brand's
official artwork, converted to plate white for the dark partner wall. Dragon
Energy is a vector file. If a partner sends an updated logo, save a white
version over the matching file. If you use `.svg`, update the extension in
`index.html`. Each logo's display height is set by `--h` in the HTML so the
marks look equally weighted.

If a new partner's logo file isn't ready yet, its tile can show the name in
type: put `<span class="partner-wordmark">Name</span>` where the `<img>` would
go, and swap in the logo when it arrives.

Each partner tile links to that partner's website in a new tab. The addresses
are the `href` values on the `partner-link` tiles in `index.html`:

| Partner | Website |
| --- | --- |
| MotoZone | https://motozone.ae/ |
| Dawlati | https://www.dawlati.ae/ |
| Dragon Energy | https://dragon.energy/ |
| EBC Brakes | https://www.ebcbrakes.com/ |
| IMS | https://www.imsproducts.com/ |
| RK Takasago Chain | https://global.rk-japan.co.jp/ |
| DeWalt | https://www.dewalt.com/ |
| Apina Designs | https://www.apinauniform.at/ |
| 100% | https://www.100percent.com/ |

If a partner prefers a regional page (for example a UAE distributor), change
its `href`.

The broadcaster logos in `assets/img/media/` (Eurosport, Rally-Raid Network,
Saudia) are still cut from the deck. They are shown in dark ink on the light
media page (the `-ink` files). Replace them the same way when you have the
official files.

## Edit the text and numbers

All copy is in `index.html`, in page order. Things that will need updating:

- **Reach figures:** change both the visible number and its `data-count` value,
  for example `data-count="5646621"`.
- **Age:** the rider card shows 22. Update it on Alex's birthday.
- **New results:** add them to the roadbook box for the season and, if it's a
  win or a title, to the results board in "A winner made in the UAE".
- **The Arabic line:** "من الإمارات إلى داكار" ("From the Emirates to Dakar").
  Its font is cut down to just those letters, so if you change the words,
  rebuild the font with the command in `dev/README.md` (or ask Claude to).
- **Dakar dates:** `DAKAR_START` and `DAKAR_END` at the top of
  `assets/js/site.js`, plus the matching text in `index.html`. During the rally
  the countdown switches to "Racing now" on its own. Once it is over, the trip
  meter hides and the page shows the dates, so the season content will need a
  refresh.

## What's in the folder

| Path | What it is |
| --- | --- |
| `index.html` | The page |
| `assets/css/site.css` | All styles |
| `assets/js/site.js` | Load sequence, section stacking, reveals, counters, ticker, film, countdown, menu, presenter mode |
| `assets/fonts/` | Saira Black Italic (titles, numbers) and Archivo (text), trimmed to the characters and weights used, plus Noto Kufi Arabic cut down to the Arabic line |
| `assets/img/texture/` | Sand, night-sand and roadbook-paper textures, and the stamp ink grain |
| `assets/img/` | Generated photo sizes, the MC INNES RACING logo, the Dakar logo, partner and broadcaster logos, and the photos and maps behind "Your brand on the bike" |
| `assets/video/` | The film, in AV1 and H.264 |
| `source-images/` | Original photos that `tools/make-images.py` builds from |
| `tools/make-images.py` | Image pipeline |
| `favicon.svg`, `apple-touch-icon.png`, `og-image.jpg` | Browser icon (the race plate), home-screen icon, share image |
| `robots.txt`, `sitemap.xml` | Search engine files (update `lastmod` in the sitemap when the page changes) |
| `_redirects` | Netlify rule that sends the old `heartfelt-lily-8e8080.netlify.app` address to mcinnesracing.com |

## Design notes

- **Colour, sampled from Alex's photos:** dust haze `#E4DDD1`, desert shadow
  `#1C1611`, roadbook paper `#FBFAF7`, plate white `#F6F3EE`, track dust
  `#8C8272`. Race red `#C9231B` is kept for actions, the Dakar goal and the
  slash that leads each title.
- **Type:** Saira Black Italic for the name, titles and race numbers. Archivo
  for everything you read.
- **Texture:** seamless sand with wind ripples on light sections, fine
  night-sand grain on dark ones, paper grain on the roadbook and media pages.
- **Race plate:** on the rider card and the browser icon, the `21` is drawn
  as a KTM-style front number board. In the top bar it is drawn from the
  logo's own letters instead.
- **Motion:** the dust clears and the name races in with a speed trail. The
  hero photos wipe in from the right behind a slanted edge, like a race plate,
  each settling from a slight zoom. Section titles rise word by word, roadbook
  routes draw themselves, numbers count up, stamps hit the page, and each
  section slides over the last as it shrinks back into the dark. Reduced
  motion keeps the stacking and swaps everything else for fades; the hero
  photos then wait for the play button. Without JavaScript the page still
  works, the hero photos cross-fade on a loop, and where the browser allows
  it, sections still stack and reveal with CSS.

## Tested

- Phones (390 px), tablets (768 px), laptops (1280 × 720, 1440 × 900) and TVs
  (1920 × 1080). No sideways scrolling at any size.
- Section stacking on phone and desktop with full motion, reduced motion and
  scripts turned off. Each covered section holds still to the pixel while the
  next one slides over it.
- The main photo shows in about 0.1 s locally, with no layout shift while the
  page loads. A phone downloads about 540 KB for the first screen; each hero
  photo loads one step before it is shown, not with the page.
- The hero photos keep moving with the pointer resting on them (they fill the
  screen, so pausing on hover would stop them for most visitors). They pause
  with the pause button, while the controls have keyboard focus, when the
  hero is mostly covered or off screen, and when the tab is hidden.
- Skip link, visible keyboard focus, labelled controls, alt text, WCAG AA
  contrast and 44 px touch targets.

## Credits

Saira by Omnibus-Type and Archivo by Omnibus-Type, both SIL Open Font License
1.1. Noto Kufi Arabic by Google, SIL Open Font License 1.1. Partner,
broadcaster and event logos are trademarks of their owners.
