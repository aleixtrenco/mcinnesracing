// Check "Your brand on the bike": every level and view with the stand-in logo
// and with an uploaded one, plus the downloaded preview sheet.
// usage: node dev/livery.js <outdir> [logo-file] [width height]
const { chromium } = require("./lib/playwright");
const fs = require("fs");
const path = require("path");
const [out = "dev/out/livery", logo, W = "1440", H = "900"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto("http://127.0.0.1:8123/#livery", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await p.click('.nav-links a[href="#livery"]').catch(() => {});
  await p.waitForSelector("#livery.is-ready", { timeout: 15000 });
  await p.waitForTimeout(800);
  const shoot = async (name) => {
    await p.waitForFunction(() => !document.querySelector("#livery").classList.contains("is-drawing"));
    await p.waitForTimeout(250);
    await p.locator(".stage-frame").screenshot({ path: `${out}/${name}.png` });
  };
  const run = async (prefix) => {
    for (const tier of ["platinum", "gold", "silver"]) {
      await p.click(`.tier[data-tier="${tier}"]`);
      await p.waitForTimeout(300);
      const views = await p.$$eval(".view-btn", (bs) => bs.map((x) => x.dataset.view));
      for (const v of views) {
        await p.click(`.view-btn[data-view="${v}"]`);
        await shoot(`${prefix}-${tier}-${v}`);
      }
    }
  };
  await run("standin");
  if (logo) {
    await p.setInputFiles('input[name="logo"]', logo);
    await p.waitForFunction(() => document.querySelector(".livery-status").textContent.startsWith("Added"), null, { timeout: 15000 });
    console.log("status:", await p.textContent(".livery-status"));
    await run(path.basename(logo).replace(/\W+/g, "_"));
    await p.click('.tier[data-tier="platinum"]');
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click('[data-livery="download"]')]);
    const file = `${out}/${dl.suggestedFilename()}`;
    await dl.saveAs(file);
    console.log("downloaded", file);
  }
  console.log("ask link:", await p.getAttribute('[data-livery="ask"]', "href"));
  console.log(errs.length ? "ERRORS " + errs.join(" | ") : "no errors");
  await b.close();
})();
