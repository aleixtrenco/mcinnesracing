const { chromium } = require("./lib/playwright");
(async () => {
  const b = await chromium.launch();
  for (const w of [768, 820, 390, 1024]) {
    const p = await b.newPage({ viewport: { width: w, height: 1024 } });
    await p.goto("http://127.0.0.1:8123/", { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      for (const el of document.querySelectorAll("body *")) {
        const rect = el.getBoundingClientRect();
        if (rect.right > vw + 0.5 && rect.width > 0) {
          // skip descendants of elements that clip
          let clipped = false;
          for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
            const cs = getComputedStyle(a);
            if (cs.overflowX !== "visible") { clipped = true; break; }
          }
          if (!clipped) out.push(`${el.tagName.toLowerCase()}.${(el.className && el.className.baseVal === undefined ? el.className : "").toString().split(" ")[0]} right=${Math.round(rect.right)}`);
        }
      }
      return { sw: document.documentElement.scrollWidth, vw, out: out.slice(0, 8) };
    });
    console.log(w, JSON.stringify(r));
    await p.close();
  }
  await b.close();
})();
