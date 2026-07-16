/* ============================================================
   WEATHER WARS v2 — a fast card duel fought on the living Earth.

   The rethink: one resource (Storm Power, +1/turn), a 3-card
   hand, four elements in one counter cycle
   (water douses heat, heat melts cold, cold stills wind,
   wind scatters water), and cinematic simultaneous resolution
   on the real map. Two taps from cold start to playing.
   ============================================================ */

/* ---------------- data ---------------- */

const ELEMENTS = {
  water: { e: "💧", beats: "heat", verb: "douses" },
  heat:  { e: "🔥", beats: "cold", verb: "melts" },
  cold:  { e: "❄️", beats: "wind", verb: "stills" },
  wind:  { e: "💨", beats: "water", verb: "scatters" },
};

const CARDS = {
  // starters (cost 1-2)
  squall:    { name: "Squall",        emoji: "🌬️", el: "wind",  cost: 1, dmg: 8,  fx: "tornado",   desc: "A quick lash of wind." },
  downpour:  { name: "Downpour",      emoji: "🌧️", el: "water", cost: 2, dmg: 11, fx: "hurricane", desc: "Douses heat." },
  heatwave:  { name: "Heat Wave",     emoji: "🔆", el: "heat",  cost: 2, dmg: 11, fx: "heatdome",  desc: "Melts cold." },
  coldsnap:  { name: "Cold Snap",     emoji: "🥶", el: "cold",  cost: 2, dmg: 11, fx: "freeze",    desc: "Stills wind." },
  shield:    { name: "Storm Shield",  emoji: "🛡️", el: null,   cost: 1, dmg: 0,  fx: null,        desc: "Blocks 70% of their hit.", shield: 0.7 },
  // mid game (cost 4-5)
  twister:   { name: "Twister",       emoji: "🌪️", el: "wind",  cost: 4, dmg: 19, fx: "tornado",   desc: "Scatters water." },
  flood:     { name: "Flash Flood",   emoji: "🌊", el: "water", cost: 4, dmg: 19, fx: "hurricane", desc: "Douses heat." },
  firestorm: { name: "Firestorm",     emoji: "🔥", el: "heat",  cost: 5, dmg: 23, fx: "heatdome",  desc: "Melts cold." },
  blizzard:  { name: "Blizzard",      emoji: "❄️", el: "cold",  cost: 5, dmg: 23, fx: "freeze",    desc: "Stills wind." },
  // superweapons (cost 8)
  cat7:      { name: "Category 7",    emoji: "🌀", el: "water", cost: 8, dmg: 38, fx: "hurricane", desc: "The drowned world's answer.", super: true },
  solarlance:{ name: "Solar Lance",   emoji: "☀️", el: "heat",  cost: 8, dmg: 38, fx: "heatdome",  desc: "The furnace, focused.", super: true },
  abszero:   { name: "Absolute Zero", emoji: "🧊", el: "cold",  cost: 8, dmg: 38, fx: "freeze",    desc: "The last cold, spent.", super: true },
  omega:     { name: "Stormfront Ω",  emoji: "⚡", el: "wind",  cost: 8, dmg: 38, fx: "lightning", desc: "All chaos at once.", super: true },
};

const FACTIONS = {
  maritime: { name: "Maritime League", city: "Tide Bastion", el: "water", color: "#4cc9ff",
              blurb: "Hurricanes & floods", deck: ["squall","downpour","heatwave","coldsnap","shield","flood","twister","cat7"] },
  sun:      { name: "Sun Cartel",      city: "Helios Spire", el: "heat",  color: "#ffb54c",
              blurb: "Heat & fire",        deck: ["squall","downpour","heatwave","coldsnap","shield","firestorm","flood","solarlance"] },
  north:    { name: "Northern Pact",   city: "Frosthold",    el: "cold",  color: "#bfe9ff",
              blurb: "Ice & frost",        deck: ["squall","downpour","heatwave","coldsnap","shield","blizzard","firestorm","abszero"] },
  storm:    { name: "Storm Syndicate", city: "Skyforge",     el: "wind",  color: "#c9a6ff",
              blurb: "Wind & lightning",   deck: ["squall","downpour","heatwave","coldsnap","shield","twister","blizzard","omega"] },
};

const MAX_POWER = 10;
const TURN_LIMIT = 14;
const DOOM_MAX = 100;

const HINTS = [
  "⚡ Storm Power grows every turn — bigger cards unlock as the war escalates.",
  "💡 Counter cycle: 💧 douses 🔥 · 🔥 melts ❄️ · ❄️ stills 💨 · 💨 scatters 💧. Counter their element and their storm fizzles!",
  "🌡️ Big weapons heat the whole planet. If Doomsday maxes out, EVERYONE loses.",
];

let G = null;
let busy = false; // input locked during resolution

/* ---------------- game state ---------------- */

function newSide(factionId, isHuman) {
  return { factionId, isHuman, hp: 100, played: null, lastEl: null };
}

function startGame(playerFaction) {
  const others = Object.keys(FACTIONS).filter((f) => f !== playerFaction);
  const enemyFaction = others[Math.floor(Math.random() * others.length)];
  G = {
    turn: 1, doom: 0, over: false,
    you: newSide(playerFaction, true),
    enemy: newSide(enemyFaction, false),
  };
  busy = false;
  if (window.MapView) MapView.setup(G);
  if (window.WeatherMap) WeatherMap.setGlobalHeat(0);
  hide("start"); hide("gameover");
  banner(`${FACTIONS[enemyFaction].name} declares war!`, FACTIONS[enemyFaction].color);
  beginTurn();
}

function power() { return Math.min(G.turn, MAX_POWER); }

// effective cost: your own element is home turf — 1 cheaper
function costOf(side, cardId) {
  const c = CARDS[cardId];
  const native = c.el && c.el === FACTIONS[side.factionId].el;
  return Math.max(1, c.cost - (native ? 1 : 0));
}

function drawHand(side) {
  const deck = FACTIONS[side.factionId].deck.slice();
  const hand = [];
  while (hand.length < 3 && deck.length) {
    const i = Math.floor(Math.random() * deck.length);
    hand.push(deck.splice(i, 1)[0]);
  }
  // guarantee at least one playable card
  if (!hand.some((id) => costOf(side, id) <= power())) hand[0] = "squall";
  return hand;
}

/* ---------------- turn flow ---------------- */

function beginTurn() {
  if (G.over) return;
  G.hand = drawHand(G.you);
  G.enemyHand = drawHand(G.enemy);
  G.you.played = null;
  G.enemy.played = null;
  render();
  if (G.turn <= HINTS.length) hint(HINTS[G.turn - 1]);
}

function playCard(cardId) {
  if (G.over || busy || costOf(G.you, cardId) > power()) return;
  busy = true;
  hideHint();
  G.you.played = cardId;
  G.enemy.played = aiPick();
  G.you.lastEl = CARDS[cardId].el || G.you.lastEl;
  G.enemy.lastEl = CARDS[G.enemy.played].el || G.enemy.lastEl;
  renderHand(); // show chosen card locked in
  resolve();
}

function resolve() {
  const yc = CARDS[G.you.played], ec = CARDS[G.enemy.played];
  const yf = FACTIONS[G.you.factionId], ef = FACTIONS[G.enemy.factionId];

  // counter math (one direction can hold at a time; cycle is asymmetric)
  const youCounter = yc.el && ec.el && ELEMENTS[yc.el].beats === ec.el;
  const enemyCounter = yc.el && ec.el && ELEMENTS[ec.el].beats === yc.el;

  let dmgToEnemy = yc.dmg * (youCounter ? 1.3 : 1) * (enemyCounter ? 0.5 : 1);
  let dmgToYou = ec.dmg * (enemyCounter ? 1.3 : 1) * (youCounter ? 0.5 : 1);
  if (yc.shield) dmgToYou *= 1 - yc.shield;
  if (ec.shield) dmgToEnemy *= 1 - ec.shield;
  dmgToEnemy = Math.round(dmgToEnemy);
  dmgToYou = Math.round(dmgToYou);

  const seq = [];
  // 1) reveal enemy card
  seq.push([500, () => banner(`${ef.name} plays ${ec.emoji} ${ec.name}!`, ef.color)]);
  // 2) counter callout
  if (youCounter) seq.push([900, () => banner(`${ELEMENTS[yc.el].e} Your ${yc.name} ${ELEMENTS[yc.el].verb} their ${ec.name}!`, "#46c97a")]);
  else if (enemyCounter) seq.push([900, () => banner(`${ELEMENTS[ec.el].e} Their ${ec.name} ${ELEMENTS[ec.el].verb} your ${yc.name}!`, "#e85d5d")]);
  // 3) your strike lands
  seq.push([800, () => {
    if (yc.fx && window.MapView) MapView.strike(fxOf(yc), G.enemy);
    if (dmgToEnemy > 0) { G.enemy.hp = Math.max(0, G.enemy.hp - dmgToEnemy); popDmg(G.enemy, dmgToEnemy, youCounter); }
    if (yc.dmg) G.doom = Math.min(DOOM_MAX, G.doom + Math.round(yc.cost * 1.3) + (yc.super ? 4 : 0));
    renderBars();
  }]);
  // 4) enemy strike lands
  seq.push([900, () => {
    if (ec.fx && window.MapView) MapView.strike(fxOf(ec), G.you);
    if (dmgToYou > 0) { G.you.hp = Math.max(0, G.you.hp - dmgToYou); popDmg(G.you, dmgToYou, enemyCounter); shake(); }
    if (ec.dmg) G.doom = Math.min(DOOM_MAX, G.doom + Math.round(ec.cost * 1.3) + (ec.super ? 4 : 0));
    renderBars();
  }]);
  // 5) settle: end or next turn
  seq.push([1100, () => {
    WeatherMap.setGlobalHeat(G.doom / DOOM_MAX);
    if (checkEnd()) return;
    G.turn += 1;
    if (G.turn > TURN_LIMIT) return endByTimeout();
    busy = false;
    beginTurn();
  }]);

  let t = 0;
  for (const [d, fn] of seq) { t += d; setTimeout(fn, t); }
}

// map fx name for a card (shield has none)
function fxOf(card) { return card.fx; }

/* ---------------- endings ---------------- */

function checkEnd() {
  if (G.over) return true;
  if (G.doom >= DOOM_MAX) return endGame("draw", "🌍 The planet broke first.", "Doomsday maxed out. Nobody rules a dead sky.");
  const y = G.you.hp <= 0, e = G.enemy.hp <= 0;
  if (y && e) return endGame("draw", "Mutual ruin.", "Both cities fell in the same storm.");
  if (e) return endGame("win", "Victory!", `${FACTIONS[G.enemy.factionId].city} lies in ruins. The sky is yours.`);
  if (y) return endGame("lose", "Defeat.", `${FACTIONS[G.you.factionId].city} has fallen.`);
  return false;
}

function endByTimeout() {
  if (G.you.hp > G.enemy.hp) return endGame("win", "Victory on points.", "The ceasefire finds your city stronger.");
  if (G.enemy.hp > G.you.hp) return endGame("lose", "Defeat on points.", "The ceasefire finds their city stronger.");
  return endGame("draw", "Stalemate.", "The war ends as it began: even.");
}

function endGame(kind, title, sub) {
  G.over = true;
  const t = el("goTitle");
  t.textContent = title;
  t.className = "go-title " + kind;
  el("goSub").textContent = sub;
  setTimeout(() => show("gameover"), 700);
  return true;
}

/* ---------------- AI ---------------- */

function aiPick() {
  const me = G.enemy, hand = G.enemyHand;
  const affordable = hand.filter((id) => costOf(me, id) <= power());
  if (!affordable.length) return "squall";

  const dmgOf = (id) => CARDS[id].dmg || 0;
  const best = affordable.slice().sort((a, b) => dmgOf(b) - dmgOf(a))[0];

  // finish the player if possible
  if (dmgOf(best) >= G.you.hp) return best;
  // shield sometimes when hurting
  if (me.hp <= 30 && affordable.includes("shield") && Math.random() < 0.5) return "shield";
  // try to counter the element the player used last
  if (G.you.lastEl && Math.random() < 0.35) {
    const counterEl = Object.keys(ELEMENTS).find((k) => ELEMENTS[k].beats === G.you.lastEl);
    const counters = affordable.filter((id) => CARDS[id].el === counterEl && dmgOf(id) > 0);
    if (counters.length) return counters.sort((a, b) => dmgOf(b) - dmgOf(a))[0];
  }
  // usually the biggest hit, sometimes variety
  return Math.random() < 0.75 ? best : affordable[Math.floor(Math.random() * affordable.length)];
}

/* ---------------- rendering ---------------- */

function el(id) { return document.getElementById(id); }
function show(id) { el(id).classList.remove("hidden"); }
function hide(id) { el(id).classList.add("hidden"); }

function render() { renderBars(); renderHand(); }

function renderBars() {
  const yf = FACTIONS[G.you.factionId], ef = FACTIONS[G.enemy.factionId];
  el("turnNum").textContent = `${G.turn}`;
  el("enemyName").textContent = ef.name;
  el("enemyCity").textContent = ef.city;
  el("enemyHp").style.width = G.enemy.hp + "%";
  el("enemyHpNum").textContent = Math.round(G.enemy.hp);
  el("youName").textContent = yf.name;
  el("youCity").textContent = yf.city;
  el("youHp").style.width = G.you.hp + "%";
  el("youHpNum").textContent = Math.round(G.you.hp);
  el("doomFill").style.width = G.doom + "%";
  el("doomVal").textContent = Math.round(G.doom);

  // storm power pips
  const pips = el("pips");
  pips.innerHTML = "";
  for (let i = 1; i <= MAX_POWER; i++) {
    const s = document.createElement("span");
    s.className = "pip" + (i <= power() ? " lit" : "");
    pips.appendChild(s);
  }
  if (window.MapView) MapView.update();
}

function renderHand() {
  const wrap = el("hand");
  wrap.innerHTML = "";
  for (const id of G.hand) {
    const c = CARDS[id];
    const cost = costOf(G.you, id);
    const can = cost <= power() && !busy && !G.over;
    const native = c.el && c.el === FACTIONS[G.you.factionId].el;
    const btn = document.createElement("button");
    btn.className = "card" + (can ? "" : " off") + (G.you.played === id ? " picked" : "") + (c.super ? " super" : "");
    btn.disabled = !can;
    btn.innerHTML =
      `<div class="c-cost">⚡${cost}</div>` +
      `<div class="c-emoji">${c.emoji}</div>` +
      `<div class="c-name">${c.name}</div>` +
      (c.dmg ? `<div class="c-dmg">${c.dmg} dmg</div>` : `<div class="c-dmg block">blocks</div>`) +
      `<div class="c-el">${c.el ? ELEMENTS[c.el].e : "🛡️"}${native ? "<span class='home'>home</span>" : ""}</div>`;
    btn.onclick = () => playCard(id);
    wrap.appendChild(btn);
  }
}

/* banner: big center callout */
let bannerTimer = null;
function banner(text, color) {
  const b = el("banner");
  b.textContent = text;
  b.style.borderColor = color || "#4b6a90";
  b.classList.remove("hidden");
  b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.add("hidden"), 1600);
}

/* floating damage number over a city */
function popDmg(side, n, countered) {
  if (!window.MapView) return;
  const p = MapView.cityPx(side.factionId);
  const d = document.createElement("div");
  d.className = "dmg" + (countered ? " crit" : "");
  d.textContent = "−" + n;
  d.style.left = p.x + "px";
  d.style.top = p.y + "px";
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1400);
}

function shake() {
  const s = document.getElementById("stage");
  s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake");
}

/* coach hints */
let hintTimer = null;
function hint(text) {
  const h = el("hint");
  h.textContent = text;
  h.classList.remove("hidden");
  clearTimeout(hintTimer);
  hintTimer = setTimeout(hideHint, 6500);
}
function hideHint() { el("hint").classList.add("hidden"); }

/* ---------------- boot ---------------- */

function buildStart() {
  const grid = el("factionGrid");
  grid.innerHTML = "";
  let picked = "storm";
  for (const id in FACTIONS) {
    const f = FACTIONS[id];
    const b = document.createElement("button");
    b.className = "fac" + (id === picked ? " on" : "");
    b.dataset.id = id;
    b.innerHTML = `<span class="f-el">${ELEMENTS[f.el].e}</span><span class="f-name">${f.name}</span><span class="f-blurb">${f.blurb}</span>`;
    b.onclick = () => {
      picked = id;
      grid.querySelectorAll(".fac").forEach((x) => x.classList.toggle("on", x.dataset.id === id));
    };
    grid.appendChild(b);
  }
  el("playBtn").onclick = () => startGame(picked);
}

function wire() {
  if (window.MapView) MapView.init();
  buildStart();
  el("goAgain").onclick = () => { hide("gameover"); show("start"); };
  el("helpBtn").onclick = () => show("help");
  el("helpClose").onclick = () => hide("help");
}

document.addEventListener("DOMContentLoaded", wire);
