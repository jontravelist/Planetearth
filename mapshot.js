const puppeteer = require("puppeteer");
const path = require("path");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-gl=swiftshader", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  await page.goto("file://" + path.resolve(__dirname, "map.html"), { waitUntil: "networkidle0" });

  // let the base wind field build up flowing trails
  await wait(2600);
  await page.screenshot({ path: "shots/map-1-calm.png" });

  // inject a hurricane center-left and let it spin up
  await page.evaluate(() => window.WeatherMap.applyEffect("hurricane", 0.34, 0.42));
  await wait(2200);
  await page.screenshot({ path: "shots/map-2-hurricane.png" });

  // add a heat dome (right) and a freeze (top) to show the color reaction
  await page.evaluate(() => {
    window.WeatherMap.applyEffect("heatdome", 0.72, 0.6);
    window.WeatherMap.applyEffect("freeze", 0.55, 0.18);
  });
  await wait(2200);
  await page.screenshot({ path: "shots/map-3-multi.png" });

  // pan to the EU/Africa theater to show real geography elsewhere
  await page.evaluate(() => {
    window.WeatherMap.reset();
    window.WeatherMap.setView(-20, 72, 55, -38);
    window.WeatherMap.applyEffect("hurricane", 0.3, 0.35);
  });
  await wait(2400);
  await page.screenshot({ path: "shots/map-4-europe.png" });

  await browser.close();
  console.log("map screenshots written to shots/");
})().catch((e) => { console.error(e); process.exit(1); });
