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

  // 1) Faction-select over the living map
  await wait(1800);
  await page.screenshot({ path: "shots/ui-1-setup.png" });

  // 2) Compose a clean, representative mid-game state for the showcase shot.
  await page.evaluate(() => {
    startGame("storm");
    // Force a known opponent + tidy board (avoids RNG ending the game early).
    G.enemy.factionId = "sun"; // Skyforge (Himalayas) vs Helios Spire (Sahara)
    G.turn = 8;
    G.doom = 34;
    G.you.integrity = 78;
    G.you.charges = { heat: 1, cold: 0, moisture: 4, pressure: 7, static: 9 };
    G.you.refineries = [{ charge: "moisture", tick: 1 }];
    G.you.upgrades = { tornado: 1 };
    G.you.pollution = 13;
    G.enemy.integrity = 61;
    G.enemy.charges = { heat: 6, cold: 0, moisture: 0, pressure: 2, static: 3 };
    G.enemy.pollution = 19;
    MapView.setup(G); // reframe camera for the forced matchup
    clearLog();
    log("sys", "— Turn 7 —");
    log("you", "🌪️ You hit Sun Cartel with Tornado Swarm for 37.");
    log("enemy", "🔆 Sun Cartel hits You with Heat Dome for 9. (shielded)");
    log("sys", "— Turn 8 —");
    G.enemy.committed = { type: "strike", weapon: "heatdome" };
    G.you.committed = null;
    render();
    setActionsEnabled(true);
  });
  await wait(2200); // let wind trails build over the terrain
  await page.screenshot({ path: "shots/ui-2-game.png" });

  // 3) Weapon picker modal open
  await page.evaluate(() => { if (!G.over && !G.you.committed) openStrikePicker(); });
  await wait(200);
  await page.screenshot({ path: "shots/ui-3-strike.png" });
  await page.evaluate(() => closeModal());

  // 4) Fire a hurricane and catch it blooming over the enemy capital
  await page.evaluate(() => {
    if (!G.over && !G.you.committed) submitPlayerAction({ type: "strike", weapon: "hurricane" });
  });
  await wait(2400);
  await page.screenshot({ path: "shots/ui-4-impact.png" });

  await browser.close();
  console.log("screenshots written to shots/");
})().catch((e) => { console.error(e); process.exit(1); });
