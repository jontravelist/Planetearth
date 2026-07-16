/* ============================================================
   WEATHER WAR — prototype engine (vanilla JS, no dependencies)
   Proves the core loop: charges, faction bias, weapon recipes &
   counters, blind-commit turns, slow-build economy, foreign
   refineries, the Doomsday Meter, and both comeback mechanics.
   ============================================================ */

const CHARGE_EMOJI = {
  heat: "🔥", cold: "❄️", moisture: "💧", pressure: "💨", static: "⚡",
};
const CHARGE_KEYS = Object.keys(CHARGE_EMOJI);

const FACTIONS = {
  sun:      { name: "Sun Cartel",      motto: "We are the furnace.",          native: { heat: 4, static: 2 } },
  maritime: { name: "Maritime League", motto: "The tide remembers.",          native: { moisture: 4, pressure: 2 } },
  north:    { name: "Northern Pact",   motto: "Cold is mercy.",               native: { cold: 4, moisture: 2 } },
  storm:    { name: "Storm Syndicate", motto: "Chaos is a ladder of clouds.", native: { pressure: 4, static: 3 } },
};

// Weapon recipes mirror DESIGN.md §4.
const WEAPONS = {
  hurricane: { name: "Hurricane",         emoji: "🌀", cost: { moisture: 2, pressure: 1 }, dmg: 25, doom: 8, drift: true,
               desc: "Wide hit, but may drift off-target." },
  heatdome:  { name: "Heat Dome",         emoji: "🔆", cost: { heat: 3 },                   dmg: 12, doom: 6, dot: 9,
               desc: "Damage now + a burn next turn." },
  freeze:    { name: "Flash Freeze",      emoji: "❄️", cost: { cold: 2 },                   dmg: 15, doom: 5, freeze: true,
               desc: "Damage + freezes enemy economy 1 turn." },
  tornado:   { name: "Tornado Swarm",     emoji: "🌪️", cost: { pressure: 1, static: 1, heat: 1 }, dmg: 30, doom: 7,
               desc: "Precise, heavy single strike." },
  lightning: { name: "Lightning Barrage", emoji: "⚡", cost: { static: 2, pressure: 1 },    dmg: 18, doom: 6, sabotage: true,
               desc: "Damage + destroys an enemy refinery." },
};
const WEAPON_KEYS = Object.keys(WEAPONS);

const REFINERY_COST = 5;       // charges (paid from your richest native) to build a foreign tap
const REFINERY_PERIOD = 2;     // produces 1 foreign charge every N turns
const FORTIFY_REPAIR = 6;      // integrity healed by Fortify
const DOOM_MAX = 100;
const TURN_LIMIT = 30;

let G = null; // game state

/* ---------------- state setup ---------------- */

function newPlayer(factionId, isHuman) {
  return {
    factionId, isHuman,
    integrity: 100,
    charges: { heat: 0, cold: 0, moisture: 0, pressure: 0, static: 0 },
    refineries: [],          // [{ charge, tick }]
    upgrades: {},            // weaponKey -> tier (int)
    pollution: 0,
    frozen: false,           // economy frozen next income
    burn: 0,                 // pending DoT
    committed: null,         // action chosen this turn
  };
}

function startGame(playerFaction) {
  const factionIds = Object.keys(FACTIONS);
  const enemyChoices = factionIds.filter((f) => f !== playerFaction);
  const enemyFaction = enemyChoices[Math.floor(Math.random() * enemyChoices.length)];

  G = {
    turn: 1,
    doom: 0,
    you: newPlayer(playerFaction, true),
    enemy: newPlayer(enemyFaction, false),
    over: false,
  };

  // Seed a little starting income so turn 1 has options.
  applyIncome(G.you, true);
  applyIncome(G.enemy, true);

  if (window.MapView) MapView.setup(G);

  document.getElementById("setup").classList.add("hidden");
  document.getElementById("gameover").classList.add("hidden");
  clearLog();
  log("sys", `⚡ War begins. ${FACTIONS[playerFaction].name} vs ${FACTIONS[enemyFaction].name}.`);
  log("sys", "Pick an action. Both sides commit blind, then clash.");
  beginTurn();
}

/* ---------------- economy ---------------- */

function corneredMult(p) {
  // Comeback: losing integrity concentrates output (up to +50% near defeat).
  return 1 + ((100 - p.integrity) / 100) * 0.5;
}

function applyIncome(p, silent) {
  if (p.frozen) {
    p.frozen = false;
    if (!silent) log(p.isHuman ? "you" : "enemy", `${whoPoss(p)} economy is frozen — no charges this turn.`);
    return;
  }
  const mult = corneredMult(p);
  const nat = FACTIONS[p.factionId].native;
  for (const k in nat) p.charges[k] += Math.round(nat[k] * mult);

  // Refineries drip foreign charges.
  for (const r of p.refineries) {
    r.tick += 1;
    if (r.tick % REFINERY_PERIOD === 0) p.charges[r.charge] += 1;
  }
}

function applyBurn(p) {
  if (p.burn > 0) {
    const d = p.burn;
    p.burn = 0;
    p.integrity = Math.max(0, p.integrity - d);
    log(p.isHuman ? "you" : "enemy", `🔥 ${who(p)} ${p.isHuman ? "take" : "takes"} ${d} burn damage.`);
  }
}

/* ---------------- affordability ---------------- */

function canAfford(p, cost) {
  for (const k in cost) if ((p.charges[k] || 0) < cost[k]) return false;
  return true;
}
function pay(p, cost) {
  for (const k in cost) p.charges[k] -= cost[k];
}
function richestNative(p) {
  const nat = FACTIONS[p.factionId].native;
  let best = null, bestN = -1;
  for (const k in nat) if (p.charges[k] > bestN) { bestN = p.charges[k]; best = k; }
  return best;
}
function upgradeMult(p, w) { return 1 + 0.25 * (p.upgrades[w] || 0); }

/* ---------------- turn flow ---------------- */

function beginTurn() {
  // Start-of-turn: burn ticks, then income.
  applyBurn(G.you);
  applyBurn(G.enemy);
  if (checkEnd()) return;

  applyIncome(G.you);
  applyIncome(G.enemy);

  // Enemy commits blind (before seeing your move).
  G.enemy.committed = aiChoose(G.enemy, G.you);
  G.you.committed = null;

  render();
  setActionsEnabled(true);
}

function submitPlayerAction(action) {
  if (G.over || G.you.committed) return;
  G.you.committed = action;
  setActionsEnabled(false);
  resolveTurn();
}

function resolveTurn() {
  const you = G.you, enemy = G.enemy;
  const ya = you.committed, ea = enemy.committed;

  log("sys", `— Turn ${G.turn} —`);

  // Shields known before strikes resolve.
  const youShield = ya.type === "shield";
  const enemyShield = ea.type === "shield";

  // Apply non-strike economy actions first (so they're not wasted if struck).
  applyNonStrike(you, ya);
  applyNonStrike(enemy, ea);

  // Resolve strikes simultaneously.
  if (ya.type === "strike") doStrike(you, enemy, ya.weapon, enemyShield);
  if (ea.type === "strike") doStrike(enemy, you, ea.weapon, youShield);

  you.committed = null;
  enemy.committed = null;

  render();
  if (checkEnd()) return;

  G.turn += 1;
  if (G.turn > TURN_LIMIT) { endByTimeout(); return; }
  beginTurn();
}

function applyNonStrike(p, a) {
  if (a.type === "shield") {
    log(p.isHuman ? "you" : "enemy", `🛡️ ${who(p)} raises a pressure shield.`);
  } else if (a.type === "fortify") {
    applyIncome(p, true); // second income pulse = focus on economy
    p.integrity = Math.min(100, p.integrity + FORTIFY_REPAIR);
    log(p.isHuman ? "you" : "enemy", `⚙️ ${who(p)} fortifies: bonus charges +${FORTIFY_REPAIR} integrity.`);
  } else if (a.type === "refinery") {
    const src = richestNative(p);
    pay(p, { [src]: REFINERY_COST });
    p.refineries.push({ charge: a.charge, tick: 0 });
    log(p.isHuman ? "you" : "enemy", `🏭 ${who(p)} builds a ${CHARGE_EMOJI[a.charge]} refinery.`);
  } else if (a.type === "upgrade") {
    const w = WEAPONS[a.weapon];
    pay(p, scaleCost(w.cost, 2));
    p.upgrades[a.weapon] = (p.upgrades[a.weapon] || 0) + 1;
    log(p.isHuman ? "you" : "enemy", `🔬 ${who(p)} upgrades ${w.name} to tier ${p.upgrades[a.weapon] + 1}.`);
  }
}

function doStrike(attacker, defender, wKey, defenderShield) {
  const w = WEAPONS[wKey];
  pay(attacker, w.cost);
  if (window.MapView) MapView.strike(wKey, defender);

  let dmg = w.dmg * upgradeMult(attacker, wKey);

  // Doomsday Backlash: the dirtier player's strikes destabilize.
  const other = attacker === G.you ? G.enemy : G.you;
  const lead = attacker.pollution - other.pollution;
  if (lead > 0) {
    const misChance = Math.min(0.4, lead / 100);
    if (Math.random() < misChance) {
      dmg *= 0.5;
      G.doom = Math.min(DOOM_MAX, G.doom + 3);
      log(attacker.isHuman ? "you" : "enemy", `🌡️ Backlash! ${who(attacker)}'s ${w.name} destabilizes — half damage.`);
    }
  }

  // Hurricane drift risk.
  if (w.drift && Math.random() < 0.3) {
    dmg *= 0.6;
    log(attacker.isHuman ? "you" : "enemy", `🌀 The hurricane drifts — glancing blow.`);
  }

  if (defenderShield) dmg *= 0.3;

  dmg = Math.round(dmg);
  defender.integrity = Math.max(0, defender.integrity - dmg);

  // Pollution + global doom.
  attacker.pollution += w.doom;
  G.doom = Math.min(DOOM_MAX, G.doom + w.doom);

  const cls = attacker.isHuman ? "you" : "enemy";
  log(cls, `${w.emoji} ${who(attacker)} ${attacker.isHuman ? "hit" : "hits"} ${who(defender)} with ${w.name} for ${dmg}.${defenderShield ? " (shielded)" : ""}`);

  // Side effects.
  if (w.dot) { defender.burn += w.dot; }
  if (w.freeze) { defender.frozen = true; log(cls, `❄️ ${whoPoss(defender)} economy will freeze next turn.`); }
  if (w.sabotage && defender.refineries.length) {
    const lost = defender.refineries.pop();
    log(cls, `⚡ Strike destroys ${whoPoss(defender)} ${CHARGE_EMOJI[lost.charge]} refinery.`);
  }
}

function scaleCost(cost, f) {
  const o = {};
  for (const k in cost) o[k] = cost[k] * f;
  return o;
}

/* ---------------- end conditions ---------------- */

function checkEnd() {
  if (G.over) return true;
  if (G.doom >= DOOM_MAX) { endGame("draw", "🌍 The planet died.", "The Doomsday Meter maxed out. Everyone loses — that was always the risk."); return true; }
  const youDead = G.you.integrity <= 0;
  const enemyDead = G.enemy.integrity <= 0;
  if (youDead && enemyDead) { endGame("draw", "Mutual ruin.", "Both capitals fell in the same exchange."); return true; }
  if (enemyDead) { endGame("win", "Victory!", `${FACTIONS[G.enemy.factionId].name} is broken. The sky is yours.`); return true; }
  if (youDead) { endGame("lose", "Defeat.", `${FACTIONS[G.enemy.factionId].name} shattered your capital.`); return true; }
  return false;
}

function endByTimeout() {
  const you = G.you, enemy = G.enemy;
  if (you.integrity > enemy.integrity) endGame("win", "Victory on points.", "Time ran out — your capital stood stronger.");
  else if (enemy.integrity > you.integrity) endGame("lose", "Defeat on points.", "Time ran out — the enemy outlasted you.");
  else endGame("draw", "Stalemate.", "Time ran out evenly matched.");
}

function endGame(kind, title, sub) {
  G.over = true;
  setActionsEnabled(false);
  const t = document.getElementById("goTitle");
  t.textContent = title;
  t.className = "go-title " + (kind === "win" ? "win" : kind === "lose" ? "lose" : "draw");
  document.getElementById("goSub").textContent = sub;
  document.getElementById("gameover").classList.remove("hidden");
  log("big", title);
}

/* ---------------- simple AI ---------------- */

function aiChoose(me, foe) {
  // Best affordable strike by effective damage.
  let best = null, bestDmg = -1;
  for (const wKey of WEAPON_KEYS) {
    const w = WEAPONS[wKey];
    if (!canAfford(me, w.cost)) continue;
    const eff = w.dmg * upgradeMult(me, wKey);
    if (eff > bestDmg) { bestDmg = eff; best = wKey; }
  }

  const lowFoe = foe.integrity <= 35;
  const lowMe = me.integrity <= 30;
  const totalCharges = CHARGE_KEYS.reduce((s, k) => s + me.charges[k], 0);

  // Go for the kill.
  if (best && lowFoe) return { type: "strike", weapon: best };

  // Defend if hurt and not able to race.
  if (lowMe && Math.random() < 0.45) return { type: "shield" };

  // Early economy / poor on charges → build.
  if (totalCharges < 4 || (G.turn <= 3 && Math.random() < 0.5)) {
    // Sometimes invest in a foreign refinery for flexibility.
    if (me.refineries.length < 2 && Math.random() < 0.4 && canAffordRefinery(me)) {
      return { type: "refinery", charge: pickForeignCharge(me) };
    }
    return { type: "fortify" };
  }

  // Mostly strike if able, occasionally shield/build to vary.
  if (best) {
    const r = Math.random();
    if (r < 0.15) return { type: "shield" };
    if (r < 0.25 && canAffordUpgrade(me, best)) return { type: "upgrade", weapon: best };
    return { type: "strike", weapon: best };
  }
  return { type: "fortify" };
}

function canAffordRefinery(p) {
  const src = richestNative(p);
  return p.charges[src] >= REFINERY_COST;
}
function canAffordUpgrade(p, w) {
  return canAfford(p, scaleCost(WEAPONS[w].cost, 2));
}
function pickForeignCharge(p) {
  const nat = FACTIONS[p.factionId].native;
  const owned = new Set(p.refineries.map((r) => r.charge));
  const foreign = CHARGE_KEYS.filter((k) => !(k in nat) && !owned.has(k));
  return foreign[Math.floor(Math.random() * foreign.length)] || "cold";
}

/* ---------------- rendering ---------------- */

function who(p) { return p.isHuman ? "You" : FACTIONS[p.factionId].name; }
function whoPoss(p) { return p.isHuman ? "Your" : FACTIONS[p.factionId].name + "'s"; }

function render() {
  document.getElementById("turnNum").textContent = G.turn;

  // Doom
  document.getElementById("doomVal").textContent = Math.round(G.doom);
  document.getElementById("doomFill").style.width = G.doom + "%";

  renderPlayer(G.you, "you");
  renderPlayer(G.enemy, "enemy");

  if (window.MapView) MapView.update();

  // Update action affordability
  refreshActionBar();
}

function renderPlayer(p, prefix) {
  const f = FACTIONS[p.factionId];
  document.getElementById(prefix + "Name").textContent = p.isHuman ? `You — ${f.name}` : f.name;
  document.getElementById(prefix + "Motto").textContent = `“${f.motto}”`;
  document.getElementById(prefix + "Poll").textContent = `☁ pollution ${p.pollution}`;
  document.getElementById(prefix + "Hp").style.width = p.integrity + "%";
  document.getElementById(prefix + "HpNum").textContent = Math.round(p.integrity);

  const cc = document.getElementById(prefix + "Charges");
  cc.innerHTML = "";
  for (const k of CHARGE_KEYS) {
    const native = k in f.native;
    const v = p.charges[k];
    const chip = document.createElement("span");
    chip.className = "chip" + (native ? " native" : "") + (v === 0 ? " zero" : "");
    chip.innerHTML = `${CHARGE_EMOJI[k]}<span class="cnum">${v}</span>`;
    cc.appendChild(chip);
  }

  const bb = document.getElementById(prefix + "Builds");
  bb.innerHTML = "";
  for (const r of p.refineries) {
    const b = document.createElement("span");
    b.className = "badge";
    b.textContent = `🏭 ${CHARGE_EMOJI[r.charge]}`;
    bb.appendChild(b);
  }
  for (const w in p.upgrades) {
    const b = document.createElement("span");
    b.className = "badge up";
    b.textContent = `${WEAPONS[w].emoji} T${p.upgrades[w] + 1}`;
    bb.appendChild(b);
  }
}

/* ---------------- action bar + modals ---------------- */

const actionButtons = () => Array.from(document.querySelectorAll(".act"));

function setActionsEnabled(on) {
  actionButtons().forEach((b) => (b.disabled = !on));
  if (on) refreshActionBar();
}

function refreshActionBar() {
  if (G.over || G.you.committed) return;
  const p = G.you;
  const anyStrike = WEAPON_KEYS.some((w) => canAfford(p, WEAPONS[w].cost));
  byAct("strike").disabled = !anyStrike;
  byAct("refinery").disabled = !canAffordRefinery(p);
  byAct("upgrade").disabled = !WEAPON_KEYS.some((w) => canAffordUpgrade(p, w));
}
function byAct(a) { return document.querySelector(`.act[data-act="${a}"]`); }

function onAction(act) {
  if (G.over || G.you.committed) return;
  if (act === "shield") return submitPlayerAction({ type: "shield" });
  if (act === "fortify") return submitPlayerAction({ type: "fortify" });
  if (act === "strike") return openStrikePicker();
  if (act === "refinery") return openRefineryPicker();
  if (act === "upgrade") return openUpgradePicker();
}

function openModal(title, opts) {
  document.getElementById("modalTitle").textContent = title;
  const list = document.getElementById("modalList");
  list.innerHTML = "";
  for (const o of opts) {
    const btn = document.createElement("button");
    btn.className = "opt" + (o.disabled ? " cant" : "");
    btn.disabled = !!o.disabled;
    btn.innerHTML =
      `<div class="o-top"><span>${o.label}</span><span class="o-cost">${o.cost}</span></div>` +
      (o.desc ? `<div class="o-desc">${o.desc}</div>` : "");
    btn.onclick = () => { closeModal(); o.pick(); };
    list.appendChild(btn);
  }
  document.getElementById("modal").classList.remove("hidden");
}
function closeModal() { document.getElementById("modal").classList.add("hidden"); }

function costStr(cost) {
  return Object.keys(cost).map((k) => `${CHARGE_EMOJI[k]}${cost[k]}`).join(" ");
}

function openStrikePicker() {
  const p = G.you;
  const opts = WEAPON_KEYS.map((wKey) => {
    const w = WEAPONS[wKey];
    const tier = p.upgrades[wKey] || 0;
    const dmg = Math.round(w.dmg * upgradeMult(p, wKey));
    return {
      label: `${w.emoji} ${w.name}${tier ? ` T${tier + 1}` : ""}`,
      cost: `${costStr(w.cost)}  · ${dmg}dmg`,
      desc: w.desc,
      disabled: !canAfford(p, w.cost),
      pick: () => submitPlayerAction({ type: "strike", weapon: wKey }),
    };
  });
  openModal("🎯 Choose a weapon", opts);
}

function openRefineryPicker() {
  const p = G.you;
  const nat = FACTIONS[p.factionId].native;
  const owned = new Set(p.refineries.map((r) => r.charge));
  const src = richestNative(p);
  const opts = CHARGE_KEYS
    .filter((k) => !(k in nat))
    .map((k) => ({
      label: `${CHARGE_EMOJI[k]} ${k} refinery`,
      cost: `${CHARGE_EMOJI[src]}${REFINERY_COST}`,
      desc: owned.has(k) ? "Already built (adds another tap)." : `+1 ${CHARGE_EMOJI[k]} every ${REFINERY_PERIOD} turns.`,
      disabled: !canAffordRefinery(p),
      pick: () => submitPlayerAction({ type: "refinery", charge: k }),
    }));
  openModal("🏭 Build a foreign refinery", opts);
}

function openUpgradePicker() {
  const p = G.you;
  const opts = WEAPON_KEYS.map((wKey) => {
    const w = WEAPONS[wKey];
    const tier = p.upgrades[wKey] || 0;
    const cost = scaleCost(w.cost, 2);
    return {
      label: `${w.emoji} ${w.name} → T${tier + 2}`,
      cost: costStr(cost),
      desc: `+25% damage (now ${Math.round(w.dmg * upgradeMult(p, wKey))} → ${Math.round(w.dmg * (upgradeMult(p, wKey) + 0.25))}).`,
      disabled: !canAfford(p, cost),
      pick: () => submitPlayerAction({ type: "upgrade", weapon: wKey }),
    };
  });
  openModal("🔬 Upgrade a weapon", opts);
}

/* ---------------- log ---------------- */

function log(cls, msg) {
  const el = document.createElement("div");
  el.className = "logline " + cls;
  el.textContent = msg;
  document.getElementById("log").appendChild(el);
}
function clearLog() { document.getElementById("log").innerHTML = ""; }

/* ---------------- boot / wiring ---------------- */

function buildFactionSelect() {
  const grid = document.getElementById("factionGrid");
  grid.innerHTML = "";
  for (const id in FACTIONS) {
    const f = FACTIONS[id];
    const natStr = Object.keys(f.native).map((k) => CHARGE_EMOJI[k]).join(" ");
    const b = document.createElement("button");
    b.className = "fac";
    b.innerHTML =
      `<div class="f-name">${f.name}</div>` +
      `<div class="f-motto">“${f.motto}”</div>` +
      `<div class="f-native">${natStr}</div>`;
    b.onclick = () => startGame(id);
    grid.appendChild(b);
  }
}

function wire() {
  if (window.MapView) MapView.init();
  actionButtons().forEach((b) => b.addEventListener("click", () => onAction(b.dataset.act)));
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("goAgain").addEventListener("click", () => {
    document.getElementById("gameover").classList.add("hidden");
    document.getElementById("setup").classList.remove("hidden");
  });
  buildFactionSelect();
}

document.addEventListener("DOMContentLoaded", wire);
