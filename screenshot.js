const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });

  const url = "file://" + path.resolve(__dirname, "index.html");
  await page.goto(url, { waitUntil: "networkidle0" });

  // 1) Faction-select / title screen
  await page.screenshot({ path: "shots/ui-1-setup.png" });

  // 2) Compose a clean, representative mid-game state for the showcase shot.
  await page.evaluate(() => {
    startGame("storm");
    // Force a known opponent + tidy board (avoids RNG ending the game early).
    G.enemy.factionId = "maritime";
    G.turn = 8;
    G.doom = 34;
    G.you.integrity = 78;
    G.you.charges = { heat: 1, cold: 0, moisture: 2, pressure: 7, static: 9 };
    G.you.refineries = [{ charge: "moisture", tick: 1 }];
    G.you.upgrades = { tornado: 1 };
    G.you.pollution = 13;
    G.enemy.integrity = 61;
    G.enemy.charges = { heat: 0, cold: 0, moisture: 6, pressure: 3, static: 0 };
    G.enemy.pollution = 19;
    clearLog();
    log("sys", "— Turn 7 —");
    log("you", "🌪️ You hit Maritime League with Tornado Swarm for 37.");
    log("enemy", "🌀 Maritime League hits You with Hurricane for 18. (shielded)");
    log("you", "🛡️ You raise a pressure shield.");
    log("enemy", "🌡️ Backlash! Maritime League's Hurricane destabilizes — half damage.");
    log("sys", "— Turn 8 —");
    G.enemy.committed = { type: "strike", weapon: "hurricane" };
    G.you.committed = null;
    render();
    setActionsEnabled(true);
  });
  await page.screenshot({ path: "shots/ui-2-game.png" });

  // 3) Weapon picker modal open
  await page.evaluate(() => { if (!G.over && !G.you.committed) openStrikePicker(); });
  await new Promise((r) => setTimeout(r, 150));
  await page.screenshot({ path: "shots/ui-3-strike.png" });

  await browser.close();
  console.log("screenshots written to shots/");
})().catch((e) => { console.error(e); process.exit(1); });
