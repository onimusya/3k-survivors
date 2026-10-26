import { Application } from 'pixi.js';
import { Game } from './game.js';

const app = new Application();
await app.init({
  background: 0x0b0f1a,
  resizeTo: window,
  antialias: false,
  resolution: 0.75,
  autoDensity: true,
  powerPreference: 'high-performance',
});
document.getElementById('app').appendChild(app.canvas);

const game = new Game(app);
await game.start();

window.__game = game;