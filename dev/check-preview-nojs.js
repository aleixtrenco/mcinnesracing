// Open the single-file preview on a phone with JavaScript switched off and
// check that sections still stack as the page scrolls.
const { chromium } = require("./lib/playwright");
// usage: node dev/check-preview-nojs.js [preview.html] [outdir]
const path = require("path");
const fs = require("fs");
const file = path.resolve(process.argv[2] || "alex-mcinnes-preview.html");
const out = process.argv[3] || "dev/out";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, javaScriptEnabled: false });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file://" + file, { waitUntil: "load" });
  await p.waitForTimeout(2500);
  let canEval = true;
  try { await p.evaluate(() => 1); } catch (e) { canEval = false; console.log("evaluate blocked:", e.message.split("\n")[0]); }
  if (canEval) {
    const cls = await p.evaluate(() => document.documentElement.className);
    console.log("html class:", JSON.stringify(cls));
    const flow = await p.evaluate(() => {
      let y = document.querySelector("main").getBoundingClientRect().top + scrollY;
      return [...document.querySelectorAll("main > section")].map((s) => { const r = { id: s.id, top: y, h: s.offsetHeight }; y += s.offsetHeight; return r; });
    });
    for (const i of [1, 2, 5]) {
      const next = flow[i + 1];
      for (const f of [0.3, 0.6]) {
        await p.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), Math.round(next.top - 844 * (1 - f)));
        await p.waitForTimeout(500);
        const m = await p.evaluate((i) => { const s = document.querySelectorAll("main > section"); const a = s[i].getBoundingClientRect(); return { bottom: Math.round(a.bottom), left: +a.left.toFixed(1), shade: getComputedStyle(s[i], "::after").opacity }; }, i);
        console.log(flow[i].id, "->", next.id, "f" + f, JSON.stringify(m));
        if (f === 0.6) await p.screenshot({ path: `${out}/nojs-${next.id}.png` });
      }
    }
  }
  console.log(errs.length ? "ERRORS " + errs.join(" | ") : "no page errors");
  await b.close();
})();
