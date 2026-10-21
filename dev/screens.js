// Screenshot each section where it fills the screen, plus a mid-transition frame.
// usage: node sections.js <url> <outdir> desktop|mobile|tablet|laptop [--mid]
const { chromium } = require("./lib/playwright");
const fs = require("fs");
const [url, out, mode, flag] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const views = {
  desktop: { viewport: { width: 1440, height: 900 } },
  laptop: { viewport: { width: 1280, height: 720 } },
  tablet: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(views[mode]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => errors.push(`failed: ${r.url()}`));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/${mode}-00-hero.png` });

  // Walk down gently so lazy images load and reveals fire, then measure flow positions.
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 400) { await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y); await page.waitForTimeout(60); }
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(400);

  const sections = await page.evaluate(() => {
    let y = document.querySelector("main").getBoundingClientRect().top + scrollY;
    return [...document.querySelectorAll("main > section")].map((s) => { const r = { id: s.id, start: y, h: s.offsetHeight }; y += s.offsetHeight; return r; });
  });
  const vh = views[mode].viewport.height;
  let n = 1;
  for (const s of sections.slice(1)) {
    if (flag === "--mid") {
      await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), Math.round(s.start - vh * 0.45));
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/${mode}-${String(n).padStart(2, "0")}a-${s.id}-mid.png` });
    }
    await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), Math.round(s.start));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${mode}-${String(n).padStart(2, "0")}-${s.id}.png` });
    if (s.h > vh * 1.25) {
      await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), Math.round(s.start + s.h - vh));
      await page.waitForTimeout(1300);
      await page.screenshot({ path: `${out}/${mode}-${String(n).padStart(2, "0")}b-${s.id}-end.png` });
    }
    n++;
  }
  const info = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight }));
  console.log(mode, JSON.stringify(info), JSON.stringify(sections.map((s) => s.id + ":" + s.h)));
  if (errors.length) console.log("ERRORS\n" + errors.join("\n"));
  await browser.close();
})();
