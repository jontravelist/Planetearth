# ⚡ Weather War

A mobile strategy game where rival techno-states weaponize the weather and wage
atmospheric war. For weather geeks and environmentally-minded players: the
spectacle of weather-as-warfare, with the quiet warning that weaponizing nature
is a doomsday spiral.

> *"In 2087, whoever controls the sky controls the world."*

## This repo

- **[`DESIGN.md`](DESIGN.md)** — the living game design document (the full vision).
- **`index.html` / `styles.css` / `game.js`** — a playable **vs-AI prototype** of
  the core combat loop. Zero dependencies.

## Play the prototype

It's a single static page — no build step, no install.

```bash
# Option A: just open the file
open index.html            # macOS  (or double-click it)

# Option B: serve it (better on some mobile browsers)
python3 -m http.server 8000
# then visit http://localhost:8000  (or http://<your-ip>:8000 on your phone)
```

Pick a faction and play. Each turn you and the AI **commit a move blind**, then
they resolve together.

## What the prototype proves

The vertical slice implements the systems from `DESIGN.md`:

- **Five elemental charges** (🔥 heat · ❄️ cold · 💧 moisture · 🌬️ pressure · ⚡ static)
- **Faction bias** — your terrain pumps out 2–3 charges cheaply; the rest are foreign
- **Weapon recipes & counters** — Hurricane, Heat Dome, Flash Freeze, Tornado Swarm, Lightning Barrage
- **Blind-commit turns** — the async-PvP mind game, vs an AI for now
- **Slow-build economy** — stockpile charges, fortify, build foreign **refineries**, **upgrade** weapon tiers
- **Doomsday Meter** — every strike pushes it up; if it maxes, *everyone* loses
- **Comeback mechanics** — *Cornered* (losing concentrates your output) and
  *Doomsday Backlash* (the biggest polluter's own weapons destabilize)

### Actions each turn

| Action | Effect |
|--------|--------|
| 🎯 **Strike** | Spend charges to fire a weapon at the enemy capital |
| 🛡️ **Shield** | Cut incoming strike damage this turn (a guess — you commit blind) |
| ⚙️ **Fortify** | Bonus charge income + repair integrity |
| 🏭 **Refinery** | Build a slow tap for a *foreign* charge (unlock other factions' weapons) |
| 🔬 **Upgrade** | Permanently boost a weapon's damage (a tier) |

## Status

Early prototype / brainstorm. Next candidates: full faction tuning passes, a
proper map/territory layer, and real async multiplayer (this build is local
vs-AI). See the open questions at the end of `DESIGN.md`.
