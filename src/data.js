// Three Kingdoms heroes
export const HEROES = [
  { id:'guanyu', name:'Guan Yu', color:0x2f8f4e, hp:120, speed:1.0, weapon:'blade', desc:'Green Dragon Crescent Blade' },
  { id:'zhangfei', name:'Zhang Fei', color:0x8b2f2f, hp:160, speed:0.9, weapon:'spear', desc:'Serpent Spear' },
  { id:'zhaoyun', name:'Zhao Yun', color:0x3a6ea5, hp:100, speed:1.25, weapon:'bow', desc:'Dragon Bow' },
  { id:'zhugeliang', name:'Zhuge Liang', color:0x9b6fa5, hp:90, speed:1.05, weapon:'fan', desc:'Feather Fan' },
  { id:'lubu', name:'Lu Bu', color:0xb83232, hp:140, speed:1.1, weapon:'halberd', desc:'Sky Piercer Halberd' },
  { id:'sunshangxiang', name:'Sun Shangxiang', color:0xd4a017, hp:95, speed:1.3, weapon:'daggers', desc:'Twin Ring Blades' },
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
  blade: { name:'Green Dragon Blade', color:0x5fd38d, dmg:18, cd:0.9, area:1.0, type:'melee_arc', evo:'dragonslayer', pass:'might', desc:'Wide crescent slash' },
  spear: { name:'Serpent Spear', color:0xd35f5f, dmg:22, cd:1.1, area:1.0, type:'thrust', evo:'ironpike', pass:'armor', desc:'Forward piercing thrust' },
  bow: { name:'Dragon Bow', color:0x5f9dd3, dmg:14, cd:0.55, area:1.0, type:'projectile', evo:'stormbow', pass:'swiftness', desc:'Rapid aimed arrows' },
  fan: { name:'Feather Fan', color:0xb38fd3, dmg:12, cd:0.7, area:1.0, type:'magic_bolt', evo:'galefan', pass:'cooldown', desc:'Arcane wind bolts' },
  halberd: { name:'Sky Piercer', color:0xd38f5f, dmg:26, cd:1.3, area:1.2, type:'spin', evo:'skyhalberd', pass:'area', desc:'360° sweeping cleave' },
  daggers: { name:'Twin Blades', color:0xd4c017, dmg:11, cd:0.4, area:1.0, type:'projectile', evo:'twindragons', pass:'growth', desc:'Dual homing daggers' },
};

export const EVOLUTIONS = {
  dragonslayer: { name:'Dragon Slayer', color:0x1fff8a, dmgMul:2.2, cdMul:0.75, areaMul:1.4, desc:'Sweeping crimson arcs' },
  ironpike: { name:'Iron Pike', color:0xff5f5f, dmgMul:2.0, cdMul:0.85, areaMul:1.3, desc:'Piercing charge' },
  stormbow: { name:'Storm Bow', color:0x5fffff, dmgMul:1.9, cdMul:0.5, areaMul:1.0, desc:'Volley of arrows' },
  galefan: { name:'Gale Fan', color:0xffffff, dmgMul:1.8, cdMul:0.6, areaMul:1.6, desc:'Tempest of wind' },
  skyhalberd: { name:'Sky Halberd', color:0xffaa5f, dmgMul:2.4, cdMul:0.9, areaMul:1.8, desc:'Whirling death' },
  twindragons: { name:'Twin Dragons', color:0xffff5f, dmgMul:2.0, cdMul:0.45, areaMul:1.1, desc:'Dual homing blades' },
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

export const ENEMY_TYPES = {
  soldier: { name:'Militia Spearman', color:0x7a8a9a, hp:8, speed:60, dmg:6, size:14, xp:1, weight:50 },
  archer: { name:'Crossbow Scout', color:0x5a8a62, hp:6, speed:52, dmg:8, size:13, xp:2, weight:20, ranged:true },
  cavalry: { name:'Steppe Raider', color:0xb87642, hp:20, speed:110, dmg:12, size:18, xp:4, weight:12 },
  shield: { name:'Ironclad Guard', color:0x6a82a8, hp:28, speed:44, dmg:10, size:17, xp:3, weight:18, knockResist:0.65 },
  assassin: { name:'Shadow Nightblade', color:0xc83e5b, hp:10, speed:128, dmg:11, size:13, xp:3, weight:15 },
  bomber: { name:'Firebrand Zealot', color:0xe8682c, hp:12, speed:86, dmg:15, size:14, xp:3, weight:14, explosive:true },
  sorcerer: { name:'Taoist Mystic', color:0x9b62d8, hp:14, speed:48, dmg:12, size:14, xp:4, weight:14, ranged:true },
  boss_chengyuanzhi: { name:'Cheng Yuanzhi', color:0xe2b04a, hp:90, speed:68, dmg:14, size:22, xp:22, weight:0, boss:true },
  boss_dengmao: { name:'Deng Mao', color:0xe8833a, hp:105, speed:72, dmg:17, size:22, xp:25, weight:0, boss:true },
  elite: { name:'Zhang Jiao', color:0xd4a017, hp:120, speed:75, dmg:20, size:23, xp:30, weight:0, boss:true },
  boss_huzhen: { name:'Hu Zhen', color:0xe66756, hp:135, speed:78, dmg:22, size:23, xp:32, weight:0, boss:true },
  boss_lijue: { name:'Li Jue', color:0xff784f, hp:150, speed:82, dmg:25, size:24, xp:35, weight:0, boss:true },
  boss_huaxiong: { name:'Hua Xiong', color:0xff5f5f, hp:170, speed:84, dmg:28, size:24, xp:40, weight:0, boss:true },
  boss_caimao: { name:'Cai Mao', color:0x5ca8ff, hp:185, speed:84, dmg:30, size:24, xp:42, weight:0, boss:true },
  boss_zhangyun: { name:'Zhang Yun', color:0x7cb8ff, hp:205, speed:88, dmg:33, size:25, xp:45, weight:0, boss:true },
  boss_caoren: { name:'Cao Ren', color:0x6b9fff, hp:230, speed:90, dmg:36, size:25, xp:50, weight:0, boss:true },
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


export const CAMPAIGN_MAPS = [
  {
    id: 'outskirts',
    name: 'Yellow Turban Outskirts',
    short: 'OUTSKIRTS',
    bgColor: '#1e241b',
    bgFilter: 'none',
    propOrder: ['house', 'tree', 'grass', 'watchtower', 'rock', 'grass', 'house', 'banner', 'tree', 'grass', 'rock', 'tent'],
    boss: { name: 'Zhang Jiao', title: 'Heaven General', spriteType: 'elite', hp: 220, dmg: 20, speed: 75, color: 0xf5c84c, scale: 1.75 },
    levels: [
      {
        level: 1, name: 'Village Perimeter', waves: 3, waveDuration: 18,
        hpMul: 1.0, dmgMul: 1.0, speedMul: 1.0, spawnMul: 1.0, bossStage: false,
        bgColor: '#263820', layoutPattern: 'glade', season: 'spring', weather: 'clear',
        propOrder: ['house', 'tree', 'grass', 'house', 'rock', 'tree', 'banner', 'house', 'grass', 'watchtower', 'grass', 'tree'],
        enemies: ['soldier', 'soldier', 'archer'],
        levelBoss: { name: 'Cheng Yuanzhi', title: 'Rebel Vanguard', spriteType: 'boss_chengyuanzhi', pattern: 'cleave', hp: 130, dmg: 14, speed: 68, color: 0xe2b04a, scale: 1.55 },
      },
      {
        level: 2, name: 'Granary Siege', waves: 3, waveDuration: 20,
        hpMul: 1.35, dmgMul: 1.15, speedMul: 1.06, spawnMul: 1.2, bossStage: false,
        bgColor: '#3d311a', layoutPattern: 'fortress', season: 'summer', weather: 'rain',
        propOrder: ['house', 'watchtower', 'tent', 'banner', 'rock', 'house', 'watchtower', 'grass', 'tent', 'rock', 'tree', 'banner'],
        enemies: ['soldier', 'shield', 'archer', 'bomber'],
        levelBoss: { name: 'Deng Mao', title: 'Siege Captain', spriteType: 'boss_dengmao', pattern: 'bomb_barrage', hp: 175, dmg: 17, speed: 72, color: 0xe8833a, scale: 1.65 },
      },
      {
        level: 3, name: 'Altar of Heaven', waves: 3, waveDuration: 20,
        hpMul: 1.7, dmgMul: 1.3, speedMul: 1.12, spawnMul: 1.35, bossStage: true,
        bgColor: '#362244', layoutPattern: 'ring', season: 'autumn', weather: 'storm',
        propOrder: ['castle', 'watchtower', 'banner', 'pine', 'tent', 'watchtower', 'castle', 'rock', 'banner', 'pine', 'mountain', 'tent'],
        enemies: ['shield', 'bomber', 'sorcerer', 'cavalry'],
        levelBoss: { name: 'Zhang Jiao', title: 'Heaven General', spriteType: 'elite', pattern: 'thunder_nova', hp: 220, dmg: 20, speed: 75, color: 0xf5c84c, scale: 1.75 },
      },
    ],
  },
  {
    id: 'hulao',
    name: 'Hulao Pass Fortress',
    short: 'HULAO PASS',
    bgColor: '#261b16',
    bgFilter: 'sepia(0.32) hue-rotate(-18deg) saturate(1.15)',
    propOrder: ['castle', 'watchtower', 'rock', 'tent', 'mountain', 'banner', 'castle', 'rock', 'watchtower', 'pine', 'mountain', 'tent'],
    boss: { name: 'Hua Xiong', title: 'Demon Vanguard', spriteType: 'boss_huaxiong', hp: 420, dmg: 28, speed: 84, color: 0xff5f5f, scale: 1.85 },
    levels: [
      {
        level: 1, name: 'Outer Gatehouse', waves: 3, waveDuration: 20,
        hpMul: 2.2, dmgMul: 1.5, speedMul: 1.15, spawnMul: 1.45, bossStage: false,
        bgColor: '#3e2418', layoutPattern: 'corridor', season: 'autumn', weather: 'sandstorm',
        propOrder: ['castle', 'watchtower', 'rock', 'banner', 'mountain', 'tent', 'watchtower', 'rock', 'castle', 'banner', 'pine', 'rock'],
        enemies: ['shield', 'archer', 'cavalry', 'soldier'],
        levelBoss: { name: 'Hu Zhen', title: 'Gate Commander', spriteType: 'boss_huzhen', pattern: 'lance_rush', hp: 280, dmg: 22, speed: 78, color: 0xe66756, scale: 1.65 },
      },
      {
        level: 2, name: 'Iron Ramparts', waves: 3, waveDuration: 22,
        hpMul: 2.8, dmgMul: 1.7, speedMul: 1.2, spawnMul: 1.6, bossStage: false,
        bgColor: '#461e1a', layoutPattern: 'fortress', season: 'summer', weather: 'embers',
        propOrder: ['castle', 'watchtower', 'tent', 'rock', 'castle', 'banner', 'watchtower', 'mountain', 'tent', 'banner', 'rock', 'castle'],
        enemies: ['shield', 'assassin', 'bomber', 'cavalry'],
        levelBoss: { name: 'Li Jue', title: 'Iron Enforcer', spriteType: 'boss_lijue', pattern: 'whirlwind_nova', hp: 350, dmg: 25, speed: 82, color: 0xff784f, scale: 1.75 },
      },
      {
        level: 3, name: 'Warlord Bastion', waves: 3, waveDuration: 22,
        hpMul: 3.5, dmgMul: 1.9, speedMul: 1.25, spawnMul: 1.8, bossStage: true,
        bgColor: '#52161a', layoutPattern: 'ring', season: 'winter', weather: 'storm',
        propOrder: ['castle', 'watchtower', 'banner', 'tent', 'castle', 'mountain', 'watchtower', 'banner', 'castle', 'tent', 'mountain', 'rock'],
        enemies: ['shield', 'assassin', 'sorcerer', 'cavalry', 'bomber'],
        levelBoss: { name: 'Hua Xiong', title: 'Demon Vanguard', spriteType: 'boss_huaxiong', pattern: 'demon_slam', hp: 420, dmg: 28, speed: 84, color: 0xff5f5f, scale: 1.85 },
      },
    ],
  },
  {
    id: 'redcliffs',
    name: 'Red Cliffs Armada',
    short: 'RED CLIFFS',
    bgColor: '#161f28',
    bgFilter: 'hue-rotate(155deg) saturate(0.85) brightness(0.95)',
    propOrder: ['watchtower', 'house', 'pine', 'tent', 'rock', 'banner', 'castle', 'pine', 'watchtower', 'grass', 'mountain', 'banner'],
    boss: { name: 'Cao Ren', title: 'Grand Commander', spriteType: 'boss_caoren', hp: 680, dmg: 36, speed: 90, color: 0x6b9fff, scale: 1.95 },
    levels: [
      {
        level: 1, name: 'Misty Riverbank', waves: 3, waveDuration: 22,
        hpMul: 4.4, dmgMul: 2.15, speedMul: 1.28, spawnMul: 1.95, bossStage: false,
        bgColor: '#183442', layoutPattern: 'glade', season: 'winter', weather: 'snow',
        propOrder: ['house', 'watchtower', 'pine', 'rock', 'house', 'grass', 'watchtower', 'pine', 'tent', 'banner', 'grass', 'rock'],
        enemies: ['archer', 'assassin', 'sorcerer', 'soldier'],
        levelBoss: { name: 'Cai Mao', title: 'Fleet Admiral', spriteType: 'boss_caimao', pattern: 'arrow_rain', hp: 480, dmg: 30, speed: 84, color: 0x5ca8ff, scale: 1.75 },
      },
      {
        level: 2, name: 'Chained Armada', waves: 3, waveDuration: 24,
        hpMul: 5.5, dmgMul: 2.4, speedMul: 1.32, spawnMul: 2.1, bossStage: false,
        bgColor: '#1c2848', layoutPattern: 'corridor', season: 'autumn', weather: 'rain',
        propOrder: ['watchtower', 'tent', 'banner', 'rock', 'castle', 'watchtower', 'banner', 'tent', 'pine', 'watchtower', 'rock', 'banner'],
        enemies: ['shield', 'bomber', 'sorcerer', 'assassin'],
        levelBoss: { name: 'Zhang Yun', title: 'Naval Vanguard', spriteType: 'boss_zhangyun', pattern: 'tidal_ring', hp: 580, dmg: 33, speed: 88, color: 0x7cb8ff, scale: 1.85 },
      },
      {
        level: 3, name: 'Crimson Flagship', waves: 3, waveDuration: 24,
        hpMul: 6.8, dmgMul: 2.7, speedMul: 1.38, spawnMul: 2.3, bossStage: true,
        bgColor: '#341a46', layoutPattern: 'ring', season: 'spring', weather: 'embers',
        propOrder: ['castle', 'watchtower', 'tent', 'banner', 'castle', 'watchtower', 'mountain', 'banner', 'castle', 'tent', 'watchtower', 'banner'],
        enemies: ['shield', 'assassin', 'bomber', 'sorcerer', 'cavalry'],
        levelBoss: { name: 'Cao Ren', title: 'Grand Commander', spriteType: 'boss_caoren', pattern: 'imperial_storm', hp: 680, dmg: 36, speed: 90, color: 0x6b9fff, scale: 1.95 },
      },
    ],
  },
];