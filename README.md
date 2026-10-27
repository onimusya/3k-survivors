# 3K Survivors

![3K Survivors Cover Banner](./public/cover.png)

A mobile-first, Three Kingdoms-themed action survival game inspired by *Vampire Survivors*, built with **PixiJS 8** and **Vite**. Designed to sustain **60 FPS with 300+ active enemies** at mobile viewports (`390×844` portrait and `844×390` landscape) with zero external art dependencies.

---

## Key Features

- **6 Three Kingdoms Warriors (Universal LPC `64×64` Sprite Sheets):** Guan Yu, Zhang Fei, Zhao Yun, Zhuge Liang, Lu Bu, and Sun Shangxiang—composited from official [Universal LPC Spritesheet Character Generator](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) layers (`body`, `head`, `faces`, `armor`, `tabard/frock`, `helmets`, `capes`, `beards/hair`, and `weapons`) across 4 directions (`walk` + `slash`/`thrust`/`shoot`/`spellcast` attack animations).
- **3 Pre-Game Starting Perks (War Decrees):** Choose between **Vanguard Edict** (`+20% DMG, +10% Area`), **Imperial Aegis** (`+35 Max HP, +2 Armor`), or **Windfoot Mandate** (`+15% SPD, -10% CD, +25% XP`) before deploying.
- **10 Three Kingdoms Campaigns × 5 Levels × 5 Waves (`50` Stages), Wave-Clear Upgrades & Auto-Save:** Progress through **10 Campaigns** (**Outskirts**, **Hulao Pass**, **Guandu**, **Changban**, **Red Cliffs**, **Tong Pass**, **Hefei**, **Fan Castle**, **Yiling**, **Wuzhang** — 5 levels per campaign, 5 waves per level). Weapon, Armor, and Pet upgrades trigger **only when you eliminate all enemies of a wave**; Wave 5 spawns the stage **Boss**, and killing all enemies + the Boss completes the level, **auto-saves your Campaign Checkpoint (`localStorage`)**, and opens the **10-Campaign Checkpoint Map Screen**.
- **Summon Pet System (4 Mythic Companions, Lv 1–5):** Fight alongside **Red Hare** (*Flame Warhorse* trampling charge), **Vermilion Bird** (*Fire Phoenix* explosive fireballs), **White Tiger** (*Frost Fang* pouncing claw slashes), and **Jade Qilin** (*Celestial Stag* lightning strikes & periodic healing)—starting with your warrior's bonded companion and summoning/upgrading up to all 4 pets simultaneously via Level-Up cards.
- **Escalating Wave Hordes, Overhead Horde Health Bars, Balanced Warlord Bosses, Siege Catapults & Aerial Bullet-Rain Bird Flocks:** Each wave (`1..5`) escalates horde size, spawn frequency, batch size, and enemy HP/DMG/Speed, with every on-screen enemy displaying an overhead **Health Bar** (`green → amber → red`). Waves 2–5 deploy wheeled **Siege Catapults** that lob flaming explosive boulders and **V-formation Feather-Storm Bird Flocks** (*Feather-Storm Hawks*) that fly overhead unleashing 5-way **Bullet Rain** feather-dart volleys. Picking up a battlefield **Bomb** triggers a **`420px × areaMul` Mega Kaboom** (`185 × dmgMul` wave-scaled blast with dual inner/outer fireball rings). Every Campaign and Level features distinct **faction armor tints**, **enemy squad rosters** (including **Imperial Halberdiers**), and **ranged weapon styles**. Stage Bosses feature balanced **15% Warlord Armor Mitigation**, a **30% Max-HP single-hit cap**, and a **50% HP Enrage Phase** (`+14% Speed`, `+12% DMG`, crimson aura, and 2 Imperial Halberdier bodyguards).
- **CraftPix & itch.io Style Top-Down Pixel Art Props & Companions:** Trees, conifers, flowering bushes, boulders, war banners + barrels, medieval village houses, stone watchtowers with ladders, fortress gatehouses, chests, and 4-frame animated companions (`assets/sprites/terrain/props.png`, `assets/sprites/pets/pets.png`) crafted with crisp `1px` dark pixel outlines and 3-tone shading inspired by [CraftPix Freebies](https://craftpix.net/freebies/) and [itch.io Free Top-Down Assets](https://itch.io/game-assets/free).
- **Defensive Rotating Orbit Weapons (`flying_blades`, `bagua_shields`):** Choose **Rotating Flying Blades** (*evolves into Celestial Sword Wheel*) or **Eight-Trigram Shields** (*evolves into Imperial Aegis Ring*) on Level-Up to surround your warrior with `3–8` continuously orbiting blades/shields that slice/bash nearby enemies and **deflect incoming enemy projectiles**.
- **Weapon Progression (Lv 1–8), Mastered Skills (Lv 5) & Max-Level Awakened Specials:** Every weapon level scales damage (`+15%/lv`), area (`+8%/lv`), cooldown (`-5%/lv`), projectile/target count, and pierce. Reaching **Max Level (`Lv 8`)** automatically awakens the weapon's ultimate evolution with unique visual effects & special bonus damage (**Dragon Slayer** twin cross-slashes + 3 piercing dragon-flame waves, **Iron Pike** 3-prong trident + spear-tip explosion, **Sky Halberd** dual whirlwinds + 4 cardinal explosions, **Storm Bow / Gale Fan / Twin Dragons** exploding elemental projectiles, **Celestial Sword Wheel** 12-point dual rings + 6 radial sword-beams, **Imperial Aegis Ring** sacred repulsion shockwaves). Reaching **Max Level (`Lv 5`)** on any Passive Skill or Pet also awakens a pulsing **Mastered Aura Ring** and periodic special AoE attacks.
- **Vampire Survivors-Style HUD & Modals:** Safe-area-aware top HUD with a centered **12-slot weapon & passive loadout bar**, pixel-art icon Level-Up cards with stat deltas, and a tactical Game-Over summary card.
- **Four Seasons Map System, Three Kingdoms Buildings & Dynamic Weather:** A `10×4` seasonal prop & building atlas (**Spring Blossom** cherry-blossom canopies & `+1.5 HP/s` regen, **Summer Solstice** sunlit foliage & `+12% DMG / -8% CD`, **Autumn Harvest** fiery maple canopies & `+20% XP`, and **Winter Frost** snow-capped houses/castles/trees & `-12% Enemy Speed`), 4 solid building types (**Village Houses**, **Archer Watchtowers**, **Fortress Castle Keeps**, **War Pavilion Tents**), and a 6-mode **Stage Weather System** (`Breeze`, `Rain`, `Thunderstorm`, `Sandstorm`, `Embers`, `Snow`).
- **Multi-Frame Pixel-Art VFX (`scenario-pixel-vfx`):** 7 multi-frame, hard-banded pixel-art VFX sprite sheets (`explosion` 12f, `slash` 8f, `thrust` 8f, `whirlwind` 8f, `hit` 6f, `heal` 10f, `levelup` 12f in `assets/sprites/vfx/`) rendered deterministically via `scripts/generate_vfx.mjs` and animated through pooled `Sprite` instances at 60 FPS.
- **ElevenLabs Per-Map BGM (`music_v2_5`) & Combat SFX:** 3 bespoke Three Kingdoms instrumental campaign map BGM tracks (`assets/bgm/{outskirts,hulao,redcliffs}.mp3` generated via `client.music.compose`) plus 12 combat & reward sound effects (`assets/sfx/*` generated via `client.textToSoundEffects.convert`), with automatic map track switching and a persistent `localStorage` Mute Toggle (`M` key or on-screen `SFX` button).
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
python3 scripts/generate_lpc_sprites.py
node scripts/generate_vfx.mjs
python3 scripts/generate_sfx.py
npm run sfx:elevenlabs
npm run bgm:elevenlabs
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
