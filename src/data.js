// Three Kingdoms heroes
export const HEROES = [
  { id:'guanyu', name:'Guan Yu', roster:1, color:0x2f8f4e, hp:165, armor:3, dmgBonus:0.32, speed:1.0, weapon:'blade', desc:'Green Dragon Crescent Blade' },
  { id:'zhangfei', name:'Zhang Fei', roster:1, color:0x8b2f2f, hp:210, armor:4, dmgBonus:0.35, speed:0.9, weapon:'spear', desc:'Serpent Spear' },
  { id:'zhaoyun', name:'Zhao Yun', roster:1, color:0x3a6ea5, hp:145, armor:3, dmgBonus:0.30, speed:1.25, weapon:'bow', desc:'Dragon Bow' },
  { id:'zhugeliang', name:'Zhuge Liang', roster:1, color:0x9b6fa5, hp:135, armor:3, dmgBonus:0.32, speed:1.05, weapon:'fan', desc:'Feather Fan' },
  { id:'lubu', name:'Lu Bu', roster:1, color:0xb83232, hp:190, armor:3, dmgBonus:0.40, speed:1.1, weapon:'halberd', desc:'Sky Piercer Halberd' },
  { id:'sunshangxiang', name:'Sun Shangxiang', roster:1, color:0xd4a017, hp:140, armor:3, dmgBonus:0.32, speed:1.3, weapon:'daggers', desc:'Twin Ring Blades' },
  // Roster 2: Wei, Wu & Legends Warlords (paired with new v0.4.0 weapon archetypes!)
  { id:'caocao', name:'Cao Cao', roster:2, color:0x38bdf8, hp:175, armor:4, dmgBonus:0.36, speed:1.1, weapon:'shadow_clone', desc:'Imperial Shadow Mirage' },
  { id:'zhouyu', name:'Zhou Yu', roster:2, color:0xef4444, hp:150, armor:3, dmgBonus:0.38, speed:1.15, weapon:'fire_flask', desc:'Chibi Fire Oil Flasks' },
  { id:'diaochan', name:'Diaochan', roster:2, color:0xf472b6, hp:140, armor:3, dmgBonus:0.34, speed:1.35, weapon:'meteor_chain', desc:'Moonlight Meteor Chain' },
  { id:'machao', name:'Ma Chao', roster:2, color:0x2dd4bf, hp:180, armor:3, dmgBonus:0.37, speed:1.25, weapon:'crossbow', desc:'Repeating Bolt Crossbow' },
  { id:'simayi', name:'Sima Yi', roster:2, color:0xa855f7, hp:145, armor:3, dmgBonus:0.39, speed:1.08, weapon:'thunder_talisman', desc:'Five-Thunder Talisman' },
  { id:'menghuo', name:'Meng Huo', roster:2, color:0xf97316, hp:225, armor:4, dmgBonus:0.42, speed:0.95, weapon:'war_drum', desc:'Nanman Thunder War Drum' },
];

export const STARTING_PERKS = [
  {
    id: 'vanguard',
    name: 'Vanguard Edict',
    short: 'VANGUARD',
    icon: 'might',
    color: 0xff6b6b,
    dmgBonus: 0.2,
    areaBonus: 0.1,
    desc: '+20% DMG & +10% Area',
    lines: '+20% DMG\n+10% AREA',
  },
  {
    id: 'aegis',
    name: 'Imperial Aegis',
    short: 'AEGIS',
    icon: 'armor',
    color: 0x6b9fff,
    hpBonus: 35,
    armorBonus: 2,
    desc: '+35 Max HP & +2 Armor',
    lines: '+35 MAX HP\n+2 ARMOR',
  },
  {
    id: 'windfoot',
    name: 'Windfoot Mandate',
    short: 'WINDFOOT',
    icon: 'swiftness',
    color: 0x6bffb0,
    speedBonus: 0.15,
    cdBonus: 0.1,
    xpBonus: 0.25,
    desc: '+15% SPD, -10% CD & +25% XP',
    lines: '+15% SPD · -10% CD\n+25% XP GAIN',
  },
];

export const WEAPONS = {
  blade: { name:'Green Dragon Blade', color:0x5fd38d, dmg:23, cd:0.9, area:1.0, type:'melee_arc', evo:'dragonslayer', pass:'might', desc:'Wide crescent slash' },
  spear: { name:'Serpent Spear', color:0xd35f5f, dmg:28, cd:1.1, area:1.0, type:'thrust', evo:'ironpike', pass:'armor', desc:'Forward piercing thrust' },
  bow: { name:'Dragon Bow', color:0x5f9dd3, dmg:18, cd:0.55, area:1.0, type:'projectile', evo:'stormbow', pass:'swiftness', desc:'Rapid aimed arrows' },
  fan: { name:'Feather Fan', color:0xb38fd3, dmg:16, cd:0.7, area:1.0, type:'magic_bolt', evo:'galefan', pass:'cooldown', desc:'Arcane wind bolts' },
  halberd: { name:'Sky Piercer', color:0xd38f5f, dmg:32, cd:1.3, area:1.2, type:'spin', evo:'skyhalberd', pass:'area', desc:'360° sweeping cleave' },
  daggers: { name:'Twin Blades', color:0xd4c017, dmg:15, cd:0.4, area:1.0, type:'projectile', evo:'twindragons', pass:'growth', desc:'Dual homing daggers' },
  flying_blades: { name:'Rotating Flying Blades', color:0x38bdf8, dmg:19, cd:0.45, area:1.0, type:'orbit', evo:'celestial_buzzsaw', pass:'swiftness', desc:'Spinning blades orbit you, slicing foes & blocking bolts' },
  bagua_shields: { name:'Eight-Trigram Shields', color:0xfbbf24, dmg:22, cd:0.5, area:1.05, type:'orbit', evo:'imperial_aegis_ring', pass:'armor', desc:'Orbiting Bagua shields bash foes & deflect projectiles' },
  // 8 New v0.4.0 Three Kingdoms Weapon Archetypes!
  crossbow: { name:'Repeating Crossbow', color:0x38bdf8, dmg:14, cd:0.34, area:1.0, type:'rapid_stream', evo:'ten_thousand_bolts', pass:'swiftness', desc:'Rapid 6-bolt machine-gun stream (damages UFOs!)' },
  fire_flask: { name:'Fire Oil Flask', color:0xf97316, dmg:24, cd:1.15, area:1.15, type:'ground_zone', evo:'chibi_hellfire', pass:'area', desc:'Shatters into blazing ground fire pools for 4.5s' },
  meteor_chain: { name:'Meteor Hammer Chain', color:0xf472b6, dmg:26, cd:1.05, area:1.1, type:'boomerang', evo:'soul_dragon_chain', pass:'might', desc:'Boomerang chain sweep that pulls foes inward' },
  wooden_ox: { name:'Wooden Ox Automaton', color:0xfacc15, dmg:34, cd:1.4, area:1.2, type:'automaton', evo:'juggernaut_ox', pass:'armor', desc:'Clockwork siege ox bulldozes & explodes through hordes' },
  thunder_talisman: { name:'Five-Thunder Talisman', color:0xc084fc, dmg:27, cd:0.95, area:1.1, type:'chain_lightning', evo:'nine_skies_thunder', pass:'cooldown', desc:'Lightning bolt chains across 4 to 10 nearby enemies' },
  caltrops: { name:'Iron Lotus Caltrops', color:0x94a3b8, dmg:21, cd:0.85, area:1.0, type:'minefield', evo:'iron_lotus_mines', pass:'growth', desc:'Proximity spike traps slow foes -50% & detonate' },
  war_drum: { name:'Imperial War Drum', color:0xef4444, dmg:25, cd:1.1, area:1.25, type:'sonic_aura', evo:'earth_shaker_drum', pass:'area', desc:'Rhythmic sonic shockwave rings & knockback boom' },
  shadow_clone: { name:'Shadow Clone Talisman', color:0xa855f7, dmg:24, cd:1.25, area:1.1, type:'decoy_clone', evo:'phantom_army', pass:'cooldown', desc:'Spawns a holographic warrior mirage that slashes & explodes' },
};

export const EVOLUTIONS = {
  dragonslayer: { name:'Dragon Slayer', color:0x1fff8a, dmgMul:2.2, cdMul:0.75, areaMul:1.4, desc:'Sweeping crimson arcs' },
  ironpike: { name:'Iron Pike', color:0xff5f5f, dmgMul:2.0, cdMul:0.85, areaMul:1.3, desc:'Piercing charge' },
  stormbow: { name:'Storm Bow', color:0x5fffff, dmgMul:1.9, cdMul:0.5, areaMul:1.0, desc:'Volley of arrows' },
  galefan: { name:'Gale Fan', color:0xffffff, dmgMul:1.8, cdMul:0.6, areaMul:1.6, desc:'Tempest of wind' },
  skyhalberd: { name:'Sky Halberd', color:0xffaa5f, dmgMul:2.4, cdMul:0.9, areaMul:1.8, desc:'Whirling death' },
  twindragons: { name:'Twin Dragons', color:0xffff5f, dmgMul:2.0, cdMul:0.45, areaMul:1.1, desc:'Dual homing blades' },
  celestial_buzzsaw: { name:'Celestial Sword Wheel', color:0x7dd3fc, dmgMul:2.1, cdMul:0.65, areaMul:1.35, desc:'Blazing sword-wheel ring shreds foes & bullets' },
  imperial_aegis_ring: { name:'Imperial Aegis Ring', color:0xfde047, dmgMul:2.2, cdMul:0.7, areaMul:1.4, desc:'Golden dragon-shields repel foes & projectiles' },
  ten_thousand_bolts: { name:'Ten-Thousand Bolt Tempest', color:0x38bdf8, dmgMul:2.1, cdMul:0.55, areaMul:1.2, desc:'Unending Gattling storm of piercing dragon bolts' },
  chibi_hellfire: { name:'Chibi Hellfire Sea', color:0xff5f5f, dmgMul:2.2, cdMul:0.75, areaMul:1.55, desc:'Spreads massive infernal lava pools across the battlefield' },
  soul_dragon_chain: { name:'Soul-Seizing Dragon Chain', color:0xf472b6, dmgMul:2.2, cdMul:0.7, areaMul:1.4, desc:'Twin boomerang dragon chains vortex foes into explosions' },
  juggernaut_ox: { name:'Juggernaut Flame Ox', color:0xfde047, dmgMul:2.3, cdMul:0.75, areaMul:1.45, desc:'Armored flame-oxen stampede in 3 directions & detonate' },
  nine_skies_thunder: { name:'Nine-Skies Thunder Wrath', color:0xc084fc, dmgMul:2.2, cdMul:0.68, areaMul:1.4, desc:'10-target chain lightning arcs with thunder-pillar blasts' },
  iron_lotus_mines: { name:'Eight-Gates Iron Lotus', color:0x4ade80, dmgMul:2.1, cdMul:0.68, areaMul:1.35, desc:'Cluster of shrapnel lotus mines that shred & freeze hordes' },
  earth_shaker_drum: { name:'Earth-Shaker Thunder Drums', color:0xfde047, dmgMul:2.3, cdMul:0.72, areaMul:1.5, desc:'Triple concentric sonic booms stun & blast all nearby foes' },
  phantom_army: { name:'Phantom Army of One', color:0xd8b4fe, dmgMul:2.2, cdMul:0.7, areaMul:1.4, desc:'Summons twin shadow clones that unleash synchronized novas' },
};

export const PASSIVES = {
  might: { name:'Might', color:0xff6b6b, stat:'dmgMul', val:0.1, max:5, desc:'+10% damage' },
  armor: { name:'Armor', color:0x6b9fff, stat:'armor', val:1, max:5, desc:'+1 armor' },
  swiftness: { name:'Swiftness', color:0x6bffb0, stat:'speedMul', val:0.08, max:5, desc:'+8% move speed' },
  cooldown: { name:'Cooldown', color:0xffb06b, stat:'cdMul', val:0.08, max:5, desc:'-8% cooldown' },
  area: { name:'Area', color:0xb06bff, stat:'areaMul', val:0.1, max:5, desc:'+10% area' },
  growth: { name:'Growth', color:0xffff6b, stat:'xpMul', val:0.1, max:5, desc:'+10% XP' },
};

export const PETS = {
  redhare: {
    id: 'redhare', name: 'Red Hare', title: 'Flame Warhorse',
    color: 0xff6b52, dmg: 22, cd: 1.5, range: 165, max: 5,
    desc: 'Charges through nearby foes dealing trampling AoE damage',
  },
  vermilion: {
    id: 'vermilion', name: 'Vermilion Bird', title: 'Fire Phoenix',
    color: 0xffae42, dmg: 18, cd: 1.3, range: 280, max: 5,
    desc: 'Fires explosive phoenix fireballs at nearby enemies',
  },
  white_tiger: {
    id: 'white_tiger', name: 'White Tiger', title: 'Frost Fang',
    color: 0x7ce8ff, dmg: 26, cd: 1.15, range: 175, max: 5,
    desc: 'Pounces on priority foes with rapid frost-claw slashes',
  },
  qilin: {
    id: 'qilin', name: 'Jade Qilin', title: 'Celestial Stag',
    color: 0x6bffb0, dmg: 20, cd: 1.4, range: 240, max: 5,
    desc: 'Strikes foes with celestial lightning & heals +4 HP periodically',
  },
};

export const SHOP_UPGRADES = [
  {
    id: 'might_perm',
    name: 'Imperial Forge',
    icon: 'might',
    color: 0xff6b6b,
    max: 5,
    baseCost: 40,
    desc: '+12% Permanent Base Damage per Lv',
  },
  {
    id: 'armor_perm',
    name: 'Dragon Scale Armor',
    icon: 'armor',
    color: 0x6b9fff,
    max: 5,
    baseCost: 40,
    desc: '+1 Base Armor & +20 Max HP per Lv',
  },
  {
    id: 'speed_perm',
    name: 'Wind-Chaser Boots',
    icon: 'swiftness',
    color: 0x6bffb0,
    max: 5,
    baseCost: 35,
    desc: '+7% Move Speed & -5% Weapon CD per Lv',
  },
  {
    id: 'magnet_perm',
    name: 'Imperial Treasury',
    icon: 'growth',
    color: 0xfde047,
    max: 5,
    baseCost: 35,
    desc: '+25% Gold/XP Gain & +30px Magnet per Lv',
  },
  {
    id: 'luck_perm',
    name: 'Celestial Mandate',
    icon: 'heal',
    color: 0xc084fc,
    max: 5,
    baseCost: 50,
    desc: '+6% Egg/Mount Luck & +1 Revive (Lv 1+)',
  },
];

export const MUSOU_ULTIMATES = {
  guanyu: { name: 'Green Dragon Tsunami', color: 0x1fff8a, desc: '8 Crescent Dragon Slashes + 12 Piercing Flame Waves' },
  zhangfei: { name: 'Roar of Changban Bridge', color: 0xff5f5f, desc: 'Seismic Shockwave + 8 Trident Eruptions & +45 HP Heal' },
  zhaoyun: { name: 'Seven-Star Dragon Storm', color: 0x5fffff, desc: '18 Homing Silver-Dragon Arrows + 6 Lightning Pillars' },
  zhugeliang: { name: 'Eight-Trigram Heaven Fire', color: 0xc084fc, desc: '10 Celestial Fire & Lightning Pillars Across Battlefield' },
  lubu: { name: 'Demon God Sky-Piercer', color: 0xffaa5f, desc: '8 Cardinal Cataclysm Explosions + Dual Giant Whirlwinds' },
  sunshangxiang: { name: 'Crimson Lotus Barrage', color: 0xfde047, desc: '16 Homing Explosive Chakrams + 4 Lotus Fireball Rings' },
  caocao: { name: 'Mandate of Wei Heaven-Sword', color: 0x38bdf8, desc: '10 Imperial Sword Waves + +40 HP Royal Decree' },
  zhouyu: { name: 'Red Cliffs Inferno Requiem', color: 0xef4444, desc: '12 Blazing Phoenix Firestorms Across the Fleet' },
  diaochan: { name: 'Moonlight Blossom Dance', color: 0xf472b6, desc: '16 Homing Moonlight Ribbons + +45 HP Lotus Grace' },
  machao: { name: 'Xiliang Thunder Stampede', color: 0x2dd4bf, desc: '10 Piercing Lightning Lances + 12s Red Hare Mount' },
  simayi: { name: 'Dark Starfall Singularity', color: 0xa855f7, desc: '10 Void Gravity Novas + 14 Homing Phantom Blades' },
  menghuo: { name: 'Nanman Savage Cataclysm', color: 0xf97316, desc: '10 Volcanic Quake Eruptions + Dual Beast Whirlwinds' },
};

export const SWORN_BONDS = {
  guanyu: { partner: 'zhangfei', title: 'PEACH GARDEN OATH', color: 0x4ade80 },
  zhangfei: { partner: 'guanyu', title: 'PEACH GARDEN OATH', color: 0xf87171 },
  zhaoyun: { partner: 'machao', title: 'TWIN DRAGON LANCERS', color: 0x38bdf8 },
  zhugeliang: { partner: 'zhouyu', title: 'CHIBI WIND & FIRE', color: 0xc084fc },
  lubu: { partner: 'diaochan', title: 'CRIMSON MOON ECLIPSE', color: 0xfb923c },
  sunshangxiang: { partner: 'zhouyu', title: 'SUN-WU BLAZING PACT', color: 0xfacc15 },
  caocao: { partner: 'simayi', title: 'HEAVEN DECREE OF WEI', color: 0x60a5fa },
  zhouyu: { partner: 'sunshangxiang', title: 'RED CLIFFS ARMADA', color: 0xf87171 },
  diaochan: { partner: 'lubu', title: 'LOTUS & SKY-PIERCER', color: 0xf472b6 },
  machao: { partner: 'zhaoyun', title: 'XILIANG SPEAR STORM', color: 0x2dd4bf },
  simayi: { partner: 'caocao', title: 'SHADOW PHANTASM PACT', color: 0xc084fc },
  menghuo: { partner: 'zhangfei', title: 'TITAN WARLORD ROAR', color: 0xfb923c },
};

export const CODEX_RELICS = [
  { id: 'jade_seal', name: 'Imperial Jade Seal', color: 0x4ade80, bonus: '+10% All Damage', desc: 'Ancient heirloom of the Han Dynasty (+10% DMG)' },
  { id: 'chibi_tally', name: 'Red Cliffs Fire Tally', color: 0xf87171, bonus: '+12% Attack Area', desc: 'Bronze naval tally from Chibi (+12% Area)' },
  { id: 'titan_emblem', name: 'Titan Slayer Crest', color: 0x38bdf8, bonus: '+25 Max HP & +1 Armor', desc: 'Forged from Kaiju & Ghidorah scales (+25 HP, +1 Armor)' },
  { id: 'starfall_compass', name: 'Eight-Trigram Compass', color: 0xc084fc, bonus: '-8% Weapon Cooldown', desc: 'Zhuge Liang celestial astrolabe (-8% Cooldown)' },
  { id: 'peach_cup', name: 'Peach Garden Wine Cup', color: 0xfacc15, bonus: '+25% Partner Assist DMG', desc: 'Sworn Brotherhood oath vessel (+25% Partner DMG)' },
  { id: 'conqueror_crown', name: 'Endless Conqueror Diadem', color: 0xfb923c, bonus: '+20% Gold & XP Gain', desc: 'Crown of the Survival Arena (+20% Gold & XP)' },
];

export const MYTHIC_FUSIONS = [
  {
    id: 'azure_heaven_splitter',
    name: 'Azure Dragon Heaven-Splitter',
    color: 0x00f5d4,
    desc: 'Fuses 2 Lv 8 Weapons into periodic 8-way Azure Dragon Beam Novas (+65% DMG)',
  },
  {
    id: 'cosmos_bagua_array',
    name: 'Eight-Trigram Cosmos Array',
    color: 0xfde047,
    desc: 'Surrounds warrior with an expanding Sacred Golden Bagua Supernova & Meteor Shower',
  },
  {
    id: 'infernal_cataclysm',
    name: 'Infernal Sky-Piercer Cataclysm',
    color: 0xff5f5f,
    desc: 'Unleashes 10 Cardinal Crimson Volcano Pillars & Homing Dragon Chakrams every 3.5s',
  },
];
export const WAR_FORMATIONS = {
  eight_gates: { id: 'eight_gates', name: 'Eight-Gates Golden Lock', color: 0xfde047, armorBonus: 2, enemySlowAura: 0.25, desc: '+2 Armor & slows nearby foes -25%' },
  serpent_coil: { id: 'serpent_coil', name: 'Coiling Serpent Array', color: 0x4ade80, speedBonus: 0.20, cdBonus: 0.08, desc: '+20% Move Speed & -8% Cooldown' },
  crane_wing: { id: 'crane_wing', name: 'Crane Wing Formation', color: 0x38bdf8, dmgBonus: 0.22, areaBonus: 0.12, desc: '+22% Damage & +12% Attack Area' },
  tiger_claw: { id: 'tiger_claw', name: 'Fierce Tiger Wedge', color: 0xf97316, dmgBonus: 0.28, desc: '+28% Melee & Impact Damage' },
  dragon_flight: { id: 'dragon_flight', name: 'Flying Dragon Array', color: 0x00f5d4, cdBonus: 0.14, xpBonus: 0.20, desc: '-14% Cooldown & +20% XP Gain' },
  earth_wall: { id: 'earth_wall', name: 'Earth-Shield Square', color: 0xf59e0b, armorBonus: 3, hpRegen: 2.0, desc: '+3 Armor & +2 HP/s Regen' },
  heaven_net: { id: 'heaven_net', name: 'Heaven-Earth Net', color: 0xc084fc, areaBonus: 0.25, magnetBonus: 60, desc: '+25% Attack Area & +60px Magnet' },
  void_star: { id: 'void_star', name: 'Seven-Star Altar Array', color: 0xf472b6, dmgBonus: 0.18, cdBonus: 0.10, starStrike: true, desc: '+18% DMG, -10% CD & Star-Bolt Strikes' },
};

export const MOUNT_SPECS = {
  redhare: { id: 'redhare', name: 'Red Hare Flame Steed', sprite: 'redhare', color: 0xff6b52, speedBonus: 0.55, armorBonus: 1, trampleDmg: 55, desc: '+55% Speed & Flame Hoof Trample' },
  war_elephant: { id: 'war_elephant', name: 'Nanman War Elephant', sprite: 'mount_elephant', color: 0xf59e0b, speedBonus: 0.38, armorBonus: 3, trampleDmg: 95, desc: '+38% Speed, +3 Armor & Seismic Stomp' },
  war_chariot: { id: 'war_chariot', name: 'Imperial Scythe Chariot', sprite: 'mount_chariot', color: 0xfde047, speedBonus: 0.62, armorBonus: 2, trampleDmg: 110, desc: '+62% Speed & Dual Wheel-Scythe Cleave' },
  frost_wolf: { id: 'frost_wolf', name: 'Northern Dire Frostwolf', sprite: 'mount_wolf', color: 0x38bdf8, speedBonus: 0.75, armorBonus: 1, trampleDmg: 75, freeze: true, desc: '+75% Speed & Glacial Frostbite Bite' },
  azure_dragon: { id: 'azure_dragon', name: 'Celestial Azure Dragon', sprite: 'mount_dragon', color: 0x4ade80, speedBonus: 0.68, armorBonus: 2, trampleDmg: 125, flying: true, desc: '+68% Speed, Flies Over Obstacles & Dragon Breath' },
};

export const ELEMENTAL_GEMS = {
  fire_ruby: { id: 'fire_ruby', name: 'Crimson Fire Ruby', sprite: 'gem_fire', color: 0xef4444, dmgBonus: 0.22, desc: '+22% Fire Burn Damage on all weapons' },
  ice_sapphire: { id: 'ice_sapphire', name: 'Glacial Ice Sapphire', sprite: 'gem_ice', color: 0x38bdf8, dmgBonus: 0.15, slowOnHit: true, desc: '+15% Crit Shatter & chills enemies -35% SPD' },
  thunder_topaz: { id: 'thunder_topaz', name: 'Heaven Thunder Topaz', sprite: 'gem_thunder', color: 0xc084fc, dmgBonus: 0.18, chainOnHit: true, desc: '+18% DMG & 25% chance to arc Chain Shock' },
  poison_jade: { id: 'poison_jade', name: 'Venomous Serpent Jade', sprite: 'gem_fire', tint: 0x4ade80, color: 0x4ade80, dmgBonus: 0.20, desc: '+20% Corrosive Venom Damage' },
  blood_garnet: { id: 'blood_garnet', name: 'Vampiric Bloodstone', sprite: 'gem_fire', tint: 0xf43f5e, color: 0xf43f5e, lifesteal: 3, desc: 'Restores +3 HP every 6 enemy kills' },
};
export const HEIRLOOM_GEAR = {
  helm_redmane: { id: 'helm_redmane', slot: 'helm', name: 'Phoenix-Plume War Helm', sprite: 'gear_helm', color: 0xfde047, hpBonus: 35, armorBonus: 2, desc: '+35 Max HP & +2 Armor' },
  armor_brightsilver: { id: 'armor_brightsilver', slot: 'armor', name: 'Bright Silver Scale Mail', sprite: 'gear_armor', color: 0x38bdf8, armorBonus: 3, hpBonus: 25, desc: '+3 Armor & +25 Max HP' },
  sword_sevenstar: { id: 'sword_sevenstar', slot: 'weapon_relic', name: 'Seven-Star Jeweled Blade', sprite: 'gear_sword', color: 0xf97316, dmgBonus: 0.25, desc: '+25% All Weapon Damage' },
  scroll_artofwar: { id: 'scroll_artofwar', slot: 'tome', name: 'Sun Tzu Art of War Scroll', sprite: 'gear_scroll', color: 0x4ade80, cdBonus: 0.12, xpBonus: 0.25, desc: '-12% Cooldown & +25% XP Gain' },
  boots_cloudstep: { id: 'boots_cloudstep', slot: 'boots', name: 'Cloud-Stepping Silk Boots', sprite: 'gear_boots', color: 0x7dd3fc, speedBonus: 0.20, desc: '+20% Move Speed & Evasion' },
  pendant_imperial: { id: 'pendant_imperial', slot: 'pendant', name: 'Imperial Dragon Jade Pendant', sprite: 'gear_pendant', color: 0x10b981, hpRegen: 2.5, magnetBonus: 50, desc: '+2.5 HP/s Regen & +50px Magnet' },
};

export const STRATAGEMS = {
  empty_fort: { id: 'empty_fort', name: 'Empty Fort Strategy', sprite: 'stratagem_seal', color: 0xc084fc, cd: 16.0, desc: '4.5s Invulnerability + Decoy Taunt Freeze!' },
  borrow_arrows: { id: 'borrow_arrows', name: 'Borrowing Arrows (Straw Boats)', sprite: 'stratagem_seal', color: 0x38bdf8, cd: 15.0, desc: 'Absorbs enemy bolts & fires 24 Homing Arrows!' },
  chibi_fire: { id: 'chibi_fire', name: 'Fire Attack at Chibi', sprite: 'stratagem_seal', color: 0xef4444, cd: 16.0, desc: 'Ignites the battlefield with 8 Blazing Fire Pools!' },
  chain_link: { id: 'chain_link', name: 'Iron Chain Stratagem', sprite: 'tiger_tally', color: 0xfde047, cd: 15.0, desc: 'Chains lightning across 16 foes for massive damage!' },
};

export const VANGUARD_SQUADS = {
  white_feather: { id: 'white_feather', name: 'White-Feathered Guards', unitType: 'soldier', color: 0x4ade80, count: 4, dmg: 26, desc: '4 Shu Elite Guards march & thrust in formation' },
  tiger_leopard: { id: 'tiger_leopard', name: 'Tiger & Leopard Cavalry', unitType: 'cavalry', color: 0x38bdf8, count: 4, dmg: 32, desc: '4 Wei Heavy Cavalry charge nearby enemies' },
  xiliang_iron: { id: 'xiliang_iron', name: 'Xiliang Iron Lancers', unitType: 'halberdier', color: 0xfde047, count: 4, dmg: 30, desc: '4 Western Halberdiers cleave surrounding foes' },
  rattan_guard: { id: 'rattan_guard', name: 'Nanman Rattan Vanguard', unitType: 'shield', color: 0xf97316, count: 4, dmg: 28, desc: '4 Armored Shield-Guards bash & block bolts' },
};

export const ENEMY_TYPES = {
  soldier: { name:'Militia Spearman', color:0x7a8a9a, hp:8, speed:60, dmg:6, size:14, xp:1, weight:50 },
  archer: { name:'Crossbow Scout', color:0x5a8a62, hp:6, speed:52, dmg:8, size:13, xp:2, weight:20, ranged:true },
  cavalry: { name:'Steppe Raider', color:0xb87642, hp:20, speed:110, dmg:12, size:18, xp:4, weight:12 },
  shield: { name:'Ironclad Guard', color:0x6a82a8, hp:28, speed:44, dmg:10, size:17, xp:3, weight:18, knockResist:0.65 },
  assassin: { name:'Shadow Nightblade', color:0xc83e5b, hp:10, speed:128, dmg:11, size:13, xp:3, weight:15 },
  bomber: { name:'Firebrand Zealot', color:0xe8682c, hp:12, speed:86, dmg:15, size:14, xp:3, weight:14, explosive:true },
  sorcerer: { name:'Taoist Mystic', color:0x9b62d8, hp:14, speed:48, dmg:12, size:14, xp:4, weight:14, ranged:true },
  halberdier: { name:'Imperial Halberdier', color:0xe07a5f, hp:24, speed:66, dmg:14, size:16, xp:4, weight:16, knockResist:0.4 },
  catapult:   { name:'Siege Catapult',     color:0xd97706, hp:36, speed:26, dmg:9,  size:21, xp:8, weight:8, ranged:true, isCatapult:true, knockResist:0.9 },
  firebird:   { name:'Feather-Storm Hawk',color:0xef4444, hp:12, speed:240, dmg:5,  size:14, xp:5, weight:0, isBird:true },
  kaiju:      { name:'Kaiju Godzilla Titan',color:0x00f5d4, hp:12000, speed:42, dmg:29, size:30, xp:250, weight:0, boss:true, isKaiju:true, knockResist:0.99 },
  ufo:        { name:'Cosmic UFO Saucer',   color:0x38bdf8, hp:95,  speed:190, dmg:0, size:20, xp:60,  weight:0, isUfo:true },
  ghidorah:   { name:'King Ghidorah Titan',color:0xfde047, hp:13500, speed:44, dmg:31, size:32, xp:300, weight:0, boss:true, isKaiju:true, isGhidorah:true, knockResist:0.99 },
  caravan:    { name:'Golden Supply Cart', color:0xfacc15, hp:85, speed:48, dmg:0, size:20, xp:30, weight:0, isCaravan:true, knockResist:0.95 },
  boss_chengyuanzhi: { name:'Cheng Yuanzhi', color:0xe2b04a, hp:90, speed:68, dmg:7, size:22, xp:22, weight:0, boss:true },
  boss_dengmao: { name:'Deng Mao', color:0xe8833a, hp:105, speed:72, dmg:8, size:22, xp:25, weight:0, boss:true },
  elite: { name:'Zhang Jiao', color:0xd4a017, hp:120, speed:75, dmg:9, size:23, xp:30, weight:0, boss:true },
  boss_huzhen: { name:'Hu Zhen', color:0xe66756, hp:135, speed:78, dmg:10, size:23, xp:32, weight:0, boss:true },
  boss_lijue: { name:'Li Jue', color:0xff784f, hp:150, speed:82, dmg:11, size:24, xp:35, weight:0, boss:true },
  boss_huaxiong: { name:'Hua Xiong', color:0xff5f5f, hp:170, speed:84, dmg:12, size:24, xp:40, weight:0, boss:true },
  boss_caimao: { name:'Cai Mao', color:0x5ca8ff, hp:185, speed:84, dmg:13, size:24, xp:42, weight:0, boss:true },
  boss_zhangyun: { name:'Zhang Yun', color:0x7cb8ff, hp:205, speed:88, dmg:14, size:25, xp:45, weight:0, boss:true },
  boss_caoren: { name:'Cao Ren', color:0x6b9fff, hp:230, speed:90, dmg:15, size:25, xp:50, weight:0, boss:true },
  mothra:        { name:'Queen Mothra Titan',   color:0x38bdf8, hp:11000, speed:48, dmg:27, size:30, xp:260, weight:0, boss:true, isKaiju:true, isMothra:true, knockResist:0.99 },
  rodan:         { name:'Fire Demon Rodan',     color:0xf97316, hp:11800, speed:52, dmg:28, size:30, xp:270, weight:0, boss:true, isKaiju:true, isRodan:true, knockResist:0.99 },
  mechagodzilla: { name:'Mecha-Godzilla Kiryu', color:0x94a3b8, hp:14000, speed:44, dmg:32, size:32, xp:320, weight:0, boss:true, isKaiju:true, isMechaG:true, knockResist:0.99 },
  biollante:     { name:'Abyssal Biollante',    color:0x4ade80, hp:12800, speed:40, dmg:30, size:32, xp:290, weight:0, boss:true, isKaiju:true, isBiollante:true, knockResist:0.99 },
};

export const LEVEL_XP = (lvl) => Math.floor(20 * Math.pow(1.15, lvl - 1));

export const WEATHER_TYPES = {
  clear: { id: 'clear', name: 'Sunlit Breeze', short: 'BREEZE', color: 0xffe89e },
  rain: { id: 'rain', name: 'Monsoon Rain', short: 'RAIN', color: 0x7cc4ff },
  storm: { id: 'storm', name: 'Thunderstorm', short: 'STORM', color: 0xa5b4fc },
  sandstorm: { id: 'sandstorm', name: 'Canyon Sandstorm', short: 'SAND', color: 0xe6a964 },
  embers: { id: 'embers', name: 'Firestorm Embers', short: 'EMBERS', color: 0xff8552 },
  snow: { id: 'snow', name: 'Winter Frost', short: 'SNOW', color: 0xdbeafe },
};
export const SEASONS = {
  spring: {
    id: 'spring', name: 'Spring Blossom', short: 'SPRING',
    bgColor: '#243d27', foliageTint: 0xffd6e7, roofTint: 0xffeef5,
    particleCol1: 0xffb3c6, particleCol2: 0xffe5ec,
    hpRegen: 1.5, dmgBonus: 0, cdBonus: 0, xpBonus: 0, enemySlow: 0,
    desc: '+1.5 HP/s Regen • Drifting Blossom Petals',
  },
  summer: {
    id: 'summer', name: 'Summer Solstice', short: 'SUMMER',
    bgColor: '#313f19', foliageTint: 0xd8f79a, roofTint: 0xfff3c4,
    particleCol1: 0xffe066, particleCol2: 0x95d5b2,
    hpRegen: 0, dmgBonus: 0.12, cdBonus: 0.08, xpBonus: 0, enemySlow: 0,
    desc: '+12% DMG, -8% CD • Sunlit Fireflies',
  },
  autumn: {
    id: 'autumn', name: 'Autumn Harvest', short: 'AUTUMN',
    bgColor: '#422916', foliageTint: 0xff9b54, roofTint: 0xffd8a8,
    particleCol1: 0xff7b3d, particleCol2: 0xffbe3d,
    hpRegen: 0, dmgBonus: 0, cdBonus: 0, xpBonus: 0.2, enemySlow: 0,
    desc: '+20% XP Gain • Swirling Maple Leaves',
  },
  winter: {
    id: 'winter', name: 'Winter Frost', short: 'WINTER',
    bgColor: '#1d3242', foliageTint: 0xdbeafe, roofTint: 0xe0f2fe,
    particleCol1: 0xffffff, particleCol2: 0xbae6fd,
    hpRegen: 0, dmgBonus: 0, cdBonus: 0, xpBonus: 0, enemySlow: 0.12,
    desc: '-12% Enemy Speed • Winter Snow & Frost',
  },
};


const CAMPAIGN_SPECS = [
  {
    id: 'outskirts', name: 'Yellow Turban Outskirts', short: 'OUTSKIRTS', bgm: 'outskirts',
    bgColors: ['#263820', '#313d1b', '#3d311a', '#38291e', '#362244'],
    patterns: ['glade', 'fortress', 'corridor', 'fortress', 'ring'],
    seasons: ['spring', 'summer', 'summer', 'autumn', 'autumn'],
    weathers: ['clear', 'clear', 'rain', 'rain', 'storm'],
    props: ['house', 'tree', 'grass', 'watchtower', 'rock', 'house', 'banner', 'tree', 'tent', 'watchtower', 'grass', 'tree'],
    stageNames: ['Village Perimeter', 'Granary Siege', 'Guangzong Trench', 'Juluxian Stronghold', 'Altar of Heaven'],
    bosses: [
      { name: 'Cheng Yuanzhi', title: 'Rebel Vanguard', spriteType: 'boss_chengyuanzhi', pattern: 'cleave', color: 0xe2b04a },
      { name: 'Deng Mao', title: 'Siege Captain', spriteType: 'boss_dengmao', pattern: 'bomb_barrage', color: 0xe8833a },
      { name: 'Zhang Bao', title: 'Earth General', spriteType: 'boss_dengmao', pattern: 'whirlwind_nova', color: 0xd97736 },
      { name: 'Zhang Liang', title: 'Human General', spriteType: 'boss_chengyuanzhi', pattern: 'lance_rush', color: 0xeab308 },
      { name: 'Zhang Jiao', title: 'Heaven General', spriteType: 'elite', pattern: 'thunder_nova', color: 0xf5c84c },
    ],
  },
  {
    id: 'hulao', name: 'Hulao Pass Fortress', short: 'HULAO PASS', bgm: 'hulao',
    bgColors: ['#3b2418', '#3e2418', '#461e1a', '#4c1a1a', '#52161a'],
    patterns: ['glade', 'corridor', 'fortress', 'corridor', 'ring'],
    seasons: ['autumn', 'autumn', 'summer', 'winter', 'winter'],
    weathers: ['clear', 'sandstorm', 'embers', 'sandstorm', 'storm'],
    props: ['castle', 'watchtower', 'rock', 'tent', 'mountain', 'banner', 'castle', 'rock', 'watchtower', 'pine', 'mountain', 'tent'],
    stageNames: ['Sishui Outpost', 'Outer Gatehouse', 'Iron Ramparts', 'Blood Canyon', 'Warlord Bastion'],
    bosses: [
      { name: 'Hu Zhen', title: 'Gate Commander', spriteType: 'boss_huzhen', pattern: 'lance_rush', color: 0xe66756 },
      { name: 'Zhao Cen', title: 'Pass Warden', spriteType: 'boss_chengyuanzhi', pattern: 'cleave', color: 0xd97757 },
      { name: 'Li Jue', title: 'Iron Enforcer', spriteType: 'boss_lijue', pattern: 'whirlwind_nova', color: 0xff784f },
      { name: 'Guo Si', title: 'Plunder General', spriteType: 'boss_dengmao', pattern: 'bomb_barrage', color: 0xf97316 },
      { name: 'Hua Xiong', title: 'Demon Vanguard', spriteType: 'boss_huaxiong', pattern: 'demon_slam', color: 0xff5f5f },
    ],
  },
  {
    id: 'guandu', name: 'Guandu Plains', short: 'GUANDU', bgm: 'outskirts',
    bgColors: ['#2e381e', '#38341c', '#3f2e18', '#44261a', '#3d1e2e'],
    patterns: ['glade', 'corridor', 'fortress', 'fortress', 'ring'],
    seasons: ['spring', 'summer', 'autumn', 'autumn', 'summer'],
    weathers: ['clear', 'rain', 'clear', 'embers', 'storm'],
    props: ['watchtower', 'tent', 'house', 'banner', 'rock', 'tree', 'castle', 'watchtower', 'tent', 'rock', 'banner', 'pine'],
    stageNames: ['Baima Ford', 'Yanjin Crossing', 'Watchtower Line', 'Wuchao Supply Depot', 'Guandu Citadel'],
    bosses: [
      { name: 'Yan Liang', title: 'Fierce Vanguard', spriteType: 'boss_huaxiong', pattern: 'cleave', color: 0xfbbf24 },
      { name: 'Wen Chou', title: 'River Lancer', spriteType: 'boss_huzhen', pattern: 'lance_rush', color: 0xf59e0b },
      { name: 'Chunyu Qiong', title: 'Depot Commander', spriteType: 'boss_dengmao', pattern: 'bomb_barrage', color: 0xf97316 },
      { name: 'Gao Lan', title: 'Hebei Pillar', spriteType: 'boss_zhangyun', pattern: 'tidal_ring', color: 0xeab308 },
      { name: 'Yuan Shao', title: 'Grand Noble', spriteType: 'boss_lijue', pattern: 'imperial_storm', color: 0xfacc15 },
    ],
  },
  {
    id: 'changban', name: 'Changban Bridge', short: 'CHANGBAN', bgm: 'hulao',
    bgColors: ['#1e362a', '#1b332e', '#202e38', '#28263b', '#2e1f3d'],
    patterns: ['glade', 'corridor', 'glade', 'corridor', 'ring'],
    seasons: ['spring', 'spring', 'autumn', 'winter', 'winter'],
    weathers: ['clear', 'rain', 'rain', 'snow', 'storm'],
    props: ['house', 'pine', 'tree', 'watchtower', 'rock', 'grass', 'banner', 'house', 'pine', 'watchtower', 'mountain', 'rock'],
    stageNames: ['Xinye Evacuation', 'Misty Bamboo Grove', 'Reed Marshland', 'Steep Hillside', 'Changban Bridge'],
    bosses: [
      { name: 'Xiahou En', title: 'Sword Bearer', spriteType: 'boss_chengyuanzhi', pattern: 'cleave', color: 0x60a5fa },
      { name: 'Yan Ming', title: 'Cavalry Captain', spriteType: 'boss_huzhen', pattern: 'lance_rush', color: 0x38bdf8 },
      { name: 'Zhang He', title: 'Tactical Master', spriteType: 'boss_zhangyun', pattern: 'arrow_rain', color: 0x818cf8 },
      { name: 'Wen Pin', title: 'Jingzhou Guard', spriteType: 'boss_lijue', pattern: 'whirlwind_nova', color: 0x6366f1 },
      { name: 'Xiahou Dun', title: 'One-Eyed Tiger', spriteType: 'boss_huaxiong', pattern: 'demon_slam', color: 0x3b82f6 },
    ],
  },
  {
    id: 'redcliffs', name: 'Red Cliffs Armada', short: 'RED CLIFFS', bgm: 'redcliffs',
    bgColors: ['#183442', '#1a2d44', '#1c2848', '#281d46', '#341a46'],
    patterns: ['glade', 'corridor', 'fortress', 'corridor', 'ring'],
    seasons: ['winter', 'winter', 'autumn', 'summer', 'spring'],
    weathers: ['snow', 'rain', 'rain', 'embers', 'embers'],
    props: ['watchtower', 'house', 'pine', 'tent', 'rock', 'banner', 'castle', 'pine', 'watchtower', 'grass', 'mountain', 'banner'],
    stageNames: ['Misty Riverbank', 'Sanjiang Pier', 'Bowman Flotilla', 'Chained Armada', 'Crimson Flagship'],
    bosses: [
      { name: 'Cai Mao', title: 'Fleet Admiral', spriteType: 'boss_caimao', pattern: 'arrow_rain', color: 0x5ca8ff },
      { name: 'Zhang Yun', title: 'Naval Vanguard', spriteType: 'boss_zhangyun', pattern: 'tidal_ring', color: 0x7cb8ff },
      { name: 'Yu Jin', title: 'Fleet Discipliner', spriteType: 'boss_huzhen', pattern: 'arrow_rain', color: 0x60a5fa },
      { name: 'yue Jin', title: 'Boarding Pioneer', spriteType: 'boss_lijue', pattern: 'whirlwind_nova', color: 0x93c5fd },
      { name: 'Cao Ren', title: 'Grand Commander', spriteType: 'boss_caoren', pattern: 'imperial_storm', color: 0x6b9fff },
    ],
  },
  {
    id: 'tongpass', name: 'Tong Pass Canyon', short: 'TONG PASS', bgm: 'hulao',
    bgColors: ['#3d2b1a', '#422818', '#382d38', '#2a3342', '#4a1d1a'],
    patterns: ['corridor', 'fortress', 'corridor', 'glade', 'ring'],
    seasons: ['autumn', 'autumn', 'winter', 'winter', 'summer'],
    weathers: ['sandstorm', 'sandstorm', 'snow', 'snow', 'storm'],
    props: ['castle', 'mountain', 'rock', 'watchtower', 'tent', 'banner', 'mountain', 'rock', 'castle', 'watchtower', 'pine', 'tent'],
    stageNames: ['Wei River Ferry', 'Frozen Rampart', 'Cavalry Ravine', 'Sandstorm Defile', 'Tong Pass Keep'],
    bosses: [
      { name: 'Cheng Yin', title: 'Xiliang Rider', spriteType: 'boss_huzhen', pattern: 'lance_rush', color: 0xf59e0b },
      { name: 'Candidate Han', title: 'Pass Rebel', spriteType: 'boss_chengyuanzhi', pattern: 'cleave', color: 0xd97706 },
      { name: 'Pang De', title: 'White Horse General', spriteType: 'boss_lijue', pattern: 'whirlwind_nova', color: 0xf97316 },
      { name: 'Ma Dai', title: 'Steppe Striker', spriteType: 'boss_caimao', pattern: 'arrow_rain', color: 0xfbbf24 },
      { name: 'Xu Chu', title: 'Tiger Bodyguard', spriteType: 'boss_dengmao', pattern: 'demon_slam', color: 0xef4444 },
    ],
  },
  {
    id: 'hefei', name: 'Hefei Castle', short: 'HEFEI', bgm: 'outskirts',
    bgColors: ['#223828', '#263432', '#2b2d3b', '#33243b', '#2e1d42'],
    patterns: ['glade', 'fortress', 'corridor', 'fortress', 'ring'],
    seasons: ['spring', 'summer', 'summer', 'autumn', 'autumn'],
    weathers: ['clear', 'rain', 'storm', 'rain', 'storm'],
    props: ['castle', 'watchtower', 'house', 'banner', 'pine', 'rock', 'castle', 'watchtower', 'tent', 'tree', 'rock', 'banner'],
    stageNames: ['Xiaoyao Ford', 'Outer Palisade', 'Broken Drawbridge', 'Stone Watchtowers', 'Hefei Citadel'],
    bosses: [
      { name: 'Li Dian', title: 'Scholar General', spriteType: 'boss_caimao', pattern: 'arrow_rain', color: 0x38bdf8 },
      { name: 'Yue Jin', title: 'Fierce Striker', spriteType: 'boss_chengyuanzhi', pattern: 'cleave', color: 0x60a5fa },
      { name: 'Zang Ba', title: 'Langya Commander', spriteType: 'boss_huzhen', pattern: 'lance_rush', color: 0x818cf8 },
      { name: 'Xiahou Shang', title: 'Siege Warden', spriteType: 'boss_lijue', pattern: 'whirlwind_nova', color: 0xa78bfa },
      { name: 'Zhang Liao', title: 'Terror of Xiaoyao', spriteType: 'boss_zhangyun', pattern: 'imperial_storm', color: 0x67e8f9 },
    ],
  },
  {
    id: 'fancastle', name: 'Fan Castle Flood', short: 'FAN CASTLE', bgm: 'redcliffs',
    bgColors: ['#16323d', '#182c42', '#1c2646', '#212046', '#281844'],
    patterns: ['glade', 'corridor', 'fortress', 'corridor', 'ring'],
    seasons: ['autumn', 'autumn', 'winter', 'winter', 'winter'],
    weathers: ['rain', 'rain', 'storm', 'snow', 'storm'],
    props: ['house', 'watchtower', 'castle', 'pine', 'rock', 'banner', 'house', 'watchtower', 'castle', 'tent', 'mountain', 'rock'],
    stageNames: ['Han River Levee', 'Submerged Village', 'Flooded Ramparts', 'Stormy Causeway', 'Fan Castle Keep'],
    bosses: [
      { name: 'Hao Zhao', title: 'Wall Defender', spriteType: 'boss_dengmao', pattern: 'bomb_barrage', color: 0x38bdf8 },
      { name: 'Dong Heng', title: 'Garrison Officer', spriteType: 'boss_huzhen', pattern: 'lance_rush', color: 0x7dd3fc },
      { name: 'Man Chong', title: 'Fortress Tactician', spriteType: 'elite', pattern: 'thunder_nova', color: 0x93c5fd },
      { name: 'Xu Huang', title: 'Unbroken Axe', spriteType: 'boss_huaxiong', pattern: 'demon_slam', color: 0x60a5fa },
      { name: 'Pang De', title: 'Coffin Vanguard', spriteType: 'boss_caimao', pattern: 'tidal_ring', color: 0x38bdf8 },
    ],
  },
  {
    id: 'yiling', name: 'Yiling Forest Blaze', short: 'YILING', bgm: 'hulao',
    bgColors: ['#2d381c', '#3b3018', '#462616', '#521e16', '#5c1618'],
    patterns: ['glade', 'corridor', 'glade', 'fortress', 'ring'],
    seasons: ['spring', 'summer', 'summer', 'autumn', 'summer'],
    weathers: ['clear', 'embers', 'embers', 'embers', 'storm'],
    props: ['tree', 'pine', 'tent', 'watchtower', 'house', 'banner', 'tree', 'pine', 'tent', 'rock', 'watchtower', 'banner'],
    stageNames: ['Xiaoting Encampment', 'Linked War Tents', 'Windy Pine Ridge', 'Blazing Palisade', 'Yiling Inferno'],
    bosses: [
      { name: 'Zhu Ran', title: 'Firebow Commander', spriteType: 'boss_caimao', pattern: 'arrow_rain', color: 0xf97316 },
      { name: 'Pan Zhang', title: 'Blade Captor', spriteType: 'boss_lijue', pattern: 'whirlwind_nova', color: 0xfb923c },
      { name: 'Han Dang', title: 'Jiangdong Veteran', spriteType: 'boss_huzhen', pattern: 'lance_rush', color: 0xfbbf24 },
      { name: 'Zhou Tai', title: 'Scarred Shield', spriteType: 'boss_zhangyun', pattern: 'tidal_ring', color: 0xef4444 },
      { name: 'Lu Xun', title: 'Grand Marshal', spriteType: 'boss_chengyuanzhi', pattern: 'imperial_storm', color: 0xff6b52 },
    ],
  },
  {
    id: 'wuzhang', name: 'Wuzhang Plains', short: 'WUZHANG', bgm: 'redcliffs',
    bgColors: ['#282c3d', '#2d2642', '#332046', '#381b48', '#42164b'],
    patterns: ['corridor', 'glade', 'fortress', 'ring', 'ring'],
    seasons: ['autumn', 'autumn', 'winter', 'winter', 'spring'],
    weathers: ['sandstorm', 'embers', 'snow', 'storm', 'storm'],
    props: ['castle', 'watchtower', 'tent', 'mountain', 'banner', 'rock', 'castle', 'watchtower', 'tent', 'pine', 'mountain', 'banner'],
    stageNames: ['Qishan Foothills', 'Gourd Valley', 'Wei River Camp', 'Seven Star Altar', 'Wuzhang Citadel'],
    bosses: [
      { name: 'Guo Huai', title: 'Western Shield', spriteType: 'boss_zhangyun', pattern: 'tidal_ring', color: 0xa78bfa },
      { name: 'Sun Li', title: 'Vanguard Envoy', spriteType: 'boss_huzhen', pattern: 'lance_rush', color: 0xc084fc },
      { name: 'Sima Shi', title: 'Heir Apparent', spriteType: 'boss_lijue', pattern: 'whirlwind_nova', color: 0xd8b4fe },
      { name: 'Sima Zhao', title: 'Ambition Lord', spriteType: 'boss_caoren', pattern: 'demon_slam', color: 0xe879f9 },
      { name: 'Sima Yi', title: 'Supreme Regent', spriteType: 'elite', pattern: 'imperial_storm', color: 0xf0abfc },
    ],
  },
];

const CAMPAIGN_FACTION_TINTS = [
  [0xffe4a0, 0xffd180, 0xfef08a], // C1 Outskirts: Yellow Turban Ochre & Gold
  [0xffb4b4, 0xfca5a5, 0xe2e8f0], // C2 Hulao: Dong Zhuo Crimson & Black-Iron
  [0xfde68a, 0xfcd34d, 0xfed7aa], // C3 Guandu: Yuan Shao Gilded Amber & Bronze
  [0xbfdbfe, 0x93c5fd, 0xc7d2fe], // C4 Changban: Cao Wei Cobalt & Frost-Silver
  [0x99f6e4, 0x7dd3fc, 0xfda4af], // C5 Red Cliffs: Naval Teal & Crimson Lacquer
  [0xfed7aa, 0xfdba74, 0xd6d3d1], // C6 Tong Pass: Xiliang Sand-Bronze & Iron
  [0xa7f3d0, 0x6ee7b7, 0xbae6fd], // C7 Hefei: Jiangdong Emerald-Jade & Silver
  [0xbae6fd, 0xa5b4fc, 0xe0f2fe], // C8 Fan Castle: Flooded Storm-Sapphire
  [0xfecaca, 0xfdba74, 0xfef08a], // C9 Yiling: Blazing Vermilion & Ember-Gold
  [0xe9d5ff, 0xd8b4fe, 0xfef08a], // C10 Wuzhang: Imperial Violet & Gold
];

const EARLY_CAMP1_SQUADS = [
  ['soldier', 'soldier', 'soldier', 'archer'],
  ['soldier', 'soldier', 'archer', 'cavalry'],
  ['soldier', 'archer', 'cavalry', 'shield'],
  ['soldier', 'archer', 'shield', 'halberdier'],
  ['soldier', 'cavalry', 'halberdier', 'bomber'],
];

const LEVEL_SQUAD_TEMPLATES = [
  ['soldier', 'soldier', 'archer', 'halberdier'],
  ['shield', 'halberdier', 'archer', 'catapult'],
  ['cavalry', 'assassin', 'halberdier', 'bomber'],
  ['catapult', 'bomber', 'shield', 'sorcerer', 'halberdier'],
  ['halberdier', 'shield', 'catapult', 'sorcerer', 'cavalry', 'assassin'],
];
const WEAPON_STYLES = ['spear_volley', 'crossbow_bolt', 'throwing_axe', 'fire_pot', 'arcane_orb'];

const SECOND_HALF_PREFIXES = ['Inner', 'Fortified', 'Upper', 'Citadel', 'Sanctum'];
export const TERRAIN_BIOME_SPECS = {
  grassland: { id: 'grassland', name: 'Peach Blossom Grasslands', effectDesc: '+1 HP/s Natural Regen', hpRegen: 1.0 },
  fortress: { id: 'fortress', name: 'Hulao Fortress Flagstone', effectDesc: '+1 Armor on Stone Courtyard', armorBonus: 1 },
  scorched: { id: 'scorched', name: 'Guandu Scorched Trenches', effectDesc: '+12% Explosive & Fire DMG', dmgBonus: 0.12 },
  warship: { id: 'warship', name: 'Chibi Chained Warship Deck', effectDesc: '+15% Area on Warship Planks', areaBonus: 0.15 },
  snowfield: { id: 'snowfield', name: 'Tong Pass Frozen Icefield', effectDesc: '+12% Slide Speed & -10% Enemy SPD', speedBonus: 0.12, enemySlow: 0.10 },
  flooded: { id: 'flooded', name: 'Fan Castle Flooded Causeway', effectDesc: '-14% Enemy Speed in Water', enemySlow: 0.14 },
  magma: { id: 'magma', name: 'Yiling Magma Ember Fissures', effectDesc: '+18% All Weapon Damage', dmgBonus: 0.18 },
  star_altar: { id: 'star_altar', name: 'Wuzhang Obsidian Star-Altar', effectDesc: '-10% Weapon Cooldown & +15% XP', cdBonus: 0.10, xpBonus: 0.15 },
};
export const DISASTER_SPECS = {
  volcano: {
    id: 'volcano',
    name: 'Volcanic Magma Eruption',
    color: 0xff5722,
    minPct: 0.18,
    maxPct: 0.24,
    enemyDmg: 145,
    radius: 54,
    desc: 'Erupts molten magma bombs & lava pools that burn both enemies & player!',
  },
  meteor_shower: {
    id: 'meteor_shower',
    name: 'Starfall Meteor Crash',
    color: 0xef4444,
    minPct: 0.22,
    maxPct: 0.30,
    enemyDmg: 185,
    radius: 62,
    desc: 'Giant flaming meteors crash into crimson target zones!',
  },
  hailstorm: {
    id: 'hailstorm',
    name: 'Blizzard Hailstorm Barrage',
    color: 0x38bdf8,
    minPct: 0.14,
    maxPct: 0.20,
    enemyDmg: 115,
    radius: 46,
    desc: 'Falling glacial hailstones shatter on impact, slowing & damaging player & foes!',
  },
  lightning_storm: {
    id: 'lightning_storm',
    name: 'Heaven Wrath Lightning Strikes',
    color: 0xc084fc,
    minPct: 0.20,
    maxPct: 0.26,
    enemyDmg: 160,
    radius: 48,
    desc: 'Sky-splitting thunderbolts strike telegraphed sigils across the battlefield!',
  },
  earthquake: {
    id: 'earthquake',
    name: 'Tectonic Earthquake Fissures',
    color: 0xf59e0b,
    minPct: 0.18,
    maxPct: 0.24,
    enemyDmg: 150,
    radius: 52,
    desc: 'Violent seismic tremors rupture tectonic fault lines across the ground!',
  },
  fire_tornado: {
    id: 'fire_tornado',
    name: 'Infernal Fire Cyclone',
    color: 0xf97316,
    minPct: 0.14,
    maxPct: 0.18,
    enemyDmg: 95,
    radius: 54,
    desc: 'Roaming blazing fire vortex spirals across the battlefield burning all in its path!',
  },
};
const CAMPAIGN_TERRAIN_ORDER = [
  'grassland', 'fortress', 'scorched', 'grassland', 'warship',
  'snowfield', 'fortress', 'flooded', 'magma', 'star_altar',
];
const STAGE_TERRAIN_CYCLE = [
  'grassland', 'fortress', 'scorched', 'warship',
  'snowfield', 'flooded', 'magma', 'star_altar',
];

export const CAMPAIGN_MAPS = CAMPAIGN_SPECS.map((c, cIdx) => {
  const finalBoss = c.bosses[4];
  const cTints = CAMPAIGN_FACTION_TINTS[cIdx % CAMPAIGN_FACTION_TINTS.length];
  return {
    id: c.id,
    name: c.name,
    short: c.short,
    bgm: c.bgm,
    bgColor: c.bgColors[0],
    bgFilter: 'none',
    propOrder: c.props,
    factionTints: cTints,
    boss: { ...finalBoss, hp: 520 + cIdx * 110, dmg: 9 + cIdx * 1.5, speed: 74 + cIdx * 1.5, scale: 1.9 },
    levels: Array.from({ length: 10 }, (_, lIdx) => {
      const baseIdx = lIdx % 5;
      const isSecondHalf = lIdx >= 5;
      const stName = isSecondHalf
        ? `${SECOND_HALF_PREFIXES[baseIdx]} ${c.stageNames[baseIdx]}`
        : c.stageNames[baseIdx];
      const bSpec = c.bosses[baseIdx];
      const squad = (cIdx === 0 && lIdx < 5)
        ? EARLY_CAMP1_SQUADS[baseIdx]
        : LEVEL_SQUAD_TEMPLATES[(lIdx + cIdx) % LEVEL_SQUAD_TEMPLATES.length];
      const levelTints = [
        cTints[lIdx % cTints.length],
        cTints[(lIdx + 1) % cTints.length],
        cTints[(lIdx + 2) % cTints.length],
      ];
      // Scale within each 10-level campaign (since weapons & skills reset on each new campaign!)
      const campTier = cIdx * 0.16;
      return {
        level: lIdx + 1,
        name: stName,
        waves: 5,
        waveDuration: 10,
        hpMul: +(0.65 + campTier + lIdx * 0.15).toFixed(2),
        dmgMul: +(0.65 + cIdx * 0.08 + lIdx * 0.06).toFixed(2),
        speedMul: +(0.86 + cIdx * 0.015 + lIdx * 0.012).toFixed(3),
        spawnMul: +(0.78 + cIdx * 0.05 + lIdx * 0.045).toFixed(2),
        bossStage: lIdx === 9,
        bgColor: c.bgColors[baseIdx],
        terrainBiome: lIdx % 3 === 0
          ? CAMPAIGN_TERRAIN_ORDER[cIdx % CAMPAIGN_TERRAIN_ORDER.length]
          : STAGE_TERRAIN_CYCLE[(cIdx * 3 + lIdx) % STAGE_TERRAIN_CYCLE.length],
        layoutPattern: c.patterns[(lIdx + cIdx) % c.patterns.length],
        season: c.seasons[(lIdx + cIdx) % c.seasons.length],
        weather: c.weathers[(lIdx + cIdx) % c.weathers.length],
        propOrder: c.props,
        enemies: squad,
        factionTints: levelTints,
        weaponStyle: WEAPON_STYLES[(cIdx + lIdx) % WEAPON_STYLES.length],
        levelBoss: {
          ...bSpec,
          name: isSecondHalf && lIdx === 9 ? `Grand ${bSpec.name}` : bSpec.name,
          hp: Math.round((190 + cIdx * 38 + lIdx * 28) * (lIdx === 9 ? 1.25 : 1.0)),
          dmg: Math.round(6 + cIdx * 0.9 + lIdx * 0.55),
          speed: Math.min(88, 66 + Math.floor(cIdx * 1.2 + lIdx * 0.9)),
          scale: lIdx === 9 ? 1.88 : 1.65,
        },
      };
    }),
  };
});