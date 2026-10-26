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

export const ENEMY_TYPES = {
  soldier: { name:'Soldier', color:0x7a7a7a, hp:8, speed:60, dmg:6, size:14, xp:1, weight:60 },
  archer: { name:'Archer', color:0x5a7a5a, hp:6, speed:50, dmg:8, size:13, xp:2, weight:20, ranged:true },
  cavalry: { name:'Cavalry', color:0x9a6a3a, hp:20, speed:110, dmg:12, size:18, xp:4, weight:12 },
  elite: { name:'Elite', color:0xd4a017, hp:80, speed:70, dmg:18, size:22, xp:20, weight:0, boss:true },
};

export const LEVEL_XP = (lvl) => Math.floor(20 * Math.pow(1.15, lvl - 1));