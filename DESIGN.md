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

| Weapon | Beats | Countered by | Flavor |
|--------|-------|--------------|--------|
| Hurricane | coastal cities, navies | cloud-seeding (rains it out early) | wide area, *drifts* — placement risk |
| Heat Dome | shields, crops | incoming rain/storms | slow multi-turn siege |
| Flash Freeze | enemy energy grid | heat dome | instant, expensive stun |
| Tornado Swarm | fortified targets | flash freeze (cold kills rotation) | precise sniper |
| Lightning Barrage | tech / research nodes | pressure shield | disables enemy buildings |

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

Collecting/leveling factions = long-term meta-progression.

---

## 6. Resources (kept lean for "medium" complexity)

- **Energy** — fuel for weather machines (solar / wind / thermal / ocean), tied to terrain
- **Tech** — small research tree: bigger storms, faster delivery, better shields
- **Territory** — climate footprint; expanding it grows your power base

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
