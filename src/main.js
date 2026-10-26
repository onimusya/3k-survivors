import { Application, TextStyle } from 'pixi.js';
import { Game } from './game.js';

TextStyle.defaultTextStyle.resolution = 2;

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

const game = new Game(app);
await game.start();

window.__game = game;