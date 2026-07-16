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

  const url = "file://" + path.resolve(__dirname, "index.html");
  await page.goto(url, { waitUntil: "networkidle0" });

  // 1) Start screen over the living map
  await wait(1800);
  await page.screenshot({ path: "shots/v2-1-start.png" });

  // 2) Mid-game state: turn 6, both sides scarred, hand ready
  await page.evaluate(() => {
    startGame("storm");
    G.enemy.factionId = "sun";
    G.turn = 6;
    G.doom = 28;
    G.you.hp = 71;
    G.enemy.hp = 58;
    MapView.setup(G);
    G.hand = ["twister", "downpour", "shield"];
    render();
    WeatherMap.setGlobalHeat(G.doom / 100);
  });
  await wait(2400);
  await page.screenshot({ path: "shots/v2-2-battle.png" });

  // 3) Play a card and catch the clash mid-resolution
  await page.evaluate(() => playCard("twister"));
  await wait(2600); // banners shown, both storms blooming, damage numbers up
  await page.screenshot({ path: "shots/v2-3-clash.png" });

  // 4) Help sheet
  await wait(2600);
  await page.evaluate(() => document.getElementById("help").classList.remove("hidden"));
  await wait(250);
  await page.screenshot({ path: "shots/v2-4-help.png" });

  await browser.close();
  console.log("v2 screenshots written to shots/");
})().catch((e) => { console.error(e); process.exit(1); });
