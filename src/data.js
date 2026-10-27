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
  halberdier: { name:'Imperial Halberdier', color:0xe07a5f, hp:24, speed:66, dmg:14, size:16, xp:4, weight:16, knockResist:0.4 },
  catapult: { name:'Siege Catapult', color:0xd97706, hp:52, speed:28, dmg:22, size:21, xp:8, weight:8, ranged:true, isCatapult:true, knockResist:0.9 },
  firebird:   { name:'Feather-Storm Hawk',color:0xef4444, hp:14, speed:240, dmg:13, size:14, xp:5, weight:0, isBird:true },
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
    boss: { ...finalBoss, hp: 900 + cIdx * 320, dmg: 24 + cIdx * 5, speed: 78 + cIdx * 2, scale: 1.9 },
    levels: c.stageNames.map((stName, lIdx) => {
      const order = cIdx * 5 + lIdx;
      const bSpec = c.bosses[lIdx];
      const squad = cIdx === 0
        ? EARLY_CAMP1_SQUADS[lIdx % EARLY_CAMP1_SQUADS.length]
        : LEVEL_SQUAD_TEMPLATES[lIdx % LEVEL_SQUAD_TEMPLATES.length];
      // Rotate tint priority per level so each level has visibly distinct armor colors
      const levelTints = [
        cTints[lIdx % cTints.length],
        cTints[(lIdx + 1) % cTints.length],
        cTints[(lIdx + 2) % cTints.length],
      ];
      return {
        level: lIdx + 1,
        name: stName,
        waves: 5,
        waveDuration: 10,
        hpMul: +(0.65 + order * 0.16).toFixed(2),
        dmgMul: +(0.65 + order * 0.065).toFixed(2),
        speedMul: +(0.86 + order * 0.01).toFixed(3),
        spawnMul: +(0.78 + order * 0.04).toFixed(2),
        bossStage: lIdx === 4,
        bgColor: c.bgColors[lIdx],
        layoutPattern: c.patterns[lIdx],
        season: c.seasons[lIdx],
        weather: c.weathers[lIdx],
        propOrder: c.props,
        enemies: squad,
        factionTints: levelTints,
        weaponStyle: WEAPON_STYLES[(cIdx + lIdx) % WEAPON_STYLES.length],
        levelBoss: {
          ...bSpec,
          hp: Math.round((210 + order * 26) * (lIdx === 4 ? 1.25 : 1.0)),
          dmg: Math.round(12 + order * 0.9),
          speed: Math.min(88, 66 + Math.floor(order * 0.45)),
          scale: lIdx === 4 ? 1.85 : 1.65,
        },
      };
    }),
  };
});