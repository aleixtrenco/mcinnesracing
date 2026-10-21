// Click every partner tile that has a website and record which URL opens in
// the new tab. Tiles still waiting for a website are listed, not clicked.
const { chromium } = require("./lib/playwright");
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  // Answer external requests locally so the new tabs load without leaving this machine.
  await ctx.route(/^https:\/\/(?!127\.0\.0\.1)/, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>partner</title>" }));
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:8123/", { waitUntil: "networkidle" });
  // The top bar is hidden on the opening screen: scroll until it slides in.
  await p.evaluate(() => scrollTo({ top: innerHeight * 1.2, behavior: "instant" }));
  await p.waitForTimeout(700);
  await p.click('.nav-links a[href="#partners"]');
  await p.waitForTimeout(2200);
  const waiting = await p.$$eval(".partner-link:not([href])", (as) => as.map((a) => a.textContent.replace(/\s+/g, " ").trim()));
  if (waiting.length) console.log("no website yet:", waiting.join(" | "));
  const tiles = await p.$$(".partner-link[href]");
  for (const tile of tiles) {
    const name = await tile.evaluate((a) => a.querySelector("img")?.alt || a.querySelector(".partner-wordmark")?.textContent);
    const [popup] = await Promise.all([ctx.waitForEvent("page"), tile.click()]);
    await popup.waitForLoadState();
    const label = await tile.evaluate((a) => a.textContent.replace(/\s+/g, " ").trim());
    console.log(`${name} -> ${popup.url()}  (opener stays on ${new URL(p.url()).hash || "/"}; link reads: "${label}")`);
    await popup.close();
  }
  await tiles[2].hover();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/partners-hover.png`, clip: { x: 0, y: 300, width: 1440, height: 500 } });
  console.log(errors.length ? "ERRORS " + errors.join(" | ") : "no errors");
  await b.close();
})();
