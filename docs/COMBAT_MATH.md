# Combat Math & Progression Specification (`docs/COMBAT_MATH.md`)

## 1. Playable Heroes (`HEROES` in `src/data.js`)

| Hero ID | Name | Base HP | Speed Multiplier | Starting Weapon | Theme / Description |
|---|---|---:|---:|---|---|
| `guanyu` | **Guan Yu** | `120` | `1.00×` (`180 px/s`) | `blade` | Green Dragon Crescent Blade |
| `zhangfei` | **Zhang Fei** | `160` | `0.90×` (`162 px/s`) | `spear` | Serpent Spear |
| `zhaoyun` | **Zhao Yun** | `100` | `1.25×` (`225 px/s`) | `bow` | Dragon Bow |
| `zhugeliang` | **Zhuge Liang** | `90` | `1.05×` (`189 px/s`) | `fan` | Feather Fan |
| `lubu` | **Lu Bu** | `140` | `1.10×` (`198 px/s`) | `halberd` | Sky Piercer Halberd |
| `sunshangxiang` | **Sun Shangxiang** | `95` | `1.30×` (`234 px/s`) | `daggers` | Twin Ring Blades |

---

## 2. Pre-Game Starting Perks (`STARTING_PERKS` in `src/data.js`)

Players select **1 of 3 Starting Perks (War Decrees)** on the menu before deploying:

| Perk ID | Name | HUD Tag | Modifiers Applied in `resetRun()` / `recomputeStats()` |
|---|---|---|---|
| `vanguard` | **Vanguard Edict** | `VANGUARD` | `dmgBonus: +20%`, `areaBonus: +10%` |
| `aegis` | **Imperial Aegis** | `AEGIS` | `hpBonus: +35 Max HP`, `armorBonus: +2 Flat Armor` |
| `windfoot` | **Windfoot Mandate** | `WINDFOOT` | `speedBonus: +15%`, `cdBonus: -10%`, `xpBonus: +25%` |

---

## 3. Passive Upgrades & Compounding (`PASSIVES` & `recomputeStats()`)

Each passive can be leveled from **Lv 1 to Lv 5** during a run. Combined with the chosen Starting Perk (`perk`), `recomputeStats()` updates `game.player`:

$$\begin{aligned}
\text{dmgMul} &= (1 + 0.10 \cdot \text{might}) \times (1 + \text{perk.dmgBonus}) \\
\text{armor} &= (1 \cdot \text{armor}) + \text{perk.armorBonus} \\
\text{speedMul} &= (1 + 0.08 \cdot \text{swiftness}) \times (1 + \text{perk.speedBonus}) \\
\text{cdMul} &= 0.92^{\text{cooldown}} \times (1 - \text{perk.cdBonus}) \\
\text{areaMul} &= (1 + 0.10 \cdot \text{area}) \times (1 + \text{perk.areaBonus}) \\
\text{xpMul} &= (1 + 0.10 \cdot \text{growth}) \times (1 + \text{perk.xpBonus})
\end{aligned}$$

---

## 4. Weapon Level 1–8 Scaling (`getWeaponStats(w)`)

For a weapon at level $L \in \{1, \dots, 8\}$, let $\Delta = L - 1$:

- **Level Damage Multiplier:** $\text{lvlDmgMul} = 1 + 0.15\Delta$ (`1.00×` at Lv 1 $\rightarrow$ `2.05×` at Lv 8)
- **Level Area Multiplier:** $\text{lvlAreaMul} = 1 + 0.08\Delta$ (`1.00×` at Lv 1 $\rightarrow$ `1.56×` at Lv 8)
- **Level Cooldown Multiplier:** $\text{lvlCdMul} = \max(0.65,\; 1 - 0.05\Delta)$ (`1.00×` at Lv 1 $\rightarrow$ `0.65×` at Lv 8)
- **Bonus Projectiles / Target Pairs:** $\text{bonusCount} = \lfloor \Delta / 2 \rfloor$ (`+1` at Lv 3, `+2` at Lv 5, `+3` at Lv 7)
- **Bonus Pierce:** $\text{bonusPierce} = \lfloor \Delta / 3 \rfloor$ (`+1` at Lv 4, `+2` at Lv 7)

Final effective weapon stats:
$$\begin{aligned}
\text{dmg} &= \text{base.dmg} \times \text{lvlDmgMul} \times \text{player.dmgMul} \times (\text{evo} ? \text{evo.dmgMul} : 1) \\
\text{area} &= \text{base.area} \times \text{lvlAreaMul} \times \text{player.areaMul} \times (\text{evo} ? \text{evo.areaMul} : 1) \\
\text{cd} &= \text{base.cd} \times \text{lvlCdMul} \times \text{player.cdMul} \times (\text{evo} ? \text{evo.cdMul} : 1)
\end{aligned}$$

---

## 5. Weapon Base Stats & Evolution Table

Opening a Boss Treasure Chest (`openChest`) evolves the first equipped weapon that has reached **Lv 8** and whose paired passive is **Lv 1+**:

| Weapon ID | Base Name | Type | Base DMG | Base CD | Paired Passive | Evolved Name | Evolution Multipliers |
|---|---|---|---:|---:|---|---|---|
| `blade` | Green Dragon Blade | `melee_arc` | `18` | `0.90s` | **Might** (`might`) | **Dragon Slayer** (`dragonslayer`) | `2.2×` DMG, `0.75×` CD, `1.4×` Area |
| `spear` | Serpent Spear | `thrust` | `22` | `1.10s` | **Armor** (`armor`) | **Iron Pike** (`ironpike`) | `2.0×` DMG, `0.85×` CD, `1.3×` Area |
| `bow` | Dragon Bow | `projectile` | `14` | `0.55s` | **Swiftness** (`swiftness`) | **Storm Bow** (`stormbow`) | `1.9×` DMG, `0.50×` CD, `1.0×` Area |
| `fan` | Feather Fan | `magic_bolt` | `12` | `0.70s` | **Cooldown** (`cooldown`) | **Gale Fan** (`galefan`) | `1.8×` DMG, `0.60×` CD, `1.6×` Area |
| `halberd` | Sky Piercer | `spin` | `26` | `1.30s` | **Area** (`area`) | **Sky Halberd** (`skyhalberd`) | `2.4×` DMG, `0.90×` CD, `1.8×` Area |
| `daggers` | Twin Blades | `projectile` | `11` | `0.40s` | **Growth** (`growth`) | **Twin Dragons** (`twindragons`) | `2.0×` DMG, `0.45×` CD, `1.1×` Area (Homing) |

---

## 6. Enemy Scaling & XP Curve

- **XP Requirement (`LEVEL_XP(lvl)`):** $\lfloor 20 \times 1.15^{\text{lvl} - 1} \rfloor$
- **Enemy HP Time Scaling:**
  - Regular enemies (`soldier`, `archer`, `cavalry`): $\text{hp} = \text{base.hp} \times (1 + 0.02t)$
  - Elite bosses (`elite`, spawns every `120s`): $\text{hp} = 80 \times (1 + 0.05t)$
