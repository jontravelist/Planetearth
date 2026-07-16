/* ============================================================
   WEATHER WAR — MapView: binds the game to the live Earth map.
   - Each faction has a real capital (lon/lat) on the real map
   - Camera frames the two warring capitals
   - Territories glow around capitals and shrink with damage
   - Strikes detonate as living storms at the target capital
   ============================================================ */
(function () {
  "use strict";

  const CAPITALS = {
    sun:      { lon: 8,   lat: 23, name: "Helios Spire", color: "#ffb54c" }, // Sahara
    maritime: { lon: -72, lat: 21, name: "Tide Bastion", color: "#4cc9ff" }, // Caribbean
    north:    { lon: 24,  lat: 65, name: "Frosthold",    color: "#bfe9ff" }, // Scandinavia
    storm:    { lon: 88,  lat: 33, name: "Skyforge",     color: "#c9a6ff" }, // Himalayas
  };
  const FX = { hurricane: "hurricane", heatdome: "heatdome", freeze: "freeze", tornado: "tornado", lightning: "lightning" };

  let G = null;

  function init() {
    WeatherMap.init(document.getElementById("bg"), document.getElementById("fx"));
    WeatherMap.setOverlayPainter(paint);
  }

  function setup(g) {
    G = g;
    frame();
    WeatherMap.reset();
  }

  function update() { WeatherMap.repaint(); }

  // Frame both capitals with padding, matched to the canvas aspect.
  function frame() {
    const a = CAPITALS[G.you.factionId], b = CAPITALS[G.enemy.factionId];
    let lon0 = Math.min(a.lon, b.lon) - 16, lon1 = Math.max(a.lon, b.lon) + 16;
    let latT = Math.max(a.lat, b.lat) + 13, latB = Math.min(a.lat, b.lat) - 13;

    const el = document.getElementById("fx");
    const A = Math.max(0.2, el.clientWidth / Math.max(1, el.clientHeight));
    let dx = (lon1 - lon0) / 360, dy = (latT - latB) / 180;
    if (dx / dy < A) {           // too narrow -> widen longitudes
      const need = A * dy * 360, mid = (lon0 + lon1) / 2;
      lon0 = mid - need / 2; lon1 = mid + need / 2;
    } else {                     // too flat -> extend latitudes
      const need = (dx / A) * 180, mid = (latT + latB) / 2;
      latT = mid + need / 2; latB = mid - need / 2;
    }
    if (latT > 88) { latB -= latT - 88; latT = 88; }
    if (latB < -88) { latT += -88 - latB; latB = -88; }
    WeatherMap.setView(lon0, latT, lon1, latB);
  }

  // Draw territory glows + capital markers into the map's bg layer.
  function paint(b, api) {
    if (!G) return;
    for (const side of [G.enemy, G.you]) {
      const c = CAPITALS[side.factionId];
      const [px, py] = api.lonlat2px(c.lon, c.lat);

      // climate footprint: shrinks as the capital takes damage (Cornered, visualized)
      const r = api.h * (0.05 + 0.13 * Math.max(0, side.integrity) / 100);
      const grad = b.createRadialGradient(px, py, 0, px, py, r);
      grad.addColorStop(0, c.color + "4d");
      grad.addColorStop(0.65, c.color + "1f");
      grad.addColorStop(1, c.color + "00");
      b.fillStyle = grad;
      b.beginPath(); b.arc(px, py, r, 0, 7); b.fill();
      b.setLineDash([4, 5]);
      b.strokeStyle = c.color + "59";
      b.lineWidth = 1;
      b.beginPath(); b.arc(px, py, r, 0, 7); b.stroke();
      b.setLineDash([]);

      // capital marker
      b.beginPath(); b.arc(px, py, 9, 0, 7);
      b.fillStyle = "rgba(8,14,22,0.92)"; b.fill();
      b.lineWidth = 2; b.strokeStyle = c.color; b.stroke();
      b.beginPath(); b.arc(px, py, 3.2, 0, 7);
      b.fillStyle = c.color; b.fill();

      b.font = "700 10px -apple-system, 'Segoe UI', sans-serif";
      b.textAlign = "center";
      b.fillStyle = "rgba(232,242,252,0.9)";
      b.strokeStyle = "rgba(5,10,16,0.75)";
      b.lineWidth = 3;
      const label = (side.isHuman ? "YOU · " : "") + c.name.toUpperCase();
      b.strokeText(label, px, py + 24);
      b.fillText(label, px, py + 24);
    }
  }

  // Detonate a weapon's weather effect over the defender's capital.
  function strike(wKey, defender) {
    const c = CAPITALS[defender.factionId];
    const f = WeatherMap.lonlat2frac(c.lon, c.lat);
    WeatherMap.applyEffect(
      FX[wKey] || "tornado",
      f.x + (Math.random() - 0.5) * 0.05,
      f.y + (Math.random() - 0.5) * 0.05
    );
  }

  window.MapView = { init, setup, update, strike, CAPITALS };
})();
