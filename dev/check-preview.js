// Open the single-file preview from disk on a laptop and a phone and check
// fonts, images, the hero sequence, sideways scrolling and console errors.
// usage: node dev/check-preview.js [preview.html] [outdir]
const { chromium } = require("./lib/playwright");
const path = require("path");
const fs = require("fs");
const file = path.resolve(process.argv[2] || "alex-mcinnes-preview.html");
const out = process.argv[3] || "dev/out";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [name, opts] of [["desktop", { viewport: { width: 1280, height: 720 } }], ["phone", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
    const ctx = await b.newContext(opts);
    const p = await ctx.newPage();
    const errs = [];
    p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("requestfailed", (r) => errs.push("failed " + r.url().slice(0, 80)));
    await p.goto("file://" + file, { waitUntil: "load" });
    await p.waitForTimeout(2600);
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 500) { await p.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y); await p.waitForTimeout(120); }
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({
      font: document.fonts.check('800 40px "Archivo"'),
      // Photos not on show (slides still queued, photos hidden on phones) load later or never; only shown ones count.
      images: [...document.images].filter((i) => i.getClientRects().length && (!i.complete || !i.naturalWidth)).length + " broken of " + [...document.images].filter((i) => i.getClientRects().length).length + " shown (" + document.images.length + " in the page)",
      ready: document.querySelector(".hero").classList.contains("is-ready"),
      hScroll: document.documentElement.scrollWidth > innerWidth,
    }));
    console.log(name, JSON.stringify(r), errs.length ? errs : "no errors");
    await p.screenshot({ path: `${out}/preview-${name}.png` });
    await ctx.close();
  }
  await b.close();
})();
