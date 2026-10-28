import { Application, TextStyle } from 'pixi.js';
import { Game } from './game.js';

TextStyle.defaultTextStyle.resolution = 2;

const preloaderEl = document.getElementById('preloader');
const barEl = document.getElementById('preloader-bar');
const statusEl = document.getElementById('preloader-status');
const pctEl = document.getElementById('preloader-pct');

function updatePreloader(frac, label) {
  const pct = Math.max(4, Math.min(100, Math.round(frac * 100)));
  window.__preloaderProgress = { pct, label };
  if (barEl) barEl.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (statusEl && label) statusEl.textContent = label.toUpperCase();
}

updatePreloader(0.08, 'INITIALIZING PIXIJS 8 RENDERER...');

const app = new Application();
await app.init({
  background: 0x0b0f1a,
  backgroundAlpha: 0,
  resizeTo: window,
  antialias: false,
  roundPixels: true,
  resolution: 1,
  autoDensity: true,
  powerPreference: 'high-performance',
});
document.getElementById('app').appendChild(app.canvas);

updatePreloader(0.14, 'LOADING WARRIORS, TERRAINS & VFX...');

const game = new Game(app);
await game.start((frac, label) => {
  updatePreloader(0.14 + frac * 0.86, label);
});

window.__game = game;
updatePreloader(1.0, 'BATTLEFIELD READY!');
if (preloaderEl) {
  setTimeout(() => {
    preloaderEl.classList.add('preloader-hide');
  }, 180);
}