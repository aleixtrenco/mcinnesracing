# Alex McInnes Racing: portfolio and pitch website

Read this before starting work. It holds what was agreed in the sessions so
far, so you don't need the earlier conversations.

## The project

- **What:** a one-page portfolio and sponsorship pitch site for Alex McInnes,
  a Scottish rally-raid motorbike rider (race number 21) based in Dubai. It
  also works as a click-through presentation (presenter mode).
- **Content source:** `source/2026_Pitch_Deck.pdf` (January 2026 deck). Use
  facts from the deck only. Don't invent results, numbers or quotes.
- **Goal:** win sponsors, aimed at the Dakar Rally 2027 (1 to 15 January 2027,
  Saudi Arabia).
- **Quality bar:** the brief was "a website worth $10k" with elegant animation
  that loads well on any device.
- **Repository:** https://github.com/aleixtrenco/mcinnesracing holds the whole
  project (the user's; pushed at their request). Hosting from it: Netlify with
  publish directory `alex-mcinnes-site`, no build command (see README.md).

## Where things are

| Path | What |
| --- | --- |
| `alex-mcinnes-site/` | The website. Deploy this folder. Its `README.md` is the owner's guide (hosting, presenter mode, swapping photos and logos, editing numbers). |
| `alex-mcinnes-site/index.html` | All copy, in page order |
| `alex-mcinnes-site/assets/css/site.css` | Design tokens and all styles |
| `alex-mcinnes-site/assets/js/site.js` | Hero sequence, stacking, reveals, counters, ticker, countdowns, menu, in-page links, presenter mode |
| `alex-mcinnes-site/tools/make-images.py` | Builds every photo size (AVIF/WebP/JPEG), the share image and blur placeholders from `source-images/` |
| `dev/` | Test and preview tools (not deployed). See `dev/README.md`. |
| `dev/assets/` | Scripts that made the textures, fonts and logos |
| `source/` | The client's original files: the deck, Alex's logo (`brand/`), official partner logos, the Red Bull KTM badge, full fonts (plus Noto Kufi Arabic for the Arabic line), the original film, and the deck crop the contact photo replaced (`replaced-photos/`) |
| `.claude/skills/` | The two design skills used on this project: `frontend-design` and `ui-ux-pro-max` |

## Decisions already agreed (keep them)

- **Format:** a scrolling site plus presenter mode. Presenter mode has 18 stops
  (`[data-stop]`): hero, rider, made in the UAE, the seven roadbook seasons,
  why, reach, coverage, partners, your brand on the bike, season, Dakar,
  contact. Each stop must fit a 1280×720 laptop and a 1920×1080 TV.
  - The Present buttons are for Alex's team only (the user asked): they show
    only in a browser that opened the site with `?team` (stored in
    localStorage `mcinnes-team`; `?team=off` clears it; the head script reads
    it and removes the query). It hides the buttons, it isn't access control;
    `#present` deep links still work. `dev/present.js` opens with `?team`.
- **Look:** desert dust and race red.
  - Tokens are in `:root` in site.css: haze `#E4DDD1`, paper `#FBFAF7`, ink
    `#1C1611`, plate `#F6F3EE`, red `#C9231B`, night `#0D0A07`.
  - Sand texture on light sections, night-sand grain on dark ones, paper grain
    on the roadbook and media pages. Keep the textures consistent across the site.
- **Type:**
  - Titles, numbers and the name use Saira Black Italic. The user found the
    first title font too basic.
  - Body text uses Archivo.
  - Both fonts are trimmed. If new copy needs characters outside Latin-1,
    re-run `dev/assets/trim-fonts.py` with a wider set.
  - The Arabic line uses Noto Kufi Arabic Black (OFL), cut down to its own
    letters (`assets/fonts/noto-kufi-arabic-tagline.woff2`, 3 KB). Changing
    the Arabic text means rebuilding it (command in `dev/README.md`).
- **Race plate:** the `21` KTM-style front number board (the user asked for
  the KTM shape) is on the rider card and in `favicon.svg`. The top bar no
  longer uses it (see Top bar).
- **Rider profile:** the intro tells the story the user asked for (their
  facts): Alex comes from the north of Scotland, which almost never produces a
  professional rally-raid rider; very few Scottish athletes have ever taken
  part in the Dakar, let alone finished it; living in Dubai since 2006, from
  early childhood, shaped him into the athlete he is; the goal is to be the
  first Scottish rider to finish the Dakar in Saudi Arabia (deck). Written in
  the third person like the rest of the site. The rider card beside it stays
  as it is ("keep the key info table").
- **Rider card:** a dark race-licence-style card with plate, flags, key
  numbers and titles. The user said the plain table looked "from school".
  - Age is 22 (the user corrected 21). The race number stays 21. The birthday
    isn't known, so the age is a plain number to update by hand.
  - The user asked to remove the "Factory Red Bull KTM test rider" row (and
    with it the Red Bull KTM badge they had asked for a round earlier; the
    original file stays in `source/team-logos/`), then the same line from the
    2026 roadbook box. Don't bring it back without asking.
- **Road to Dakar:** a rally roadbook, one numbered box per season with tulip
  route diagrams that draw themselves. It carries the Dakar logo.
- **Media page ("On screen and in print"):**
  - broadcaster logos
  - a skewed news-outlet ticker
  - rubber-stamp event badges
  The user called the first version plain and boring.
- **Partners ("Already on board"):**
  - Nine partners in a 3×3 grid. On phones it has two columns and the odd
    last tile spans the row.
  - Nine official logos, converted to plate white from the files in
    `source/partner-logos/` by `dev/assets/partner-logos.py`.
  - Each tile links to the partner's site in a new tab (URLs in the site
    README).
  - Presenter mode tightens the tiles so all three rows fit 1280×720.
  - The intro text lines up with the title.
- **2026 season:** the title is the clear top level. Race names are not all
  bold.
- **Dakar section:** the large Dakar mark, a live trip-meter countdown and
  dunes.
- **Hero:** a slideshow of six photos the user chose, "passing by":
  1 `hero.jpg` (dunes, the user's chosen first photo), 2 `helmet.jpg`,
  3 `camel.jpg`, 4 `dust.jpg` (the first hero, from the deck), 5 `rocks.jpg`,
  6 `dune-run.jpg`.
  - The name: the user disliked it on a band under the photos and asked for
    it "as before" (big Saira Black Italic on the photo, racing in with its
    speed trail), moving per photo so the rider and the name both stay clear.
    So each slide carries its own decorative copy of the name (`.slide-name`,
    aria-hidden; the real h1 stays in the band for screen readers and phones).
    Each slide lists places to try (`data-name`: `top`/`bottom` one line, or
    `tl`/`tr`/`bl`/`br` stacked; `ink` or `light`) and the rider's boxes
    (`data-subjects`, fractions of the photo). `place()` in site.js measures
    the name for the visitor's screen and picks the first place that clears
    every box (else the least overlap); a soft wash behind the name keeps it
    readable. The name races in again with each photo and the old one races
    off. The static classes in index.html are the laptop choices, for
    browsers without scripts.
  - Phones (under 700px): the photo, then the big two-line name on the dark
    band, as on the original phone design (on a narrow photo it would cover
    the rider). The words, buttons and countdown sit on a slim dark band
    under the photos everywhere.
  - Framing: each slide's `--pos` (index.html) sets the wide crop; phones get
    a square crop per photo (`square` focal in make-images.py, `-sq-` files).
  - Motion: each photo holds 6.5 s (`--hold` on `.hero`), wipes in from the
    right behind a slanted edge, settles from a slight zoom; the dash for the
    current photo fills. Pause button, one dash per photo (jumps), swipe on
    phones. It holds while the controls have keyboard focus, when the hero
    is more than half covered (`carousel.cover(p)` from the stacking loop) or
    off screen, and when the tab is hidden. Not on hover: the photos fill the
    screen, so a resting pointer would stop them for most visitors.
  - Calm mode and Save-Data wait for Play (like the film), then cross-fade.
    Without JavaScript the photos cross-fade on a CSS loop (first photo only
    for reduced motion).
  - Loading: only slide 1 loads with the page (`.js .hero-slide:not(.is-shown):not(.is-armed)`
    is display none); each slide is armed one step before it shows.
  - The slide state class is `is-shown`, not `is-current`: presenter mode
    and `dev/present.js` use `is-current` for the current stop.
- **Contact:**
  - A symmetric 2×2 grid: Email and Instagram on top, WhatsApp ("Send a
    message") and Call below.
  - The panel must not cover the bike in the photo.
  - The photo is the user's portrait of Alex on the bike. On landscape screens
    from 1024px it fills the right of the section top to bottom (46%, 38%
    under 1280px), cut on a slant; on phones and tablets it sits under the
    panel in a square frame from the helmet down. It uses the shared photo
    reveal.
  - Instagram is `@amcinnes_21` (one underscore; the user gave the link).
- **Top bar:** Alex's race number, then his MC INNES RACING logo, in ink with
  no background (the user's requests; `assets/img/mcinnes-racing.svg`, traced
  by `dev/assets/brand-logo.py` from `source/brand/mcinnes-racing-logo.png`,
  shown as a CSS mask so it takes the ink colour). Both go back to the top of
  the page. The nav has a "UAE" link to the new section.
  - The 21 replaced the plate there at the user's request, "following the same
    font as the logo". The logo's lettering is not a font we have, so
    `dev/assets/brand-21.py` builds the digits from the logo's letters: the 2
    is its S mirrored, the 1 its I stem with a flag at the N's 53° diagonal,
    separated by a stencil slit the way the N separates its strokes; traced
    like the logo. `--n21: 1.75` runs it from the top of MC INNES to the foot
    of RACING.
  - Hidden on the opening screen (the user wanted the hero cleaner): the nav
    starts with `is-tucked` in the HTML; `onFrame()` keeps it while scrollY is
    above the point where the rider section is half way up. It shows when it
    has keyboard focus or the menu is open; without scripts a scroll timeline
    does the same where supported; the safety net brings it back if the
    script fails. The hero has no top padding now, so the photos run to the
    top. Tests that click the bar (`present.js`, `partner-links.js`) scroll
    down first.
- **Transitions:**
  - Each section pins when its end reaches the bottom of the screen. The next
    one slides over it while the covered one darkens and shrinks back.
  - Phones get the same effect, with more shrink.
  - The user asked twice for impactful transitions that also work on mobile.
    Don't remove or weaken them.
- **Motion modes:** the inline script in `<head>` sets `js` plus `motion` or
  `calm`.
  - `calm` (reduced motion): keeps stacking and darkening; everything else
    becomes fades.
  - `html:not(.js)` (scripts blocked): stacks and reveals with CSS
    scroll-driven animations where the browser supports them.
- **Dakar logo:** `assets/img/dakar-logo.svg` is a stand-in traced from the
  deck. The official file must come from the organiser (A.S.O.), with
  permission.
- **Phones:** the user found text and photos on top of each other on phones
  and allowed hiding photos. Under 700px the Dakar backdrop is hidden (it's in
  the hero slideshow) and no words sit over any photo.
- **Made in the UAE (`#uae`, after the rider profile):** from an Emirati
  person's feedback the user passed on: brands care that he's a winner ("first
  in many championships"), the Emirati element was missing, show his love for
  the UAE and giving back, a "safe pitch for UAE owned companies".
  - The lede is "Raised in the UAE and racing out of Dubai, Alex has finished
    on the podium every season from 2022 to 2025" (from the roadbook), so it
    doesn't repeat the rider profile's Dubai lines just above it.
  - An Arabic line "من الإمارات إلى داكار" with the UAE flag, the title "A
    winner made in the UAE", a results board (P1 UAE and Qatar national
    titles 2025, P1 FIM Bajas World Cup round win in Saudi Arabia 2025, P2
    vice world champion 2022 and 2024, record: youngest-ever Abu Dhabi Desert
    Challenge finisher 2022; all from the deck via the roadbook), three
    pillars (raised in the UAE, a safe choice for UAE brands, giving back) and
    "Partner with a UAE champion".
  - The title slash uses the flag's red, green and white.
  - The "Giving back" activities (rider days, school visits, talks on coming
    back from injury) are proposals written for this pitch, not facts from
    the deck: the user was told to confirm them with Alex.
- **Riding photos and film:** the user asked for these to sit subtly inside the
  existing sections and add value there, not as a gallery.
  - Once the hero slideshow existed, the user asked to remove the camel photo
    from the rider profile, the partners call-to-action panel (photo, line
    and buttons) and the 2026 season panorama. Don't bring them back.
  - Who sees your brand: the vertical black-and-white film beside the numbers.
    It is a sample of the content behind the impressions.
  - Dakar: `rocks`, night-graded behind the countdown. The stars were removed
    for it.
  - Photos in sections share one reveal: a wipe up with a slight zoom settle.
    Don't add other photo effects.
- **Your brand on the bike (`#livery`, nav "Your logo"):** the user asked for
  this. A sponsor picks a level, uploads a logo and sees it on the bike and
  kit.
  - Levels, as the user set them:
    - Platinum: front fairing, both radiator side panels (moved here from
      Gold at the user's request) and the chest of the jersey. Views: front
      fairing, jersey, side panel close-up, whole bike. Its card's tab is
      royal purple, so it can't be mistaken for Silver (the user asked).
    - Gold: the fork guards (bigger, as asked), the front fender and the front
      tank. The fork logo runs down the whole guard face. Views: fork guard
      close-up, front fender, front tank, whole bike.
    - The side panel: the user disliked a painted black decal there ("the
      black background you added looks bad"). The logo is now printed on the
      real panel (`erase` in livery.py): MotoZone and Dawlati are cleaned off,
      the white tank, trim, crease and shine stay, and four boxes (wide to
      square) fit the panel's side face below the crease, leaning -8 degrees
      like the Dawlati logo.
    - Silver: the rear tank and the rear fender. The logo takes the top slot of
      each logo stack (EBC's place in the photos), painted in the panel's own
      measured colour (`match`). No whole-bike view: one slot is invisible at
      that distance.
  - Photos: `source-images/livery-*.jpg`, from the user, shot in the workshop,
    plus one standing in the dunes: side (whole bike), fairing, rider, front
    (front fender), front-tank (the tank top seen from the seat, first
    mislabelled as a rear fender), rear-tank, rear-fender.
  - `dev/assets/livery.py` holds the levels, views and placements. It writes
    the web photos, one packed map per placement
    (`assets/img/livery/map-*.webp`: red = mask, green = shading, blue =
    gloss) and the `livery-data` JSON block in index.html. Shading is sampled
    only from the panel's own colour, so old logos don't ghost through.
  - The renderer (site.js, "your brand on the bike"):
    - Canvas 2D. The logo is warped with a homography drawn as a 10×10
      triangle mesh.
    - Each decal is a panel colour + logo, then the shading is multiplied, the
      gloss screened and the mask applied.
    - A placement with a cleaned copy (`plate-<id>.webp`) draws that copy
      instead of a colour, and only the logo takes the shading and gloss.
    - Composites are cached per photo, level and logo.
  - Logo handling: background removal by flood fill from the edges when the
    border is one plain colour. A one-colour version (white on dark panels,
    ink on light ones) is used only when under 35% of the logo would show. It
    is keyed on brightness like a reversed logo, so a badge keeps its
    lettering instead of becoming a plain shape.
  - Sharing:
    - "Download the preview" makes one sheet with every view of the level.
    - "Ask about <level>" opens a WhatsApp chat with the level filled in (the
      user asked for this); a prefilled email is offered as the alternative.
- **Film behaviour:**
  - It plays muted only while it's on screen and its section is less than 60%
    covered by the next one. Pinned sections stay "visible", so the stacking
    code reports cover through `film.cover(p)`.
  - Calm mode and Save-Data wait for a press. Without JavaScript the browser's
    own controls show.
  - Files: `assets/video/reel-720.webm` (AV1, CRF 38) and `reel-720.mp4`
    (H.264, CRF 28). The loop cut is 0.30 to 13.70 s of
    `source/video/reel-original.mp4`.
  - The poster is `source-images/reel-poster.jpg`, built by make-images.py.

## How the tricky parts work

- **Stacking (site.js):**
  - `layoutStacks()` sets each section's sticky `top` to
    `min(0, innerHeight - height)` (`pinTops`) and records where each section
    sits in normal flow (`flowTops`).
  - `onFrame()` works out each section's on-screen top from those numbers
    rather than measuring, so the shrink never feeds back into the maths. It
    then sets the `.shade` opacity and the shrink, eased, at 0.08 under 700px
    wide and 0.06 above.
  - Cover runs from where the next section first sits on screen:
    `min(innerHeight, flowTops[i + 1])`. On phones the hero is shorter than
    the screen, so measuring from the bottom edge shrank it at the very top
    of the page (hidden while the top bar covered it).
- **In-page links:** sticky positioning breaks native anchor jumps, so links
  scroll to `flowTop(target)`. Scroll restoration is manual and a popstate
  handler restores position. Don't swap this for plain anchors.
- **Presenter mode:**
  - It turns stacking off: `.presenting .stack` is relative, with no top and
    no transform.
  - It scales `rem` to the screen height.
  - Controls are keys, clicker, wheel and swipe, plus deep links `#present-N`.
- **Safety nets:**
  - If the script fails, a `settle` animation shows everything after 2.5s.
  - `main > section { overflow-x: clip }` stops reveal transforms from causing
    sideways scrolling.
- **Images:** `<picture>` elements with a tall crop for portrait screens (a
  square one for the hero slides on phones). Placeholders are inlined in
  `<style id="lqip">` by make-images.py.

## Working with this user

- They want clarifying questions before a big build. After that, they give
  feedback in batches: do every point, then say briefly what changed.
- They review using the single-file preview `alex-mcinnes-preview.html`, which
  you build with `dev/build-preview.py`. They didn't want video recordings.
- **Deliverables after each round:**
  - the preview, shown inline
  - a zip of the project, so nothing is lost when a cloud session ends
- Deliver the site as files. Don't publish it as a claude.ai Artifact link:
  it presents a real person under his own name.
- Ask before anything outward-facing: pushing, deploying, contacting partners.

## Open items

- **Waiting on the user:**
  - The original of `portrait.jpg` ("Why partner") goes in
    `alex-mcinnes-site/source-images/`, then run `tools/make-images.py`. It is
    the last low-resolution crop from the deck. The old contact crop is kept
    in `source/replaced-photos/`; the old hero is back as slide 4 (`dust.jpg`).
  - Alex's confirmation of the "Giving back" activities in "A winner made in
    the UAE" (rider days, school visits, talks), or the real ones to use.
  - The official Dakar logo.
  - Official broadcaster logos (Eurosport, Rally-Raid Network, Saudia). The
    current ones are cut from the deck.
  - The domain. The site assumes `https://mcinnesracing.com/` (canonical,
    `og:url`, JSON-LD, robots.txt, sitemap.xml).
- **Built from the proposals:**
  - "Your brand on the bike", with Platinum, Gold and Silver levels.
  - The reel (a sample of Alex's film content, in "Who sees your brand").
- **Still proposed:**
  1. Partnership packages: what each level includes beyond logo space (content
     days, posts, hospitality), plus an enquiry form (Netlify Forms or
     Formspree once hosted). This needs Alex's real packages and prices.
  2. Audience proof: follower age, top countries and engagement rate. This
     needs Instagram or TikTok insights. An Instagram analytics connector was
     available in the old account; it has to be connected again in this one.
  3. Smaller wins:
     - partner quotes and results
     - a downloadable media kit
     - an Arabic version
     - a live Dakar tracker in January
- **After the rally:** after 16 January 2027 the trip meter hides by itself,
  and the season content needs a refresh.

## Checking your work

```bash
python3 -m http.server 8123 --bind 127.0.0.1 --directory alex-mcinnes-site   # keep running in the background
```

The tools in `dev/` expect that server (or the built preview file). A change is
done when all of these hold:

- no console errors
- no sideways scrolling at 390, 768, 820 and 1024 px
- all 18 presenter stops fit 1280×720 and 1920×1080
- links and the back button land on the right sections
- stacking holds still in all three modes (`dev/stack-modes.js`)
- the preview passes `dev/check-preview.js`

`dev/README.md` has the commands. Playwright's Chromium cannot play H.264,
so on the served site it plays the AV1 file. The single-file preview carries only
the MP4, so check the film in the preview with a real browser.
