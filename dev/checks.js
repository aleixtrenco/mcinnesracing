// Robustness checks: reduced motion, no JavaScript, tablet layout, page weight, LCP, a11y basics.
const { chromium } = require("./lib/playwright");
const [url, out] = process.argv.slice(2);

(async () => {
  const browser = await chromium.launch();

  // 1. Reduced motion: everything visible immediately, counters show final values.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({
      motionClass: document.documentElement.classList.contains("motion"),
      heroOpacity: getComputedStyle(document.querySelector(".hero-slide picture")).opacity,
      chTransform: getComputedStyle(document.querySelector(".hero .ch")).transform,
      routeOffset: getComputedStyle(document.querySelector(".tl-draw")).strokeDashoffset, stackPos: getComputedStyle(document.querySelector(".rider")).position, titleSplit: !!document.querySelector(".title .w"),
      counter: document.querySelector("[data-count]").textContent,
    }));
    console.log("reduced-motion", JSON.stringify(r));
    await ctx.close();
  }

  // 2. No JavaScript: content readable, nothing hidden.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    const r = await page.evaluate(() => ({
      heroOpacity: getComputedStyle(document.querySelector(".hero-slide picture")).opacity,
      countdown: document.querySelector("[data-countdown=short]").textContent.trim(),
      meterHidden: document.querySelector(".tripmeter").hidden, dakarWhen: document.querySelector(".dakar-when").textContent.trim(), titleText: document.querySelector("#rider-title").textContent.trim(),
    }));
    console.log("no-js", JSON.stringify(r));
    await ctx.close();
  }

  // 3. Mobile page weight and LCP on first load.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    let bytes = 0; const byType = {};
    page.on("response", async (res) => {
      try {
        const len = (await res.body()).length; bytes += len;
        const t = res.request().resourceType(); byType[t] = (byType[t] || 0) + len;
      } catch (_) {}
    });
    await page.addInitScript(() => {
      window.__lcp = 0;
      new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__lcp = { t: Math.round(e.startTime), el: e.element && (e.element.tagName + "." + e.element.className) }; }).observe({ type: "largest-contentful-paint", buffered: true });
      window.__cls = 0;
      new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    const perf = await page.evaluate(() => ({ lcp: window.__lcp, cls: +window.__cls.toFixed(4), heroSrc: document.querySelector(".hero-slide img").currentSrc.split("/").pop() }));
    console.log("mobile-first-load", JSON.stringify({ kb: Math.round(bytes / 1024), byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)])), ...perf }));
    await ctx.close();
  }

  // 4. Desktop: which hero file is chosen, headings outline, images without alt, small tap targets.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    const r = await page.evaluate(() => ({
      heroSrc: document.querySelector(".hero-slide img").currentSrc.split("/").pop(),
      headings: [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => h.tagName + ":" + h.textContent.trim().replace(/\s+/g, " ").slice(0, 40)),
      noAlt: [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length,
      smallTargets: [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.height < 44 && !el.closest(".rb-notes")) ; }).map((el) => (el.className || el.tagName) + " " + Math.round(el.getBoundingClientRect().height)),
    }));
    console.log("desktop", JSON.stringify(r, null, 1));
    await ctx.close();
  }

  // 5. Tablet portrait screenshot.
  {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/tablet-first.png` });
    const r = await page.evaluate(() => ({ heroSrc: document.querySelector(".hero-slide img").currentSrc.split("/").pop(), sw: document.documentElement.scrollWidth }));
    console.log("tablet", JSON.stringify(r));
    await page.evaluate(() => document.querySelector("#contact").scrollIntoView({ behavior: "instant" }));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/tablet-contact.png` });
    await ctx.close();
  }

  await browser.close();
})();
