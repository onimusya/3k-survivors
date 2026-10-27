# 3K Survivors

A mobile-first, Three Kingdoms-themed action survival game inspired by *Vampire Survivors*, built with **PixiJS 8** and **Vite**. Designed to sustain **60 FPS with 300+ active enemies** at mobile viewports (`390×844` portrait and `844×390` landscape) with zero external art dependencies.

---

## Key Features

- **6 Three Kingdoms Warriors:** Guan Yu, Zhang Fei, Zhao Yun, Zhuge Liang, Lu Bu, and Sun Shangxiang—each with distinct base stats, 4-direction walk/attack sprite sheets, and signature starting weapons.
- **3 Pre-Game Starting Perks (War Decrees):** Choose between **Vanguard Edict** (`+20% DMG, +10% Area`), **Imperial Aegis** (`+35 Max HP, +2 Armor`), or **Windfoot Mandate** (`+15% SPD, -10% CD, +25% XP`) before deploying.
- **3 Campaign Maps × 9 Unique Stage Designs, 10 Enemy/Boss Types & Interactive Checkpoint Map Screen:** Progress through **Yellow Turban Outskirts**, **Hulao Pass Fortress**, and **Red Cliffs Armada** (`1-1` through `3-3`). Every stage features its own map layout (`glade`, `fortress`, `corridor`, `ring`), escalating enemy squads across **10 minion & boss types** (`Militia Spearman`, `Crossbow Scout`, `Steppe Raider`, `Ironclad Guard`, `Shadow Nightblade`, `Firebrand Zealot`, `Taoist Mystic`, plus Stage/Map Bosses **Zhang Jiao**, **Hua Xiong**, **Cao Ren**), and an interactive **3×3 Campaign Map Checkpoint Screen** upon clearing each stage.
- **Weapon Progression (Lv 1–8) & Evolutions:** Every weapon level scales damage (`+15%/lv`), area (`+8%/lv`), cooldown (`-5%/lv`), projectile/target count (`+1` at Lv 3, 5, 7), and pierce (`+1` at Lv 4, 7). Reaching **Lv 8** with the weapon's paired passive (`Lv 1+`) unlocks its ultimate evolution via Boss Chests.
- **Vampire Survivors-Style HUD & Modals:** Safe-area-aware top HUD with a centered **12-slot weapon & passive loadout bar**, pixel-art icon Level-Up cards with stat deltas, and a tactical Game-Over summary card.
- **Battlefield Decorations & Jet-Black Thunder Bomb Drops:** Endless toroidal map props (`tree`, `pine`, `rock`, `grass`, `mountain`, `banner`) with solid obstacle collision, plus random/periodic **Heart** (`+30 HP` recovery) and **Jet-Black Thunder Bomb** (`250px` AoE blast with 5-fireball explosion VFX, 3 concentric shockwaves, 16 radial sparks, screen flash, and camera shake) item drops.
- **Multi-Frame Pixel-Art VFX (`scenario-pixel-vfx`):** 7 multi-frame, hard-banded pixel-art VFX sprite sheets (`explosion` 12f, `slash` 8f, `thrust` 8f, `whirlwind` 8f, `hit` 6f, `heal` 10f, `levelup` 12f in `assets/sprites/vfx/`) rendered deterministically via `scripts/generate_vfx.mjs` and animated through pooled `Sprite` instances at 60 FPS.
- **Game Audio & SFX (`uisfx` + `earshot`):** Combines CC0 arcade UI/reward sound cues from [uisfx.com](https://uisfx.com) with physical blade/spear swish and Bessel-membrane impact `.wav` recipes from [earshot](https://leonxlnx.github.io/earshot-site/), complete with micro-pitch jitter, per-cue throttling, and a persistent `localStorage` Mute Toggle (`M` key or on-screen `SFX` button).
- **Locked 60 FPS Horde Engine:** Batched `ParticleContainer` enemy rendering, object pooling (`enemyPool`, `projPool`, `gemPool`, `hitPool`, `slashPool`, `textPool`), `SpatialHash` collision queries, and viewport-sized terrain tiling.

---

## Quick Start

### Prerequisites
- **Node.js** `>= 18`
- **Python 3 + Pillow (`PIL`)** *(optional, only required when regenerating pixel-art sprite sheets)*

### Install & Run
```bash
# Install dependencies
npm install

# Start Vite development server (http://127.0.0.1:5173/)
npm run dev

# Build static production bundle into dist/
npm run build

# Preview production build
npm run preview
```

### Regenerating Pixel-Art & SFX Assets
All sprites (`assets/sprites/`) and combat/UI audio (`assets/sfx/`) are deterministically generated:
```bash
python3 scripts/generate_sprites.py
node scripts/generate_vfx.mjs
python3 scripts/generate_sfx.py
```

---

## Documentation (`docs/`)

Development progress, architecture, combat formulas, and upcoming milestones are tracked in [`docs/`](./docs/) and [`progress.html`](./progress.html):

- **[`docs/PROGRESS.md`](./docs/PROGRESS.md)** — Milestone tracker, 15/15 piece verification matrix, and timestamped engineering log.
- **[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)** — Runtime architecture, rendering layers, object pools, spatial hashing, and 60 FPS optimization breakdown.
- **[`docs/COMBAT_MATH.md`](./docs/COMBAT_MATH.md)** — Complete reference for Hero stats, Starting Perks, Weapon Lv 1–8 formulas, Evolution pairings, and Passive compounding.
- **[`docs/ROADMAP.md`](./docs/ROADMAP.md)** — Prioritized backlog for upcoming phases (Persistent Gold & Camp Upgrades, `node:test` Suite, WebAudio SFX, Wave Events).
- **[`progress.html`](./progress.html)** — Auto-refreshing HTML status dashboard.

---

## Project Structure

```text
3k-survivors/
├── assets/
│   ├── sfx/                 # 14 bundled CC0 uisfx (.ogg) & earshot physical combat (.wav) SFX
│   └── sprites/             # Generated pixel-art PNG sheets (heroes, enemies, terrain, effects, UI icons)
├── docs/                    # Engineering & development progress documentation
│   ├── ARCHITECTURE.md
│   ├── COMBAT_MATH.md
│   ├── PROGRESS.md
│   └── ROADMAP.md
├── scripts/
│   ├── deploy-pages.sh      # GitHub Pages (gh-pages) deployment script
│   ├── generate_sfx.py      # Deterministic combat WAV synthesizer + uisfx bundler
│   └── generate_sprites.py  # Deterministic pixel-art asset generator
├── src/
│   ├── main.js              # PixiJS 8 Application bootstrap (0.75x resolution, high-performance)
│   ├── audio.js             # WebAudio SoundManager (uisfx arcade + decoded AudioBuffers + mute state)
│   ├── game.js              # Core Game loop, UI modals, HUD, input, combat, and rendering
│   ├── data.js              # Heroes, Starting Perks, Weapons, Evolutions, Passives, Enemies
│   ├── sprites.js           # Texture loader and frame slicer (nearest-neighbor filtering)
│   ├── spatial.js           # 2D SpatialHash grid for O(1) neighborhood collision queries
│   └── utils.js             # Math helpers and generic object Pool
├── tests/                   # Playwright profiling and smoke scripts
├── index.html               # Mobile viewport shell + CSS radial-gradient vignette overlay
├── progress.html            # Auto-refreshing development status dashboard
└── vite.config.js           # Vite build configuration
```
