import { Assets, Rectangle, Texture } from 'pixi.js';

const HERO_SHEETS = {
  guanyu: new URL('../assets/sprites/heroes/guanyu.png', import.meta.url).href,
  zhangfei: new URL('../assets/sprites/heroes/zhangfei.png', import.meta.url).href,
  zhaoyun: new URL('../assets/sprites/heroes/zhaoyun.png', import.meta.url).href,
  zhugeliang: new URL('../assets/sprites/heroes/zhugeliang.png', import.meta.url).href,
  lubu: new URL('../assets/sprites/heroes/lubu.png', import.meta.url).href,
  sunshangxiang: new URL('../assets/sprites/heroes/sunshangxiang.png', import.meta.url).href,
  caocao: new URL('../assets/sprites/heroes/caocao.png', import.meta.url).href,
  zhouyu: new URL('../assets/sprites/heroes/zhouyu.png', import.meta.url).href,
  diaochan: new URL('../assets/sprites/heroes/diaochan.png', import.meta.url).href,
  machao: new URL('../assets/sprites/heroes/machao.png', import.meta.url).href,
  simayi: new URL('../assets/sprites/heroes/simayi.png', import.meta.url).href,
  menghuo: new URL('../assets/sprites/heroes/menghuo.png', import.meta.url).href,
  liubei: new URL('../assets/sprites/heroes/liubei.png', import.meta.url).href,
  huangzhong: new URL('../assets/sprites/heroes/huangzhong.png', import.meta.url).href,
  ganning: new URL('../assets/sprites/heroes/ganning.png', import.meta.url).href,
  zhurong: new URL('../assets/sprites/heroes/zhurong.png', import.meta.url).href,
  zuoci: new URL('../assets/sprites/heroes/zuoci.png', import.meta.url).href,
  wukong: new URL('../assets/sprites/heroes/wukong.png', import.meta.url).href,
};

const ENEMY_ATLAS = new URL('../assets/sprites/enemies/atlas.png', import.meta.url).href;
const TERRAIN = new URL('../assets/sprites/terrain/ground.png', import.meta.url).href;
const TERRAIN_BIOMES = {
  grassland: new URL('../assets/sprites/terrain/grassland.png', import.meta.url).href,
  fortress: new URL('../assets/sprites/terrain/fortress.png', import.meta.url).href,
  scorched: new URL('../assets/sprites/terrain/scorched.png', import.meta.url).href,
  warship: new URL('../assets/sprites/terrain/warship.png', import.meta.url).href,
  snowfield: new URL('../assets/sprites/terrain/snowfield.png', import.meta.url).href,
  flooded: new URL('../assets/sprites/terrain/flooded.png', import.meta.url).href,
  magma: new URL('../assets/sprites/terrain/magma.png', import.meta.url).href,
  star_altar: new URL('../assets/sprites/terrain/star_altar.png', import.meta.url).href,
};
const PROPS_ATLAS = new URL('../assets/sprites/terrain/props.png', import.meta.url).href;
const PROP_IDS = ['tree', 'pine', 'rock', 'grass', 'mountain', 'banner', 'house', 'watchtower', 'castle', 'tent'];
const VIGNETTE = new URL('../assets/sprites/ui/vignette.png', import.meta.url).href;
const ICONS_ATLAS = new URL('../assets/sprites/ui/icons.png', import.meta.url).href;
const STAGES_ATLAS = new URL('../assets/sprites/ui/stages.png', import.meta.url).href;
const PETS_ATLAS = new URL('../assets/sprites/pets/pets.png', import.meta.url).href;
const PET_IDS = ['redhare', 'vermilion', 'white_tiger', 'qilin'];
const ICON_IDS = [
  'blade', 'spear', 'bow', 'fan', 'halberd', 'daggers',
  'flying_blades', 'bagua_shields',
  'crossbow', 'fire_flask', 'meteor_chain', 'wooden_ox',
  'thunder_talisman', 'caltrops', 'war_drum', 'shadow_clone',
  'might', 'armor', 'swiftness', 'cooldown', 'area', 'growth', 'heal',
  'sound_on', 'sound_off',
  'redhare', 'vermilion', 'white_tiger', 'qilin',
];
const EFFECTS = {
  slash: new URL('../assets/sprites/effects/slash.png', import.meta.url).href,
  spear: new URL('../assets/sprites/effects/spear.png', import.meta.url).href,
  whirlwind: new URL('../assets/sprites/effects/whirlwind.png', import.meta.url).href,
  shockwave: new URL('../assets/sprites/effects/shockwave.png', import.meta.url).href,
  spark: new URL('../assets/sprites/effects/spark.png', import.meta.url).href,
  impact: new URL('../assets/sprites/effects/impact.png', import.meta.url).href,
  gem: new URL('../assets/sprites/effects/gem.png', import.meta.url).href,
  chest: new URL('../assets/sprites/effects/chest.png', import.meta.url).href,
  heart: new URL('../assets/sprites/effects/heart.png', import.meta.url).href,
  bomb: new URL('../assets/sprites/effects/bomb.png', import.meta.url).href,
  explosion: new URL('../assets/sprites/effects/explosion.png', import.meta.url).href,
  projectile: new URL('../assets/sprites/effects/projectile.png', import.meta.url).href,
  golden_egg: new URL('../assets/sprites/effects/golden_egg.png', import.meta.url).href,
  ultraman: new URL('../assets/sprites/effects/ultraman.png', import.meta.url).href,
  saddle: new URL('../assets/sprites/effects/saddle.png', import.meta.url).href,
  barrel: new URL('../assets/sprites/effects/barrel.png', import.meta.url).href,
  meteor_boulder: new URL('../assets/sprites/effects/meteor_boulder.png', import.meta.url).href,
  volcano_geyser: new URL('../assets/sprites/effects/volcano_geyser.png', import.meta.url).href,
  meteor_crater: new URL('../assets/sprites/effects/meteor_crater.png', import.meta.url).href,
  fire_cyclone: new URL('../assets/sprites/effects/fire_cyclone.png', import.meta.url).href,
  wooden_ox_sprite: new URL('../assets/sprites/effects/wooden_ox_sprite.png', import.meta.url).href,
  mount_elephant: new URL('../assets/sprites/effects/mount_elephant.png', import.meta.url).href,
  mount_chariot: new URL('../assets/sprites/effects/mount_chariot.png', import.meta.url).href,
  mount_wolf: new URL('../assets/sprites/effects/mount_wolf.png', import.meta.url).href,
  mount_dragon: new URL('../assets/sprites/effects/mount_dragon.png', import.meta.url).href,
  fort_gatehouse: new URL('../assets/sprites/effects/fort_gatehouse.png', import.meta.url).href,
  fort_beacon: new URL('../assets/sprites/effects/fort_beacon.png', import.meta.url).href,
  fort_depot: new URL('../assets/sprites/effects/fort_depot.png', import.meta.url).href,
  fort_citadel: new URL('../assets/sprites/effects/fort_citadel.png', import.meta.url).href,
  gem_fire: new URL('../assets/sprites/effects/gem_fire.png', import.meta.url).href,
  gem_ice: new URL('../assets/sprites/effects/gem_ice.png', import.meta.url).href,
  gem_thunder: new URL('../assets/sprites/effects/gem_thunder.png', import.meta.url).href,
  formation_bagua: new URL('../assets/sprites/effects/formation_bagua.png', import.meta.url).href,
  guardian_mecha: new URL('../assets/sprites/effects/guardian_mecha.png', import.meta.url).href,
  guardian_dragon: new URL('../assets/sprites/effects/guardian_dragon.png', import.meta.url).href,
  gear_helm: new URL('../assets/sprites/effects/gear_helm.png', import.meta.url).href,
  gear_armor: new URL('../assets/sprites/effects/gear_armor.png', import.meta.url).href,
  gear_sword: new URL('../assets/sprites/effects/gear_sword.png', import.meta.url).href,
  gear_scroll: new URL('../assets/sprites/effects/gear_scroll.png', import.meta.url).href,
  gear_boots: new URL('../assets/sprites/effects/gear_boots.png', import.meta.url).href,
  gear_pendant: new URL('../assets/sprites/effects/gear_pendant.png', import.meta.url).href,
  stratagem_seal: new URL('../assets/sprites/effects/stratagem_seal.png', import.meta.url).href,
  tiger_tally: new URL('../assets/sprites/effects/tiger_tally.png', import.meta.url).href,
  npc_merchant: new URL('../assets/sprites/effects/npc_merchant.png', import.meta.url).href,
  npc_blacksmith: new URL('../assets/sprites/effects/npc_blacksmith.png', import.meta.url).href,
  npc_sage: new URL('../assets/sprites/effects/npc_sage.png', import.meta.url).href,
  allied_banner: new URL('../assets/sprites/effects/allied_banner.png', import.meta.url).href,
  titan_core: new URL('../assets/sprites/effects/titan_core.png', import.meta.url).href,
};
const VFX_SHEETS = {
  explosion: { url: new URL('../assets/sprites/vfx/explosion.png', import.meta.url).href, w: 64, h: 64, frames: 12 },
  slash: { url: new URL('../assets/sprites/vfx/slash.png', import.meta.url).href, w: 64, h: 64, frames: 8 },
  thrust: { url: new URL('../assets/sprites/vfx/thrust.png', import.meta.url).href, w: 64, h: 48, frames: 8 },
  whirlwind: { url: new URL('../assets/sprites/vfx/whirlwind.png', import.meta.url).href, w: 64, h: 64, frames: 8 },
  hit: { url: new URL('../assets/sprites/vfx/hit.png', import.meta.url).href, w: 32, h: 32, frames: 6 },
  heal: { url: new URL('../assets/sprites/vfx/heal.png', import.meta.url).href, w: 48, h: 48, frames: 10 },
  levelup: { url: new URL('../assets/sprites/vfx/levelup.png', import.meta.url).href, w: 64, h: 64, frames: 12 },
  volcano: { url: new URL('../assets/sprites/vfx/volcano.png', import.meta.url).href, w: 64, h: 64, frames: 12 },
  meteor: { url: new URL('../assets/sprites/vfx/meteor.png', import.meta.url).href, w: 64, h: 64, frames: 12 },
  hailstorm: { url: new URL('../assets/sprites/vfx/hailstorm.png', import.meta.url).href, w: 64, h: 64, frames: 10 },
  lightning: { url: new URL('../assets/sprites/vfx/lightning.png', import.meta.url).href, w: 64, h: 64, frames: 10 },
  earthquake: { url: new URL('../assets/sprites/vfx/earthquake.png', import.meta.url).href, w: 64, h: 64, frames: 12 },
  fire_tornado: { url: new URL('../assets/sprites/vfx/fire-tornado.png', import.meta.url).href, w: 64, h: 64, frames: 12 },
};

const HERO_FRAME_W = 64;
const HERO_FRAME_H = 64;
const HERO_WALK_FRAMES = 4;
const HERO_ATTACK_FRAMES = 4;
const HERO_DIRECTIONS = 4;
const ENEMY_FRAME_W = 64;
const ENEMY_FRAME_H = 64;
const ENEMY_FRAMES = 4;
const ENEMY_TYPES = [
  'soldier', 'archer', 'cavalry', 'shield', 'assassin',
  'bomber', 'sorcerer', 'halberdier', 'catapult', 'firebird', 'kaiju', 'ufo', 'ghidorah',
  'boss_chengyuanzhi', 'boss_dengmao', 'elite',
  'boss_huzhen', 'boss_lijue', 'boss_huaxiong',
  'boss_caimao', 'boss_zhangyun', 'boss_caoren',
  'mothra', 'rodan', 'mechagodzilla', 'biollante',
  'gamera', 'king_kong', 'destoroyah', 'gigan',
];

function nearest(texture) {
  texture.source.scaleMode = 'nearest';
  texture.source.autoGenerateMipmaps = false;
  return texture;
}

function frame(source, x, y, width, height, label) {
  return new Texture({
    source,
    frame: new Rectangle(x, y, width, height),
    orig: new Rectangle(0, 0, width, height),
    label,
  });
}

export async function loadSpriteAssets(onProgress = null) {
  const heroEntries = Object.entries(HERO_SHEETS);
  const terrainEntries = Object.entries(TERRAIN_BIOMES);
  const effectEntries = Object.entries(EFFECTS);
  const vfxEntries = Object.entries(VFX_SHEETS);
  const totalSteps = heroEntries.length + 2 + terrainEntries.length + 5 + effectEntries.length + vfxEntries.length;
  let completedSteps = 0;
  const step = (label) => {
    completedSteps++;
    if (onProgress) onProgress(completedSteps, totalSteps, label);
  };

  const heroBases = await Promise.all(
    heroEntries.map(async ([id, url]) => {
      const tex = nearest(await Assets.load(url));
      step(`Summoning Warrior: ${id.toUpperCase()}...`);
      return [id, tex];
    }),
  );
  const heroFrames = {};
  const heroAttackFrames = {};
  for (const [id, base] of heroBases) {
    const directions = [];
    const attacks = [];
    for (let direction = 0; direction < HERO_DIRECTIONS; direction++) {
      const walk = [];
      for (let walkFrame = 0; walkFrame < HERO_WALK_FRAMES; walkFrame++) {
        walk.push(frame(
          base.source,
          walkFrame * HERO_FRAME_W,
          direction * HERO_FRAME_H,
          HERO_FRAME_W,
          HERO_FRAME_H,
          `${id}-${direction}-walk-${walkFrame}`,
        ));
      }
      const attack = [];
      for (let attackFrame = 0; attackFrame < HERO_ATTACK_FRAMES; attackFrame++) {
        attack.push(frame(
          base.source,
          (HERO_WALK_FRAMES + attackFrame) * HERO_FRAME_W,
          direction * HERO_FRAME_H,
          HERO_FRAME_W,
          HERO_FRAME_H,
          `${id}-${direction}-attack-${attackFrame}`,
        ));
      }
      directions.push(walk);
      attacks.push(attack);
    }
    heroFrames[id] = directions;
    heroAttackFrames[id] = attacks;
  }

  const enemyBase = nearest(await Assets.load(ENEMY_ATLAS));
  step('Loading Horde & Warlord Atlas...');
  const enemyFrames = {};
  for (let typeIndex = 0; typeIndex < ENEMY_TYPES.length; typeIndex++) {
    const frames = [];
    for (let walk = 0; walk < ENEMY_FRAMES; walk++) {
      frames.push(frame(
        enemyBase.source,
        walk * ENEMY_FRAME_W,
        typeIndex * ENEMY_FRAME_H,
        ENEMY_FRAME_W,
        ENEMY_FRAME_H,
        `${ENEMY_TYPES[typeIndex]}-${walk}`,
      ));
    }
    enemyFrames[ENEMY_TYPES[typeIndex]] = frames;
  }

  const terrain = nearest(await Assets.load(TERRAIN));
  step('Loading Base Battlefield Ground...');
  const terrainBiomes = {};
  await Promise.all(terrainEntries.map(async ([k, url]) => {
    terrainBiomes[k] = nearest(await Assets.load(url));
    step(`Forging Terrain Biome: ${k.toUpperCase()}...`);
  }));
  const propsBase = nearest(await Assets.load(PROPS_ATLAS));
  step('Loading Four Seasons Props & Buildings...');
  const seasonNames = ['spring', 'summer', 'autumn', 'winter'];
  const props = {};
  for (let s = 0; s < seasonNames.length; s++) {
    const sMap = {};
    for (let i = 0; i < PROP_IDS.length; i++) {
      sMap[PROP_IDS[i]] = frame(propsBase.source, i * 48, s * 48, 48, 48, `prop-${seasonNames[s]}-${PROP_IDS[i]}`);
    }
    props[seasonNames[s]] = sMap;
  }
  for (let i = 0; i < PROP_IDS.length; i++) {
    props[PROP_IDS[i]] = props.summer[PROP_IDS[i]];
  }
  const vignette = nearest(await Assets.load(VIGNETTE));
  step('Loading UI Vignette...');
  const iconsBase = nearest(await Assets.load(ICONS_ATLAS));
  step('Loading 32x32 Weapon & Skill Icons...');
  const iconSize = iconsBase.height || 32;
  const icons = {};
  for (let i = 0; i < ICON_IDS.length; i++) {
    icons[ICON_IDS[i]] = frame(iconsBase.source, i * iconSize, 0, iconSize, iconSize, `icon-${ICON_IDS[i]}`);
  }
  const stagesBase = nearest(await Assets.load(STAGES_ATLAS));
  step('Loading Campaign Stage Dioramas...');
  const stages = [];
  for (let i = 0; i < 9; i++) {
    stages.push(frame(stagesBase.source, i * 56, 0, 56, 32, `stage-${i}`));
  }
  const effectFrames = {};
  await Promise.all(effectEntries.map(async ([id, url]) => {
    const tex = nearest(await Assets.load(url));
    if ((id === 'ultraman' || id === 'guardian_mecha' || id === 'guardian_dragon') && tex.width >= 256) {
      const uFrames = [];
      for (let c = 0; c < 4; c++) {
        uFrames.push(frame(tex.source, c * 64, 0, 64, 64, `${id}-${c}`));
      }
      effectFrames[`${id}Frames`] = uFrames;
      effectFrames[id] = uFrames[0];
    } else {
      effectFrames[id] = tex;
    }
    step(`Loading Sprite Asset: ${id.toUpperCase()}...`);
  }));
  const vfx = {};
  await Promise.all(vfxEntries.map(async ([id, spec]) => {
    const base = nearest(await Assets.load(spec.url));
    const list = [];
    for (let i = 0; i < spec.frames; i++) {
      list.push(frame(base.source, i * spec.w, 0, spec.w, spec.h, `vfx-${id}-${i}`));
    }
    vfx[id] = list;
    step(`Awakening Pixel VFX: ${id.toUpperCase()}...`);
  }));
  const petsBase = nearest(await Assets.load(PETS_ATLAS));
  step('Summoning 4 Mythic Companions...');
  const pets = {};
  for (let r = 0; r < PET_IDS.length; r++) {
    const list = [];
    for (let c = 0; c < 4; c++) {
      list.push(frame(petsBase.source, c * 32, r * 32, 32, 32, `pet-${PET_IDS[r]}-${c}`));
    }
    pets[PET_IDS[r]] = list;
  }

  return { heroFrames, heroAttackFrames, enemyFrames, terrain, terrainBiomes, props, propsBase, vignette, icons, stages, effects: effectFrames, vfx, pets, enemyBase };
}

export const SPRITE_MANIFEST = {
  heroes: HERO_SHEETS,
  enemies: ENEMY_ATLAS,
  terrain: TERRAIN,
  terrains: TERRAIN_BIOMES,
  vignette: VIGNETTE,
  effects: EFFECTS,
};
