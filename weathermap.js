/* ============================================================
   WEATHER WAR — live weather-field renderer (prototype)
   "Windy"-style look with zero dependencies:
     - a curl-noise WIND field  -> thousands of advected particles
       with fading trails (the silky flow lines)
     - a TEMPERATURE color field underneath (cold blue -> hot red)
     - reactive EFFECTS (hurricane / heat dome / freeze / tornado)
       that inject vortices + hot/cold blobs and decay over time
   Public API:  WeatherMap.init(canvasBg, canvasFx)
                WeatherMap.applyEffect(type, [x01, y01])   // 0..1 coords
   ============================================================ */
(function () {
  "use strict";

  // ---- tiny value-noise (no deps) ----
  function hash(i, j) {
    let n = i * 374761393 + j * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function vnoise(x, y) {
    const i = Math.floor(x), j = Math.floor(y);
    const fx = x - i, fy = y - j;
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    const u = smooth(fx), v = smooth(fy);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  }
  // scalar stream function (animated) -> curl gives divergence-free flow
  function psi(x, y, t) {
    return (
      vnoise(x * 1.1 + t * 0.06, y * 1.1) * 1.0 +
      vnoise(x * 2.3 - t * 0.05, y * 2.3 + 9.1) * 0.5 +
      vnoise(x * 4.1, y * 4.1 - t * 0.04) * 0.25
    );
  }

  const EFFECTS = {
    hurricane: { temp: 0.0, swirl: 1.0, push: 0.2, radius: 0.22, color: "#9bdcff", maxLife: 520, rise: 60 },
    heatdome:  { temp: 1.0, swirl: 0.0, push: -0.05, radius: 0.20, color: "#ff8a4c", maxLife: 600, rise: 90 },
    freeze:    { temp: -1.0, swirl: 0.1, push: 0.0, radius: 0.18, color: "#bfe9ff", maxLife: 600, rise: 70 },
    tornado:   { temp: 0.2, swirl: 1.6, push: 0.0, radius: 0.10, color: "#d6b3ff", maxLife: 360, rise: 30 },
  };

  const M = {
    bg: null, fx: null, bctx: null, fctx: null,
    w: 0, h: 0, dpr: 1,
    t: 0, particles: [], n: 0,
    storms: [],            // active injected effects
    tempLow: null, tcols: 0, trows: 0, tcanvas: null, tctx: null,
    land: [],              // stylized faction landmasses (faint)
    raf: 0,
  };

  function resize() {
    const rect = M.bg.getBoundingClientRect();
    M.dpr = Math.min(window.devicePixelRatio || 1, 2);
    M.w = Math.max(1, Math.floor(rect.width));
    M.h = Math.max(1, Math.floor(rect.height));
    for (const c of [M.bg, M.fx]) {
      c.width = M.w * M.dpr; c.height = M.h * M.dpr;
      c.style.width = M.w + "px"; c.style.height = M.h + "px";
    }
    M.bctx.setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
    M.fctx.setTransform(M.dpr, 0, 0, M.dpr, 0, 0);

    // temperature low-res grid
    M.tcols = Math.max(12, Math.round(M.w / 26));
    M.trows = Math.max(12, Math.round(M.h / 26));
    M.tcanvas = document.createElement("canvas");
    M.tcanvas.width = M.tcols; M.tcanvas.height = M.trows;
    M.tctx = M.tcanvas.getContext("2d");

    // particle count scales with area, capped for mobile
    M.n = Math.min(2600, Math.round((M.w * M.h) / 700));
    M.particles = [];
    for (let i = 0; i < M.n; i++) M.particles.push(spawn());
  }

  function spawn() {
    return { x: Math.random() * M.w, y: Math.random() * M.h, age: Math.random() * 90, max: 60 + Math.random() * 90 };
  }

  // base wind from curl of psi, plus storm vortices
  function windAt(px, py) {
    const x = px / M.h, y = py / M.h; // scale by height to keep aspect
    const e = 0.015;
    const vx = (psi(x, y + e, M.t) - psi(x, y - e, M.t)) / (2 * e);
    const vy = -(psi(x + e, y, M.t) - psi(x - e, y, M.t)) / (2 * e);
    let wx = vx * 0.9, wy = vy * 0.9;

    for (const s of M.storms) {
      const dx = px - s.px, dy = py - s.py;
      const r = M.h * s.cfg.radius;
      const d2 = dx * dx + dy * dy;
      const fall = Math.exp(-d2 / (2 * r * r)) * s.strength;
      if (fall < 0.001) continue;
      // rotational (swirl) + slight inward push
      wx += (-dy) * s.cfg.swirl * fall * 0.03;
      wy += (dx) * s.cfg.swirl * fall * 0.03;
      wx += (-dx) * s.cfg.push * fall * 0.03;
      wy += (-dy) * s.cfg.push * fall * 0.03;
    }
    return [wx, wy];
  }

  function tempAt(col, row) {
    const y = row / (M.trows - 1);
    // base: cool at poles (top/bottom), warm at equator (middle)
    let t = 1 - Math.abs(y - 0.5) * 2;       // 0..1
    t = t * 1.4 - 0.7;                        // -0.7..0.7
    const px = (col + 0.5) / M.tcols * M.w;
    const py = (row + 0.5) / M.trows * M.h;
    for (const s of M.storms) {
      const dx = px - s.px, dy = py - s.py;
      const r = M.h * s.cfg.radius;
      const fall = Math.exp(-(dx * dx + dy * dy) / (2 * r * r)) * s.strength;
      t += s.cfg.temp * fall;
    }
    return Math.max(-1, Math.min(1, t));
  }

  // temperature -> RGB (cold cyan/blue -> teal -> warm orange/red)
  function tempColor(t) {
    // t in -1..1
    const stops = [
      [-1.0, [120, 200, 255]],
      [-0.4, [70, 150, 210]],
      [0.0, [40, 110, 140]],
      [0.4, [210, 150, 70]],
      [1.0, [255, 110, 60]],
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      const [a, ca] = stops[i], [b, cb] = stops[i + 1];
      if (t <= b) {
        const f = (t - a) / (b - a);
        return [
          Math.round(ca[0] + (cb[0] - ca[0]) * f),
          Math.round(ca[1] + (cb[1] - ca[1]) * f),
          Math.round(ca[2] + (cb[2] - ca[2]) * f),
        ];
      }
    }
    return stops[stops.length - 1][1];
  }

  function paintBackground() {
    const b = M.bctx;
    b.clearRect(0, 0, M.w, M.h);
    b.fillStyle = "#081320";
    b.fillRect(0, 0, M.w, M.h);

    // temperature field -> low-res image, drawn smoothed (blurred gradient)
    const img = M.tctx.createImageData(M.tcols, M.trows);
    for (let r = 0; r < M.trows; r++) {
      for (let c = 0; c < M.tcols; c++) {
        const [rr, gg, bb] = tempColor(tempAt(c, r));
        const k = (r * M.tcols + c) * 4;
        img.data[k] = rr; img.data[k + 1] = gg; img.data[k + 2] = bb; img.data[k + 3] = 150;
      }
    }
    M.tctx.putImageData(img, 0, 0);
    b.imageSmoothingEnabled = true;
    b.globalAlpha = 0.85;
    b.drawImage(M.tcanvas, 0, 0, M.tcols, M.trows, 0, 0, M.w, M.h);
    b.globalAlpha = 1;

    // faint stylized landmasses (faction territories)
    b.save();
    b.globalAlpha = 0.16;
    b.fillStyle = "#0c1a12";
    b.strokeStyle = "rgba(180,220,200,0.25)";
    b.lineWidth = 1.5;
    for (const poly of M.land) {
      b.beginPath();
      poly.forEach((p, i) => {
        const x = p[0] * M.w, y = p[1] * M.h;
        i ? b.lineTo(x, y) : b.moveTo(x, y);
      });
      b.closePath(); b.fill(); b.stroke();
    }
    b.restore();
  }

  function step() {
    M.t += 0.6;

    // advance + decay storms; repaint bg when any storm active (so colors react)
    let active = false;
    for (const s of M.storms) {
      s.life++;
      if (s.life < s.cfg.rise) s.strength = s.life / s.cfg.rise;          // ease in
      else s.strength = Math.max(0, 1 - (s.life - s.cfg.rise) / (s.cfg.maxLife - s.cfg.rise)); // decay
      if (s.strength > 0.001) active = true;
    }
    M.storms = M.storms.filter((s) => s.life < s.cfg.maxLife);
    if (active || M._dirtyBg) { paintBackground(); M._dirtyBg = false; }

    // fade existing trails toward transparent (keeps bg temp visible)
    const f = M.fctx;
    f.globalCompositeOperation = "destination-out";
    f.fillStyle = "rgba(0,0,0,0.10)";
    f.fillRect(0, 0, M.w, M.h);
    f.globalCompositeOperation = "source-over";

    f.lineWidth = 1.2;
    f.lineCap = "round";
    for (const p of M.particles) {
      const [wx, wy] = windAt(p.x, p.y);
      const nx = p.x + wx, ny = p.y + wy;
      const speed = Math.min(1, Math.hypot(wx, wy) / 3);
      // color: cool->warm by local temp, brightened by speed
      const tc = tempColor(tempAt(
        Math.max(0, Math.min(M.tcols - 1, Math.floor(p.x / M.w * M.tcols))),
        Math.max(0, Math.min(M.trows - 1, Math.floor(p.y / M.h * M.trows)))
      ));
      f.strokeStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${0.25 + speed * 0.6})`;
      f.beginPath();
      f.moveTo(p.x, p.y);
      f.lineTo(nx, ny);
      f.stroke();

      p.x = nx; p.y = ny; p.age++;
      if (p.age > p.max || p.x < 0 || p.x > M.w || p.y < 0 || p.y > M.h) {
        Object.assign(p, spawn());
      }
    }

    M.raf = requestAnimationFrame(step);
  }

  // ---------- public API ----------
  const WeatherMap = {
    init(bgCanvas, fxCanvas) {
      M.bg = bgCanvas; M.fx = fxCanvas;
      M.bctx = bgCanvas.getContext("2d");
      M.fctx = fxCanvas.getContext("2d");
      // a couple stylized landmasses (normalized coords)
      M.land = [
        [[0.05, 0.30], [0.22, 0.20], [0.34, 0.34], [0.28, 0.55], [0.10, 0.60]],
        [[0.55, 0.12], [0.78, 0.18], [0.86, 0.38], [0.70, 0.46], [0.58, 0.30]],
        [[0.48, 0.62], [0.70, 0.66], [0.74, 0.86], [0.50, 0.90], [0.40, 0.74]],
      ];
      resize();
      M._dirtyBg = true;
      window.addEventListener("resize", () => { cancelAnimationFrame(M.raf); resize(); M._dirtyBg = true; M.raf = requestAnimationFrame(step); });
      M.raf = requestAnimationFrame(step);
      return WeatherMap;
    },
    applyEffect(type, x01, y01) {
      const cfg = EFFECTS[type] || EFFECTS.hurricane;
      const px = (x01 != null ? x01 : 0.25 + Math.random() * 0.5) * M.w;
      const py = (y01 != null ? y01 : 0.25 + Math.random() * 0.5) * M.h;
      M.storms.push({ px, py, cfg, life: 0, strength: 0 });
      M._dirtyBg = true;
      return { px, py };
    },
    reset() { M.storms = []; M._dirtyBg = true; },
  };

  window.WeatherMap = WeatherMap;
})();
