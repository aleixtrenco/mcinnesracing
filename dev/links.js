// Check in-page links land on the right section from anywhere on the page,
// then screenshot the contact panel at a few sizes.
const { chromium } = require("./lib/playwright");
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await p.goto("http://127.0.0.1:8123/", { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  const flowOf = (id) => p.evaluate((id) => { let y = document.querySelector("main").getBoundingClientRect().top + scrollY; for (const s of document.querySelectorAll("main > section")) { if (s.id === id) return Math.round(y); y += s.offsetHeight; } }, id);
  const settle = () => p.waitForTimeout(1600);
  const bottom = () => p.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));

  // 1. Logo from the bottom of the page.
  await bottom(); await p.waitForTimeout(400);
  await p.click(".nav-brand"); await settle();
  console.log("logo from bottom -> scrollY", await p.evaluate(() => scrollY), "url", await p.evaluate(() => location.href.replace(/^.*?:\d+/, "")));

  // 2. Each nav link from the bottom, and the current-section marker.
  for (const id of ["uae", "journey", "why", "reach", "partners", "season"]) {
    await bottom(); await p.waitForTimeout(400);
    await p.click(`.nav-links a[href="#${id}"]`); await settle();
    const y = await p.evaluate(() => Math.round(scrollY));
    const current = await p.evaluate(() => document.querySelector('.nav-links a[aria-current="true"]')?.getAttribute("href"));
    console.log(`#${id} from bottom -> scrollY ${y}, section starts ${await flowOf(id)}, nav marks ${current}`);
  }

  // 3. Back button returns to the previous section.
  await p.goBack(); await settle();
  console.log("back ->", await p.evaluate(() => location.hash), "scrollY", await p.evaluate(() => Math.round(scrollY)), "partners starts", await flowOf("partners"));

  // 4. Contact panel at desktop sizes.
  for (const [w, h] of [[1440, 900], [1280, 720], [1920, 1080]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(400);
    await p.click('.nav-cta'); await settle();
    await p.screenshot({ path: `${out}/contact-${w}.png` });
  }
  await p.close();

  const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.goto("http://127.0.0.1:8123/", { waitUntil: "networkidle" });
  const c = await m.evaluate(() => { let y = 0; for (const s of document.querySelectorAll("main > section")) { if (s.id === "contact") return y; y += s.offsetHeight; } });
  for (let y = 0; y <= c; y += 400) { await m.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y); await m.waitForTimeout(30); }
  await m.evaluate((y) => scrollTo({ top: y + 90, behavior: "instant" }), c);
  await m.waitForTimeout(1200);
  await m.screenshot({ path: `${out}/contact-390.png` });
  console.log(errors.length ? "ERRORS " + errors.join(" | ") : "no errors");
  await b.close();
})();
