// Check section stacking in each mode on a phone: full motion, calm (reduced
// motion) and no JavaScript (scripts stripped from the page).
// usage: node stack-modes.js <outdir> motion|calm|nojs [width height]
const { chromium } = require("./lib/playwright");
const fs = require("fs");
const [out, mode, W = "390", H = "844"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const url = "http://127.0.0.1:8123/";
const mobile = Number(W) < 700;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: Number(W), height: Number(H) },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: mode === "calm" ? "reduce" : "no-preference",
  });
  if (mode === "nojs") {
    await ctx.route(url, async (route) => {
      const res = await route.fetch();
      const body = (await res.text()).replace(/<script\b[\s\S]*?<\/script>/g, "");
      await route.fulfill({ response: res, body });
    });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  const cls = await page.evaluate(() => document.documentElement.className);
  const vh = Number(H);

  const flow = await page.evaluate(() => {
    let y = document.querySelector("main").getBoundingClientRect().top + scrollY;
    return [...document.querySelectorAll("main > section")].map((s) => { const r = { id: s.id, top: y, h: s.offsetHeight }; y += s.offsetHeight; return r; });
  });
  console.log(mode, "html class:", JSON.stringify(cls));
  const rows = [];
  for (let i = 0; i < flow.length - 1; i++) {
    const next = flow[i + 1];
    const line = [];
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const y = Math.round(next.top - vh * (1 - f));
      await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y);
      await page.waitForTimeout(f === 0.5 ? 450 : 120);
      const m = await page.evaluate(([i]) => {
        const s = document.querySelectorAll("main > section");
        const a = s[i].getBoundingClientRect();
        const b = s[i + 1].getBoundingClientRect();
        const shade = s[i].querySelector(":scope > .shade");
        const after = getComputedStyle(s[i], "::after");
        const op = shade ? getComputedStyle(shade).opacity : after.content !== "none" ? after.opacity : "-";
        return { top: Math.round(a.top), bottom: Math.round(a.bottom), left: +a.left.toFixed(1), nextTop: Math.round(b.top), shade: (+op).toFixed(2) };
      }, [i]);
      line.push(`f${f}: bottom ${m.bottom} left ${m.left} nextTop ${m.nextTop} shade ${m.shade}`);
      if (f === 0.5) await page.screenshot({ path: `${out}/${mode}-${String(i + 1).padStart(2, "0")}-${next.id}-mid.png` });
    }
    rows.push(`${flow[i].id} (h ${flow[i].h}) -> ${next.id}\n    ` + line.join("\n    "));
  }
  console.log(rows.join("\n"));
  const info = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, sh: document.documentElement.scrollHeight }));
  const flowEnd = flow[flow.length - 1].top + flow[flow.length - 1].h;
  console.log("scrollWidth", info.sw, "innerWidth", info.iw, "scrollHeight", info.sh, "flow end of main", flowEnd);
  console.log(errors.length ? "ERRORS\n" + errors.join("\n") : "no console errors");
  await browser.close();
})();
