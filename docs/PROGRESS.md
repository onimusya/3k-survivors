# Development Progress Tracker (`docs/PROGRESS.md`)

## 1. Current Milestone Summary
- **Milestone:** Phase 2 — Combat Math, Pre-Game Perks & Vampire Survivors HUD/Modal Parity
- **Pieces Passed:** **15 / 15**
- **Measured Performance:** **60–61 FPS** sustained across 6-second stress windows with **313–320 active enemies** at `390×844` mobile viewport (target: `60 FPS / 300+ enemies`)
- **Responsive Viewports Verified:** `390×844` (Mobile Portrait) and `844×390` (Mobile Landscape)
- **Live HTML Dashboard:** [`../progress.html`](../progress.html)

---

## 2. Piece-by-Piece Verification Matrix

| # | Piece | State | Rounds | Score / Result | Key Files & Symbols |
|---:|---|---|---:|---|---|
| 1 | Core engine + responsive viewport | `PASSED` | 2 | `60 FPS` | `src/main.js`, `src/game.js` (`applyViewportSize`, `tick`) |
| 2 | Input / touch joystick + keyboard | `PASSED` | 2 | `Idle-cached` | `src/game.js` (`setupInput`, `onPointerDown/Move/Up`) |
| 3 | Player movement + camera lerp | `PASSED` | 1 | `OK` | `src/game.js` (`updatePlaying`, `renderPlayer`) |
| 4 | Enemy hordes + staggered ranged AI | `PASSED` | 4 | `60 FPS @ 319` | `src/game.js` (`spawnEnemy`, `updateEnemies`, `renderEnemies`) |
| 5 | Weapon Lv 1–8 scaling | `PASSED` | 2 | `+15% DMG / +Proj` | `src/game.js` (`getWeaponStats`, `fireWeapon`, `describeWeaponUpgrade`) |
| 6 | Unified passive stat math (all 6) | `PASSED` | 2 | `Verified` | `src/game.js` (`recomputeStats`, `applyPassive`), `src/data.js` (`PASSIVES`) |
| 7 | Pre-game starting perks (3 choices) | `PASSED` | 1 | `Vanguard / Aegis / Windfoot` | `src/data.js` (`STARTING_PERKS`), `src/game.js` (`buildMenu`, `selectPerk`) |
| 8 | XP + leveling + icon upgrade cards | `PASSED` | 2 | `Icons + Tags + Deltas` | `src/game.js` (`levelUp`, `showLevelUpUI`, `generateChoices`) |
| 9 | Weapon evolution system | `PASSED` | 2 | `Lv 8 + Passive` | `src/data.js` (`EVOLUTIONS`), `src/game.js` (`openChest`) |
| 10 | Elite bosses + treasure chests | `PASSED` | 1 | `OK` | `src/game.js` (`spawnElite`, `spawnChest`, `openChest`) |
| 11 | Three Kingdoms hero roster (6) | `PASSED` | 1 | `OK` | `src/data.js` (`HEROES`), `src/game.js` (`buildMenu`) |
| 12 | Safe-area HUD + 12-slot loadout | `PASSED` | 3 | `Centered + Batched` | `src/game.js` (`buildHud`, `layoutHud`, `renderHudSlots`, `updateHud`) |
| 13 | Fallen in Battle Game-Over modal | `PASSED` | 2 | `Portrait + Arsenal` | `src/game.js` (`gameOver`) |
| 14 | Pixel-art sprite & icon pipeline | `PASSED` | 2 | `Deterministic PNGs` | `scripts/generate_sprites.py`, `src/sprites.js` (`loadSpriteAssets`) |
| 15 | 300+ enemy performance gate | `PASSED` | 6 | `60–61 FPS @ 320` | `src/game.js` (`setupPools`, `hitPool`, `slashPool`, `textPool`) |

---

## 3. Stress Test Benchmark Log (`390×844` Mobile Viewport)

Latest 6-second continuous horde benchmark (`window.__spawnEnemies(310)` + active auto-attacks):

| Window | Active Enemies | Active Projectiles | Measured FPS | Notes |
|---:|---:|---:|---:|---|
| `t = 1s` | 313 | 0 | **61 FPS** | Initial horde spawn |
| `t = 2s` | 314 | 4 | **60 FPS** | Staggered archer volley begins |
| `t = 3s` | 316 | 18 | **61 FPS** | Melee + ranged combat active |
| `t = 4s` | 318 | 24 | **61 FPS** | Player hit-tint feedback + pooled sparks |
| `t = 5s` | 319 | 24 | **60 FPS** | Pooled float-text + XP gem drops |
| `t = 6s` | 320 | 21 | **61 FPS** | Steady-state horde saturation |

---

## 4. Chronological Activity Log

- **`[2026-10-18]` Scaffold & Core Loop:** Initialized Vite + PixiJS 8 scaffold, 6 Three Kingdoms heroes, 6 weapons, 6 evolutions, 6 passives, spatial hash collision grid, and touch joystick.
- **`[2026-10-18]` ParticleContainer Optimization:** Replaced per-enemy `Graphics` drawing (20 FPS @ 300 enemies) with `ParticleContainer` + `0.75×` render resolution to reach 60 FPS.
- **`[2026-10-24]` Sprite Pipeline Integration:** Added deterministic pixel-art generator (`scripts/generate_sprites.py`) and texture loader (`src/sprites.js`) for hero walk/attack frames, enemy atlas, terrain tiles, and combat FX.
- **`[2026-10-25]` Visual Polish & 60 FPS Recovery Pass:**
  - Resized `terrain` `TilingSprite` from `3200×3200` to viewport `(W+32)×(H+32)` and moved vignette to `#app::after` CSS radial-gradient, recovering FPS from 38–48 back to 60–61 FPS.
  - Added `slashPool` and `textPool` alongside `hitPool`; eliminated per-hit `Text`/`Sprite`/`Graphics` allocations and `.destroy()` churn.
  - Fixed hero card selection ambiguity, `"SUN SHANGXIANG"` text fit, and mobile top/bottom safe areas across `390×844` and `844×390`.
- **`[2026-10-26]` Combat Math, Pre-Game Perks & Loadout HUD Parity:**
  - Implemented `getWeaponStats(w)` so weapon levels 1–8 scale damage, area, cooldown, bonus projectiles, and pierce.
  - Unified passive and perk stat calculations in `recomputeStats()`.
  - Added 3 pre-game Starting Perks (`Vanguard Edict`, `Imperial Aegis`, `Windfoot Mandate`) to the Hero Selection Menu.
  - Generated `16×16` pixel-art weapon/passive icon atlas (`assets/sprites/ui/icons.png`) and built the centered 12-slot HUD loadout bar, icon Level-Up cards, and `FALLEN IN BATTLE` Game-Over summary modal.
