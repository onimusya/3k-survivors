import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RENDER_SCRIPT = '/home/francishor/.agents/skills/scenario-pixel-vfx/scripts/render.mjs';
const OUT_DIR = join(process.cwd(), 'assets/sprites/vfx');
const TMP_DIR = '/tmp/3k-vfx-recipes';

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

const TINTABLE_RAMP = ['#222a38', '#52647c', '#8ea3bd', '#cce0f5', '#ffffff'];

const RECIPES = {
  explosion: {
    name: 'explosion',
    w: 64,
    h: 64,
    frames: 12,
    fps: 18,
    loop: false,
    seed: 7,
    ramps: { main: 'fire', alt: 'lava', spark: 'solar', smoke: 'smoke' },
    outline: 'outside',
    dither: 0.12,
    pivot: [0.5, 0.5],
    layers: [
      { type: 'puffs', ramp: '$smoke', t0: 0.14, t1: 1.0, count: 8, spread: 0.52, r0: 0.16, r1: 0.38, gain: 0.72, dissolve: 1 },
      { type: 'cracks', ramp: '$alt', t0: 0.04, t1: 0.75, count: 6, len: 0.86, squash: 0.45, gain: 0.85 },
      { type: 'burst', ramp: '$main', t0: 0.0, t1: 0.9, r0: 0.12, r1: 0.88, grow: 0.36, rough: 0.6, erode: 1, erodeStart: 0.3, cool: 0.65 },
      { type: 'ring', ramp: '$spark', t0: 0.0, t1: 0.68, r0: 0.12, r1: 0.96, th: 0.22, breakup: 0.72 },
      { type: 'particles', ramp: '$spark', mode: 'burst', count: 18, speed: [1.8, 3.2], drag: 2.2, shape: 'streak', size: [2, 1] },
      { type: 'flash', ramp: '$main', r: 0.55, dur: 0.12 },
    ],
  },
  slash: {
    name: 'slash',
    w: 64,
    h: 64,
    frames: 8,
    fps: 20,
    loop: false,
    seed: 11,
    ramps: { main: TINTABLE_RAMP, spark: TINTABLE_RAMP },
    outline: 'outside',
    dither: 0,
    pivot: [0.5, 0.5],
    layers: [
      { type: 'slash', ramp: '$main', r: 0.78, th: 0.26, a0: -145, a1: 45, sweep: 0.35, trail: 0.92, erode: 0.65, gain: 0.88 },
      { type: 'slash', ramp: '$spark', r: 0.72, th: 0.12, a0: -135, a1: 40, t0: 0.05, t1: 0.85, sweep: 0.32, trail: 0.85, gain: 1.0 },
      { type: 'particles', ramp: '$spark', mode: 'burst', count: 10, dir: 25, spread: 85, speed: [1.4, 2.6], shape: 'streak', size: [2, 1] },
    ],
  },
  thrust: {
    name: 'thrust',
    w: 64,
    h: 48,
    frames: 8,
    fps: 20,
    loop: false,
    seed: 19,
    ramps: { main: TINTABLE_RAMP, spark: TINTABLE_RAMP },
    outline: 'outside',
    dither: 0,
    pivot: [0.5, 0.5],
    layers: [
      { type: 'beam', ramp: '$main', x: -0.75, y: 0, len: 1.55, th: 0.22, cap: 0.28, wob: 0.32, grow: 0.2, gain: 0.92 },
      { type: 'star', ramp: '$spark', x: 0.58, y: 0, t0: 0.06, t1: 0.85, points: 6, r: 0.42, sharp: 1.8, pop: 0.24, hollow: 0.85, gain: 1.0 },
      { type: 'particles', ramp: '$spark', x: 0.45, y: 0, mode: 'spray', dir: 0, spread: 50, count: 12, speed: [1.6, 2.8], shape: 'streak', size: [2, 1] },
    ],
  },
  whirlwind: {
    name: 'whirlwind',
    w: 64,
    h: 64,
    frames: 8,
    fps: 18,
    loop: false,
    seed: 23,
    ramps: { main: TINTABLE_RAMP, spark: TINTABLE_RAMP },
    outline: 'outside',
    dither: 0,
    pivot: [0.5, 0.5],
    layers: [
      { type: 'vortex', ramp: '$main', r: 0.88, rIn: 0.24, arms: 3, twist: 2.4, spin: 1, gain: 0.9 },
      { type: 'ring', ramp: '$spark', r0: 0.25, r1: 0.92, th: 0.16, breakup: 0.65, gain: 1.0 },
      { type: 'particles', ramp: '$spark', mode: 'burst', count: 14, speed: [1.4, 2.5], shape: 'shard', size: [2, 1] },
    ],
  },
  hit: {
    name: 'hit',
    w: 32,
    h: 32,
    frames: 6,
    fps: 22,
    loop: false,
    seed: 5,
    ramps: { main: 'solar', spark: 'white' },
    outline: 'outside',
    dither: 0,
    pivot: [0.5, 0.5],
    layers: [
      { type: 'ring', ramp: '$main', r0: 0.1, r1: 0.9, th: 0.22, breakup: 0.7, gain: 0.85 },
      { type: 'star', ramp: '$main', points: 8, r: 0.82, inner: 0.2, sharp: 1.7, pop: 0.22, hollow: 0.9, gain: 1.0 },
      { type: 'particles', ramp: '$spark', mode: 'burst', count: 10, speed: [1.5, 2.8], shape: 'streak', size: [2, 1] },
      { type: 'flash', ramp: '$main', r: 0.48, dur: 0.15 },
    ],
  },
  heal: {
    name: 'heal',
    w: 48,
    h: 48,
    frames: 10,
    fps: 16,
    loop: false,
    seed: 14,
    ramps: { main: 'nature', spark: 'holy' },
    outline: 'outside',
    dither: 0,
    pivot: [0.5, 0.5],
    layers: [
      { type: 'ring', ramp: '$main', y: 0.32, squash: 0.38, r0: 0.15, r1: 0.88, th: 0.2, breakup: 0.5, gain: 0.85 },
      { type: 'pillar', ramp: '$main', y: 0.38, w: 0.34, hgt: 1.35, grow: 0.2, gain: 0.7 },
      { type: 'particles', ramp: '$spark', mode: 'rise', count: 12, areaX: 0.55, areaY: 0.35, speed: [0.9, 1.8], shape: 'plus', size: [2, 1], gain: 1.0 },
    ],
  },
  levelup: {
    name: 'levelup',
    w: 64,
    h: 64,
    frames: 12,
    fps: 16,
    loop: false,
    seed: 29,
    ramps: { main: 'gold', spark: 'solar' },
    outline: 'outside',
    dither: 0,
    pivot: [0.5, 0.5],
    layers: [
      { type: 'glyph', ramp: '$main', y: 0.32, squash: 0.4, r: 0.86, star: 6, draw: 0.28, spin: 1, gain: 0.9 },
      { type: 'rays', ramp: '$spark', count: 10, r: 0.88, width: 0.18, t0: 0.05, t1: 0.85, gain: 0.85 },
      { type: 'pillar', ramp: '$main', y: 0.4, w: 0.36, hgt: 1.6, grow: 0.18, gain: 0.82 },
      { type: 'particles', ramp: '$spark', mode: 'rise', count: 16, areaX: 0.65, areaY: 0.4, speed: [1.2, 2.4], shape: 'star', size: [2, 1], gain: 1.0 },
      { type: 'flash', ramp: '$spark', r: 0.45, dur: 0.1 },
    ],
  },
};

for (const [id, recipe] of Object.entries(RECIPES)) {
  const recipePath = join(TMP_DIR, `${id}.recipe.json`);
  writeFileSync(recipePath, JSON.stringify(recipe, null, 2));
  execFileSync('node', [RENDER_SCRIPT, recipePath, '--out', OUT_DIR, '--force'], { stdio: 'inherit' });
  // Keep only the PNG sprite sheet to keep repo clean
  rmSync(join(OUT_DIR, `${id}.json`), { force: true });
  rmSync(join(OUT_DIR, `${id}@4x.gif`), { force: true });
}

console.log(`Generated 7 multi-frame scenario-pixel-vfx sprite sheets in ${OUT_DIR}`);
