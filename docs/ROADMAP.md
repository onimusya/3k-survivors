# Development Roadmap (`docs/ROADMAP.md`)

## Completed Phases

- [x] **Phase 1 — Core Prototype & 300-Enemy Particle Engine**
  - Vite + PixiJS 8 setup, 6 Three Kingdoms heroes, spatial hash collision grid, `ParticleContainer` enemy rendering at `0.75×` resolution.
- [x] **Phase 2 — Pixel-Art Sprite Pipeline & Visual Closure Pass**
  - Deterministic Python sprite generator (`heroes`, `enemies`, `terrain`, `effects`, `ui/icons`), walk/attack animations, pooled combat FX (`hitPool`, `slashPool`, `textPool`), safe-area HUD, and locked `60–61 FPS` with `313–320` active enemies.
- [x] **Phase 3 — Combat Math, Pre-Game Perks & VS Loadout Parity**
  - Weapon Lv 1–8 scaling (`getWeaponStats`), unified passive + perk stat calculations (`recomputeStats`), 3 pre-game Starting Perks (`Vanguard Edict`, `Imperial Aegis`, `Windfoot Mandate`), centered 12-slot HUD loadout bar, icon Level-Up cards, and `FALLEN IN BATTLE` Game-Over summary.

- [x] **Phase 4 — Game Audio & SFX (`uisfx` + `earshot`)**
  - Bundled CC0 `uisfx` arcade cues + `earshot` physical swish/impact `.wav` recipes (`assets/sfx/`), `SoundManager` (`src/audio.js`) with micro-pitch jitter and cooldown throttling, and persistent Mute UI toggle on Menu & HUD.
---

## Upcoming Backlog Tracks

### Track 3 — Persistent Gold & Camp Upgrades (`localStorage`)
- **Goal:** Give `this.gold` durable value across runs.
- **Scope:**
  - Persist `totalGold`, `bestSurvivalTime`, `totalKills`, and permanent upgrade ranks in `localStorage`.
  - Award gold from enemy kill milestones and chest pickups.
  - Add a **War Camp (Armory)** upgrade strip/modal on the menu to spend gold on permanent ranks (`Might`, `Armor`, `Swiftness`, `Greed`).

### Track 4 — Automated Node Test Suite (`npm test`)
- **Goal:** Make `npm test` (`node --test`) verify core game logic without requiring a full browser launch.
- **Scope:**
  - Extract pure combat/progression math (`computePlayerStats`, `computeWeaponStats`, `canEvolveWeapon`) into `src/combat.js`.
  - Add `tests/combat.test.js` using `node:test` and `node:assert/strict` to guard weapon Lv 1–8 scaling, passive + perk compounding, evolution rules, and `SpatialHash` queries.

### Track 5 — Extended Audio & Ambient Battle BGM (Optional)
- **Goal:** Add an optional low-footprint looping battle drum/guqin bed that ducks before heavy hits (`earshot` `stop_down` mix pattern).
### Track 6 — Timed Wave Events & Boss Variety
- **Goal:** Deepen mid-run pacing beyond linear spawn-rate scaling.
- **Scope:**
  - Add scheduled wave events (`1:00 Cavalry Charge`, `2:00 Elite Vanguard`, `3:00 Archer Ring`, `5:00 Warlord Boss`) with an on-screen wave warning banner.
