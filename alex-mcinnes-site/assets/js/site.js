/* Alex McInnes Racing
   Hero load sequence and photos, section stacking, title reveals, counters,
   ticker, film, Dakar trip meter, navigation and presenter mode. No dependencies. */

(() => {
  "use strict";

  /* Dakar 2027 runs 1 to 15 January in Saudi Arabia (UTC+3). Change these if
     the organisers move the dates, and update the matching text in index.html. */
  const DAKAR_START = new Date("2027-01-01T00:00:00+03:00");
  const DAKAR_END = new Date("2027-01-16T00:00:00+03:00");

  const root = document.documentElement;
  root.classList.add("js-ok");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionOK = () => !reducedMotion.matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ---------- hero: reveal once the photo is decoded and the type is ready ---------- */

  const hero = $(".hero");
  let heroReady = Promise.resolve();
  if (hero) {
    const img = $(".hero-slide.is-shown img", hero);
    const decoded = img && img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    const fonts = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    heroReady = Promise.race([Promise.all([decoded, fonts]), wait(2200)]).then(() => new Promise((resolve) => {
      requestAnimationFrame(() => {
        hero.classList.add("is-ready");
        resolve();
      });
    }));
  }

  /* ---------- hero photos: one after another, above the name ---------- */

  // Returns the hook the stacking needs, or null when the hero has one photo.
  function setupCarousel() {
    const stage = hero && $(".hero-media", hero);
    const slides = stage ? $$(".hero-slide", stage) : [];
    if (slides.length < 2) return null;
    const live = $(".hero-slides", stage);
    const toggle = $(".hero-toggle", stage);
    const dots = $$(".hero-dot", stage);
    const hold = (parseFloat(getComputedStyle(hero).getPropertyValue("--hold")) || 6.5) * 1000;
    // It moves on by itself unless the visitor asked for less motion or less data.
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    let rotating = false;
    let current = 0;
    let timer = 0;
    let dueAt = 0;
    let remaining = hold;
    let ready = false;
    let inView = true;
    let covered = false;
    let focused = false;
    let turn = 0;

    $(".hero-controls", stage).hidden = false;

    // Held while the controls have keyboard focus and while the hero is out of
    // sight; the clock resumes where it stopped. (Not on hover: the photos fill
    // the screen, so a resting pointer would stop them for most visitors. The
    // pause button is there for anyone who wants them still.)
    const held = () => !ready || !inView || covered || focused || document.hidden;
    function schedule() {
      clearTimeout(timer);
      timer = 0;
      stage.classList.toggle("is-held", held());
      if (!rotating || held()) return;
      dueAt = performance.now() + remaining;
      timer = setTimeout(() => {
        timer = 0;
        show(current + 1);
      }, remaining);
    }
    function update() {
      if (timer) remaining = Math.max(0, dueAt - performance.now());
      schedule();
    }

    // Where the name sits on each photo. From tablet width it rides on the
    // photo: each slide lists the places it may take (data-name: "top ink,
    // tl ink", one line at the top or bottom, or stacked in a corner, in ink
    // or white) and the rider's boxes as fractions of the photo
    // (data-subjects). The first place that leaves every box clear on this
    // screen wins; failing that, the one that covers least. Phones show the
    // name under the photo instead.
    const PLACES = ["name-top", "name-bottom", "name-tl", "name-tr", "name-bl", "name-br", "tone-ink", "tone-light"];
    const onPhoto = window.matchMedia("(min-width: 700px)");
    const setPlace = (slide, pos, tone) => {
      slide.classList.remove(...PLACES);
      slide.classList.add(`name-${pos}`, `tone-${tone}`);
    };
    // The rider's boxes in the slide's own pixels, after object-fit: cover.
    function subjectsIn(slide, box) {
      const img = $("img", slide);
      const nw = img.naturalWidth || +img.getAttribute("width");
      const nh = img.naturalHeight || +img.getAttribute("height");
      const scale = Math.max(box.width / nw, box.height / nh);
      const w = nw * scale;
      const h = nh * scale;
      const [px, py] = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
      const ox = (box.width - w) * px;
      const oy = (box.height - h) * py;
      return slide.dataset.subjects.split(";").map((part) => {
        const [x0, y0, x1, y1] = part.trim().split(/\s+/).map(Number);
        return { left: ox + x0 * w, top: oy + y0 * h, right: ox + x1 * w, bottom: oy + y1 * h };
      });
    }
    function place(slide) {
      if (!onPhoto.matches || !slide.dataset.name) return;
      const box = slide.getBoundingClientRect();
      const words = $$(".slide-name .hero-name-art .word", slide);
      if (!box.width || !box.height || !words.length) return;
      const subjects = subjectsIn(slide, box);
      const pad = box.width * 0.012;
      let best = null;
      for (const option of slide.dataset.name.split(",")) {
        const [pos, tone] = option.trim().split(/\s+/);
        setPlace(slide, pos, tone);
        // Overlap between the name's words and the rider's boxes.
        let hit = 0;
        words.forEach((word) => {
          const r = word.getBoundingClientRect();
          const n = { left: r.left - box.left - pad, top: r.top - box.top - pad, right: r.right - box.left + pad, bottom: r.bottom - box.top + pad };
          subjects.forEach((b) => {
            hit += Math.max(0, Math.min(n.right, b.right) - Math.max(n.left, b.left))
              * Math.max(0, Math.min(n.bottom, b.bottom) - Math.max(n.top, b.top));
          });
        });
        if (!best || hit < best.hit) best = { pos, tone, hit };
        if (!hit) break;
      }
      setPlace(slide, best.pos, best.tone);
    }
    const placeAll = () => slides.forEach((slide) => {
      if (slide.classList.contains("is-shown") || slide.classList.contains("is-armed")) place(slide);
    });

    // Photos load one step ahead of being shown, and get their name placed then.
    const arm = (i) => {
      const slide = slides[(i + slides.length) % slides.length];
      if (!slide.classList.contains("is-armed")) {
        slide.classList.add("is-armed");
        place(slide);
      }
      return slide;
    };
    const loaded = (slide) => {
      const img = $("img", slide);
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return Promise.race([
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }),
        wait(2500),
      ]);
    };

    async function show(i, back = false) {
      const n = (i + slides.length) % slides.length;
      if (n === current) return;
      const mine = ++turn;
      const from = slides[current];
      const to = arm(n);
      await loaded(to);
      if (mine !== turn) return;
      // The photo's own size is known now, so check the name's place again.
      place(to);
      hero.classList.add("has-turned");
      slides.forEach((slide) => slide.classList.remove("is-leaving", "is-entering", "is-back"));
      from.classList.replace("is-shown", "is-leaving");
      to.classList.add("is-shown", "is-entering");
      from.classList.toggle("is-back", back);
      to.classList.toggle("is-back", back);
      from.setAttribute("aria-hidden", "true");
      to.removeAttribute("aria-hidden");
      dots.forEach((dot, k) => {
        if (k === n) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      current = n;
      remaining = hold;
      schedule();
      if (rotating) arm(n + 1);
      setTimeout(() => {
        if (mine !== turn) return;
        from.classList.remove("is-leaving", "is-back");
        to.classList.remove("is-entering", "is-back");
      }, 1300);
    }

    function setRotating(on) {
      rotating = on;
      stage.classList.toggle("is-rotating", on);
      toggle.setAttribute("aria-label", on ? "Pause the photos" : "Play the photos");
      // Announce each photo only when the visitor is moving through them.
      live.setAttribute("aria-live", on ? "off" : "polite");
      remaining = hold;
      if (on) arm(current + 1);
      schedule();
    }

    toggle.addEventListener("click", () => setRotating(!rotating));
    dots.forEach((dot, k) => dot.addEventListener("click", () => show(k, k < current)));
    stage.addEventListener("focusin", () => {
      focused = true;
      update();
    });
    stage.addEventListener("focusout", (e) => {
      if (stage.contains(e.relatedTarget)) return;
      focused = false;
      update();
    });
    document.addEventListener("visibilitychange", update);

    // A sideways swipe on the photos moves to the next or previous one
    // (in presenter mode a swipe moves between slides instead).
    let startX = null;
    let startY = 0;
    stage.addEventListener("touchstart", (e) => {
      startX = e.touches.length === 1 ? e.touches[0].clientX : null;
      startY = e.touches.length === 1 ? e.touches[0].clientY : 0;
    }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (startX === null || root.classList.contains("presenting")) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      startX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1), dx > 0);
    }, { passive: true });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        inView = entries[entries.length - 1].isIntersecting;
        update();
      }, { threshold: 0.25 }).observe(stage);
    }

    // Place the first name now and again once the type has loaded (before the
    // name races in), then whenever the photos change size.
    arm(current);
    if (document.fonts) document.fonts.ready.then(placeAll).catch(() => {});
    if ("ResizeObserver" in window) {
      let pending = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(pending);
        pending = requestAnimationFrame(placeAll);
      }).observe(stage);
    }
    onPhoto.addEventListener("change", placeAll);

    setRotating(motionOK() && !saveData);
    heroReady.then(() => {
      ready = true;
      update();
    });

    return {
      section: hero,
      // The hero stays on screen, pinned, while the next section slides over
      // it, so the photos also stop once most of it is covered.
      cover(p) {
        const next = p > 0.5;
        if (next === covered) return;
        covered = next;
        update();
      },
    };
  }
  const carousel = setupCarousel();

  /* ---------- titles: split into words so each can rise in turn ---------- */

  const titles = $$(".title");
  if (motionOK()) {
    titles.forEach((title) => {
      const words = title.textContent.trim().split(/\s+/);
      title.textContent = "";
      words.forEach((word, i) => {
        const outer = document.createElement("span");
        const inner = document.createElement("span");
        outer.className = "w";
        inner.className = "wi";
        inner.style.setProperty("--wi", i);
        inner.textContent = word;
        outer.append(inner);
        title.append(outer);
        if (i < words.length - 1) title.append(" ");
      });
    });
  }

  /* ---------- reveal on view: titles, routes, rounds, stamps, numbers ---------- */

  const numberFormat = new Intl.NumberFormat("en-GB");
  const counters = $$("[data-count]");

  function countUp(el) {
    const target = Number(el.dataset.count) || 0;
    if (!motionOK()) {
      el.textContent = numberFormat.format(target);
      return;
    }
    const duration = 1700;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = numberFormat.format(Math.round(target * (1 - Math.pow(1 - t, 4))));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window) {
    const revealer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        revealer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
    $$("[data-reveal], .title").forEach((el) => revealer.observe(el));

    if (motionOK()) {
      // Hold each counter at its final width so the layout never shifts while it runs.
      counters.forEach((el) => {
        el.style.minWidth = `${el.getBoundingClientRect().width}px`;
        el.textContent = "0";
      });
    }
    const counter = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        countUp(entry.target);
        counter.unobserve(entry.target);
      }
    }, { threshold: 0.6 });
    counters.forEach((el) => counter.observe(el));
  } else {
    $$("[data-reveal], .title").forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- the film: plays muted while it is on screen ---------- */

  // Returns the hooks the stacking needs, or null when the page has no film.
  function setupFilm() {
    const figure = $(".reel");
    const video = figure && $("video", figure);
    if (!video) return null;
    const playBtn = $(".reel-play", figure);
    const soundBtn = $(".reel-sound", figure);
    // It starts by itself unless the visitor asked for less motion or less data.
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    const auto = motionOK() && !saveData;
    let inView = false;
    let covered = false;
    let userPaused = !auto;

    // The script's own buttons replace the browser's controls.
    video.removeAttribute("controls");
    $(".reel-controls", figure).hidden = false;

    const sync = () => {
      const playing = !video.paused;
      playBtn.classList.toggle("is-playing", playing);
      playBtn.setAttribute("aria-label", playing ? "Pause film" : "Play film");
      soundBtn.setAttribute("aria-pressed", String(!video.muted));
    };
    const update = () => {
      const visible = inView && !covered && !document.hidden;
      if (visible && !userPaused) {
        if (video.paused) video.play().catch(() => {});
      } else if (!video.paused) {
        video.pause();
      }
    };

    ["play", "pause", "volumechange"].forEach((type) => video.addEventListener(type, sync));
    playBtn.addEventListener("click", () => {
      userPaused = !video.paused;
      if (userPaused) video.pause();
      else video.play().catch(() => {});
    });
    soundBtn.addEventListener("click", () => {
      video.muted = !video.muted;
      if (!video.muted && video.paused) {
        userPaused = false;
        video.play().catch(() => {});
      }
    });
    document.addEventListener("visibilitychange", update);

    if ("IntersectionObserver" in window) {
      // Fetch the film a little before it scrolls into view.
      if (auto) {
        const early = new IntersectionObserver((entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          early.disconnect();
          video.preload = "auto";
        }, { rootMargin: "75% 0px" });
        early.observe(figure);
      }
      new IntersectionObserver((entries) => {
        inView = entries[entries.length - 1].isIntersecting;
        update();
      }, { threshold: 0.35 }).observe(figure);
    }
    sync();

    return {
      section: figure.closest("main > section"),
      // A pinned section stays on screen under the ones that slide over it,
      // so the film also stops once the next section covers most of it.
      cover(p) {
        const next = p > 0.6;
        if (next === covered) return;
        covered = next;
        update();
      },
    };
  }
  const film = setupFilm();

  /* ---------- section stacking: each section pins, the next slides over ---------- */

  const mainEl = $("main");
  const sections = $$("main > section");
  const stacks = $$("main > .stack");
  let flowTops = [];
  let pinTops = [];
  const shades = stacks.map((section) => {
    const shade = document.createElement("div");
    shade.className = "shade";
    shade.setAttribute("aria-hidden", "true");
    section.append(shade);
    return shade;
  });

  // A section pins once its end reaches the bottom of the screen. Pinned
  // sections report their pinned position, so also record where each one
  // sits in the normal page flow for links and the navigation.
  function layoutStacks() {
    const vh = window.innerHeight;
    pinTops = stacks.map((section) => {
      const top = Math.min(0, vh - section.offsetHeight);
      section.style.top = `${top}px`;
      return top;
    });
    let y = mainEl.getBoundingClientRect().top + window.scrollY;
    flowTops = sections.map((section) => {
      const top = y;
      y += section.offsetHeight;
      return top;
    });
  }

  // Where an element sits in the page when nothing is pinned.
  function flowTop(el) {
    const section = el.closest("main > section");
    if (!section) return el.getBoundingClientRect().top + window.scrollY;
    const top = flowTops[sections.indexOf(section)];
    return top + (el.getBoundingClientRect().top - section.getBoundingClientRect().top);
  }
  layoutStacks();
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => requestAnimationFrame(layoutStacks));
    stacks.forEach((section) => ro.observe(section));
  }

  const dakar = $("#dakar");
  const dunes = $$(".dune");
  let presenting = false;

  function onFrame() {
    ticking = false;
    nav.classList.toggle("is-solid", window.scrollY > 24);
    // The top bar stays out of the way on the opening screen and slides in
    // once the next section is half way up the screen.
    nav.classList.toggle("is-tucked", flowTops.length > 1 && window.scrollY < flowTops[1] - window.innerHeight / 2);
    if (presenting) return;
    updateNavCurrent();
    const motion = motionOK();
    const vh = window.innerHeight;
    const y = window.scrollY;
    // How far a fully covered section shrinks back: more on narrow screens,
    // where the same share of the width is only a few pixels.
    const recede = window.innerWidth < 700 ? 0.08 : 0.06;

    // Where each section's top is on screen, worked out from the layout rather
    // than measured, so a section's own shrink never feeds back into the maths.
    const tops = stacks.map((section, k) => Math.max(flowTops[k] - y, pinTops[k]));

    // As a section slides over the one below, that one darkens and shrinks
    // back into the page, like a card being pushed under the next. Calm mode
    // keeps the darkening only.
    for (let i = 0; i < stacks.length - 1; i++) {
      const next = tops[i + 1];
      // Cover runs from where the next section first sits on screen: the
      // bottom edge, or higher for a first section shorter than the screen
      // (the hero on a phone), so nothing shrinks before the page moves.
      const start = Math.min(vh, flowTops[i + 1]);
      const p = next >= start ? 0 : clamp(1 - next / start, 0, 1);
      const section = stacks[i];
      const shade = shades[i];
      if (film && section === film.section) film.cover(p);
      if (carousel && section === carousel.section) carousel.cover(p);
      if (p === 0) {
        if (shade.style.visibility !== "hidden") shade.style.visibility = "hidden";
        if (section.style.transform) {
          section.style.transform = "";
          section.style.willChange = "";
        }
        continue;
      }
      shade.style.visibility = "visible";
      shade.style.opacity = (p * 0.65).toFixed(3);
      if (!motion) continue;
      const eased = 1 - (1 - p) * (1 - p);
      section.style.transform = `scale(${(1 - recede * eased).toFixed(4)})`;
      section.style.willChange = p < 1 ? "transform" : "";
    }
    if (!motion) return;

    // Dunes rise at different speeds as the Dakar section comes in.
    if (dakar && dunes.length) {
      const k = stacks.indexOf(dakar);
      const r = { top: tops[k], bottom: tops[k] + dakar.offsetHeight };
      if (r.top < vh && r.bottom > 0) {
        const p = clamp((vh - r.top) / vh, 0, 1);
        const lift = [70, 40, 14];
        dunes.forEach((dune, i) => {
          dune.style.transform = `translateY(${((1 - p) * lift[i]).toFixed(1)}px)`;
        });
      }
    }
  }

  let ticking = false;
  const requestFrame = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onFrame);
    }
  };
  window.addEventListener("scroll", requestFrame, { passive: true });

  /* ---------- news ticker ---------- */

  const tickerList = $(".ticker-list");
  if (tickerList && motionOK()) {
    [...tickerList.children].forEach((item) => {
      const copy = item.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      tickerList.append(copy);
    });
    tickerList.classList.add("is-running");
  }

  /* ---------- Dakar countdown ---------- */

  const pad2 = (n) => String(n).padStart(2, "0");

  function updateCountdowns() {
    const now = new Date();
    const before = now < DAKAR_START;
    const during = !before && now < DAKAR_END;
    const ms = DAKAR_START - now;
    // Whole days left, matching the trip meter below.
    const days = Math.floor(ms / 86400000);
    const unit = days === 1 ? "day" : "days";

    const short = $('[data-countdown="short"]');
    if (short) {
      if (before && days >= 1) short.innerHTML = `<b>${days}</b> ${unit} to the Dakar start on 1 January 2027`;
      else if (before) short.innerHTML = "<b>Under a day</b> to the Dakar start";
      else if (during) short.innerHTML = "<b>Racing now:</b> Dakar 2027 runs until 15 January";
    }

    const meter = $('[data-countdown="meter"]');
    if (meter) {
      if (!before) {
        meter.hidden = true;
        return;
      }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor(ms / 3600000) % 24;
      const m = Math.floor(ms / 60000) % 60;
      $('[data-tm="days"]', meter).textContent = d;
      $('[data-tm="hours"]', meter).textContent = pad2(h);
      $('[data-tm="minutes"]', meter).textContent = pad2(m);
      $("[data-countdown-text]", meter).textContent = `${d} days, ${h} hours and ${m} minutes to the start of the Dakar Rally.`;
      meter.hidden = false;
    }
  }
  updateCountdowns();
  setInterval(updateCountdowns, 30000);

  /* ---------- your brand on the bike ---------- */

  // A visitor picks a level and adds a logo; the logo is fitted onto the
  // photos of the bike and kit with the panel's perspective, shading and
  // gloss. Everything happens in the browser: the file never leaves it.
  const liverySection = $("#livery");
  const liveryData = $("#livery-data");
  if (liverySection && liveryData && liveryData.textContent.length > 2) {
    setupLivery(liverySection, JSON.parse(liveryData.textContent));
  }

  function setupLivery(section, data) {
    const TIER_NAMES = { platinum: "Platinum", gold: "Gold", silver: "Silver" };
    const DECAL = { light: "#F3F2EF", dark: "#141317", jersey: "#1B1A27" };
    const INK = "#1C1611";
    const PLATE = "#F6F3EE";
    const MAX_LOGO = 1400; // longest side we keep from an uploaded logo
    const form = $(".livery-controls", section);
    const canvas = $(".stage-canvas", section);
    const still = $(".stage-still", section);
    const viewBar = $(".stage-views", section);
    const status = $(".livery-status", section);
    const fileInput = $('input[name="logo"]', section);
    const dropzone = $(".dropzone", section);
    const dzLogo = $(".dz-logo", section);
    const bgLabel = $(".livery-check", section);
    const bgBox = $('input[name="removebg"]', section);
    const askLink = $('[data-livery="ask"]', section);
    const askLabel = $('[data-livery="ask-label"]', section);
    const emailLink = $('[data-livery="email"]', section);
    const downloadBtn = $('[data-livery="download"]', section);

    const state = { tier: "platinum", view: data.tiers.platinum[0], logo: null, upload: null, version: 0 };
    const cache = new Map(); // images and maps by URL
    const composed = new Map(); // "photo|tier|version" -> canvas with decals
    let started = false;
    let drawing = 0;

    /* -- loading -- */

    const loadImage = (src) => {
      if (!cache.has(src)) {
        cache.set(src, new Promise((resolve, reject) => {
          const img = new Image();
          img.decoding = "async";
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Could not load ${src}`));
          img.src = src;
        }));
      }
      return cache.get(src);
    };
    const makeCanvas = (w, h) => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w));
      c.height = Math.max(1, Math.round(h));
      return c;
    };

    // Each placement's map packs three layers: red = where the decal goes,
    // green = the surface's shading, blue = its highlights.
    const mapsFor = (pl) => {
      const key = `maps:${pl.id}`;
      if (!cache.has(key)) {
        cache.set(key, loadImage(pl.map).then(async (img) => {
          const [, , w, h] = pl.box;
          const src = makeCanvas(w, h);
          const sctx = src.getContext("2d", { willReadFrequently: true });
          sctx.drawImage(img, 0, 0, w, h);
          const px = sctx.getImageData(0, 0, w, h).data;
          const layers = ["mask", "shade", "gloss"].map(() => makeCanvas(w, h));
          const out = layers.map((c) => c.getContext("2d").createImageData(w, h));
          for (let i = 0; i < px.length; i += 4) {
            const [m, s, g] = [px[i], px[i + 1], px[i + 2]];
            out[0].data[i + 3] = m;
            out[1].data[i] = out[1].data[i + 1] = out[1].data[i + 2] = s;
            out[1].data[i + 3] = 255;
            out[2].data[i] = out[2].data[i + 1] = out[2].data[i + 2] = g;
            out[2].data[i + 3] = 255;
          }
          layers.forEach((c, k) => c.getContext("2d").putImageData(out[k], 0, 0));
          // Some panels come with a cleaned copy (old graphics taken off) to print on.
          const plate = pl.plate ? await loadImage(pl.plate) : null;
          return { mask: layers[0], shade: layers[1], gloss: layers[2], plate };
        }));
      }
      return cache.get(key);
    };

    /* -- geometry -- */

    // The 3x3 projective transform that maps four points onto four others.
    function homography(src, dst) {
      const A = [];
      for (let i = 0; i < 4; i++) {
        const [x, y] = src[i];
        const [u, v] = dst[i];
        A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
        A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
      }
      for (let c = 0; c < 8; c++) {
        let pivot = c;
        for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[pivot][c])) pivot = r;
        [A[c], A[pivot]] = [A[pivot], A[c]];
        for (let r = 0; r < 8; r++) {
          if (r === c) continue;
          const f = A[r][c] / A[c][c];
          for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
        }
      }
      const h = A.map((row, i) => row[8] / row[i]);
      return [...h, 1];
    }
    const project = (H, x, y) => {
      const w = H[6] * x + H[7] * y + H[8];
      return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
    };
    const UNIT = [[0, 0], [1, 0], [1, 1], [0, 1]];

    // Where the logo goes: as large as fits in one of the placement's boxes,
    // with a margin, centred and in proportion. Some placements offer a wide
    // box and a squarer one; the one that shows the logo larger wins.
    function logoQuad(pl, logoAspect) {
      const area = (q) => Math.abs(q.reduce((sum, [x, y], i) => {
        const [nx, ny] = q[(i + 1) % q.length];
        return sum + x * ny - nx * y;
      }, 0)) / 2;
      return pl.fits
        .map((fit) => fitInto(fit, logoAspect, pl.margin ?? 0.08))
        .reduce((best, q) => (area(q) > area(best) ? q : best));
    }
    function fitInto(fit, logoAspect, share) {
      const A = fit.aspect;
      const margin = share * Math.min(A, 1);
      const bw = A - 2 * margin;
      const bh = 1 - 2 * margin;
      let lw = bw;
      let lh = bw / logoAspect;
      if (lh > bh) {
        lh = bh;
        lw = bh * logoAspect;
      }
      const u0 = (A - lw) / 2 / A;
      const u1 = (A + lw) / 2 / A;
      const v0 = (1 - lh) / 2;
      const v1 = (1 + lh) / 2;
      const H = homography(UNIT, fit.quad);
      return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => project(H, u, v));
    }

    // Canvas has no perspective, so draw the logo as a mesh of small
    // triangles, each with its own flat transform.
    function warp(ctx, img, quad, n = 10) {
      const w = img.width;
      const h = img.height;
      const H = homography([[0, 0], [w, 0], [w, h], [0, h]], quad);
      const pts = [];
      for (let j = 0; j <= n; j++) {
        for (let i = 0; i <= n; i++) {
          const sx = (i / n) * w;
          const sy = (j / n) * h;
          pts.push({ s: [sx, sy], d: project(H, sx, sy) });
        }
      }
      const at = (i, j) => pts[j * (n + 1) + i];
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const a = at(i, j);
          const b = at(i + 1, j);
          const c = at(i + 1, j + 1);
          const d = at(i, j + 1);
          triangle(ctx, img, a, b, c);
          triangle(ctx, img, a, c, d);
        }
      }
    }
    function triangle(ctx, img, p0, p1, p2) {
      const [x0, y0] = p0.s;
      const [x1, y1] = p1.s;
      const [x2, y2] = p2.s;
      const [u0, v0] = p0.d;
      const [u1, v1] = p1.d;
      const [u2, v2] = p2.d;
      const den = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
      if (!den) return;
      const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / den;
      const c = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / den;
      const e = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / den;
      const b = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / den;
      const d = (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / den;
      const f = (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / den;
      // Grow the clip a fraction of a pixel so neighbouring triangles leave no seam.
      const cx = (u0 + u1 + u2) / 3;
      const cy = (v0 + v1 + v2) / 3;
      const grow = ([x, y]) => {
        const dx = x - cx;
        const dy = y - cy;
        const len = Math.hypot(dx, dy) || 1;
        return [x + (dx / len) * 0.8, y + (dy / len) * 0.8];
      };
      const q0 = grow(p0.d);
      const q1 = grow(p1.d);
      const q2 = grow(p2.d);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(q0[0], q0[1]);
      ctx.lineTo(q1[0], q1[1]);
      ctx.lineTo(q2[0], q2[1]);
      ctx.closePath();
      ctx.clip();
      ctx.transform(a, b, c, d, e, f);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }

    /* -- the logo -- */

    // Until a logo is added, the placements show a stand-in.
    function standIn() {
      const font = 'italic 900 230px "Saira", "Archivo", sans-serif';
      const probe = makeCanvas(1, 1).getContext("2d");
      probe.font = font;
      // Room for the italic's lean on both sides.
      const c = makeCanvas(probe.measureText("YOUR LOGO").width + 120, 300);
      const ctx = c.getContext("2d");
      ctx.fillStyle = INK;
      ctx.font = font;
      ctx.fillText("YOUR LOGO", 60, 240);
      return finishLogo(c, "stand-in");
    }

    // Trim to the visible artwork and measure how much of it would still show
    // on a light panel and on a dark one.
    function finishLogo(c, name) {
      const ctx = c.getContext("2d", { willReadFrequently: true });
      const { data: px } = ctx.getImageData(0, 0, c.width, c.height);
      let x0 = c.width;
      let y0 = c.height;
      let x1 = -1;
      let y1 = -1;
      let showsOnDark = 0;
      let showsOnLight = 0;
      let solid = 0;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const i = (y * c.width + x) * 4;
          if (px[i + 3] < 24) continue;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
          if (px[i + 3] > 160) {
            const l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
            solid++;
            if (l > 0.33) showsOnDark++;
            if (l < 0.7) showsOnLight++;
          }
        }
      }
      if (x1 < 0) return null;
      const out = makeCanvas(x1 - x0 + 1, y1 - y0 + 1);
      out.getContext("2d").drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
      return {
        name,
        art: out,
        // Under a third showing means the logo would mostly vanish into the panel.
        fadesOnDark: solid > 0 && showsOnDark / solid < 0.35,
        fadesOnLight: solid > 0 && showsOnLight / solid < 0.35,
        tinted: {},
      };
    }

    // A one-colour version for surfaces where the logo's own colours would
    // vanish: white on dark panels, ink on light ones. It is keyed on
    // brightness, like a reversed logo: on a dark panel the logo's dark parts
    // turn white and its light parts drop out (the other way round in ink),
    // so a badge keeps its lettering instead of becoming a plain shape.
    function artFor(logo, tone) {
      const surfaceDark = tone !== "light";
      let colour = null;
      if (surfaceDark && logo.fadesOnDark) colour = PLATE;
      if (!surfaceDark && logo.fadesOnLight) colour = INK;
      if (!colour) return logo.art;
      if (!logo.tinted[colour]) {
        const c = makeCanvas(logo.art.width, logo.art.height);
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(logo.art, 0, 0);
        const img = ctx.getImageData(0, 0, c.width, c.height);
        const px = img.data;
        const rgb = [1, 3, 5].map((k) => parseInt(colour.slice(k, k + 2), 16));
        // 1 at `full`, 0 at `none`, a straight ramp between.
        const ramp = (none, full, l) => Math.min(1, Math.max(0, (l - none) / (full - none)));
        for (let i = 0; i < px.length; i += 4) {
          const l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
          const keep = surfaceDark ? ramp(0.85, 0.6, l) : ramp(0.15, 0.4, l);
          [px[i], px[i + 1], px[i + 2]] = rgb;
          px[i + 3] = Math.round(px[i + 3] * keep);
        }
        ctx.putImageData(img, 0, 0);
        logo.tinted[colour] = c;
      }
      return logo.tinted[colour];
    }

    async function readLogo(file) {
      const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
      if (!isSvg && !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
        throw new Error("That file isn’t a logo image. Use a PNG, SVG, JPG or WebP file.");
      }
      let blob = file;
      if (isSvg) {
        // SVGs without a width and height draw at zero size in some browsers.
        let text = await file.text();
        const svgTag = text.match(/<svg\b[^>]*>/i);
        if (svgTag && !/\swidth=/.test(svgTag[0])) {
          const vb = svgTag[0].match(/viewBox=["']\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
          const [w, h] = vb ? [parseFloat(vb[1]), parseFloat(vb[2])] : [1000, 500];
          text = text.replace(/<svg\b/i, `<svg width="${w}" height="${h}"`);
        }
        blob = new Blob([text], { type: "image/svg+xml" });
      }
      const url = URL.createObjectURL(blob);
      try {
        const img = await new Promise((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = () => reject(new Error("That image couldn’t be opened. Try saving it as a PNG."));
          im.src = url;
        });
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        if (!iw || !ih) throw new Error("That image has no size. Try saving it as a PNG.");
        const scale = isSvg ? MAX_LOGO / Math.max(iw, ih) : Math.min(1, MAX_LOGO / Math.max(iw, ih));
        const c = makeCanvas(iw * scale, ih * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        return { canvas: c, name: file.name };
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    // A logo saved on a plain background (often white JPGs) gets that
    // background removed, working in from the edges so white inside the
    // artwork stays.
    function plainBackground(c) {
      const ctx = c.getContext("2d", { willReadFrequently: true });
      const { width: w, height: h } = c;
      const px = ctx.getImageData(0, 0, w, h).data;
      let seeThrough = 0;
      for (let i = 3; i < px.length; i += 16) if (px[i] < 250) seeThrough++;
      if (seeThrough > px.length / 16 * 0.02) return null; // already transparent
      const border = [];
      for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
      for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
      const cols = border.map((k) => [px[k * 4], px[k * 4 + 1], px[k * 4 + 2]]);
      const med = [0, 1, 2].map((ch) => cols.map((col) => col[ch]).sort((a, b) => a - b)[cols.length >> 1]);
      const near = cols.filter((col) => Math.hypot(col[0] - med[0], col[1] - med[1], col[2] - med[2]) < 40).length;
      return near / cols.length > 0.85 ? med : null;
    }
    function removeBackground(c, bg) {
      const out = makeCanvas(c.width, c.height);
      const ctx = out.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(c, 0, 0);
      const { width: w, height: h } = out;
      const img = ctx.getImageData(0, 0, w, h);
      const px = img.data;
      const LOW = 34;
      const HIGH = 70;
      const dist = (k) => Math.hypot(px[k * 4] - bg[0], px[k * 4 + 1] - bg[1], px[k * 4 + 2] - bg[2]);
      const seen = new Uint8Array(w * h);
      const stack = [];
      const push = (k) => {
        if (!seen[k] && dist(k) < HIGH) {
          seen[k] = 1;
          stack.push(k);
        }
      };
      for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
      for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
      while (stack.length) {
        const k = stack.pop();
        const d = dist(k);
        px[k * 4 + 3] = d < LOW ? 0 : Math.round((255 * (d - LOW)) / (HIGH - LOW));
        if (d >= LOW) continue; // edge pixels soften but don't spread the fill
        const x = k % w;
        if (x > 0) push(k - 1);
        if (x < w - 1) push(k + 1);
        if (k >= w) push(k - w);
        if (k < w * (h - 1)) push(k + w);
      }
      ctx.putImageData(img, 0, 0);
      return out;
    }

    function useUpload() {
      const { canvas: raw, bg, name } = state.upload;
      const art = bg && bgBox.checked ? removeBackground(raw, bg) : raw;
      const logo = finishLogo(art, name);
      if (!logo) {
        say("That image looks empty. Try another file.");
        return;
      }
      state.logo = logo;
      state.version++;
      composed.clear();
      showThumb(logo.art);
      draw();
    }

    function showThumb(art) {
      const c = makeCanvas(art.width, art.height);
      c.getContext("2d").drawImage(art, 0, 0);
      dzLogo.replaceChildren(c);
      dropzone.classList.add("has-logo");
    }

    async function takeFile(file) {
      if (!file) return;
      say("Adding your logo…");
      try {
        const { canvas: raw, name } = await readLogo(file);
        const bg = plainBackground(raw);
        state.upload = { canvas: raw, bg, name };
        bgLabel.hidden = !bg;
        bgBox.checked = true;
        useUpload();
        say(bg ? `Added ${name}. Its background was removed; untick the box to keep it.` : `Added ${name}.`);
      } catch (err) {
        say(err.message);
      }
    }

    function say(text) {
      status.textContent = text;
    }

    /* -- drawing -- */

    // A lighting layer limited to the logo: the layer where the logo is, and
    // `base` (which leaves the panel unchanged) everywhere else.
    function underLogo(layer, ink, base) {
      const cut = makeCanvas(ink.width, ink.height);
      const c = cut.getContext("2d");
      c.drawImage(layer, 0, 0);
      c.globalCompositeOperation = "destination-in";
      c.drawImage(ink, 0, 0);
      const out = makeCanvas(ink.width, ink.height);
      const o = out.getContext("2d");
      o.fillStyle = base;
      o.fillRect(0, 0, out.width, out.height);
      o.drawImage(cut, 0, 0);
      return out;
    }

    async function decal(ctx, pl, logo) {
      const maps = await mapsFor(pl);
      const [bx, by, bw, bh] = pl.box;
      const art = artFor(logo, pl.tone);
      const quad = logoQuad(pl, art.width / art.height);
      const off = makeCanvas(bw, bh);
      const o = off.getContext("2d");
      if (maps.plate) {
        // Printed straight onto the real panel: the panel keeps its own look,
        // and only the logo takes its shading and reflections.
        const ink = makeCanvas(bw, bh);
        warp(ink.getContext("2d"), art, quad);
        o.drawImage(maps.plate, 0, 0, bw, bh);
        o.drawImage(ink, 0, 0);
        o.globalCompositeOperation = "multiply";
        o.drawImage(underLogo(maps.shade, ink, "#fff"), 0, 0);
        o.globalCompositeOperation = "screen";
        o.drawImage(underLogo(maps.gloss, ink, "#000"), 0, 0);
      } else {
        // Slots on a panel take the panel's own measured colour; other decals
        // are a set white, black or navy.
        o.fillStyle = pl.fill || DECAL[pl.tone];
        o.fillRect(0, 0, bw, bh);
        warp(o, art, quad);
        o.globalCompositeOperation = "multiply";
        o.drawImage(maps.shade, 0, 0);
        o.globalCompositeOperation = "screen";
        o.drawImage(maps.gloss, 0, 0);
      }
      o.globalCompositeOperation = "destination-in";
      o.drawImage(maps.mask, 0, 0);
      ctx.drawImage(off, bx, by);
    }

    // The photo with this level's decals, at the photo's full size.
    function compose(photoId, tier) {
      const logo = state.logo || state.standIn;
      const key = `${photoId}|${tier}|${state.logo ? state.version : "stand-in"}`;
      if (!composed.has(key)) {
        composed.set(key, (async () => {
          const photo = data.photos[photoId];
          const img = await loadImage(photo.src);
          const [w, h] = photo.size;
          const c = makeCanvas(w, h);
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          for (const pl of data.placements) {
            if (pl.photo === photoId && pl.tier === tier) await decal(ctx, pl, logo);
          }
          return c;
        })());
      }
      return composed.get(key);
    }

    const cropOf = (viewId) => {
      const view = data.views[viewId];
      const [w, h] = data.photos[view.photo].size;
      return view.crop || [0, 0, w, h];
    };
    const placementsIn = (viewId, tier) => {
      const view = data.views[viewId];
      const [x0, y0, x1, y1] = cropOf(viewId);
      return data.placements.filter((pl) => {
        if (pl.photo !== view.photo || pl.tier !== tier) return false;
        const [bx, by, bw, bh] = pl.box;
        return bx < x1 && bx + bw > x0 && by < y1 && by + bh > y0;
      });
    };
    const listLabels = (labels) => {
      const unique = [...new Set(labels.map((l) => l.toLowerCase()))];
      if (unique.length < 2) return unique.join("");
      return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`;
    };

    async function draw() {
      const ticket = ++drawing;
      const { tier, view } = state;
      section.classList.add("is-drawing");
      try {
        const src = await compose(data.views[view].photo, tier);
        if (ticket !== drawing) return;
        const [x0, y0, x1, y1] = cropOf(view);
        const box = canvas.getBoundingClientRect();
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.round((box.width || 600) * scale);
        canvas.width = w;
        canvas.height = Math.round((w * (y1 - y0)) / (x1 - x0));
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(src, x0, y0, x1 - x0, y1 - y0, 0, 0, canvas.width, canvas.height);
        const where = listLabels(placementsIn(view, tier).map((pl) => pl.label));
        const whose = state.logo ? "Your logo" : "A stand-in logo";
        canvas.setAttribute("aria-label", `${whose} on the ${where}, ${data.views[view].label.toLowerCase()} view.`);
        section.classList.add("is-ready");
      } catch (err) {
        say("The preview couldn’t load. Check your connection and try again.");
      } finally {
        if (ticket === drawing) section.classList.remove("is-drawing");
      }
    }

    function buildViews() {
      viewBar.replaceChildren(...data.tiers[state.tier].map((id) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "view-btn";
        b.textContent = data.views[id].label;
        b.dataset.view = id;
        b.setAttribute("aria-pressed", String(id === state.view));
        b.addEventListener("click", () => {
          state.view = id;
          $$(".view-btn", viewBar).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          draw();
        });
        return b;
      }));
    }

    function setTier(tier) {
      state.tier = tier;
      state.view = data.tiers[tier][0];
      $$(".tier", section).forEach((t) => t.classList.toggle("is-on", t.dataset.tier === tier));
      const name = TIER_NAMES[tier];
      // The button opens a WhatsApp chat with the level filled in; email is the alternative.
      askLabel.textContent = `Ask about ${name}`;
      askLink.href = `https://wa.me/971506834365?text=${encodeURIComponent(`Hi, we're interested in the ${name} partnership with Alex McInnes Racing.`)}`;
      const subject = `${name} partnership with Alex McInnes`;
      const body = `Hi Alex's team,\n\nWe're interested in the ${name} partnership for 2026 and the Dakar Rally 2027.\n\nCompany:\nName:\nPhone:\n`;
      emailLink.href = `mailto:partnerships@mcinnesracing.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      buildViews();
      draw();
    }

    /* -- download: every view of the chosen level on one sheet -- */

    async function download() {
      downloadBtn.disabled = true;
      say("Making your preview…");
      try {
        const tier = state.tier;
        const ids = data.tiers[tier];
        const tileW = 900;
        const gap = 40;
        const head = 230;
        const foot = 120;
        const tiles = await Promise.all(ids.map(async (id) => ({ id, src: await compose(data.views[id].photo, tier), crop: cropOf(id) })));
        const tileH = Math.round(tileW * 4 / 3);
        const sheet = makeCanvas(gap + ids.length * (tileW + gap), head + tileH + 60 + foot);
        const ctx = sheet.getContext("2d");
        ctx.fillStyle = "#FBFAF7";
        ctx.fillRect(0, 0, sheet.width, sheet.height);
        ctx.fillStyle = "#C9231B";
        ctx.save();
        ctx.translate(gap, 58);
        ctx.transform(1, 0, -0.5, 1, 0, 0);
        ctx.fillRect(14, 0, 90, 12);
        ctx.restore();
        ctx.fillStyle = INK;
        ctx.font = 'italic 900 84px "Saira", "Archivo", sans-serif';
        ctx.fillText("Your brand on Alex McInnes’s bike", gap, 160);
        ctx.font = '600 36px "Archivo", sans-serif';
        ctx.fillStyle = "#4B4238";
        const where = $(`.tier[data-tier="${tier}"] .tier-where`, section).textContent;
        ctx.fillText(`${TIER_NAMES[tier]}: ${where.charAt(0).toLowerCase()}${where.slice(1)}`, gap, 212);
        tiles.forEach((t, k) => {
          const x = gap + k * (tileW + gap);
          const [x0, y0, x1, y1] = t.crop;
          ctx.drawImage(t.src, x0, y0, x1 - x0, y1 - y0, x, head, tileW, tileH);
          ctx.font = '650 30px "Archivo", sans-serif';
          ctx.fillStyle = INK;
          ctx.fillText(data.views[t.id].label, x, head + tileH + 44);
        });
        ctx.font = '500 26px "Archivo", sans-serif';
        ctx.fillStyle = "#4B4238";
        ctx.fillText("A preview, not final artwork. Sizes and positions are agreed with Alex’s team. partnerships@mcinnesracing.com", gap, sheet.height - 50);
        const blob = await new Promise((resolve) => sheet.toBlob(resolve, "image/jpeg", 0.9));
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `alex-mcinnes-${tier}-partner-preview.jpg`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        say("Your preview is downloading.");
      } catch (err) {
        say("The preview couldn’t be made. Try again.");
      } finally {
        downloadBtn.disabled = false;
      }
    }

    /* -- wiring -- */

    form.addEventListener("submit", (e) => e.preventDefault());
    $$('input[name="tier"]', section).forEach((r) => r.addEventListener("change", () => r.checked && setTier(r.value)));
    fileInput.addEventListener("change", () => takeFile(fileInput.files[0]));
    bgBox.addEventListener("change", () => state.upload && useUpload());
    downloadBtn.addEventListener("click", download);
    ["dragenter", "dragover"].forEach((type) => dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-over");
    }));
    ["dragleave", "drop"].forEach((type) => dropzone.addEventListener(type, () => dropzone.classList.remove("is-over")));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      takeFile(e.dataTransfer && e.dataTransfer.files[0]);
    });

    // Start loading the photos as the section comes near, not with the page.
    async function start() {
      if (started) return;
      started = true;
      if (document.fonts) await document.fonts.load('italic 900 100px "Saira"').catch(() => {});
      state.standIn = standIn();
      const checked = $('input[name="tier"]:checked', section);
      setTier(checked ? checked.value : "platinum");
    }
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          start();
        }
      }, { rootMargin: "60% 0px" });
      io.observe(section);
    } else {
      start();
    }
    section.addEventListener("focusin", start, { once: true });
    if ("ResizeObserver" in window) {
      let last = 0;
      new ResizeObserver(([entry]) => {
        const w = Math.round(entry.contentRect.width);
        if (started && w && w !== last) {
          last = w;
          draw();
        }
      }).observe(canvas);
    }
    still.hidden = true;
  }

  /* ---------- navigation ---------- */

  const nav = $("#nav");
  const menuButton = $(".nav-menu");
  const menu = $("#menu");

  function setMenu(open) {
    if (!menuButton || !menu) return;
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    if (open === isOpen) return;
    menuButton.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    nav.classList.toggle("is-open", open);
    root.classList.toggle("menu-open", open);
    if (open) $("a", menu).focus();
  }

  if (menuButton && menu) {
    menuButton.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
    menu.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });
    nav.addEventListener("keydown", (e) => {
      if (menuButton.getAttribute("aria-expanded") !== "true") return;
      if (e.key === "Escape") {
        setMenu(false);
        menuButton.focus();
        return;
      }
      if (e.key !== "Tab") return;
      // Keep focus inside the open menu and the bar above it.
      const focusable = $$("a[href], button:not([disabled])", nav).filter((el) => el.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  // Mark the section being read in the desktop navigation, using flow
  // positions because pinned sections stay "on screen" under the ones above.
  const navLinks = $$(".nav-links a");
  const linkFor = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
  let currentLink = null;
  function updateNavCurrent() {
    const line = window.scrollY + window.innerHeight * 0.45;
    let link = null;
    sections.forEach((section, i) => {
      if (flowTops[i] <= line) link = linkFor.get(section.id) || null;
    });
    if (link === currentLink) return;
    if (currentLink) currentLink.removeAttribute("aria-current");
    if (link) link.setAttribute("aria-current", "true");
    currentLink = link;
  }

  /* ---------- in-page links ---------- */

  // The browser's own anchor jump can't find a section that is pinned under
  // the ones above it, so scroll to its place in the flow instead.
  function scrollToHash(hash, smooth) {
    const behavior = smooth && motionOK() ? "smooth" : "instant";
    if (hash === "#top") {
      window.scrollTo({ top: 0, behavior });
      return hero;
    }
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return null;
    window.scrollTo({ top: Math.max(0, Math.round(flowTop(target))), behavior });
    return target;
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || presenting || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const hash = link.getAttribute("href");
    if (hash.length < 2) return;
    const target = scrollToHash(hash, true);
    if (!target) return;
    e.preventDefault();
    // The logo goes back to the clean page address; other links keep their anchor.
    try {
      history.pushState(null, "", hash === "#top" ? location.pathname + location.search : hash);
    } catch (_) { /* some browsers refuse this for files opened from disk; the scroll still happens */ }
    // Move focus with the view for keyboard and screen-reader users.
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

  // Back and forward return to sections by their flow position; the browser's
  // own restoration would land on pinned positions instead.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.addEventListener("popstate", () => {
    if (presenting) return;
    if (location.hash && !/^#present/.test(location.hash)) scrollToHash(location.hash, false);
    else if (!location.hash) window.scrollTo({ top: 0, behavior: "instant" });
  });

  onFrame();

  /* ---------- presenter mode ---------- */

  const hud = $("#hud");
  const hint = $("#hud-hint");
  const status = $("#hud-status");
  const stops = $$("[data-stop]");
  let index = 0;
  let tween = 0;
  let idleTimer = 0;
  let hintTimers = [];
  let lastWheel = 0;
  let touchStart = null;
  let returnFocus = null;

  const jumpTo = (y) => window.scrollTo({ top: y, behavior: "instant" });

  // Where the page should scroll to for a stop: full-screen stops align to the
  // top, shorter ones are centred but kept within their own section.
  function stopTarget(el) {
    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    let y = rect.height >= vh * 0.92 ? top : top - (vh - rect.height) / 2;
    const section = el.closest("section");
    if (section && section !== el) {
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const sectionEnd = sectionTop + section.offsetHeight - vh;
      y = Math.min(Math.max(y, sectionTop), Math.max(sectionTop, sectionEnd));
    }
    const max = root.scrollHeight - vh;
    return Math.round(Math.min(Math.max(y, 0), max));
  }

  function scrollToY(y, instant) {
    cancelAnimationFrame(tween);
    const from = window.scrollY;
    const distance = y - from;
    if (instant || !motionOK() || Math.abs(distance) < 2) {
      jumpTo(y);
      return;
    }
    const duration = Math.min(1000, 520 + Math.abs(distance) * 0.12);
    const start = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      jumpTo(from + distance * ease(t));
      if (t < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  }

  function go(i, { instant = false } = {}) {
    index = Math.max(0, Math.min(stops.length - 1, i));
    stops.forEach((stop, n) => stop.classList.toggle("is-current", n === index));
    scrollToY(stopTarget(stops[index]), instant);
    $("[data-hud-index]", hud).textContent = index + 1;
    hud.style.setProperty("--p", (index + 1) / stops.length);
    status.textContent = `${index + 1} of ${stops.length}`;
    history.replaceState(null, "", `#present-${index + 1}`);
  }

  function nearestStop() {
    const line = window.scrollY + window.innerHeight * 0.35;
    let found = 0;
    stops.forEach((stop, n) => {
      if (stop.getBoundingClientRect().top + window.scrollY <= line) found = n;
    });
    return found;
  }

  function requestFullscreen() {
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!request) return;
    try {
      const result = request.call(root);
      if (result && result.catch) result.catch(() => {});
    } catch (_) { /* not allowed here; presenter mode still works */ }
  }

  function exitFullscreen() {
    const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
    if (!exitFs || !(document.fullscreenElement || document.webkitFullscreenElement)) return;
    try {
      const result = exitFs.call(document);
      if (result && result.catch) result.catch(() => {});
    } catch (_) { /* ignore */ }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) exitFullscreen();
    else requestFullscreen();
  }

  function wakeHud() {
    if (!presenting) return;
    hud.classList.remove("is-idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!hud.matches(":hover")) hud.classList.add("is-idle");
    }, 2600);
  }

  function showHint() {
    hintTimers.forEach(clearTimeout);
    hint.hidden = false;
    hint.classList.remove("is-fading");
    hintTimers = [
      setTimeout(() => hint.classList.add("is-fading"), 4000),
      setTimeout(() => { hint.hidden = true; }, 4600),
    ];
  }

  function enter(at, { fullscreen = false } = {}) {
    if (presenting || !stops.length) return;
    returnFocus = document.activeElement;
    setMenu(false);
    const start = at === undefined ? nearestStop() : at;
    presenting = true;
    root.classList.add("presenting");
    shades.forEach((shade) => { shade.style.visibility = "hidden"; });
    if (film) film.cover(0);
    if (carousel) carousel.cover(0);
    hud.hidden = false;
    $("[data-hud-total]", hud).textContent = stops.length;
    if (fullscreen) requestFullscreen();
    showHint();
    wakeHud();
    // The layout rescales for presenting, so measure after it settles.
    requestAnimationFrame(() => {
      go(start, { instant: true });
      $('[data-hud="next"]', hud).focus({ preventScroll: true });
    });
  }

  function exit() {
    if (!presenting) return;
    presenting = false;
    cancelAnimationFrame(tween);
    const current = stops[index];
    root.classList.remove("presenting");
    hud.hidden = true;
    hud.classList.remove("is-idle");
    hint.hidden = true;
    stops.forEach((stop) => stop.classList.remove("is-current"));
    exitFullscreen();
    history.replaceState(null, "", location.pathname + location.search);
    status.textContent = "Presentation closed";
    requestAnimationFrame(() => {
      layoutStacks();
      jumpTo(current.getBoundingClientRect().top + window.scrollY - (current === stops[0] ? 0 : nav.offsetHeight));
      onFrame();
      if (returnFocus && document.contains(returnFocus) && returnFocus.offsetParent !== null) {
        returnFocus.focus({ preventScroll: true });
      }
    });
  }

  $$("[data-present]").forEach((button) => {
    button.addEventListener("click", () => enter(0, { fullscreen: true }));
  });

  hud.addEventListener("click", (e) => {
    const button = e.target.closest("[data-hud]");
    if (!button) return;
    const action = button.dataset.hud;
    if (action === "next") go(index + 1);
    else if (action === "prev") go(index - 1);
    else if (action === "fullscreen") toggleFullscreen();
    else if (action === "exit") exit();
    wakeHud();
  });

  hud.addEventListener("focusin", wakeHud);

  // Stepping through stops leaves the controls hidden so they don't flash on
  // a big screen; Tab, the mouse or a tap brings them back.
  document.addEventListener("keydown", (e) => {
    if (!presenting || e.altKey || e.ctrlKey || e.metaKey) return;
    const onControl = e.target.closest && e.target.closest("button, a");
    const key = e.key;
    if (key === "Tab") {
      wakeHud();
      return;
    }
    let handled = true;
    if (key === "ArrowRight" || key === "ArrowDown" || key === "PageDown") go(index + 1);
    else if (key === "ArrowLeft" || key === "ArrowUp" || key === "PageUp") go(index - 1);
    else if (key === " " && !onControl) go(index + (e.shiftKey ? -1 : 1));
    else if (key === "Home") go(0);
    else if (key === "End") go(stops.length - 1);
    else if (key === "Escape") exit();
    else if (key === "f" || key === "F") toggleFullscreen();
    else handled = false;
    if (handled) e.preventDefault();
  });

  // One step per wheel gesture: trackpad momentum arrives as a continuous
  // stream of events, so only the first event after a pause moves.
  window.addEventListener("wheel", (e) => {
    if (!presenting) return;
    e.preventDefault();
    const now = performance.now();
    const newGesture = now - lastWheel > 220;
    lastWheel = now;
    if (!newGesture || Math.abs(e.deltaY) + Math.abs(e.deltaX) < 6) return;
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    go(index + (delta > 0 ? 1 : -1));
    wakeHud();
  }, { passive: false });

  window.addEventListener("touchstart", (e) => {
    if (!presenting || e.touches.length !== 1) return;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (presenting && !e.target.closest(".hud")) e.preventDefault();
  }, { passive: false });
  window.addEventListener("touchend", (e) => {
    if (!presenting || !touchStart) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    wakeHud();
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
    const forward = Math.abs(dy) > Math.abs(dx) ? dy < 0 : dx < 0;
    go(index + (forward ? 1 : -1));
  });

  window.addEventListener("mousemove", wakeHud, { passive: true });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      layoutStacks();
      if (presenting) go(index, { instant: true });
      else onFrame();
      if (window.innerWidth >= 1200) setMenu(false);
    }, 120);
  });

  // Open straight into presenter mode from a link such as /#present or /#present-5.
  const deepLink = location.hash.match(/^#present(?:-(\d+))?$/);
  if (deepLink) {
    const start = deepLink[1] ? Number(deepLink[1]) - 1 : 0;
    const begin = () => enter(start);
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });
  }
})();
