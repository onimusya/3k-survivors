import { Assets, Rectangle, Texture } from 'pixi.js';

const HERO_SHEETS = {
  guanyu: new URL('../assets/sprites/heroes/guanyu.png', import.meta.url).href,
  zhangfei: new URL('../assets/sprites/heroes/zhangfei.png', import.meta.url).href,
  zhaoyun: new URL('../assets/sprites/heroes/zhaoyun.png', import.meta.url).href,
  zhugeliang: new URL('../assets/sprites/heroes/zhugeliang.png', import.meta.url).href,
  lubu: new URL('../assets/sprites/heroes/lubu.png', import.meta.url).href,
  sunshangxiang: new URL('../assets/sprites/heroes/sunshangxiang.png', import.meta.url).href,
};

const ENEMY_ATLAS = new URL('../assets/sprites/enemies/atlas.png', import.meta.url).href;
const TERRAIN = new URL('../assets/sprites/terrain/ground.png', import.meta.url).href;
const PROPS_ATLAS = new URL('../assets/sprites/terrain/props.png', import.meta.url).href;
const PROP_IDS = ['tree', 'pine', 'rock', 'grass', 'mountain', 'banner'];
const VIGNETTE = new URL('../assets/sprites/ui/vignette.png', import.meta.url).href;
const ICONS_ATLAS = new URL('../assets/sprites/ui/icons.png', import.meta.url).href;
const STAGES_ATLAS = new URL('../assets/sprites/ui/stages.png', import.meta.url).href;
const ICON_IDS = [
  'blade', 'spear', 'bow', 'fan', 'halberd', 'daggers',
  'might', 'armor', 'swiftness', 'cooldown', 'area', 'growth', 'heal',
  'sound_on', 'sound_off',
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
};

const HERO_FRAME_W = 32;
const HERO_FRAME_H = 40;
const HERO_WALK_FRAMES = 4;
const HERO_ATTACK_FRAMES = 4;
const HERO_DIRECTIONS = 4;
const ENEMY_FRAME_W = 32;
const ENEMY_FRAME_H = 32;
const ENEMY_FRAMES = 4;
const ENEMY_TYPES = [
  'soldier', 'archer', 'cavalry', 'shield', 'assassin',
  'bomber', 'sorcerer', 'elite', 'boss_huaxiong', 'boss_caoren',
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

export async function loadSpriteAssets() {
  const heroBases = await Promise.all(
    Object.entries(HERO_SHEETS).map(async ([id, url]) => [id, nearest(await Assets.load(url))]),
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
  const propsBase = nearest(await Assets.load(PROPS_ATLAS));
  const props = {};
  for (let i = 0; i < PROP_IDS.length; i++) {
    props[PROP_IDS[i]] = frame(propsBase.source, i * 48, 0, 48, 48, `prop-${PROP_IDS[i]}`);
  }
  const vignette = nearest(await Assets.load(VIGNETTE));
  const iconsBase = nearest(await Assets.load(ICONS_ATLAS));
  const icons = {};
  for (let i = 0; i < ICON_IDS.length; i++) {
    icons[ICON_IDS[i]] = frame(iconsBase.source, i * 16, 0, 16, 16, `icon-${ICON_IDS[i]}`);
  }
  const stagesBase = nearest(await Assets.load(STAGES_ATLAS));
  const stages = [];
  for (let i = 0; i < 9; i++) {
    stages.push(frame(stagesBase.source, i * 56, 0, 56, 32, `stage-${i}`));
  }
  const effectFrames = {};
  await Promise.all(Object.entries(EFFECTS).map(async ([id, url]) => {
    effectFrames[id] = nearest(await Assets.load(url));
  }));

  return { heroFrames, heroAttackFrames, enemyFrames, terrain, props, propsBase, vignette, icons, stages, effects: effectFrames, enemyBase };
}

export const SPRITE_MANIFEST = {
  heroes: HERO_SHEETS,
  enemies: ENEMY_ATLAS,
  terrain: TERRAIN,
  vignette: VIGNETTE,
  effects: EFFECTS,
};
