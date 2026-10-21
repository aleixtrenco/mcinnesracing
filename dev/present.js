// Step through presenter mode and screenshot every stop.
// usage: node present.js <url> <outdir> <width> <height>
const { chromium } = require("./lib/playwright");
const fs = require("fs");
const [url, out, w, h] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  // The Present buttons show only for Alex's team: ?team switches them on in this browser.
  await page.goto(url + (url.includes("?") ? "&" : "?") + "team", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  // enter via the nav button, as a presenter would: the top bar is hidden on
  // the opening screen, so scroll down until it slides in
  await page.evaluate(() => scrollTo({ top: innerHeight * 1.2, behavior: "instant" }));
  await page.waitForTimeout(700);
  await page.click(".nav-present");
  await page.waitForTimeout(900);
  const total = await page.evaluate(() => document.querySelectorAll("[data-stop]").length);
  for (let i = 0; i < total; i++) {
    await page.waitForTimeout(1300);
    const state = await page.evaluate(() => ({
      idx: document.querySelector("[data-hud-index]").textContent,
      hash: location.hash,
      y: Math.round(scrollY),
      fs: getComputedStyle(document.documentElement).fontSize,
      cur: document.querySelector(".is-current")?.className,
      // The current stop's content must sit fully on screen. Decorative layers
      // (the Dakar dunes, the stacking shade) may run past the edge.
      fits: (() => {
        const el = document.querySelector(".is-current");
        if (!el) return null;
        const parts = el.matches("main > section") ? [...el.querySelectorAll(":scope > :not([aria-hidden='true']):not(.shade)")] : [el];
        const rects = parts.map((n) => n.getBoundingClientRect()).filter((r) => r.height > 0);
        return rects.every((r) => r.top >= -2 && r.bottom <= innerHeight + 2);
      })(),
    }));
    console.log(i + 1, JSON.stringify(state));
    await page.screenshot({ path: `${out}/p-${w}-${String(i + 1).padStart(2, "0")}.png` });
    await page.keyboard.press("ArrowRight");
  }
  // back one, then Escape
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(1200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({ presenting: document.documentElement.classList.contains("presenting"), hash: location.hash, y: Math.round(scrollY), hud: document.getElementById("hud").hidden }));
  console.log("after exit", JSON.stringify(after));
  if (errors.length) console.log("ERRORS", errors);
  await browser.close();
})();
