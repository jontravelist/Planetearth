# Weather War — Game Design Document

> *"In 2087, whoever controls the sky controls the world."*

A mobile strategy game where rival techno-states weaponize the weather and wage
atmospheric war. Built for weather geeks and environmentally-minded players: the
spectacle of weather-as-warfare, with the quiet warning that weaponizing nature
is a doomsday spiral.

**Status:** Concept / brainstorm. This doc is a living spec.

---

## 1. Pillars (locked)

| Decision | Choice |
|----------|--------|
| **Format** | Async PvP — play a turn, opponent is notified, plays theirs (chess-app style) |
| **Complexity** | Medium / accessible — meaningful choices, no spreadsheet overload |
| **Primary hooks** | (1) Weather-as-weapons combat &nbsp; (2) Deep faction identity & lore |

---

## 2. Premise

The climate broke. Instead of cooperating, nations militarized the atmosphere.
Cloud-seeding became artillery; jet-stream manipulation became maneuver warfare.
The planet is now carved into rival **weather-states**, each with a network of
atmospheric tech, locked in a cold-and-getting-hotter war. You command one. Your
weapon is the weather itself.

---

## 3. Core Loop

```
   HARVEST atmospheric energy  ->  BUILD weather weapons / tech
            ^                              |
            |                              v
   DEFEND your climate    <----    STRIKE the enemy with weather
```

Each turn the player picks ONE of three move types (committed "blind"; resolves
when the opponent has also moved):

- **Strike** — launch a weather weapon at enemy territory
- **Shield** — defend a region (a guess at where they'll hit)
- **Build** — bank energy / research / fortify (greedy, leaves you exposed)

The blind-commit + counter triangle is the chess-like mind game that makes
async turn-based PvP addictive.

---

## 4. Weapons — atmospheric rock-paper-scissors

Readable for newcomers, min-maxable for geeks. Each weapon has delivery, impact,
and blowback.

Every weapon is a **recipe of charges** (see §6). The recipe is what ties a
weapon to a faction's home terrain — and what a player must source elsewhere to
build "foreign" weapons.

| Weapon | Recipe | Beats | Countered by | Flavor |
|--------|--------|-------|--------------|--------|
| Hurricane | 💧💧 🌬️ | coastal cities, navies | cloud-seeding (rains it out early) | wide area, *drifts* — placement risk |
| Heat Dome | 🔥🔥🔥 | shields, crops | incoming rain/storms | slow multi-turn siege |
| Flash Freeze | ❄️❄️ | enemy energy grid | heat dome | instant, expensive stun |
| Tornado Swarm | 🌬️ ⚡ 🔥 | fortified targets | flash freeze (cold kills rotation) | precise sniper |
| Lightning Barrage | ⚡⚡ 🌬️ | tech / research nodes | pressure shield | disables enemy buildings |

**Counters as verbs:** seed clouds to rain out a hurricane; heat the air to melt
a blizzard; raise a pressure shield over your capital.

---

## 5. Factions — terrain is destiny

Your home climate is your arsenal: you can only natively produce weather your
geography supports. Taking enemy land changes what you can do.

| Faction | Identity | Arsenal | Motto |
|---------|----------|---------|-------|
| Maritime League | Drowned coastal megacities on stilts | Hurricanes, storm surges | *"The tide remembers."* |
| Sun Cartel | Solar god-kings of the expanded deserts | Heat domes, droughts | *"We are the furnace."* |
| Northern Pact | Arctic clans hoarding the last cold | Blizzards, flash freezes | *"Cold is mercy."* |
| Storm Syndicate | Anarchist mountain engineers | Lightning, tornadoes | *"Chaos is a ladder of clouds."* |

Each faction has:
- a unique **superweapon** (charged over many turns),
- a **passive** (e.g. Sun Cartel regens energy on sunny turns),
- a **weakness** (home climate is vulnerable to the opposite force).

**Identity is a starting bias, not a cage.** Your faction is *born fluent* in
2–3 charges (cheap, abundant) and nearly mute in the rest. But every charge —
and therefore every weapon — is reachable. Mastery = learning to think and
fight like all four factions. See §6 for how foreign skills are acquired.

Collecting/leveling factions = long-term meta-progression.

---

## 6. The Charge System (the core economy)

One mechanic does two jobs: it *creates* faction identity AND it *prevents*
factions from being limiting. Every weapon is a recipe of five elemental
atmospheric charges.

| Charge | Symbol | Produced abundantly by |
|--------|--------|------------------------|
| Heat | 🔥 | Sun Cartel (deserts) |
| Cold | ❄️ | Northern Pact (arctic) |
| Moisture | 💧 | Maritime League (oceans) |
| Pressure / Wind | 🌬️ | Storm Syndicate (mountains) |
| Static | ⚡ | Storm Syndicate (mountains) |

- Each turn, your **terrain generates charges** — 2–3 cheaply (your faction's
  fluency), the rest only trickle in.
- Weapons cost combos of charges (§4), so a desert player finds heat domes cheap
  and blizzards expensive/foreign — identity emerges naturally from the economy.

### Learning other factions (no permanent lock-out)

Four paths to acquire foreign charges and the skills they unlock:

1. **Conquest** — capture enemy terrain and it generates *its* charge for you.
   Take their land, take their weather.
2. **Research** — a tech branch builds a *refinery* that synthesizes a foreign
   charge slowly and at a premium (the peaceful, costly route).
3. **Trade / espionage** — swap surplus charges with allies, or steal a weapon
   blueprint in battle.
4. **Environmental drift** — as the Doomsday Meter (§7) rises, the whole map
   warms: 🔥 gets cheaper for everyone, ❄️ scarcer. The dying planet reshapes
   the economy.

A master player ends up fluent in all five charges — fielding hybrid arsenals
no single faction could build alone.

---

## 6a. Progression — the slow build

The **Build** move has real depth. Two layers:

**Within a match**
- **Stockpiling** — charges bank turn-over-turn. Spend now on a cheap jab, or
  save for a devastating supercharged strike? This risk/reward is the heartbeat
  of every turn.
- **Refineries & infrastructure** — buildings that raise charge output
  (compounding economy).
- **Weapon tiers** — Hurricane I → II → III: bigger, less drift, cheaper per
  use. Upgrades cost accumulated charges + research over several turns.

**Across matches (meta-progression)**
- **Faction levels & permanent blueprint unlocks** — long-game retention.
- **Weapon mastery** — use a weapon enough and it permanently improves.

Intended match rhythm: **early jabs → mid-game economy build → late-game
supercharged haymakers**, with constant temptation to overreach (and the
Doomsday Meter punishing everyone who does).

---

## 7. The Doomsday Meter (environmental conscience)

Every weapon damages the shared global climate. A global **Doomsday Meter**
(sea level / biodiversity / runaway warming) ticks up as players fight dirty.

- If it maxes out, **everyone loses** — the planet dies (MAD-style tension).
- Creates real decisions: escalate, or propose a ceasefire?
- Argues that weaponizing nature is a doomsday spiral — without preaching.

---

## 8. Win Conditions

1. **Conquest** — push your climate over all enemy territory
2. **Survival** — last faction standing
3. **Eco-Victory** — stabilize global climate to safe levels (hardest, most prestige)
4. **Economic** — control a target share of atmospheric energy reserves

---

## 9. Open Questions / Next Steps

- Map model: hex grid? region nodes? abstract lanes?
- Turn timer for async (24h? configurable?)
- Match size: strictly 1v1, or free-for-all with 3-4 factions?
- Monetization: cosmetic faction skins? battle pass? premium campaign?
- First prototype target: vs-AI single-player to prove the combat triangle is fun
  before adding networking.

---

## 10. Comparable Games (for tone/mechanics reference)

- *Reigns* — swipe-simple decisions, narrative weight
- *Civilization* — tech/territory depth (we take a lighter slice)
- *Plague Inc.* — systemic spread, dark premise made playable
- *Words With Friends / Chess apps* — async PvP cadence
