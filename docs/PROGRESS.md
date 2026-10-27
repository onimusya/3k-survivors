# Development Progress Tracker (`docs/PROGRESS.md`)

## 1. Current Milestone Summary
- **Milestone:** Phase 2 — Combat Math, Pre-Game Perks & Vampire Survivors HUD/Modal Parity
- **Pieces Passed:** **21 / 21**
- **Measured Performance:** **60–61 FPS** sustained across 6-second stress windows with **301–381 active enemies** at `1.0×` native render resolution (`2.0×` HiDPI text resolution)
- **Responsive Viewports Verified:** `390×844` (Mobile Portrait), `844×390` (Mobile Landscape), and `1280×800` (Tablet/Desktop)
- **Live HTML Dashboard:** [`../progress.html`](../progress.html)

---

## 2. Piece-by-Piece Verification Matrix

| # | Piece | State | Rounds | Score / Result | Key Files & Symbols |
|---:|---|---|---:|---|---|
| 1 | Core engine + responsive viewport | `PASSED` | 2 | `60 FPS` | `src/main.js`, `src/game.js` (`applyViewportSize`, `tick`) |
| 2 | Input / floating touch joystick + keyboard | `PASSED` | 3 | `Full-screen thumb anchor` | `src/game.js` (`setupInput`, `onPointerDown/Move/Up`) |
| 3 | Player movement + obstacle collision | `PASSED` | 2 | `Tree/Rock/Mountain block` | `src/game.js` (`updatePlaying`, `resolvePropCollisions`, `renderPlayer`) |
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
| 14 | Universal LPC character & sprite pipeline | `PASSED` | 3 | `64×64 LPC + 7 VFX Sheets` | `scripts/generate_lpc_sprites.py`, `scripts/generate_sprites.py`, `src/sprites.js` |
| 15 | 300+ enemy performance gate | `PASSED` | 6 | `60–61 FPS @ 320` | `src/game.js` (`setupPools`, `hitPool`, `slashPool`, `textPool`) |
| 16 | Map BGM & Combat SFX (`ElevenLabs Music v2.5` + `SFX`) | `PASSED` | 3 | `3 Map BGMs + 12 SFX + Mute UI` | `scripts/generate_bgm.mjs`, `scripts/generate_elevenlabs_sfx.mjs`, `src/audio.js` |
| 17 | Multi-res sharp rendering & `scenario-pixel-vfx` sheets | `PASSED` | 2 | `1.0x Res + 7 VFX Sheets` | `scripts/generate_vfx.mjs`, `src/sprites.js`, `src/game.js` (`vfxFrames`, `updateParticles`) |
| 18 | Four Seasons, Buildings (`House`/`Tower`/`Castle`/`Tent`) & Weather | `PASSED` | 4 | `4×10 Seasonal Props + 6 Weathers` | `src/data.js` (`SEASONS`), `src/game.js` (`setSeason`, `applySeasonPropTints`, `updateWeather`) |
| 19 | Campaign maps, levels, bosses & wave HUD | `PASSED` | 2 | `9 Map Designs + 9 Bosses` | `src/data.js` (`CAMPAIGN_MAPS`), `src/game.js` (`updateStageProgression`, `advanceStage`, `spawnMapBoss`) |
| 20 | Campaign Checkpoint Map Screen & 16 Enemy/Boss types | `PASSED` | 3 | `Illustrated 3×3 Map + 9 Bosses` | `src/game.js` (`showCampaignMapModal`, `enemyShoot`), `scripts/generate_lpc_sprites.py` |
| 21 | Summon Pet System (4 mythic companions, Lv 1–5) | `PASSED` | 1 | `Red Hare / Vermilion / Tiger / Qilin` | `src/data.js` (`PETS`), `src/game.js` (`summonPet`, `updatePets`, `renderPets`), `scripts/generate_sprites.py` |

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
- **`[2026-10-26]` Game Audio & SFX Integration (`uisfx` + `earshot`):**
  - Installed `uisfx` (`CC0-1.0` audio) and created `scripts/generate_sfx.py` to bundle 8 `uisfx` `.ogg` cues (`select`, `start`, `levelup`, `upgrade`, `evolve`, `chest`, `gem`, `gameover`) and render 6 physical combat `.wav` cues (`slash`, `thrust`, `spin`, `shoot`, `hit`, `hurt`) using `earshot` Strouhal swish and Bessel membrane impact recipes.
  - Built `SoundManager` in `src/audio.js` with WebAudio `AudioBuffer` decoding, micro-pitch jitter, per-cue cooldown throttling, and `localStorage` mute persistence.
  - Added on-screen `SFX / MUTE` toggle buttons to both the Hero Selection Menu and the gameplay HUD.
- **`[2026-10-26]` Sharp 1.0× Resolution, Multi-Resolution UI Scaling & Weapon Attack VFX:**
  - Upgraded `src/main.js` from `resolution: 0.75` to `resolution: 1` (`roundPixels: true`, `TextStyle.defaultTextStyle.resolution = 2`) with CSS-composited pixel-art terrain on `#app`, eliminating sub-pixel sprite and font blur while maintaining **60–61 FPS** with 310+ active enemies.
  - Added `computeLayoutMetrics()` (`uiScale`, `worldScale`) and centered HUD/Menu scaling across `390×844`, `844×390`, and `1280×800` viewports.
  - Added `spear.png`, `whirlwind.png`, `shockwave.png`, and `spark.png` in `scripts/generate_sprites.py` and 4 new FX pools (`thrustPool`, `spinPool`, `ringPool`, `sparkPool`) in `src/game.js` for directional blade echoes, spear lance lunges, dual counter-rotating whirlwinds, shockwave rings, directional hit sparks, and enemy hit squash-and-stretch.
- **`[2026-10-26]` Battlefield Decorations & Heart/Bomb Item Drops:**
  - Generated `assets/sprites/terrain/props.png` (`tree`, `pine`, `rock`, `grass`, `mountain`, `banner`) and `heart.png` / `bomb.png` pickup sprites in `scripts/generate_sprites.py` plus `bomb.wav` and `heal.ogg` in `scripts/generate_sfx.py`.
  - Implemented a 48-prop toroidal wrap-around decoration layer (`propLayer`) and pooled `Heart` (`+30 HP` heal) + `Bomb` (`240px` radius `85 * dmgMul` AoE blast + double shockwave + camera shake) drops in `src/game.js`, maintaining **60–61 FPS** with 310+ active enemies.
- **`[2026-10-26]` Solid Obstacle Collision & Full-Screen Floating Touch Joystick:**
  - Added circular obstacle collision (`resolvePropCollisions`) for `tree` (`r=17`), `pine` (`r=15`), `rock` (`r=17`), and `mountain` (`r=25`) props while keeping `grass` walkable.
  - Updated `onPointerDown` and `updatePlaying` so the mobile touch joystick anchors dynamically wherever the player places their thumb on screen (left, center, or right) and hides cleanly on release instead of sticking to the bottom-left corner.
- **`[2026-10-26]` Multi-Map Campaign, Progressive Level Difficulty, Map Bosses & Wave Progress HUD:**
  - Added `CAMPAIGN_MAPS` in `src/data.js` defining 3 Three Kingdoms maps (`Yellow Turban Outskirts`, `Hulao Pass Fortress`, `Red Cliffs Armada`), each with 3 progressive levels (`1-1` to `3-3`), distinct terrain themes & prop weights, and a final Level 3 Map Boss (`Zhang Jiao`, `Hua Xiong`, `Cao Ren`).
  - Implemented `updateStageProgression`, `advanceStage`, and `spawnMapBoss` in `src/game.js` so completing 3 waves advances to the next level, Level 3 spawns the Map Boss, and defeating the Map Boss transitions to the next Map.
  - Added a 3-segment Wave & Boss HP Progress Bar (`hudWaveBg`, `hudWaveFill`, `hudWaveText`) inside the battle HUD.
- **`[2026-10-26]` Jet-Black Bomb & Multi-Fireball Explosion VFX, 10 Enemy/Boss Types, 9 Unique Level Map Designs & Interactive Campaign Map Checkpoint Screen:**
  - Updated `bomb.png` to jet-black with bright fuse spark and added `explosion.png` (`64×64` multi-layered fireball) + `explosionPool` in `src/game.js` so `explodeBomb()` spawns 5 fireball bursts, 3 concentric shockwaves, 16 radial sparks, screen flash, and camera shake.
  - Expanded the enemy sprite atlas (`assets/sprites/enemies/atlas.png`) and `ENEMY_TYPES` to 10 distinct minion & boss rows (`soldier`, `archer`, `cavalry`, `shield`, `assassin`, `bomber`, `sorcerer`, `elite` Zhang Jiao, `boss_huaxiong` Hua Xiong, `boss_caoren` Cao Ren), with knockback-resistant shields, explosive bombers on death, and multi-bolt sorcerers/bosses.
  - Gave every single one of the 9 levels (`1-1` through `3-3`) a unique map design (`bgColor` with `backgroundBlendMode: 'overlay'`, `layoutPattern` `'glade'`/`'fortress'`/`'corridor'`/`'ring'`, and `propOrder`), progressive minion roster, and a Wave 3 Stage/Map Boss.
  - Added the interactive 3×3 **Campaign Map Checkpoint Screen (`showCampaignMapModal()`, `deployToCheckpoint()`)** whenever a level is cleared, unlocking the next checkpoint and letting the player select and deploy to any unlocked level.
  - Generated 9 custom pixel-art stage map preview dioramas (`assets/sprites/ui/stages.png`, `56×32` per stage) and upgraded `showCampaignMapModal()` + the pre-game `MAP` selector button to display stage terrain previews, boss portraits, region prop icons, and framed minion squad sprite badges across both `390×844` and `844×390` viewports.
- **`[2026-10-27]` Multi-Frame Animated Pixel VFX Integration (`scenario-pixel-vfx`):**
  - Created `scripts/generate_vfx.mjs` using the `scenario-pixel-vfx` heat-field renderer to generate 7 multi-frame pixel-art VFX sprite sheets in `assets/sprites/vfx/`: `explosion.png` (12 frames, `64×64`), `slash.png` (8 frames, `64×64`), `thrust.png` (8 frames, `64×48`), `whirlwind.png` (8 frames, `64×64`), `hit.png` (6 frames, `32×32`), `heal.png` (10 frames, `48×48`), and `levelup.png` (12 frames, `64×64`).
  - Updated `src/sprites.js` and `src/game.js` (`hitPool`, `slashPool`, `thrustPool`, `spinPool`, `explosionPool`, `healPool`, `levelupPool`, `updateParticles`) to step through each VFX sprite sheet frame-by-frame while sustaining **60–61 FPS** with 315–320 active enemies.
- **`[2026-10-27]` Universal LPC Character Sprite Sheet Integration (`scripts/generate_lpc_sprites.py`):**
  - Built `scripts/generate_lpc_sprites.py` to fetch and composite official Universal LPC Spritesheet Character Generator layers (`body`, `head`, `faces`, `torso/armour`, `torso/jacket`, `shoulders`, `arms`, `legs`, `feet`, `beards`, `hair`, `hat/helmet`, `cape`, `shield`, `weapon`) using the official 6-step Universal LPC material palettes (`body`, `metal`, `cloth`, `hair`) plus Three Kingdoms signature details (Guan Yu's long black beard & Guan Dao, Lu Bu's twin pheasant plumes & Fangtian Huaji, Zhuge Liang's white feather fan, mounted Steppe Raider warhorse, and Firebrand Zealot black bomb).
  - Upgraded `src/sprites.js` (`HERO_FRAME_W/H = 64`, `ENEMY_FRAME_W/H = 64`) and `src/game.js` scales, sustaining **60–61 FPS** across 6-second stress windows with **306–311 active enemies**.
- **`[2026-10-27]` ElevenLabs Sound Effects Integration (`@elevenlabs/elevenlabs-js`):**
  - Added `@elevenlabs/elevenlabs-js`, `scripts/generate_elevenlabs_sfx.mjs` (`npm run sfx:elevenlabs`), and the `/api/sfx/generate` Vite server endpoint in `vite.config.js`.
  - Generated 12 Three Kingdoms combat & reward sound effects (`slash`, `thrust`, `spin`, `shoot`, `hit`, `hurt`, `bomb`, `heal`, `gem`, `chest`, `levelup`, `evolve`) in `assets/sfx/` via `client.textToSoundEffects.convert` and updated `SoundManager.play()` in `src/audio.js` to prioritize decoded ElevenLabs `AudioBuffer`s.
- **`[2026-10-27]` Three Kingdoms Buildings & Dynamic Stage Weather System:**
  - Expanded `assets/sprites/terrain/props.png` (`scripts/generate_sprites.py`) from 6 to 10 props by adding 4 pixel-art building types: **Village House** (`house`, `r=24`), **Archer Watchtower** (`watchtower`, `r=22`), **Fortress Castle Keep** (`castle`, `r=28`), and **War Pavilion Tent** (`tent`, `r=21`), all with solid circular obstacle collision in `setupProps()`.
  - Added `WEATHER_TYPES` (`clear`, `rain`, `storm`, `sandstorm`, `embers`, `snow`) in `src/data.js` and built a 56-particle batched `weatherLayer` (`setupWeather`, `setWeather`, `updateWeather`) in `src/game.js` with periodic lightning flashes during thunderstorms, sustaining **60–61 FPS** with 310+ active enemies.
- **`[2026-10-27]` 9 Unique Stage Bosses & 4-Companion Summon Pet System:**
  - Expanded `scripts/generate_lpc_sprites.py` and `assets/sprites/enemies/atlas.png` (`256×1024`, 16 rows) so all 9 stages (`1-1` through `3-3`) feature their own unique Universal LPC Boss sprite (**Cheng Yuanzhi**, **Deng Mao**, **Zhang Jiao**, **Hu Zhen**, **Li Jue**, **Hua Xiong**, **Cai Mao**, **Zhang Yun**, **Cao Ren**) and custom boss attack pattern (`cleave`, `bomb_barrage`, `thunder_nova`, `lance_rush`, `whirlwind_nova`, `demon_slam`, `arrow_rain`, `tidal_ring`, `imperial_storm`) in `enemyShoot()`.
  - Added `PETS` in `src/data.js` and `assets/sprites/pets/pets.png` (`4×4` `32×32` frames) for **Red Hare** (trampling charge + explosion), **Vermilion Bird** (homing phoenix fireballs), **White Tiger** (frost-claw pounce slash), and **Jade Qilin** (celestial lightning + periodic `+HP` heal), complete with starting companion summons, Lv 1–5 Level-Up cards, and HUD loadout slots.
- **`[2026-10-27]` Four Seasons Map System & ElevenLabs Per-Map BGM (`music_v2_5`):**
  - Added `SEASONS` (`spring`, `summer`, `autumn`, `winter`) in `src/data.js` and expanded `assets/sprites/terrain/props.png` to a `480×192` (`10 cols × 4 rows`) seasonal atlas with pink cherry-blossom trees in Spring (`+1.5 HP/s` regen), lush emerald foliage in Summer (`+12% DMG, -8% CD`), fiery crimson/golden maple canopies in Autumn (`+20% XP`), and snow-blanketed trees, houses, watchtowers, castles, and tents in Winter (`-12% Enemy Speed`).
  - Created `scripts/generate_bgm.mjs` (`npm run bgm:elevenlabs`) using `client.music.compose` (`modelId: "music_v2_5"`, `forceInstrumental: true`) to generate 3 campaign map BGM tracks (`assets/bgm/outskirts.mp3`, `assets/bgm/hulao.mp3`, `assets/bgm/redcliffs.mp3`) and wired automatic per-map looping playback and mute/unmute sync into `SoundManager` (`src/audio.js`).
