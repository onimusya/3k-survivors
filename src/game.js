import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle, Particle, ParticleContainer, TilingSprite } from 'pixi.js';
import { HEROES, STARTING_PERKS, CAMPAIGN_MAPS, WEATHER_TYPES, SEASONS, PETS, WEAPONS, EVOLUTIONS, PASSIVES, ENEMY_TYPES, LEVEL_XP } from './data.js';
import { clamp, dist2, rand, randInt, pick, angleTo, Pool } from './utils.js';
import { SpatialHash } from './spatial.js';
import { loadSpriteAssets, SPRITE_MANIFEST } from './sprites.js';
import { SoundManager } from './audio.js';

export class Game {
  constructor(app) {
    this.app = app;
    this.W = window.innerWidth || app.screen.width;
    this.H = window.innerHeight || app.screen.height;
    this.stage = app.stage;
    this.world = new Container();
    this.weatherLayer = new Container();
    this.uiLayer = new Container();
    this.stage.addChild(this.world);
    this.stage.addChild(this.weatherLayer);
    this.stage.addChild(this.uiLayer);
    this.bgGrid = new Container();
    this.world.addChildAt(this.bgGrid, 0);
    this.propLayer = new Container();
    this.world.addChild(this.propLayer);
    this.enemyContainer = new ParticleContainer({
      texture: null,
      dynamicProperties: { position: true, rotation: false, vertex: true, uvs: true, color: true },
    });
    this.world.addChild(this.enemyContainer);
    this.enemyLayer = new Graphics();
    this.world.addChild(this.enemyLayer);
    this.playerLayer = new Container();
    this.world.addChild(this.playerLayer);
    this.petLayer = new Container();
    this.world.addChild(this.petLayer);
    this.orbitLayer = new Graphics();
    this.world.addChild(this.orbitLayer);
    this.projLayer = new Container();
    this.gemLayer = new Container();
    this.itemLayer = new Container();
    this.chestLayer = new Container();
    this.fxLayer = new Container();
    this.world.addChild(this.projLayer);
    this.world.addChild(this.gemLayer);
    this.world.addChild(this.itemLayer);
    this.world.addChild(this.chestLayer);
    this.world.addChild(this.fxLayer);
    this.state = 'menu'; // menu | playing | levelup | gameover
    this.time = 0;
    this.animTime = 0;
    this.kills = 0;
    this.gold = 0;

    this.props = [];
    this.selectedSeasonMode = 'auto'; // auto | spring | summer | autumn | winter
    this.activeSeason = 'spring';
    this.weatherDrops = [];
    this.activeWeather = 'clear';
    this.lightningTimer = 8;
    this.enemies = [];
    this.projectiles = [];
    this.gems = [];
    this.items = [];
    this.chests = [];
    this.particles = [];
    this.enemyPool = null;
    this.enemySerial = 0;
    this.projPool = null;
    this.gemPool = null;

    this.spatial = new SpatialHash(96);

    this.hero = null;
    this.selectedHero = HEROES[0];
    this.perk = STARTING_PERKS[0];
    this.selectedPerk = STARTING_PERKS[0];
    this.selectedMapIndex = 0;
    this.mapIndex = 0;
    this.stageIndex = 0;
    this.unlockedCampaignIndex = 0;
    this.unlockedStageOrder = 0;
    this.selectedCheckpointOrder = 0;
    this.viewingCampaignIndex = 0;
    this.clearedStages = new Set();
    this.lastAutoSavedCampaign = null;
    this.stageProgress = 0;
    this.currentWave = 1;
    this.waveTotalEnemies = 14;
    this.waveSpawnedCount = 0;
    this.waveKills = 0;
    this.pendingNextWave = null;
    this.finalWaveSpawned = false;
    this.stageBoss = null;
    this.loadCampaignProgress();
    this.pets = []; // [{ id, level, x, y, vx, vy, cdTimer, healTimer, lungeX, lungeY, sprite, shadow }]
    this.passives = {}; // id -> level
    this.xp = 0;
    this.level = 1;
    this.xpNext = LEVEL_XP(1);

    this.joystick = { x:0, y:0, active:false, id:null, originX:0, originY:0, curX:0, curY:0 };
    this.touchIds = new Map();
    this.shake = 0;
    this.keys = {};
    this.sfx = new SoundManager();
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      this.sfx.unlock();
      if (e.key === 'm' || e.key === 'M') this.toggleSound();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });
    this.fpsSamples = [];
    this.lastFpsTime = performance.now();
    this.frameCount = 0;

    this.setupResize();
    this.setupInput();

    window.__spawnEnemies = (n) => {
      for (let i = 0; i < n; i++) {
        this.spawnEnemy();
        this.waveTotalEnemies = (this.waveTotalEnemies || 0) + 1;
        this.waveSpawnedCount = (this.waveSpawnedCount || 0) + 1;
      }
    };
    window.__game = this;
  }

  async start() {
    const [assets] = await Promise.all([loadSpriteAssets(), this.sfx.preload()]);
    this.assets = assets;
    this.setupTextures();
    this.setupPools();
    this.buildMenu();
    this.app.ticker.add((t) => this.tick(t.deltaTime));
  }

  toggleSound() {
    this.sfx.toggleMute();
    if (this.state === 'menu') this.buildMenu();
    else if (this.hud) {
      this._loadoutDirty = true;
      this.renderHudSlots();
    }
  }

  setupResize() {
    this.resizePending = false;
    const onResize = () => {
      if (this.resizePending) return;
      this.resizePending = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.resizePending = false;
          this.applyViewportSize();
        });
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
  }

  computeLayoutMetrics() {
    const minDim = Math.min(this.W, this.H);
    this.uiScale = clamp(minDim / 390, 0.88, 1.45);
    this.worldScale = minDim > 520 ? clamp(minDim / 500, 1.0, 1.35) : 1.0;
  }

  applyViewportSize(force = false) {
    const nextW = window.innerWidth || this.app.screen.width;
    const nextH = window.innerHeight || this.app.screen.height;
    if (!force && nextW === this.W && nextH === this.H) return;
    if (this.app?.renderer && (this.app.screen.width !== nextW || this.app.screen.height !== nextH)) {
      this.app.renderer.resize(nextW, nextH);
    }
    this.W = nextW;
    this.H = nextH;
    this.computeLayoutMetrics();
    this.layoutVignette();
    if (this.hud) this.layoutHud();
    if (this.menuContainer) {
      const visible = this.menuContainer.visible;
      this.buildMenu();
      this.menuContainer.visible = visible;
    }
    if (this.state === 'levelup') this.showLevelUpUI();
    if (this.state === 'campaignmap') this.showCampaignMapModal();
    if (this.state === 'gameover') this.gameOver();
  }

  layoutVignette() {
    this.computeLayoutMetrics();
    if (this.appEl) {
      const tilePx = Math.round(128 * (this.worldScale || 1));
      this.appEl.style.backgroundSize = `${tilePx}px ${tilePx}px`;
    }
  }

  setupTextures() {
    this.enemyTextures = this.assets.enemyFrames;
    this.heroFrames = this.assets.heroFrames;
    this.heroAttackFrames = this.assets.heroAttackFrames;
    this.effectTextures = this.assets.effects;
    this.iconTextures = this.assets.icons;
    this.propTextures = this.assets.props;
    this.stageTextures = this.assets.stages;
    this.vfxFrames = this.assets.vfx;
    this.petTextures = this.assets.pets;

    this.appEl = document.getElementById('app');
    if (this.appEl) {
      this.appEl.style.backgroundColor = '#1e221c';
      this.appEl.style.backgroundImage = `url("${SPRITE_MANIFEST.terrain}")`;
      this.appEl.style.backgroundRepeat = 'repeat';
      this.appEl.style.imageRendering = 'pixelated';
    }
    this.terrain = { width: this.W, height: this.H, x: 0, y: 0, visible: false, tilePosition: { set() {} } };
    this.layoutVignette();
  }

  setupPools() {
    this.enemyContainer.texture = this.assets.enemyBase;
    this.enemyPool = new Pool(() => {
      const p = new Particle(this.enemyTextures.soldier[0]);
      p.anchorX = 0.5; p.anchorY = 0.625;
      this.enemyContainer.addParticle(p);
      return { active:false, type:'soldier', x:0, y:0, hp:0, maxHp:0, speed:0, dmg:0, size:14, baseScale:1, xp:1, color:0x7a7a7a, hitFlash:0, knock:0, kx:0, ky:0, knockResist:0, ranged:false, explosive:false, isBoss:false, isMapBoss:false, shootCd:0, sprite:p, frame:-1 };
    }, (e) => { e.active = false; if (e.sprite) { e.sprite.alpha = 0; } });
    this.projPool = new Pool(() => {
      const sprite = new Sprite(this.effectTextures.projectile);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.projLayer.addChild(sprite);
      return {
        active:false, x:0, y:0, vx:0, vy:0, dmg:0, life:0, pierce:0, size:6, color:0xffffff, hit:new Set(), fromEnemy:false, homing:false, isMagic:false, sprite,
      };
    }, (p) => { p.active = false; p.hit.clear(); p.sprite.visible = false; });
    this.gemPool = new Pool(() => {
      const sprite = new Sprite(this.effectTextures.gem);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.gemLayer.addChild(sprite);
      return {
        active:false, x:0, y:0, val:1, magnet:false, vy:0, sprite,
      };
    }, (g) => { g.active = false; g.sprite.visible = false; });
    this.itemPool = new Pool(() => {
      const sprite = new Sprite(this.effectTextures.heart);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.itemLayer.addChild(sprite);
      return {
        active:false, kind:'heart', x:0, y:0, magnet:false, phase:0, sprite,
      };
    }, (it) => { it.active = false; it.sprite.visible = false; });
    const makeFxPool = (tex) => new Pool(() => {
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.fxLayer.addChild(sprite);
      return { active:false, sprite };
    }, (item) => { item.active = false; item.sprite.visible = false; item.sprite.rotation = 0; });
    this.hitPool = makeFxPool(this.vfxFrames?.hit?.[0] || this.effectTextures.impact);
    this.slashPool = makeFxPool(this.vfxFrames?.slash?.[0] || this.effectTextures.slash);
    this.thrustPool = makeFxPool(this.vfxFrames?.thrust?.[0] || this.effectTextures.spear || this.effectTextures.slash);
    this.spinPool = makeFxPool(this.vfxFrames?.whirlwind?.[0] || this.effectTextures.whirlwind || this.effectTextures.slash);
    this.ringPool = makeFxPool(this.effectTextures.shockwave || this.effectTextures.impact);
    this.sparkPool = makeFxPool(this.effectTextures.spark || this.effectTextures.impact);
    this.explosionPool = makeFxPool(this.vfxFrames?.explosion?.[0] || this.effectTextures.explosion || this.effectTextures.impact);
    this.healPool = makeFxPool(this.vfxFrames?.heal?.[0] || this.effectTextures.heart);
    this.levelupPool = makeFxPool(this.vfxFrames?.levelup?.[0] || this.effectTextures.impact);
    this.floatTextStyle = new TextStyle({
      fill: 0xffffff,
      fontSize: 13,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      stroke: { color: 0x120d12, width: 3 },
    });
    this.textPool = new Pool(() => {
      const t = new Text({ text: '', style: this.floatTextStyle });
      t.anchor.set(0.5);
      t.visible = false;
      this.fxLayer.addChild(t);
      return { active:false, sprite:t };
    }, (t) => { t.active = false; t.sprite.visible = false; });
    this.setupWeather();
  }

  buildMenu() {
    if (this.menuContainer) this.menuContainer.destroy({ children:true });
    this.menuContainer = new Container();
    this.uiLayer.addChild(this.menuContainer);

    this.computeLayoutMetrics();
    const W = this.W;
    const H = this.H;
    const landscape = W >= H;
    const s = landscape
      ? clamp(H / 390, 0.9, 1.38)
      : clamp(Math.min(W / 390, H / 844), 0.88, 1.38);
    const margin = Math.round((landscape ? 20 : 16) * s);
    const gap = Math.round(8 * s);
    const topSafe = Math.round(landscape ? 8 * s : 28 * s);
    const bottomSafe = Math.round(landscape ? 16 * s : 36 * s);

    const bg = new Graphics();
    bg.rect(0, 0, W, H).fill({ color:0x0b1117, alpha:0.98 });
    const menuTerrain = new TilingSprite({ texture:this.assets.terrain, width:W, height:H });
    menuTerrain.tileScale.set(2);
    menuTerrain.alpha = 0.28;
    this.menuContainer.addChild(bg, menuTerrain);

    const bannerH = Math.round(landscape ? 62 * s : Math.min(114 * s, topSafe + 84 * s));
    const banner = new Graphics();
    banner.rect(0, 0, W, bannerH).fill({ color:0x121a21, alpha:0.96 });
    banner.moveTo(0, bannerH - 2).lineTo(W, bannerH - 2).stroke({ color:0xd4a017, width:2, alpha:0.9 });
    banner.moveTo(margin, topSafe).lineTo(W - margin, topSafe).stroke({ color:0xd4a017, width:1, alpha:0.22 });
    banner.circle(margin + 8, bannerH - 10, 3).fill(0xd4a017);
    banner.circle(W - margin - 8, bannerH - 10, 3).fill(0xd4a017);
    this.menuContainer.addChild(banner);

    const title = new Text({
      text:'3K SURVIVORS',
      style: new TextStyle({ fill:0xf2c75b, fontSize:Math.round((landscape ? 22 : 28) * s), fontFamily:'monospace', fontWeight:'bold', letterSpacing:1.5, stroke:{ color:0x080b10, width:Math.round(5 * s) } }),
    });
    title.anchor.set(0.5);
    title.x = Math.round(W / 2);
    title.y = Math.round(topSafe + (bannerH - topSafe) * 0.36);
    this.menuContainer.addChild(title);

    const sub = new Text({
      text:'ROMANCE OF THE THREE KINGDOMS',
      style: new TextStyle({ fill:0xcbd3dc, fontSize:Math.round((landscape ? 9 : 10) * s), fontFamily:'monospace', letterSpacing:1.0 }),
    });
    sub.anchor.set(0.5);
    sub.x = Math.round(W / 2);
    sub.y = Math.round(topSafe + (bannerH - topSafe) * 0.7);
    this.menuContainer.addChild(sub);

    const cols = landscape ? 3 : 2;
    const rows = landscape ? 2 : 3;
    const maxGridW = Math.round((landscape ? 740 : 440) * s);
    const availGridW = Math.min(W - margin * 2, maxGridW);
    const cardW = Math.floor((availGridW - gap * (cols - 1)) / cols);
    const cardH = Math.round((landscape ? 70 : 90) * s);
    const perkH = Math.round((landscape ? 48 : 66) * s);
    const deployH = Math.round((landscape ? 40 : 48) * s);
    const headerRowH = Math.round((landscape ? 24 : 46) * s);
    const contentH = headerRowH + rows * cardH + (rows - 1) * gap + Math.round((landscape ? 24 : 28) * s) + perkH + Math.round((landscape ? 10 : 12) * s) + deployH + (landscape ? 16 : 32);
    const extraY = Math.max(0, Math.floor((H - bannerH - bottomSafe - contentH) * 0.45));
    const gridY = Math.round(bannerH + extraY + headerRowH);
    const totalGridW = cols * cardW + (cols - 1) * gap;
    const gridX = Math.round((W - totalGridW) / 2);
    const muteBtn = new Container();
    const muteW = Math.round(58 * s), muteH = Math.round(22 * s);
    const muteBg = new Graphics();
    muteBg.roundRect(0, 0, muteW, muteH, 4)
      .fill({ color:0x16202b, alpha:0.95 })
      .stroke({ color:this.sfx.enabled ? 0x6bffb0 : 0x52606e, width:1.2, alpha:0.85 });
    muteBtn.addChild(muteBg);
    const muteIconKey = this.sfx.enabled ? 'sound_on' : 'sound_off';
    if (this.iconTextures?.[muteIconKey]) {
      const mic = new Sprite(this.iconTextures[muteIconKey]);
      mic.x = Math.round(5 * s); mic.y = Math.round((muteH - 16) / 2);
      muteBtn.addChild(mic);
    }
    const muteTxt = new Text({
      text: this.sfx.enabled ? 'SFX' : 'MUTE',
      style: new TextStyle({ fill:this.sfx.enabled ? 0xd8f5e5 : 0x9aa6b4, fontSize:Math.round(9 * s), fontFamily:'monospace', fontWeight:'bold' }),
    });
    muteTxt.x = Math.round(24 * s); muteTxt.y = Math.round((muteH - muteTxt.height) / 2);
    muteBtn.addChild(muteTxt);
    muteBtn.x = gridX + totalGridW - muteW;
    muteBtn.y = Math.round(bannerH + extraY + (landscape ? 2 : 5) * s);
    muteBtn.eventMode = 'static';
    muteBtn.cursor = 'pointer';
    muteBtn.on('pointertap', () => this.toggleSound());
    this.menuContainer.addChild(muteBtn);
    const curMapIdx = this.selectedMapIndex || 0;
    const curMap = CAMPAIGN_MAPS[curMapIdx] || CAMPAIGN_MAPS[0];
    const mapBtn = new Container();
    const mapBtnW = Math.round(132 * s), mapBtnH = Math.round(22 * s);
    const mapBg = new Graphics();
    mapBg.roundRect(0, 0, mapBtnW, mapBtnH, 4)
      .fill({ color:0x16202b, alpha:0.95 })
      .stroke({ color:0xf5c84c, width:1.2, alpha:0.85 });
    mapBtn.addChild(mapBg);
    const thumbIdx = (curMapIdx * 2) % 9;
    if (this.stageTextures?.[thumbIdx]) {
      const mThumb = new Sprite(this.stageTextures[thumbIdx]);
      mThumb.x = Math.round(3 * s);
      mThumb.y = Math.round(3 * s);
      mThumb.width = Math.round(26 * s);
      mThumb.height = Math.round(16 * s);
      mapBtn.addChild(mThumb);
    }
    const mapTxt = new Text({
      text: `C${curMapIdx + 1}/${CAMPAIGN_MAPS.length}: ${curMap.short}`,
      style: new TextStyle({ fill:0xfff3c4, fontSize:Math.round(8 * s), fontFamily:'monospace', fontWeight:'bold' }),
    });
    mapTxt.anchor.set(0, 0.5);
    mapTxt.x = Math.round(33 * s);
    mapTxt.y = Math.round(mapBtnH / 2);
    mapBtn.addChild(mapTxt);
    mapBtn.x = gridX;
    mapBtn.y = Math.round(bannerH + extraY + (landscape ? 2 : 5) * s);
    mapBtn.eventMode = 'static';
    mapBtn.cursor = 'pointer';
    mapBtn.on('pointertap', () => this.cycleMap());
    this.menuContainer.addChild(mapBtn);
    const seasonModes = ['auto', 'spring', 'summer', 'autumn', 'winter'];
    const curMode = this.selectedSeasonMode || 'auto';
    const seasonColors = { auto: 0x9ec5e8, spring: 0xffb3c6, summer: 0xffe066, autumn: 0xff9b54, winter: 0xbae6fd };
    const seasonBtn = new Container();
    const seasonBtnW = Math.round(112 * s), seasonBtnH = Math.round(22 * s);
    const seasonBg = new Graphics();
    seasonBg.roundRect(0, 0, seasonBtnW, seasonBtnH, 4)
      .fill({ color: 0x16202b, alpha: 0.95 })
      .stroke({ color: seasonColors[curMode] || 0x9ec5e8, width: 1.2, alpha: 0.85 });
    seasonBtn.addChild(seasonBg);
    const seasonTxt = new Text({
      text: `SEASON: ${curMode.toUpperCase()}`,
      style: new TextStyle({ fill: seasonColors[curMode] || 0xfff3c4, fontSize: Math.round(8.5 * s), fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    seasonTxt.anchor.set(0.5);
    seasonTxt.x = Math.round(seasonBtnW / 2);
    seasonTxt.y = Math.round(seasonBtnH / 2);
    seasonBtn.addChild(seasonTxt);
    seasonBtn.x = Math.round((W - seasonBtnW) / 2);
    seasonBtn.y = Math.round(bannerH + extraY + (landscape ? 2 : 5) * s);
    seasonBtn.eventMode = 'static';
    seasonBtn.cursor = 'pointer';
    seasonBtn.on('pointertap', () => {
      this.sfx.unlock();
      const idx = seasonModes.indexOf(this.selectedSeasonMode || 'auto');
      this.selectedSeasonMode = seasonModes[(idx + 1) % seasonModes.length];
      this.sfx.play('select');
      this.buildMenu();
    });
    this.menuContainer.addChild(seasonBtn);

    const section = new Text({
      text:'1. CHOOSE YOUR WARRIOR',
      style: new TextStyle({ fill:0xe7e2d2, fontSize:Math.round((landscape ? 10 : 11) * s), fontFamily:'monospace', fontWeight:'bold', letterSpacing:1.1 }),
    });
    section.anchor.set(0.5);
    section.x = Math.round(W / 2);
    section.y = Math.round(bannerH + extraY + (landscape ? 12 : 34) * s);
    this.menuContainer.addChild(section);

    const portraitW = Math.round(46 * s);
    const thumbScale = s >= 1.2 ? 0.96 : 0.82;

    HEROES.forEach((h, i) => {
      const bx = gridX + (i % cols) * (cardW + gap);
      const by = gridY + Math.floor(i / cols) * (cardH + gap);
      const selected = h.id === this.selectedHero.id;
      const btn = new Container();

      const shadow = new Graphics();
      shadow.roundRect(3, 5, cardW, cardH, 4).fill({ color:0x000000, alpha:0.48 });
      btn.addChild(shadow);

      const panel = new Graphics();
      panel.roundRect(0, 0, cardW, cardH, 4)
        .fill({ color:selected ? 0x24313d : 0x131920, alpha:0.98 })
        .stroke({ color:selected ? 0xf5c84c : 0x2d3844, width:selected ? 2.5 : 1, alpha:selected ? 1 : 0.85 });
      if (selected) {
        panel.roundRect(2, 2, cardW - 4, cardH - 4, 3)
          .stroke({ color:0xffe89e, width:1, alpha:0.45 });
      }
      panel.rect(0, 0, 5, cardH).fill({ color:h.color, alpha:selected ? 1 : 0.85 });
      btn.addChild(panel);

      const portrait = new Graphics();
      portrait.roundRect(8, 8, portraitW, cardH - 16, 4)
        .fill({ color:selected ? 0x101922 : 0x090f15, alpha:0.9 })
        .stroke({ color:selected ? 0xf5c84c : 0x3b4754, width:1, alpha:selected ? 0.9 : 0.5 });
      btn.addChild(portrait);

      const thumb = new Sprite(this.heroFrames[h.id][0][0]);
      thumb.anchor.set(0.5, 0.6);
      thumb.scale.set(thumbScale);
      thumb.x = Math.round(8 + portraitW / 2);
      thumb.y = Math.round(8 + (cardH - (selected ? 24 : 16)) / 2);
      btn.addChild(thumb);

      const textX = Math.round(14 + portraitW);
      const maxTextW = cardW - textX - 8;
      const name = new Text({
        text:h.name.toUpperCase(),
        style: new TextStyle({ fill:selected ? 0xfff3c4 : 0xffffff, fontSize:Math.round((landscape ? 10 : 11) * s), fontFamily:'monospace', fontWeight:'bold', letterSpacing:0.2 }),
      });
      if (name.width > maxTextW) {
        name.scale.set(maxTextW / name.width);
      }
      name.x = textX; name.y = Math.round(8 * s);
      btn.addChild(name);

      const desc = new Text({
        text:h.desc,
        style: new TextStyle({ fill:selected ? 0xd8e1ea : 0xaeb8c2, fontSize:Math.round(9 * s), fontFamily:'monospace', wordWrap:true, wordWrapWidth:maxTextW, breakWords:true }),
      });
      desc.x = textX; desc.y = Math.round(24 * s);
      btn.addChild(desc);

      const stats = new Text({
        text:`HP ${h.hp}  SPD ${h.speed.toFixed(1)}`,
        style: new TextStyle({ fill:selected ? 0xf5c84c : 0xbac6d2, fontSize:Math.round(9 * s), fontFamily:'monospace', fontWeight:'bold' }),
      });
      stats.x = textX; stats.y = Math.round(cardH - 19 * s);
      btn.addChild(stats);

      if (selected) {
        const badgeW = Math.round(38 * s);
        const badgeH = Math.round(11 * s);
        const bxBadge = Math.round(8 + (portraitW - badgeW) / 2);
        const byBadge = Math.round(cardH - badgeH - 10);
        const badge = new Graphics();
        badge.roundRect(bxBadge, byBadge, badgeW, badgeH, 2)
          .fill(0xf5c84c);
        btn.addChild(badge);
        const marker = new Text({
          text:'PICK',
          style:new TextStyle({ fill:0x141008, fontSize:Math.round(8 * s), fontFamily:'monospace', fontWeight:'bold' }),
        });
        marker.anchor.set(0.5);
        marker.x = Math.round(bxBadge + badgeW / 2);
        marker.y = Math.round(byBadge + badgeH / 2);
        btn.addChild(marker);
      }

      btn.x = bx; btn.y = by;
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointertap', () => this.selectHero(h));
      this.menuContainer.addChild(btn);
    });

    const gridBottom = gridY + rows * cardH + (rows - 1) * gap;

    const perkHeader = new Text({
      text:'2. CHOOSE STARTING PERK (1 OF 3)',
      style: new TextStyle({ fill:0xe7e2d2, fontSize:Math.round((landscape ? 10 : 11) * s), fontFamily:'monospace', fontWeight:'bold', letterSpacing:1.0 }),
    });
    perkHeader.anchor.set(0.5);
    perkHeader.x = Math.round(W / 2);
    perkHeader.y = Math.round(gridBottom + (landscape ? 12 : 16) * s);
    this.menuContainer.addChild(perkHeader);

    const perkY = Math.round(gridBottom + (landscape ? 24 : 30) * s);
    const perkW = Math.floor((totalGridW - gap * 2) / 3);

    STARTING_PERKS.forEach((pk, idx) => {
      const px = gridX + idx * (perkW + gap);
      const isSel = this.selectedPerk?.id === pk.id;
      const pBtn = new Container();

      const pCard = new Graphics();
      pCard.roundRect(2, 4, perkW, perkH, 4).fill({ color:0x000000, alpha:0.42 });
      pCard.roundRect(0, 0, perkW, perkH, 4)
        .fill({ color:isSel ? 0x24313d : 0x131920, alpha:0.98 })
        .stroke({ color:isSel ? 0xf5c84c : 0x2d3844, width:isSel ? 2.2 : 1, alpha:isSel ? 1 : 0.85 });
      pCard.rect(0, 0, 4, perkH).fill({ color:pk.color, alpha:isSel ? 1 : 0.8 });
      pBtn.addChild(pCard);

      if (this.iconTextures?.[pk.icon]) {
        const ic = new Sprite(this.iconTextures[pk.icon]);
        ic.x = 8;
        ic.y = Math.round(7 * s);
        pBtn.addChild(ic);
      }

      const pTitle = new Text({
        text: pk.short,
        style: new TextStyle({ fill:isSel ? 0xfff3c4 : 0xffffff, fontSize:Math.round(10 * s), fontFamily:'monospace', fontWeight:'bold' }),
      });
      pTitle.x = 27;
      pTitle.y = Math.round(8 * s);
      pBtn.addChild(pTitle);

      if (isSel) {
        const star = new Text({
          text: '★',
          style: new TextStyle({ fill:0xf5c84c, fontSize:Math.round(10 * s), fontFamily:'monospace', fontWeight:'bold' }),
        });
        star.anchor.set(1, 0);
        star.x = perkW - 6;
        star.y = Math.round(6 * s);
        pBtn.addChild(star);
      }

      const pDesc = new Text({
        text: landscape ? pk.desc : pk.lines,
        style: new TextStyle({
          fill: isSel ? 0xe5edf5 : 0xb2beca,
          fontSize: Math.round((landscape ? 9 : 8.5) * s),
          fontFamily: 'monospace',
          lineHeight: Math.round(12 * s),
        }),
      });
      pDesc.x = landscape ? 27 : 8;
      pDesc.y = Math.round((landscape ? 25 : 27) * s);
      pBtn.addChild(pDesc);

      pBtn.x = px;
      pBtn.y = perkY;
      pBtn.eventMode = 'static';
      pBtn.cursor = 'pointer';
      pBtn.on('pointertap', () => this.selectPerk(pk));
      this.menuContainer.addChild(pBtn);
    });

    const perkBottom = perkY + perkH;
    const deployW = Math.min(Math.round(272 * s), totalGridW);
    const deployY = Math.round(landscape ? Math.min(H - deployH - 18, perkBottom + 10 * s) : perkBottom + 14 * s);
    const deploy = new Container();
    const deployShadow = new Graphics();
    deployShadow.roundRect(3, 5, deployW, deployH, 4).fill({ color:0x000000, alpha:0.5 });
    deploy.addChild(deployShadow);
    const deployPanel = new Graphics();
    deployPanel.roundRect(0, 0, deployW, deployH, 4).fill(0xe0b64d).stroke({ color:0xffe7a1, width:2, alpha:0.95 });
    deploy.addChild(deployPanel);
    const deployText = new Text({
      text:`DEPLOY ${this.selectedHero.name.toUpperCase()}`,
      style:new TextStyle({ fill:0x18130b, fontSize:Math.round((landscape ? 12 : 13) * s), fontFamily:'monospace', fontWeight:'bold', letterSpacing:0.5 }),
    });
    deployText.anchor.set(0.5);
    deployText.x = Math.round(deployW / 2); deployText.y = Math.round(deployH * 0.36);
    deploy.addChild(deployText);
    const deploySub = new Text({
      text:`PERK: ${this.selectedPerk.name.toUpperCase()}`,
      style:new TextStyle({ fill:0x33260e, fontSize:Math.round(9 * s), fontFamily:'monospace', fontWeight:'bold', letterSpacing:0.3 }),
    });
    deploySub.anchor.set(0.5);
    deploySub.x = Math.round(deployW / 2); deploySub.y = Math.round(deployH * 0.72);
    deploy.addChild(deploySub);
    deploy.x = Math.round((W - deployW) / 2); deploy.y = deployY;
    deploy.eventMode = 'static';
    deploy.cursor = 'pointer';
    deploy.on('pointertap', () => this.startRun(this.selectedHero, this.selectedPerk));
    this.menuContainer.addChild(deploy);

    if (!landscape) {
      const hint = new Text({
        text:'SELECT WARRIOR & PERK  •  TAP DEPLOY TO BEGIN',
        style:new TextStyle({ fill:0x9aa6b4, fontSize:Math.round(9 * s), fontFamily:'monospace', letterSpacing:0.5 }),
      });
      hint.anchor.set(0.5);
      hint.x = Math.round(W / 2);
      hint.y = Math.round(Math.min(H - bottomSafe, deployY + deployH + 22 * s));
      this.menuContainer.addChild(hint);
    }
  }

  selectHero(hero) {
    this.sfx.unlock();
    if (this.selectedHero.id === hero.id) return;
    this.selectedHero = hero;
    this.sfx.play('select');
    this.buildMenu();
  }

  selectPerk(perk) {
    this.sfx.unlock();
    if (this.selectedPerk?.id === perk.id) return;
    this.selectedPerk = perk;
    this.sfx.play('select');
    this.buildMenu();
  }

  loadCampaignProgress() {
    try {
      const raw = window.localStorage?.getItem('3k-survivors-campaign-save-v1');
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return false;
      const maxCampaign = CAMPAIGN_MAPS.length - 1;
      const maxOrder = CAMPAIGN_MAPS.length * 10 - 1;
      this.unlockedCampaignIndex = clamp(Number(data.unlockedCampaignIndex) || 0, 0, maxCampaign);
      this.unlockedStageOrder = clamp(Number(data.unlockedStageOrder) || (this.unlockedCampaignIndex * 10), 0, maxOrder);
      if (Array.isArray(data.clearedStages)) {
        this.clearedStages = new Set(data.clearedStages.map((n) => Number(n)).filter((n) => n >= 0 && n <= maxOrder));
      }
      this.selectedMapIndex = clamp(Number(data.selectedMapIndex ?? this.unlockedCampaignIndex) || 0, 0, maxCampaign);
      this.viewingCampaignIndex = this.selectedMapIndex;
      this.selectedCheckpointOrder = this.unlockedStageOrder;
      this.lastAutoSavedCampaign = data.lastCompletedCampaign ?? null;
      return true;
    } catch {
      return false;
    }
  }

  saveCampaignProgress(completedCampaignIdx = null) {
    try {
      if (completedCampaignIdx !== null) {
        this.lastAutoSavedCampaign = completedCampaignIdx;
      }
      const payload = {
        version: 1,
        unlockedCampaignIndex: this.unlockedCampaignIndex || 0,
        unlockedStageOrder: this.unlockedStageOrder || 0,
        clearedStages: [...(this.clearedStages || [])],
        selectedMapIndex: this.selectedMapIndex || 0,
        lastCompletedCampaign: this.lastAutoSavedCampaign,
        savedAt: new Date().toISOString(),
      };
      window.localStorage?.setItem('3k-survivors-campaign-save-v1', JSON.stringify(payload));
      return payload;
    } catch {
      return null;
    }
  }

  cycleMap() {
    this.sfx.unlock();
    const maxSelectable = Math.max(0, this.unlockedCampaignIndex || 0);
    this.selectedMapIndex = maxSelectable > 0
      ? ((this.selectedMapIndex || 0) + 1) % (maxSelectable + 1)
      : ((this.selectedMapIndex || 0) + 1) % CAMPAIGN_MAPS.length;
    this.sfx.play('select');
    this.buildMenu();
  }
  getStageSpec() {
    const map = CAMPAIGN_MAPS[this.mapIndex] || CAMPAIGN_MAPS[0];
    const stage = map.levels[this.stageIndex] || map.levels[0];
    return {
      map,
      stage,
      mapNum: this.mapIndex + 1,
      levelNum: this.stageIndex + 1,
      totalDuration: stage.waves * stage.waveDuration,
    };
  }

  applyMapTheme() {
    const { map, stage } = this.getStageSpec();
    const seasonId = this.selectedSeasonMode && this.selectedSeasonMode !== 'auto'
      ? this.selectedSeasonMode
      : (stage.season || 'spring');
    this.activeSeason = SEASONS[seasonId] ? seasonId : 'spring';
    const sSpec = SEASONS[this.activeSeason] || SEASONS.spring;
    if (this.appEl) {
      this.appEl.style.backgroundColor = this.selectedSeasonMode !== 'auto'
        ? sSpec.bgColor
        : (stage.bgColor || sSpec.bgColor || map.bgColor || '#263820');
      this.appEl.style.backgroundBlendMode = 'overlay';
      this.appEl.style.filter = 'none';
    }
    if (this.sfx) {
      this.sfx.playBgm(map.bgm || map.id);
    }
  }

  setSeason(seasonId = 'spring') {
    if (!SEASONS[seasonId]) return;
    this.selectedSeasonMode = seasonId;
    this.activeSeason = seasonId;
    if (this.appEl) {
      this.appEl.style.backgroundColor = SEASONS[seasonId].bgColor;
      this.appEl.style.backgroundBlendMode = 'overlay';
      this.appEl.style.filter = 'none';
    }
    this.applySeasonPropTints();
    this.setWeather(this.activeWeather || 'clear');
    this.recomputeStats();
  }

  applySeasonPropTints() {
    const sMap = this.propTextures?.[this.activeSeason] || this.propTextures;
    for (const pr of this.props) {
      if (sMap?.[pr.kind]) {
        pr.sprite.texture = sMap[pr.kind];
      }
      pr.sprite.tint = 0xffffff;
    }
  }
  startRun(hero, perk = this.selectedPerk, mapIndex = this.selectedMapIndex) {
    this.sfx.unlock();
    this.sfx.play('start');
    this.hero = hero;
    this.perk = perk || this.selectedPerk || STARTING_PERKS[0];
    this.mapIndex = mapIndex ?? this.selectedMapIndex ?? 0;
    this.stageIndex = 0;
    this.unlockedStageOrder = Math.max(this.unlockedStageOrder || 0, this.mapIndex * 10);
    this.unlockedCampaignIndex = Math.max(this.unlockedCampaignIndex || 0, this.mapIndex);
    this.selectedCheckpointOrder = this.mapIndex * 10;
    this.viewingCampaignIndex = this.mapIndex;
    this.menuContainer.visible = false;
    if (this.campaignMapContainer) this.campaignMapContainer.visible = false;
    if (this.gameOverContainer) this.gameOverContainer.visible = false;
    this.resetRun();
    this.state = 'playing';
    this.buildHud();
  }
  resetRun() {
    // clear world
    for (const e of this.enemies) this.enemyPool.release(e);
    this.enemies.length = 0;
    for (const p of this.projectiles) this.projPool.release(p);
    this.projectiles.length = 0;
    for (const g of this.gems) this.gemPool.release(g);
    this.gems.length = 0;
    for (const it of this.items) this.itemPool.release(it);
    this.items.length = 0;
    for (const c of this.chests) { c.sprite.destroy(); }
    this.chests.length = 0;
    for (const pt of this.particles) {
      this.releaseParticle(pt);
    }
    this.particles.length = 0;
    for (const pt of this.pets) {
      if (pt.sprite) pt.sprite.destroy();
      if (pt.shadow) pt.shadow.destroy();
    }
    this.pets.length = 0;

    this.time = 0;
    this.itemTimer = 14;
    this.stageProgress = 0;
    this.currentWave = 1;
    this.finalWaveSpawned = false;
    this.stageBoss = null;
    this.kills = 0;
    this.gold = 0;
    this.xp = 0;
    this.level = 1;
    this.xpNext = LEVEL_XP(1);
    this.applyMapTheme();
    const w = WEAPONS[hero_weapon(this.hero)];
    this.weapons = [{ id: this.hero.weapon, level:1, data: w, evo:false }];
    this.passives = {};

    // player
    if (this.playerSprite) this.playerSprite.destroy();
    if (this.playerShadow) this.playerShadow.destroy();
    this.playerShadow = new Graphics();
    this.playerShadow.ellipse(0, 14, 14, 5).fill({ color:0x000000, alpha:0.38 });
    this.playerLayer.addChild(this.playerShadow);
    const directions = this.heroFrames[this.hero.id];
    this.playerSprite = new AnimatedSprite({
      textures: directions[0],
      animationSpeed: 0.16,
      autoPlay: false,
      autoUpdate: false,
      updateAnchor: false,
    });
    this.playerSprite.anchor.set(0.5, 0.625);
    this.playerSprite.scale.set(1.05);
    this.playerLayer.addChild(this.playerSprite);
    const maxHp = this.hero.hp + (this.perk?.hpBonus || 0);
    this.player = {
      x:0, y:0, vx:0, vy:0, hp:maxHp, maxHp,
      speed: 180 * this.hero.speed, armor:0, dmgMul:1, cdMul:1, areaMul:1, xpMul:1, speedMul:1,
      invuln:0, level:this.level, direction:'down', moving:false,
      attackTimer:0, attackDuration:0.26, attackDirection:'down',
    };
    this.recomputeStats();
    this._loadoutDirty = true;
    this.camX = 0; this.camY = 0;
    this.setupProps();
    const heroPetMap = {
      guanyu: 'redhare',
      lubu: 'redhare',
      zhangfei: 'white_tiger',
      sunshangxiang: 'white_tiger',
      zhaoyun: 'vermilion',
      zhugeliang: 'qilin',
    };
    this.summonPet(heroPetMap[this.hero.id] || 'redhare');
    this.spawnItem('heart', -110, -75);
    this.spawnItem('bomb', 120, -65);
    this.startWave(1);
  }

  setupProps() {
    if (!this.propTextures) return;
    const { map, stage } = this.getStageSpec();
    const propOrder = stage.propOrder || map.propOrder || [
      'grass', 'tree', 'rock', 'grass', 'pine', 'mountain',
      'rock', 'grass', 'tree', 'banner', 'pine', 'grass',
    ];
    const pattern = stage.layoutPattern || 'glade';
    const solidRadii = {
      tree: 17, pine: 15, rock: 17, mountain: 25,
      house: 24, watchtower: 22, castle: 28, tent: 21,
    };
    const propScales = {
      castle: 1.75, watchtower: 1.6, house: 1.55,
      mountain: 1.5, tree: 1.5, pine: 1.5, tent: 1.45,
      rock: 1.25, banner: 1.25, grass: 1.0,
    };
    if (this.props.length === 0) {
      const cols = 8, rows = 6;
      const span = 1600;
      const cellW = span / cols, cellH = span / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const kind = propOrder[(idx * 7 + r * 3) % propOrder.length];
          const tex = this.propTextures[kind] || this.propTextures.tree;
          const sprite = new Sprite(tex);
          sprite.anchor.set(0.5, 0.75);
          sprite.scale.set(propScales[kind] || 1.0);
          this.propLayer.addChild(sprite);
          const radius = solidRadii[kind] || 0;
          this.props.push({ kind, solid: radius > 0, radius, x: 0, y: 0, cellW, cellH, idx, r, c, sprite });
        }
      }
    } else {
      for (const pr of this.props) {
        const kind = propOrder[(pr.idx * 7 + pr.r * 3) % propOrder.length];
        pr.kind = kind;
        pr.radius = solidRadii[kind] || 0;
        pr.solid = pr.radius > 0;
        pr.sprite.texture = this.propTextures[kind] || this.propTextures.tree;
        pr.sprite.scale.set(propScales[kind] || 1.0);
      }
    }
    const half = 800;
    const cx = this.camX || 0, cy = this.camY || 0;
    for (const pr of this.props) {
      let x, y;
      if (pattern === 'ring') {
        const ringIdx = pr.idx % 16;
        const tier = Math.floor(pr.idx / 16);
        const ang = (ringIdx / 16) * Math.PI * 2 + tier * 0.22;
        const rad = 210 + tier * 215 + ((pr.idx * 29) % 45);
        x = cx + Math.cos(ang) * rad;
        y = cy + Math.sin(ang) * rad;
      } else if (pattern === 'corridor') {
        const lane = (pr.r % 2 === 0 ? -1 : 1) * (135 + Math.floor(pr.r / 2) * 185);
        const along = (pr.c - 3.5) * 195 + ((pr.idx * 31) % 36 - 18);
        x = cx + along;
        y = cy + lane;
      } else if (pattern === 'fortress') {
        const gx = (pr.c - 3.5) * 185 + ((pr.r % 2) * 42 - 21);
        const gy = (pr.r - 2.5) * 215 + ((pr.c % 2) * 36 - 18);
        x = cx + gx;
        y = cy + gy;
      } else {
        const jx = (((pr.idx * 73 + 19) % 97) / 97 - 0.5) * pr.cellW * 0.72;
        const jy = (((pr.idx * 41 + 53) % 89) / 89 - 0.5) * pr.cellH * 0.72;
        x = cx - half + (pr.c + 0.5) * pr.cellW + jx;
        y = cy - half + (pr.r + 0.5) * pr.cellH + jy;
      }
      if (Math.hypot(x - cx, y - cy) < 115) {
        x += x >= cx ? 125 : -125;
      }
      pr.x = Math.round(x);
      pr.y = Math.round(y);
      pr.sprite.x = pr.x;
      pr.sprite.y = pr.y;
    }
    if (this.player) {
      this.resolvePropCollisions(this.player, 12);
    }
    this.applyMapTheme();
    this.applySeasonPropTints();
    this.setWeather(stage.weather || 'clear');
  }

  setupWeather() {
    if (this.weatherDrops.length > 0) return;
    const tex = this.effectTextures?.spark || this.effectTextures?.impact;
    if (!tex) return;
    for (let i = 0; i < 56; i++) {
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.weatherLayer.addChild(sprite);
      this.weatherDrops.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        speedMul: 0.8 + (i % 7) * 0.08,
        phase: i * 0.47,
        sprite,
      });
    }
  }

  setWeather(weatherId = 'clear') {
    this.setupWeather();
    this.activeWeather = WEATHER_TYPES[weatherId] ? weatherId : 'clear';
    this.lightningTimer = 6.5 + Math.random() * 3.5;
    const sSpec = SEASONS[this.activeSeason] || SEASONS.spring;
    const count = this.activeWeather === 'clear' ? 36 : (this.activeWeather === 'embers' ? 48 : 56);
    for (let i = 0; i < this.weatherDrops.length; i++) {
      const d = this.weatherDrops[i];
      const active = i < count;
      d.sprite.visible = active;
      if (!active) continue;
      d.x = ((i * 73) % 100) * 0.01 * this.W;
      d.y = ((i * 41) % 100) * 0.01 * this.H;
      const isSeasonalMote = this.activeWeather === 'clear' || i % 3 === 0;
      if (isSeasonalMote && this.activeWeather === 'clear') {
        d.sprite.tint = i % 2 === 0 ? sSpec.particleCol1 : sSpec.particleCol2;
        if (this.activeSeason === 'autumn') {
          d.sprite.scale.set(0.42, 0.28);
        } else if (this.activeSeason === 'spring') {
          d.sprite.scale.set(0.36, 0.26);
        } else {
          d.sprite.scale.set(0.34, 0.34);
        }
        d.sprite.rotation = (i % 6) * 0.5;
        d.sprite.alpha = 0.78;
      } else if (this.activeWeather === 'rain' || this.activeWeather === 'storm') {
        d.sprite.tint = this.activeWeather === 'storm' ? 0xa5c8ff : 0x8ecaff;
        d.sprite.scale.set(this.activeWeather === 'storm' ? 1.15 : 0.95, 0.22);
        d.sprite.rotation = 1.24;
        d.sprite.alpha = 0.68;
      } else if (this.activeWeather === 'snow') {
        d.sprite.tint = i % 2 === 0 ? 0xffffff : 0xdbeafe;
        d.sprite.scale.set(0.36, 0.36);
        d.sprite.rotation = 0;
        d.sprite.alpha = 0.82;
      } else if (this.activeWeather === 'embers') {
        d.sprite.tint = i % 2 === 0 ? 0xff8552 : 0xffe066;
        d.sprite.scale.set(0.38, 0.38);
        d.sprite.rotation = 0.4;
        d.sprite.alpha = 0.85;
      } else if (this.activeWeather === 'sandstorm') {
        d.sprite.tint = i % 2 === 0 ? 0xe6a964 : 0xd4a373;
        d.sprite.scale.set(1.05, 0.26);
        d.sprite.rotation = 0.14;
        d.sprite.alpha = 0.62;
      } else {
        d.sprite.tint = i % 2 === 0 ? sSpec.particleCol1 : sSpec.particleCol2;
        d.sprite.scale.set(0.34, 0.28);
        d.sprite.rotation = 0.3;
        d.sprite.alpha = 0.72;
      }
    }
  }

  updateWeather(dt) {
    if (!this.weatherDrops.length) return;
    const W = this.W, H = this.H;
    const wType = this.activeWeather || 'clear';
    if (wType === 'storm') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 7 + Math.random() * 4;
        this.flashScreen(0xdbeafe, 0.22);
        this.shake = Math.max(this.shake, 7);
      }
    }
    for (let i = 0; i < this.weatherDrops.length; i++) {
      const d = this.weatherDrops[i];
      if (!d.sprite.visible) continue;
      const sm = d.speedMul;
      if (wType === 'rain' || wType === 'storm') {
        const vy = (wType === 'storm' ? 700 : 580) * sm;
        const vx = (wType === 'storm' ? -200 : -155) * sm;
        d.x += vx * dt;
        d.y += vy * dt;
      } else if (wType === 'snow') {
        d.x += Math.sin(this.time * 2.2 + d.phase) * 42 * dt;
        d.y += 105 * sm * dt;
        d.sprite.rotation += 1.2 * dt;
      } else if (wType === 'embers') {
        d.x += (48 + Math.sin(this.time * 3 + d.phase) * 28) * dt;
        d.y -= 135 * sm * dt;
        d.sprite.alpha = 0.55 + Math.sin(this.time * 8 + d.phase) * 0.32;
      } else if (wType === 'sandstorm') {
        d.x += 580 * sm * dt;
        d.y += (85 + Math.sin(this.time * 4 + d.phase) * 25) * dt;
      } else {
        if (this.activeSeason === 'summer') {
          d.x += Math.sin(this.time * 2.5 + d.phase) * 32 * dt;
          d.y -= 42 * sm * dt;
          d.sprite.alpha = 0.45 + Math.sin(this.time * 6 + d.phase) * 0.35;
        } else if (this.activeSeason === 'autumn') {
          d.x += (68 + Math.sin(this.time * 2.4 + d.phase) * 35) * dt;
          d.y += 92 * sm * dt;
          d.sprite.rotation += 2.2 * dt;
        } else if (this.activeSeason === 'winter') {
          d.x += Math.sin(this.time * 2.0 + d.phase) * 38 * dt;
          d.y += 98 * sm * dt;
          d.sprite.rotation += 1.1 * dt;
        } else {
          d.x += (44 + Math.cos(this.time * 2.1 + d.phase) * 28) * dt;
          d.y += 64 * sm * dt;
          d.sprite.rotation += 1.6 * dt;
        }
      }
      if (d.x < -16) d.x += W + 32;
      else if (d.x > W + 16) d.x -= W + 32;
      if (d.y < -16) d.y += H + 32;
      else if (d.y > H + 16) d.y -= H + 32;
      d.sprite.x = Math.round(d.x);
      d.sprite.y = Math.round(d.y);
    }
  }

  resolvePropCollisions(entity, entityRadius = 12) {
    for (const pr of this.props) {
      if (!pr.solid) continue;
      const cy = pr.y - 6;
      const dx = entity.x - pr.x;
      const dy = entity.y - cy;
      const minDist = entityRadius + pr.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 < minDist * minDist) {
        const d = Math.sqrt(d2) || 0.001;
        const overlap = minDist - d;
        const nx = d > 0.01 ? dx / d : 1;
        const ny = d > 0.01 ? dy / d : 0;
        entity.x += nx * overlap;
        entity.y += ny * overlap;
      }
    }
  }

  recomputeStats() {
    if (!this.player) return;
    const ps = this.passives;
    const pk = this.perk || {};
    const sSpec = SEASONS[this.activeSeason] || SEASONS.spring;
    const heroArmor = this.hero?.armor ?? 3;
    const heroDmgBonus = this.hero?.dmgBonus ?? 0.3;
    this.player.dmgMul = (1 + heroDmgBonus + (ps.might || 0) * PASSIVES.might.val) * (1 + (pk.dmgBonus || 0) + (sSpec.dmgBonus || 0));
    this.player.armor = heroArmor + (ps.armor || 0) * PASSIVES.armor.val + (pk.armorBonus || 0);
    this.player.speedMul = (1 + (ps.swiftness || 0) * PASSIVES.swiftness.val) * (1 + (pk.speedBonus || 0));
    this.player.cdMul = Math.pow(1 - PASSIVES.cooldown.val, ps.cooldown || 0) * (1 - (pk.cdBonus || 0)) * (1 - (sSpec.cdBonus || 0));
    this.player.areaMul = (1 + (ps.area || 0) * PASSIVES.area.val) * (1 + (pk.areaBonus || 0));
    this.player.xpMul = (1 + (ps.growth || 0) * PASSIVES.growth.val) * (1 + (pk.xpBonus || 0) + (sSpec.xpBonus || 0));
  }

  getWeaponStats(w) {
    const base = WEAPONS[w.id];
    const lvl = Math.max(1, w.level || 1);
    if (lvl >= 8 && !w.evo) {
      w.evo = true;
      w.evoId = base.evo;
    }
    const wd = w.evo ? EVOLUTIONS[w.evoId || base.evo] : null;
    const isMax = lvl >= 8 || Boolean(wd);
    const delta = lvl - 1;
    const p = this.player;
    const lvlDmgMul = 1 + delta * 0.15;
    const lvlAreaMul = 1 + delta * 0.08;
    const lvlCdMul = Math.max(0.65, 1 - delta * 0.05);
    const bonusCount = Math.floor(delta / 2);
    const bonusPierce = Math.floor(delta / 3);
    const dmg = base.dmg * lvlDmgMul * p.dmgMul * (wd ? wd.dmgMul : 1);
    const area = base.area * lvlAreaMul * p.areaMul * (wd ? wd.areaMul : 1);
    const cd = base.cd * lvlCdMul * p.cdMul * (wd ? wd.cdMul : 1);
    return { base, wd, isMax, lvl, delta, dmg, area, cd, bonusCount, bonusPierce };
  }

  buildHud() {
    if (this.hud) this.hud.destroy({ children:true });
    this.hud = new Container();
    this.uiLayer.addChild(this.hud);

    this.hudPanel = new Graphics();
    this.hud.addChild(this.hudPanel);

    this.hudHpBg = new Graphics();
    this.hud.addChild(this.hudHpBg);
    this.hudHp = new Graphics();
    this.hud.addChild(this.hudHp);

    this.hudXpBg = new Graphics();
    this.hud.addChild(this.hudXpBg);
    this.hudXp = new Graphics();
    this.hud.addChild(this.hudXp);
    this.hudWaveBg = new Graphics();
    this.hud.addChild(this.hudWaveBg);
    this.hudWaveFill = new Graphics();
    this.hud.addChild(this.hudWaveFill);
    this.hudWaveText = new Text({
      text: '',
      style: new TextStyle({ fill: 0xffffff, fontSize: 8.5, fontFamily: 'monospace', fontWeight: 'bold', stroke: { color: 0x06080c, width: 2 } }),
    });
    this.hudWaveText.anchor.set(0.5);
    this.hud.addChild(this.hudWaveText);

    this.hudText = new Text({ text:'', style: new TextStyle({ fill:0xf2eee2, fontSize:11, fontFamily:'monospace', fontWeight:'bold', stroke:{ color:0x090c12, width:2 } }) });
    this.hud.addChild(this.hudText);

    this.hudTime = new Text({ text:'0:00', style: new TextStyle({ fill:0xf2c75b, fontSize:14, fontFamily:'monospace', fontWeight:'bold', stroke:{ color:0x090c12, width:2 } }) });
    this.hud.addChild(this.hudTime);

    this.hudKills = new Text({ text:'K:0 · FOES:0', style: new TextStyle({ fill:0xc9d1da, fontSize:10, fontFamily:'monospace', fontWeight:'bold', stroke:{ color:0x090c12, width:2 } }) });
    this.hud.addChild(this.hudKills);
    this.hudPerk = new Text({ text:'', style: new TextStyle({ fill:0xf5c84c, fontSize:9.5, fontFamily:'monospace', fontWeight:'bold', stroke:{ color:0x090c12, width:2 } }) });
    this.hud.addChild(this.hudPerk);

    this.hudSlots = new Container();
    this.hud.addChild(this.hudSlots);
    this.hudSlotsBg = new Graphics();
    this.hudSlotsIcons = new Container();
    this.hudSlotsBadges = new Container();
    this.hudSlots.addChild(this.hudSlotsBg, this.hudSlotsIcons, this.hudSlotsBadges);
    this.hudSlotItems = Array.from({ length: 12 }, () => {
      const icon = new Sprite();
      icon.visible = false;
      this.hudSlotsIcons.addChild(icon);
      const badge = new Text({
        text: '',
        style: new TextStyle({ fill: 0xffffff, fontSize: 8.5, fontFamily: 'monospace', fontWeight: 'bold' }),
      });
      badge.anchor.set(0.5);
      badge.visible = false;
      this.hudSlotsBadges.addChild(badge);
      return { icon, badge };
    });
    this.hudMuteBtn = new Container();
    this.hudMuteBg = new Graphics();
    this.hudMuteIcon = new Sprite();
    this.hudMuteBtn.addChild(this.hudMuteBg, this.hudMuteIcon);
    this.hudMuteBtn.eventMode = 'static';
    this.hudMuteBtn.cursor = 'pointer';
    this.hudMuteBtn.on('pointertap', (e) => {
      e.stopPropagation?.();
      this.toggleSound();
    });
    this.hudSlots.addChild(this.hudMuteBtn);

    // joystick base
    if (this.joyBase) this.joyBase.destroy();
    if (this.joyKnob) this.joyKnob.destroy();
    this.joyBase = new Graphics();
    this.joyKnob = new Graphics();
    this.uiLayer.addChild(this.joyBase);
    this.uiLayer.addChild(this.joyKnob);

    this._lastHpQuant = -1;
    this._lastXpQuant = -1;
    this._lastWaveQuant = -1;
    this._lastWaveBossMode = null;
    this._lastHudWaveText = '';
    this._lastHudText = '';
    this._lastHudTime = '';
    this._lastHudKills = '';
    this._lastHudPerk = '';
    this._joyWasActive = true;
    this._loadoutDirty = true;

    this.layoutHud();
    this.updateHud();
  }

  layoutHud() {
    this.computeLayoutMetrics();
    const W = this.W, H = this.H;
    const portrait = H > W;
    const hudTop = portrait ? 34 : 8;
    this.hudTop = hudTop;
    const hudW = Math.min(W - 16, Math.round(520 * (this.uiScale || 1)));
    const hudX = Math.round((W - hudW) / 2);
    this.hudX = hudX;
    this.hudW = hudW;

    const joyR = 52;
    if (!this.joyOrigin) {
      this.joyOrigin = { x: Math.round(W / 2), y: Math.round(H * 0.78), r: joyR };
    }
    if (!this.joystick.active) {
      this.joyBase.clear();
      this.joyKnob.clear();
    }

    this.hudPanel.clear();
    this.hudPanel.roundRect(hudX, hudTop, hudW, 92, 8)
      .fill({ color:0x070b10, alpha:0.86 })
      .stroke({ color:0x8f7a3e, width:1, alpha:0.55 });

    const barX = hudX + 10;
    const barW = hudW - 20;
    this.hudBarX = barX;
    this.hudBarW = barW;
    this.hudXpBg.clear();
    this.hudXpBg.roundRect(barX, hudTop + 6, barW, 7, 3).fill(0x151b29).stroke({ color:0xd4a017, width:1, alpha:0.75 });
    this.hudHpBg.clear();
    this.hudHpBg.roundRect(barX, hudTop + 18, Math.round(Math.min(136, barW * 0.42)), 6, 2).fill(0x2b1418);

    this.hudWaveBg.clear();
    this.hudWaveBg.roundRect(barX, hudTop + 29, barW, 11, 3)
      .fill(0x121824)
      .stroke({ color:0x607084, width:1, alpha:0.8 });
    for (let wTick = 1; wTick < 5; wTick++) {
      const tx = Math.round(barX + (barW * wTick) / 5);
      this.hudWaveBg.moveTo(tx, hudTop + 29).lineTo(tx, hudTop + 40).stroke({ color:0x607084, width:1, alpha:0.7 });
    }
    this.hudWaveText.x = Math.round(W / 2);
    this.hudWaveText.y = Math.round(hudTop + 34.5);

    this.hudText.x = barX; this.hudText.y = hudTop + 44;
    this.hudTime.anchor = { x:0.5, y: 0 };
    this.hudTime.x = Math.round(W / 2); this.hudTime.y = hudTop + 42;
    this.hudKills.anchor = { x:1, y: 0 };
    this.hudKills.x = barX + barW; this.hudKills.y = hudTop + 45;
    this.hudPerk.anchor = { x:1, y: 0 };
    this.hudPerk.x = barX + barW; this.hudPerk.y = hudTop + 16;
    this._lastHpQuant = -1;
    this._lastXpQuant = -1;
    this._lastWaveQuant = -1;
    this._loadoutDirty = true;
    this.renderHudSlots();
  }

  renderHudSlots() {
    if (!this.hudSlots || !this.hudSlotsBg) return;
    const hudTop = this.hudTop ?? (this.H > this.W ? 34 : 8);
    const slotY = hudTop + 62;
    const slotSize = 22;
    const step = 25;
    const groupGap = 10;
    const startX = (this.hudBarX ?? 18);
    const bg = this.hudSlotsBg;
    bg.clear();

    for (let i = 0; i < 6; i++) {
      const sx = startX + i * step;
      const item = this.hudSlotItems[i];
      const w = this.weapons[i];
      if (w) {
        const base = WEAPONS[w.id];
        const borderCol = w.evo ? 0xf5c84c : base.color;
        bg.rect(sx, slotY, slotSize, slotSize)
          .fill({ color:0x131d28, alpha:0.96 })
          .stroke({ color:borderCol, width:1.5, alpha:0.95 });
        if (this.iconTextures?.[w.id]) {
          item.icon.texture = this.iconTextures[w.id];
          item.icon.x = sx + 3;
          item.icon.y = slotY + 2;
          item.icon.visible = true;
        } else {
          item.icon.visible = false;
        }
        bg.rect(sx + slotSize - 10, slotY + slotSize - 10, 10, 10)
          .fill({ color:0x05080d, alpha:0.95 });
        const lbl = w.evo ? 'E' : `${w.level}`;
        if (item.badge.text !== lbl) item.badge.text = lbl;
        item.badge.tint = w.evo ? 0xffe066 : 0xffffff;
        item.badge.x = sx + slotSize - 5;
        item.badge.y = slotY + slotSize - 5;
        item.badge.visible = true;
      } else {
        bg.rect(sx, slotY, slotSize, slotSize)
          .fill({ color:0x0b1017, alpha:0.65 })
          .stroke({ color:0x24303c, width:1, alpha:0.65 });
        item.icon.visible = false;
        item.badge.visible = false;
      }
    }

    const rightItems = [
      ...this.pets.map((pt) => ({ id: pt.id, color: pt.spec.color, level: pt.level })),
      ...Object.keys(this.passives)
        .filter((k) => this.passives[k] > 0)
        .map((k) => ({ id: k, color: PASSIVES[k].color, level: this.passives[k] })),
    ];
    const passStartX = startX + 6 * step - (step - slotSize) + groupGap;
    for (let i = 0; i < 6; i++) {
      const sx = passStartX + i * step;
      const item = this.hudSlotItems[6 + i];
      const entry = rightItems[i];
      if (entry) {
        bg.rect(sx, slotY, slotSize, slotSize)
          .fill({ color:0x131d28, alpha:0.96 })
          .stroke({ color:entry.color, width:1.5, alpha:0.95 });
        if (this.iconTextures?.[entry.id]) {
          item.icon.texture = this.iconTextures[entry.id];
          item.icon.x = sx + 3;
          item.icon.y = slotY + 2;
          item.icon.visible = true;
        } else {
          item.icon.visible = false;
        }
        bg.rect(sx + slotSize - 10, slotY + slotSize - 10, 10, 10)
          .fill({ color:0x05080d, alpha:0.95 });
        const lbl = `${entry.level}`;
        if (item.badge.text !== lbl) item.badge.text = lbl;
        item.badge.tint = 0xffffff;
        item.badge.x = sx + slotSize - 5;
        item.badge.y = slotY + slotSize - 5;
        item.badge.visible = true;
      } else {
        bg.rect(sx, slotY, slotSize, slotSize)
          .fill({ color:0x0b1017, alpha:0.55 })
          .stroke({ color:0x202b36, width:1, alpha:0.55 });
        item.icon.visible = false;
        item.badge.visible = false;
      }
    }
    if (this.hudMuteBtn) {
      const mx = (this.hudBarX ?? 18) + (this.hudBarW ?? (this.W - 36)) - slotSize;
      this.hudMuteBtn.x = mx;
      this.hudMuteBtn.y = slotY;
      this.hudMuteBg.clear();
      this.hudMuteBg.rect(0, 0, slotSize, slotSize)
        .fill({ color:0x131d28, alpha:0.96 })
        .stroke({ color:this.sfx.enabled ? 0x6bffb0 : 0x52606e, width:1.3, alpha:0.9 });
      const iconKey = this.sfx.enabled ? 'sound_on' : 'sound_off';
      if (this.iconTextures?.[iconKey]) {
        this.hudMuteIcon.texture = this.iconTextures[iconKey];
        this.hudMuteIcon.x = 3;
        this.hudMuteIcon.y = 3;
      }
    }
    this._loadoutDirty = false;
  }

  setupInput() {
    const stage = this.app.stage;
    stage.eventMode = 'static';
    stage.hitArea = this.app.screen;

    const onTouchStart = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      // use first touch for joystick if on left half
      if (e.changedTouches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          this.handleTouchStart(touch);
        }
      } else {
        this.handleTouchStart(e);
      }
    };
    // Use pointer events
    this.app.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.app.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.app.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.app.canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));
  }

  onPointerDown(e) {
    this.sfx.unlock();
    const r = this.app.canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (this.W / r.width);
    const y = (e.clientY - r.top) * (this.H / r.height);
    this.rightTap = { x, y, t: performance.now() };
    if (this.state !== 'playing') return;
    const hudBottom = (this.hudTop ?? (this.H > this.W ? 34 : 8)) + 92;
    const inHud = y <= hudBottom && x >= (this.hudX ?? 8) && x <= (this.hudX ?? 8) + (this.hudW ?? (this.W - 16));
    if (!inHud && !this.joystick.active) {
      this.joystick.active = true;
      this.joystick.id = e.pointerId;
      this.joystick.originX = Math.round(x);
      this.joystick.originY = Math.round(y);
      this.joyOrigin = { x: this.joystick.originX, y: this.joystick.originY, r: 52 };
      this.joystick.curX = x;
      this.joystick.curY = y;
      this.joystick.x = 0;
      this.joystick.y = 0;
    }
  }
  onPointerMove(e) {
    if (!this.joystick.active || e.pointerId !== this.joystick.id) return;
    const r = this.app.canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (this.W / r.width);
    const y = (e.clientY - r.top) * (this.H / r.height);
    this.joystick.curX = x;
    this.joystick.curY = y;
    const dx = x - this.joystick.originX;
    const dy = y - this.joystick.originY;
    const d = Math.hypot(dx, dy);
    const maxR = 60;
    const cl = Math.min(d, maxR);
    const ang = Math.atan2(dy, dx);
    this.joystick.x = (Math.cos(ang) * cl) / maxR;
    this.joystick.y = (Math.sin(ang) * cl) / maxR;
  }
  onPointerUp(e) {
    if (this.joystick.active && e.pointerId === this.joystick.id) {
      this.joystick.active = false;
      this.joystick.id = null;
      this.joystick.x = 0;
      this.joystick.y = 0;
    }
  }

  tick(dt) {
    const curW = window.innerWidth || this.app.screen.width;
    const curH = window.innerHeight || this.app.screen.height;
    if (curW !== this.W || curH !== this.H) {
      this.applyViewportSize();
    }
    // dt is in frames (ticker.deltaTime, ~1 at 60fps). Convert to seconds
    const dtSec = dt / 60;
    if (this.state === 'playing') {
      this.updatePlaying(dtSec);
    }
    // fps tracking
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fpsSamples.push(this.frameCount);
      if (this.fpsSamples.length > 5) this.fpsSamples.shift();
      this.frameCount = 0;
      this.lastFpsTime = now;
      window.__fps = this.fpsSamples.length ? this.fpsSamples[this.fpsSamples.length-1] : 0;
    }
  }

  updatePlaying(dt) {
    if (dt <= 0 || dt > 0.1) dt = 1/60;
    this.time += dt;
    this.animTime += dt;
    this._floatTextThisFrame = 0;
    this.recomputeStats();
    const p = this.player;
    // movement
    let mx = this.joystick.x;
    let my = this.joystick.y;
    // keyboard fallback
    if (this.keys) {
      if (this.keys['ArrowLeft'] || this.keys['a']) mx -= 1;
      if (this.keys['ArrowRight'] || this.keys['d']) mx += 1;
      if (this.keys['ArrowUp'] || this.keys['w']) my -= 1;
      if (this.keys['ArrowDown'] || this.keys['s']) my += 1;
    }
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    p.moving = Math.hypot(mx, my) > 0.08;
    if (p.moving) {
      if (Math.abs(mx) >= Math.abs(my)) p.direction = mx < 0 ? 'left' : 'right';
      else p.direction = my < 0 ? 'up' : 'down';
    }
    const spd = p.speed * p.speedMul;
    p.vx = mx * spd;
    p.vy = my * spd;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    this.resolvePropCollisions(p, 12);
    // camera
    this.camX += (p.x - this.camX) * 0.15;
    this.camY += (p.y - this.camY) * 0.15;

    // world transform (integer-snapped with responsive worldScale & CSS-composited ground)
    const ws = this.worldScale || 1;
    this.world.scale.set(ws);
    let wx = this.W / 2 - this.camX * ws;
    let wy = this.H / 2 - this.camY * ws;
    if (this.shake > 0) {
      wx += (Math.random() - 0.5) * this.shake;
      wy += (Math.random() - 0.5) * this.shake;
      this.shake *= 0.82;
      if (this.shake < 0.15) this.shake = 0;
    }
    const rx = Math.round(wx);
    const ry = Math.round(wy);
    this.world.x = rx;
    this.world.y = ry;
    if (this.appEl) {
      this.appEl.style.backgroundPosition = `${rx}px ${ry}px`;
    }
    // update joystick knob visual only on active touch or state transition
    this.updateProps();
    if (this.joystick.active) {
      const kx = Math.round(this.joystick.originX + this.joystick.x * 52);
      const ky = Math.round(this.joystick.originY + this.joystick.y * 52);
      this.joyKnob.clear();
      this.joyKnob.circle(kx, ky, 22).fill({ color:0xffffff, alpha:0.24 }).stroke({ color:0xf5c84c, alpha:0.45, width:1.5 });
      this.joyBase.clear();
      this.joyBase.circle(this.joystick.originX, this.joystick.originY, 52).fill({ color:0xffffff, alpha:0.06 }).stroke({ color:0xffffff, alpha:0.2, width:1.5 });
      this._joyWasActive = true;
    } else if (this._joyWasActive) {
      this.joyKnob.clear();
      this.joyBase.clear();
      this._joyWasActive = false;
    }

    // spawner
    this.handleSpawns(dt);

    // weapons auto attack
    const curSeasonSpec = SEASONS[this.activeSeason];
    if (curSeasonSpec?.hpRegen && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + curSeasonSpec.hpRegen * dt);
    }
    this.handleWeapons(dt);
    if (p.attackTimer > 0) p.attackTimer = Math.max(0, p.attackTimer - dt);
    this.updatePets(dt);
    this.updateAndRenderOrbitWeapons(dt);

    // projectiles
    this.updateProjectiles(dt);

    // enemies
    this.updateEnemies(dt);

    // gems
    this.updateGems(dt);

    // chests
    this.updateChests(dt);

    // particles
    this.updateParticles(dt);
    this.updateWeather(dt);

    // collisions enemy vs player
    this.handlePlayerCollisions(dt);

    // Upgrades (weapons, armors/passives, pets) ONLY happen when all enemies of the wave are killed!
    // invuln
    if (p.invuln > 0) p.invuln -= dt;

    // render
    this.renderPlayer();
    this.renderPets();
    this.renderEnemies();
    this.renderProjectiles();
    this.renderGems();
    this.renderItems();
    this.renderChests();
    this.renderParticles();

    this.updateHud();
  }

  getActiveEnemyCount() {
    let count = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.active && e.hp > 0 && e.countsForWave !== false) count++;
    }
    return count;
  }

  startWave(waveNum = 1) {
    const { map, stage } = this.getStageSpec();
    this.currentWave = clamp(waveNum, 1, stage.waves);
    const isEarlyCampaign = this.mapIndex === 0;
    const waveCurve = isEarlyCampaign
      ? ([9, 13, 18, 24, 30][this.currentWave - 1] || 14)
      : ([14, 24, 36, 50, 68][this.currentWave - 1] || 20);
    this.waveTotalEnemies = Math.round(
      (waveCurve + this.stageIndex * (isEarlyCampaign ? 3 : 5) + this.mapIndex * 7) * Math.min(2.2, stage.spawnMul || 1),
    );
    this.waveSpawnedCount = 0;
    this.waveKills = 0;
    this.pendingNextWave = null;
    this.finalWaveSpawned = this.currentWave >= stage.waves;
    this.spawnTimer = isEarlyCampaign ? 0.35 : 0.2;
    this.birdFlockTimer = isEarlyCampaign
      ? Math.max(8.5, 14.0 - this.currentWave * 1.0)
      : Math.max(5.0, 10.0 - this.currentWave * 1.1);

    if (this.finalWaveSpawned) {
      const bossSpec = stage.levelBoss || map.boss;
      this.stageBoss = this.spawnMapBoss(map, stage, bossSpec);
      this.waveTotalEnemies++;
      this.waveSpawnedCount++;
      this.sfx.play('hurt');
      this.shake = 12;
      if (this.player) {
        this.showFloatText(this.player.x, this.player.y - 30, `WAVE 5/5 · BOSS: ${bossSpec.name.toUpperCase()}!`, 0xff5f5f);
      }
    } else if (this.currentWave > 1 && this.player) {
      this.sfx.play('select');
      this.showFloatText(this.player.x, this.player.y - 26, `WAVE ${this.currentWave}/${stage.waves} · HORDE SURGE!`, 0xf5c84c);
    }

    // Introduce Siege Catapults and Aerial Bird Flocks gently on early levels, ramping up in later campaigns
    const minCatapultWave = isEarlyCampaign ? (this.stageIndex >= 2 ? 3 : 4) : 2;
    if (this.currentWave >= minCatapultWave) {
      const catapultCount = isEarlyCampaign ? 1 : Math.min(3, Math.floor(this.currentWave / 2));
      for (let c = 0; c < catapultCount; c++) {
        if (this.waveSpawnedCount < this.waveTotalEnemies) {
          this.spawnEnemy('catapult');
          this.waveSpawnedCount++;
        }
      }
    }
    const minBirdWave = isEarlyCampaign ? 3 : 2;
    if (this.currentWave >= minBirdWave) {
      this.spawnBirdFlock(isEarlyCampaign ? 3 : (3 + Math.floor(this.currentWave / 2)));
    }
    // Rare Colossal Kaiju Godzilla Titan emergence (20% chance on Waves 3..5, or Wave 4+ in Campaign 1)
    const kaijuWaveMin = isEarlyCampaign ? 4 : 3;
    if (this.currentWave >= kaijuWaveMin && !this.enemies.some((e) => e.active && e.isKaiju) && Math.random() < 0.2) {
      this.spawnKaijuBoss();
      this.waveTotalEnemies++;
      this.waveSpawnedCount++;
    }

    const initBatch = Math.min(
      (isEarlyCampaign ? 4 : 7) + this.currentWave * (isEarlyCampaign ? 1 : 2),
      this.waveTotalEnemies - this.waveSpawnedCount,
    );
    for (let i = 0; i < initBatch; i++) {
      this.spawnEnemy();
      this.waveSpawnedCount++;
    }
    this.stageProgress = ((this.currentWave - 1) / stage.waves) * (stage.waves * stage.waveDuration);
  }

  onWaveCleared() {
    const { stage } = this.getStageSpec();
    // Auto-collect any remaining XP gems on the battlefield
    for (const g of this.gems) {
      if (g.active) {
        this.xp += g.val * (this.player?.xpMul || 1);
        g.active = false;
        this.gemPool.release(g);
      }
    }
    this.gems.length = 0;

    if (this.currentWave < stage.waves) {
      // Wave 1..4 cleared -> trigger Weapon / Armor / Pet Upgrade Modal!
      this.pendingNextWave = this.currentWave + 1;
      this.levelUp();
    } else {
      // Final Wave 5 + Boss cleared -> complete Level & auto-save Campaign Checkpoint!
      this.advanceStage();
    }
  }

  handleSpawns(dt) {
    const { map, stage } = this.getStageSpec();
    this.updateStageProgression(dt, map, stage);

    const isEarlyCampaign = this.mapIndex === 0;
    // Spawn remaining enemies of the current wave's finite horde (gentler in early levels, faster in later waves)
    if (this.waveSpawnedCount < this.waveTotalEnemies && this.enemies.length < 44) {
      this.spawnTimer = (this.spawnTimer || 0) - dt;
      if (this.spawnTimer <= 0) {
        const baseInterval = isEarlyCampaign
          ? Math.max(0.22, 0.58 - (this.currentWave - 1) * 0.06)
          : Math.max(0.06, 0.40 - (this.currentWave - 1) * 0.065);
        this.spawnTimer = Math.max(0.05, baseInterval / (stage.spawnMul || 1));
        const batch = Math.min(
          (isEarlyCampaign ? 2 : 3) + Math.floor(this.currentWave * (isEarlyCampaign ? 1 : 1.8)),
          this.waveTotalEnemies - this.waveSpawnedCount,
          48 - this.enemies.length,
        );
        for (let i = 0; i < batch; i++) {
          this.spawnEnemy();
          this.waveSpawnedCount++;
        }
      }
    }
    // Periodic V-formation Aerial Bird Flocks
    this.birdFlockTimer = (this.birdFlockTimer ?? 10.0) - dt;
    const allowBirdFlock = !isEarlyCampaign || this.currentWave >= 3;
    if (allowBirdFlock && this.birdFlockTimer <= 0 && this.getActiveEnemyCount() > 0) {
      this.birdFlockTimer = isEarlyCampaign
        ? Math.max(9.0, 15.0 - this.currentWave * 1.1)
        : Math.max(5.5, 12.5 - this.currentWave * 1.3);
      this.spawnBirdFlock(isEarlyCampaign ? 3 : (3 + Math.floor(this.currentWave / 2)));
    }
    // periodic battlefield item drops (heart / bomb)
    this.itemTimer = (this.itemTimer ?? 14) - dt;
    if (this.itemTimer <= 0) {
      this.itemTimer = 16;
      if (this.items.length < 10) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 160 + Math.random() * 140;
        const kind = (this.player.hp < this.player.maxHp * 0.75 || Math.random() < 0.55) ? 'heart' : 'bomb';
        this.spawnItem(kind, this.player.x + Math.cos(ang) * dist, this.player.y + Math.sin(ang) * dist);
      }
    }
  }

  updateStageProgression(dt, map, stage) {
    const totalDuration = stage.waves * stage.waveDuration;
    if (this.stageBoss && (!this.stageBoss.active || this.stageBoss.hp <= 0)) {
      this.stageBoss = null;
    }
    const activeFoes = this.getActiveEnemyCount();
    const waveClearRatio = this.waveTotalEnemies > 0
      ? clamp((this.waveSpawnedCount - activeFoes) / this.waveTotalEnemies, 0, 1)
      : 0;
    this.stageProgress = (((this.currentWave - 1) + waveClearRatio) / stage.waves) * totalDuration;

    if (this.waveSpawnedCount >= this.waveTotalEnemies && activeFoes === 0 && !this.stageBoss) {
      this.onWaveCleared();
    }
  }

  resetLoadoutForNewCampaign() {
    if (!this.hero || !this.player) return;
    const w = WEAPONS[this.hero.weapon];
    this.weapons = [{ id: this.hero.weapon, level: 1, data: w, evo: false, cdTimer: 0 }];
    this.passives = {};
    this._passivePulseTimers = {};
    this.level = 1;
    this.xp = 0;
    this.xpNext = LEVEL_XP(1);
    for (const pt of this.pets) {
      if (pt.sprite) pt.sprite.destroy();
      if (pt.shadow) pt.shadow.destroy();
    }
    this.pets.length = 0;
    if (this.ultraman) {
      if (this.ultraman.sprite) this.ultraman.sprite.destroy();
      if (this.ultraman.shadow) this.ultraman.shadow.destroy();
      this.ultraman = null;
    }
    const heroPetMap = {
      guanyu: 'redhare',
      lubu: 'redhare',
      zhangfei: 'white_tiger',
      zhaoyun: 'white_tiger',
      zhugeliang: 'qilin',
      sunshangxiang: 'vermilion',
    };
    this.summonPet(heroPetMap[this.hero.id] || 'redhare');
    this.recomputeStats();
    this.player.maxHp = this.hero.hp + (this.perk?.hpBonus || 0);
    this.player.hp = this.player.maxHp;
    if (this.orbitLayer) this.orbitLayer.clear();
    this._loadoutDirty = true;
    this.renderHudSlots();
  }

  advanceStage() {
    const levelsPerMap = 10;
    const totalStages = CAMPAIGN_MAPS.length * levelsPerMap;
    const curOrder = this.mapIndex * levelsPerMap + this.stageIndex;
    this.clearedStages.add(curOrder);
    const completedCampaign = this.stageIndex >= levelsPerMap - 1;
    const nextOrder = Math.min(totalStages - 1, curOrder + 1);
    this.unlockedStageOrder = Math.max(this.unlockedStageOrder || 0, nextOrder);
    this.unlockedCampaignIndex = Math.max(
      this.unlockedCampaignIndex || 0,
      Math.floor(this.unlockedStageOrder / levelsPerMap),
    );
    this.selectedCheckpointOrder = nextOrder;
    this.viewingCampaignIndex = Math.floor(nextOrder / levelsPerMap);
    this.selectedMapIndex = this.viewingCampaignIndex;
    this._justCompletedCampaign = completedCampaign;

    // Auto-save campaign checkpoint progress (especially when completing each campaign!)
    this.saveCampaignProgress(completedCampaign ? this.mapIndex : null);

    this.gold += completedCampaign ? 80 : 25;
    const healAmt = Math.round(this.player.maxHp * (completedCampaign ? 1.0 : 0.35));
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
    this.sfx.play('evolve');
    this.spawnLevelUpVfx(this.player.x, this.player.y);
    this.spawnShockwave(this.player.x, this.player.y, 0xf5c84c, 0.4, 2.5, 0.3);

    this.stageBoss = null;
    this.finalWaveSpawned = false;
    this.state = 'campaignmap';
    this.showCampaignMapModal(curOrder, nextOrder);
  }

  deployToCheckpoint(stageOrder = this.selectedCheckpointOrder) {
    const levelsPerMap = 10;
    const totalStages = CAMPAIGN_MAPS.length * levelsPerMap;
    const clamped = clamp(stageOrder ?? 0, 0, totalStages - 1);
    if (clamped > (this.unlockedStageOrder || 0)) return;
    this.sfx.play('start');
    const prevMapIndex = this.mapIndex;
    const nextMapIndex = Math.floor(clamped / levelsPerMap);
    const nextStageIndex = clamped % levelsPerMap;
    const isNewCampaignStart = nextMapIndex !== prevMapIndex || (nextStageIndex === 0 && this._justCompletedCampaign);
    this._justCompletedCampaign = false;

    this.mapIndex = nextMapIndex;
    this.stageIndex = nextStageIndex;
    this.viewingCampaignIndex = this.mapIndex;
    this.stageProgress = 0;
    this.currentWave = 1;
    this.finalWaveSpawned = false;
    this.stageBoss = null;
    for (const e of this.enemies) this.enemyPool.release(e);
    this.enemies.length = 0;
    for (const p of this.projectiles) this.projPool.release(p);
    this.projectiles.length = 0;

    if (isNewCampaignStart) {
      this.resetLoadoutForNewCampaign();
    }

    if (this.luContainer) {
      this.luContainer.destroy({ children: true });
      this.luContainer = null;
    }
    if (this.campaignMapContainer) {
      this.campaignMapContainer.destroy({ children: true });
      this.campaignMapContainer = null;
    }
    this.applyMapTheme();
    this.setupProps();
    this.state = 'playing';
    this._lastWaveQuant = -1;
    const { mapNum, levelNum, stage } = this.getStageSpec();
    if (isNewCampaignStart) {
      this.showFloatText(this.player.x, this.player.y - 44, `NEW CAMPAIGN ${mapNum}: WEAPONS & SKILLS RESET!`, 0xf5c84c);
    }
    this.showFloatText(this.player.x, this.player.y - 28, `STAGE ${mapNum}-${levelNum}: ${stage.name.toUpperCase()}!`, 0x6bffb0);
    this.startWave(1);
  }

  updateProps() {
    const span = 1600, half = 800;
    const cx = this.camX, cy = this.camY;
    for (const pr of this.props) {
      if (pr.x - cx < -half) pr.x += span;
      else if (pr.x - cx > half) pr.x -= span;
      if (pr.y - cy < -half) pr.y += span;
      else if (pr.y - cy > half) pr.y -= span;
      pr.sprite.x = Math.round(pr.x);
      pr.sprite.y = Math.round(pr.y);
    }
  }

  spawnItem(kind, x, y) {
    if (this.items.length >= 14) return null;
    const it = this.itemPool.acquire();
    it.active = true;
    it.kind = kind;
    it.x = Math.round(x);
    it.y = Math.round(y);
    this.resolvePropCollisions(it, 12);
    it.x = Math.round(it.x);
    it.y = Math.round(it.y);
    it.magnet = false;
    it.phase = Math.random() * Math.PI * 2;
    it.sprite.texture = kind === 'golden_egg'
      ? (this.effectTextures.golden_egg || this.effectTextures.bomb)
      : (kind === 'bomb' ? this.effectTextures.bomb : this.effectTextures.heart);
    it.sprite.scale.set(kind === 'golden_egg' ? 1.55 : 1.25);
    it.sprite.visible = true;
    it.sprite.x = it.x;
    it.sprite.y = it.y;
    this.items.push(it);
    return it;
  }

  collectItem(it) {
    if (!it || !it.active) return;
    it.active = false;
    const p = this.player;
    if (it.kind === 'heart') {
      const healAmt = 30;
      p.hp = Math.min(p.maxHp, p.hp + healAmt);
      this.sfx.play('heal');
      this.spawnHealVfx(p.x, p.y);
      this.spawnShockwave(p.x, p.y, 0x6bffb0, 0.35, 1.45, 0.24);
      this.showFloatText(p.x, p.y - 14, `+${healAmt} HP`, 0x6bffb0);
    } else if (it.kind === 'bomb') {
      this.explodeBomb(it.x, it.y);
    } else if (it.kind === 'golden_egg') {
      this.summonUltraman(10.0);
    }
  }

  explodeBomb(x, y) {
    this.sfx.play('bomb');
    this.shake = 24;
    this.flashScreen(0xffae42, 0.34);
    const areaMul = this.player?.areaMul || 1;
    // Massive central fireball + inner 4-fireball ring + outer 6-fireball ring covering the expanded blast zone!
    this.spawnExplosion(x, y, 1.05 * areaMul, 4.8 * areaMul, 0xffffff, 0.48, 2.2);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      this.spawnExplosion(
        x + Math.cos(a) * 82 * areaMul,
        y + Math.sin(a) * 82 * areaMul,
        0.6 * areaMul,
        2.45 * areaMul,
        0xffb84d,
        0.38,
        i % 2 ? -2.4 : 2.4,
      );
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.15;
      this.spawnExplosion(
        x + Math.cos(a) * 175 * areaMul,
        y + Math.sin(a) * 175 * areaMul,
        0.52 * areaMul,
        2.15 * areaMul,
        0xff7b3d,
        0.42,
        i % 2 ? 2.1 : -2.1,
      );
    }
    this.spawnShockwave(x, y, 0xff4d29, 0.65, 6.8 * areaMul, 0.46);
    this.spawnShockwave(x, y, 0xffae42, 0.45, 4.8 * areaMul, 0.35);
    this.spawnShockwave(x, y, 0xfff3b0, 0.25, 3.0 * areaMul, 0.24);
    this.spawnSparkBurst(x, y, 0, 0xffd166, 24, 340, 1.35, Math.PI / 8);
    this.showFloatText(x, y - 38, 'MEGA KABOOM!', 0xffe066);
    const blastRadius = 420 * areaMul;
    const blastRadius2 = blastRadius * blastRadius;
    const waveBonus = 1 + Math.max(0, (this.currentWave || 1) - 1) * 0.28;
    const blastDmg = 185 * (this.player?.dmgMul || 1) * waveBonus;
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (dist2(e.x, e.y, x, y) <= blastRadius2) {
        this.damageEnemy(e, blastDmg, x, y);
      }
    }
  }

  spawnEnemy(forceType = null) {
    const { stage } = this.getStageSpec();
    const types = stage.enemies || ['soldier', 'soldier', 'archer', 'cavalry'];
    const t = forceType && ENEMY_TYPES[forceType] ? forceType : pick(types);
    const d = ENEMY_TYPES[t] || ENEMY_TYPES.soldier;
    const ang = Math.random() * Math.PI * 2;
    const r = t === 'catapult' ? (320 + Math.random() * 70) : (400 + Math.random() * 120);
    const x = this.player.x + Math.cos(ang) * r;
    const y = this.player.y + Math.sin(ang) * r;

    const waveIdx = Math.max(0, (this.currentWave || 1) - 1);
    const earlyFactor = this.mapIndex === 0 ? 0.5 : (this.mapIndex === 1 ? 0.75 : 1.0);
    const waveHpMul = 1 + waveIdx * 0.22 * earlyFactor;
    const waveDmgMul = 1 + waveIdx * 0.12 * earlyFactor;
    const waveSpdMul = 1 + waveIdx * 0.05 * earlyFactor;
    const e = this.enemyPool.acquire();
    e.active = true;
    e.type = t;
    e.x = x; e.y = y;
    const frames = this.enemyTextures[t] || this.enemyTextures.soldier;
    e.sprite.texture = frames[0];
    const tints = stage.factionTints || [0xffffff];
    const baseTint = (t === 'catapult' || t === 'firebird')
      ? 0xffffff
      : tints[(this.enemySerial + Math.max(0, types.indexOf(t))) % tints.length];
    e.baseTint = baseTint;
    e.sprite.tint = baseTint;
    e.sprite.alpha = 1;
    const sc = t === 'catapult' ? 1.18 : (d.size >= 16 ? 0.96 : 0.84);
    e.baseScale = sc;
    e.sprite.scaleX = sc;
    e.sprite.scaleY = sc;
    e.phase = (this.enemySerial++ * 0.61803398875) % 1;
    e.hp = d.hp * (stage.hpMul || 1) * waveHpMul * (1 + this.time * 0.005);
    e.maxHp = e.hp;
    const sSlow = SEASONS[this.activeSeason]?.enemySlow || 0;
    e.speed = d.speed * (stage.speedMul || 1) * waveSpdMul * (1 - sSlow);
    e.dmg = d.dmg * (stage.dmgMul || 1) * waveDmgMul;
    e.size = d.size;
    e.xp = d.xp;
    e.color = d.color;
    e.ranged = !!d.ranged;
    e.explosive = !!d.explosive;
    e.isCatapult = !!d.isCatapult;
    e.isBird = false;
    e.countsForWave = true;
    e.knockResist = d.knockResist || 0;
    e.isBoss = false;
    e.isMapBoss = false;
    e.enraged = false;
    e.shootCd = t === 'catapult' ? (1.1 + e.phase * 0.9) : (1.3 + e.phase * 1.8);
    e.hitFlash = 0;
    e.knock = 0;
    e.kx = 0; e.ky = 0;
    this.enemies.push(e);
    return e;
  }

  spawnBirdFlock(count = 4) {
    if (!this.player) return [];
    const { stage } = this.getStageSpec();
    const d = ENEMY_TYPES.firebird || ENEMY_TYPES.assassin;
    const p = this.player;
    const fromLeft = Math.random() < 0.5;
    const baseAng = (fromLeft ? 0 : Math.PI) + (Math.random() - 0.5) * 0.45;
    const vx = Math.cos(baseAng) * d.speed;
    const vy = Math.sin(baseAng) * d.speed;
    const startDist = 360;
    const leaderX = p.x - Math.cos(baseAng) * startDist;
    const leaderY = p.y - Math.sin(baseAng) * startDist + (Math.random() - 0.5) * 90;
    const perpX = -Math.sin(baseAng);
    const perpY = Math.cos(baseAng);
    const backX = -Math.cos(baseAng);
    const backY = -Math.sin(baseAng);
    const waveIdx = Math.max(0, (this.currentWave || 1) - 1);

    const flock = [];
    for (let i = 0; i < count; i++) {
      const wingRank = Math.ceil(i / 2);
      const wingSide = i === 0 ? 0 : (i % 2 === 1 ? 1 : -1);
      const bx = leaderX + backX * (wingRank * 26) + perpX * (wingSide * wingRank * 24);
      const by = leaderY + backY * (wingRank * 26) + perpY * (wingSide * wingRank * 24);
      const e = this.enemyPool.acquire();
      e.active = true;
      e.type = 'firebird';
      e.x = bx;
      e.y = by;
      const frames = this.enemyTextures.firebird || this.enemyTextures.assassin;
      e.sprite.texture = frames[0];
      e.baseTint = 0xffffff;
      e.sprite.tint = 0xffffff;
      e.sprite.alpha = 1;
      const sc = 0.96;
      e.baseScale = sc;
      e.sprite.scaleX = fromLeft ? sc : -sc;
      e.sprite.scaleY = sc;
      e.phase = (this.enemySerial++ * 0.61803398875) % 1;
      e.hp = d.hp * (stage.hpMul || 1) * (1 + waveIdx * 0.2);
      e.maxHp = e.hp;
      e.speed = d.speed;
      e.dmg = d.dmg * (stage.dmgMul || 1) * (1 + waveIdx * 0.14);
      e.size = d.size;
      e.xp = d.xp;
      e.color = d.color;
      e.ranged = false;
      e.explosive = true;
      e.isCatapult = false;
      e.isBird = true;
      e.countsForWave = false;
      e.flyVx = vx;
      e.flyVy = vy;
      e.bombTimer = 0.45 + i * 0.22;
      e.bombsLeft = 2 + (this.currentWave >= 4 ? 1 : 0);
      e.knockResist = 0.85;
      e.isBoss = false;
      e.isMapBoss = false;
      e.enraged = false;
      e.hitFlash = 0;
      e.knock = 0;
      e.kx = 0; e.ky = 0;
      this.enemies.push(e);
      flock.push(e);
    }
    this.showFloatText(p.x, p.y - 38, 'BIRD FLOCK BULLET RAIN!', 0xff8552);
    return flock;
  }

  spawnElite() {
    const { stage } = this.getStageSpec();
    const d = ENEMY_TYPES.elite;
    const ang = Math.random() * Math.PI * 2;
    const r = 300;
    const x = this.player.x + Math.cos(ang) * r;
    const y = this.player.y + Math.sin(ang) * r;
    const e = this.enemyPool.acquire();
    e.active = true;
    e.type = 'elite';
    e.x = x; e.y = y;
    e.sprite.texture = this.enemyTextures.elite[0];
    e.sprite.tint = 0xffffff;
    e.sprite.alpha = 1;
    const sc = 1.2;
    e.baseScale = sc;
    e.sprite.scaleX = sc;
    e.sprite.scaleY = sc;
    e.phase = (this.enemySerial++ * 0.61803398875) % 1;
    e.hp = d.hp * (stage.hpMul || 1) * (1 + this.time * 0.03);
    e.maxHp = e.hp;
    e.speed = d.speed * (stage.speedMul || 1);
    e.dmg = d.dmg * (stage.dmgMul || 1);
    e.size = d.size;
    e.xp = d.xp;
    e.color = d.color;
    e.ranged = false;
    e.isBoss = true;
    e.isMapBoss = false;
    e.hitFlash = 0; e.knock=0; e.kx=0; e.ky=0;
    this.enemies.push(e);
    return e;
  }

  spawnMapBoss(map, stage, bossSpec = null) {
    const b = bossSpec || stage.levelBoss || map.boss;
    const spriteKey = b.spriteType && this.enemyTextures[b.spriteType] ? b.spriteType : 'elite';
    const ang = Math.random() * Math.PI * 2;
    const r = 230;
    const x = this.player.x + Math.cos(ang) * r;
    const y = this.player.y + Math.sin(ang) * r;
    const e = this.enemyPool.acquire();
    e.active = true;
    e.type = spriteKey;
    e.x = x; e.y = y;
    e.sprite.texture = this.enemyTextures[spriteKey][0];
    e.sprite.tint = 0xffffff;
    e.sprite.alpha = 1;
    const sc = (b.scale || 1.75) * 0.78;
    e.baseScale = sc;
    e.sprite.scaleX = sc;
    e.sprite.scaleY = sc;
    e.phase = (this.enemySerial++ * 0.61803398875) % 1;
    e.baseTint = 0xffffff;
    e.hp = b.hp * (stage.hpMul || 1);
    e.maxHp = e.hp;
    e.speed = b.speed;
    e.dmg = b.dmg * (stage.dmgMul || 1);
    e.size = 24;
    e.xp = 65;
    e.color = b.color || 0xf5c84c;
    e.ranged = true;
    e.explosive = false;
    e.isCatapult = false;
    e.isBird = false;
    e.countsForWave = true;
    e.knockResist = 0.72;
    e.shootCd = 1.45;
    e.isBoss = true;
    e.isMapBoss = true;
    e.enraged = false;
    e.bossName = b.name;
    e.bossPattern = b.pattern || 'thunder_nova';
    e.hitFlash = 0; e.knock = 0; e.kx = 0; e.ky = 0;
    this.enemies.push(e);
    return e;
  }
  spawnKaijuBoss() {
    if (!this.player) return null;
    const { stage } = this.getStageSpec();
    const d = ENEMY_TYPES.kaiju;
    const ang = Math.random() * Math.PI * 2;
    const r = 230;
    const x = this.player.x + Math.cos(ang) * r;
    const y = this.player.y + Math.sin(ang) * r;
    const e = this.enemyPool.acquire();
    e.active = true;
    e.type = 'kaiju';
    e.x = x;
    e.y = y;
    const frames = this.enemyTextures.kaiju || this.enemyTextures.elite;
    e.sprite.texture = frames[0];
    e.baseTint = 0xffffff;
    e.sprite.tint = 0xffffff;
    e.sprite.alpha = 1;
    // Colossal Kaiju Godzilla Scale (3.25x = 208x208 px on screen!)
    const sc = 3.25;
    e.baseScale = sc;
    e.sprite.scaleX = sc;
    e.sprite.scaleY = sc;
    e.phase = (this.enemySerial++ * 0.61803398875) % 1;
    e.hp = d.hp * (stage.hpMul || 1);
    e.maxHp = e.hp;
    e.speed = d.speed;
    e.dmg = d.dmg * (stage.dmgMul || 1);
    e.size = 52;
    e.xp = 120;
    e.color = 0x00f5d4;
    e.ranged = true;
    e.explosive = true;
    e.isCatapult = false;
    e.isBird = false;
    e.isKaiju = true;
    e.countsForWave = true;
    e.knockResist = 0.96;
    e.shootCd = 1.6;
    e.stompTimer = 1.4;
    e.eggTimer = 5.5;
    e.isBoss = true;
    e.isMapBoss = false;
    e.enraged = false;
    e.bossName = 'KAIJU GODZILLA';
    e.hitFlash = 0;
    e.knock = 0;
    e.kx = 0;
    e.ky = 0;
    this.enemies.push(e);
    this.sfx.play('bomb');
    this.shake = Math.max(this.shake, 20);
    this.flashScreen(0x00f5d4, 0.28);
    this.spawnShockwave(x, y, 0x00f5d4, 0.6, 3.2, 0.38);
    this.showFloatText(this.player.x, this.player.y - 42, '⚠ RARE KAIJU GODZILLA EMERGED!', 0x00f5d4);
    // Immediately drop a Golden Egg near the player when Kaiju Godzilla appears!
    const eggAng = ang + Math.PI + (Math.random() - 0.5) * 0.8;
    const eggX = this.player.x + Math.cos(eggAng) * 105;
    const eggY = this.player.y + Math.sin(eggAng) * 105;
    this.spawnItem('golden_egg', eggX, eggY);
    this.showFloatText(eggX, eggY - 18, '★ GOLDEN EGG! PICK UP FOR ULTRAMAN!', 0xfde047);
    return e;
  }

  summonUltraman(duration = 10.0) {
    if (!this.player) return null;
    const p = this.player;
    this.sfx.play('evolve');
    this.sfx.play('bomb');
    this.shake = Math.max(this.shake, 18);
    this.flashScreen(0x38bdf8, 0.28);
    this.spawnLevelUpVfx(p.x, p.y);
    this.spawnExplosion(p.x, p.y, 0.75, 2.8, 0x38bdf8, 0.38);
    this.spawnShockwave(p.x, p.y, 0xfde047, 0.5, 3.2, 0.34);
    this.showFloatText(p.x, p.y - 40, '★ ULTRAMAN SUMMONED (10S)! SPECIUM RAY!', 0x38bdf8);

    if (this.ultraman) {
      this.ultraman.timer = duration;
      this.ultraman.maxTimer = duration;
      return this.ultraman;
    }
    const shadow = new Graphics();
    shadow.ellipse(0, 32, 26, 9).fill({ color: 0x000000, alpha: 0.45 });
    this.petLayer.addChild(shadow);
    const sprite = new Sprite(this.effectTextures.ultraman || this.effectTextures.impact);
    sprite.anchor.set(0.5, 0.62);
    sprite.scale.set(2.85);
    this.petLayer.addChild(sprite);
    this.ultraman = {
      x: p.x + 65,
      y: p.y - 25,
      timer: duration,
      maxTimer: duration,
      cdTimer: 0.15,
      sprite,
      shadow,
    };
    return this.ultraman;
  }

  updateAndRenderUltraman(dt, g) {
    const u = this.ultraman;
    if (!u || !this.player) return;
    const p = this.player;
    u.timer -= dt;
    if (u.timer <= 0) {
      this.spawnLevelUpVfx(u.x, u.y);
      this.spawnShockwave(u.x, u.y, 0x38bdf8, 0.45, 2.4, 0.28);
      this.showFloatText(u.x, u.y - 28, 'ULTRAMAN ASCENDED!', 0x7dd3fc);
      if (u.sprite) u.sprite.destroy();
      if (u.shadow) u.shadow.destroy();
      this.ultraman = null;
      return;
    }
    // Target Kaiju Godzilla first, otherwise nearest Boss or enemy!
    const kaiju = this.enemies.find((e) => e.active && e.isKaiju && e.hp > 0);
    const target = kaiju || this.stageBoss || this.nearestEnemy(u.x, u.y);
    let destX = p.x + Math.cos(this.time * 1.8) * 72;
    let destY = p.y + Math.sin(this.time * 1.8) * 56;
    if (target && target.active) {
      const angToTarget = angleTo(target.x, target.y, p.x, p.y);
      destX = target.x + Math.cos(angToTarget) * 92;
      destY = target.y + Math.sin(angToTarget) * 72;
    }
    u.x += (destX - u.x) * Math.min(1, dt * 7);
    u.y += (destY - u.y) * Math.min(1, dt * 7);

    const bob = Math.sin(this.animTime * 7) * 3.5;
    u.shadow.x = Math.round(u.x);
    u.shadow.y = Math.round(u.y);
    u.sprite.x = Math.round(u.x);
    u.sprite.y = Math.round(u.y + bob);
    const facingLeft = target ? target.x < u.x : false;
    u.sprite.scale.set(facingLeft ? -2.85 : 2.85, 2.85);

    // Draw Ultraman's Golden-Cyan Aura Ring & 10s Countdown Bar on orbitLayer!
    if (g) {
      g.circle(Math.round(u.x), Math.round(u.y + 18), 34 + Math.sin(this.time * 10) * 3)
        .stroke({ color: 0x38bdf8, alpha: 0.65, width: 2.5 });
      const bw = 54, bh = 4.5;
      const bx = Math.round(u.x - bw / 2);
      const by = Math.round(u.y - 68);
      const ratio = clamp(u.timer / (u.maxTimer || 10), 0, 1);
      g.rect(bx - 1, by - 1, bw + 2, bh + 2).fill(0x0c0e14);
      g.rect(bx, by, Math.max(1, Math.round(bw * ratio)), bh).fill(0x38bdf8);
    }

    // Fire Specium Ray & Ultra Slash every 0.55s!
    u.cdTimer -= dt;
    if (u.cdTimer <= 0 && target && target.active) {
      u.cdTimer = 0.55;
      const ang = angleTo(u.x, u.y, target.x, target.y);
      const dist = Math.hypot(target.x - u.x, target.y - u.y);
      this.sfx.play('shoot');
      this.spawnThrust(u.x, u.y - 8, ang, Math.max(120, dist + 24), 0x38bdf8);
      this.spawnExplosion(target.x, target.y, 0.7, 2.35, 0x38bdf8, 0.32);
      this.spawnShockwave(target.x, target.y, 0xfde047, 0.45, 2.2, 0.26);
      this.spawnSparkBurst(target.x, target.y, ang, 0x7dd3fc, 6, 185, 0.9, 0.8);
      // Anti-Kaiju Specium Ray Damage (deals heavy direct damage to Kaiju + AoE around target!)
      const rayDmg = 135 * (p.dmgMul || 1);
      for (const e of this.enemies) {
        if (!e.active) continue;
        if (dist2(e.x, e.y, target.x, target.y) <= 115 * 115) {
          if (e.isKaiju) {
            // Ultraman's Specium Ray pierces Kaiju scales directly!
            e.hp -= Math.min(rayDmg, e.maxHp * 0.24);
            e.hitFlash = 0.14;
            if (e.hp <= 0) this.damageEnemy(e, 10, u.x, u.y);
          } else {
            this.damageEnemy(e, rayDmg, u.x, u.y);
          }
        }
      }
    }
  }

  handleWeapons(dt) {
    for (const w of this.weapons) {
      if (WEAPONS[w.id]?.type === 'orbit') continue;
      w.cdTimer = (w.cdTimer || 0) - dt;
      if (w.cdTimer <= 0) {
        const stats = this.getWeaponStats(w);
        w.cdTimer = stats.cd;
        this.fireWeapon(w, stats);
      }
    }
  }

  updateAndRenderOrbitWeapons(dt) {
    const g = this.orbitLayer;
    if (!g) return;
    g.clear();
    if (!this.player) return;
    const p = this.player;
    // 1. Render & trigger Max-Level (Lv 5) Mastered Passive Skill Auras & Special Attacks + Ultraman (10s)!
    this.updateMaxedPassives(dt, g);
    this.updateAndRenderUltraman(dt, g);

    // 2. Render & update Orbiting Defensive Weapons (Flying Blades & Eight-Trigram Shields)
    for (const w of this.weapons) {
      const base = WEAPONS[w.id];
      if (!base || base.type !== 'orbit') continue;
      const stats = this.getWeaponStats(w);
      const isShield = w.id === 'bagua_shields';
      const isMax = stats.isMax;
      // Every weapon level adds another orbiting blade/shield (3 at Lv1 -> 4 at Lv2 -> ... -> 12 at Lv8)!
      const count = 2 + stats.lvl + (isMax ? 2 : 0);
      const radius = (isShield ? 44 : 54) * stats.area;
      const dir = isShield ? -1 : 1;
      const angularSpd = (isShield ? 3.2 : 4.2) * (1 + stats.delta * 0.06) * (isMax ? 1.25 : 1.0) * dir;
      const baseAngle = this.time * angularSpd;
      const ringCol = stats.wd ? stats.wd.color : base.color;

      // Orbital energy track(s) around the warrior
      g.circle(Math.round(p.x), Math.round(p.y), radius)
        .stroke({ color: ringCol, alpha: isMax ? 0.45 : 0.22, width: isMax ? 2.2 : 1.5 });
      if (isMax) {
        g.circle(Math.round(p.x), Math.round(p.y), radius * 0.58)
          .stroke({ color: 0xfff3b0, alpha: 0.35, width: 1.5 });
      }

      // Max-Level Special Periodic Pulse for Orbit Weapons!
      if (isMax) {
        w.specialTimer = (w.specialTimer || 0) - dt;
        if (w.specialTimer <= 0) {
          w.specialTimer = isShield ? 1.25 : 1.1;
          if (isShield) {
            // Imperial Aegis Ring: Sacred Bagua Repulsion Explosion + Shockwave!
            this.spawnShockwave(p.x, p.y, 0xfde047, 0.45, 2.3 * stats.area, 0.28);
            this.spawnSparkBurst(p.x, p.y, this.time, 0xfde047, 6, 175, 0.85, Math.PI);
            const specialDmg = stats.dmg * 0.65;
            const r2 = (115 * stats.area) ** 2;
            for (const e of this.enemies) {
              if (e.active && dist2(e.x, e.y, p.x, p.y) <= r2) {
                this.damageEnemy(e, specialDmg, p.x, p.y);
                e.knock = Math.max(e.knock || 0, 16 * (1 - (e.knockResist || 0)));
              }
            }
          } else {
            // Celestial Sword Wheel: Fires 6 Radial Celestial Sword-Beam Projectiles outward!
            for (let b = 0; b < 6; b++) {
              const ba = this.time * 2 + (b * Math.PI) / 3;
              this.spawnProjectile(p.x, p.y, ba, stats.dmg * 0.6, stats.area, 0x7dd3fc, stats.wd, false, 3, true, true);
            }
          }
        }
      }

      for (let i = 0; i < count; i++) {
        const ang = baseAngle + (i * Math.PI * 2) / count;
        const bx = p.x + Math.cos(ang) * radius;
        const by = p.y + Math.sin(ang) * radius;
        const spin = this.time * 12 * dir + i;

        if (isShield) {
          // Golden Eight-Trigram (Bagua) Ward Shield grows and gains rings as level increases!
          const shR = 9 + stats.delta * 0.5 + (isMax ? 1.5 : 0);
          g.circle(bx, by, shR).fill({ color: isMax ? 0xb45309 : 0x78350f, alpha: 0.94 }).stroke({ color: ringCol, width: isMax ? 2.8 : 2.2 });
          if (stats.lvl >= 4) {
            g.circle(bx, by, shR * 0.72).stroke({ color: 0xfde047, width: 1.2 });
          }
          g.circle(bx, by, isMax ? 6 : 4.2).fill({ color: 0xfef08a, alpha: 0.98 });
        } else {
          // Spinning Flying Blade evolves star points by level: 4-pt (Lv1-2) -> 5-pt (Lv3-4) -> 6-pt (Lv5-7) -> 12-pt (Lv8)!
          const wings = isMax ? 12 : (stats.lvl >= 5 ? 10 : (stats.lvl >= 3 ? 8 : 6));
          const rOut = 9.5 + stats.delta * 0.65 + (isMax ? 2 : 0);
          const rIn = isMax ? 5 : 3.5;
          const pts = [];
          for (let k = 0; k < wings; k++) {
            const a = spin + (k * Math.PI * 2) / wings;
            const r = k % 2 === 0 ? rOut : rIn;
            pts.push(bx + Math.cos(a) * r, by + Math.sin(a) * r);
          }
          g.poly(pts).fill({ color: ringCol, alpha: 0.96 }).stroke({ color: isMax ? 0xfef08a : 0xe0f2fe, width: 1.4 });
          g.circle(bx, by, isMax ? 4 : 3).fill(0xffffff);
        }

        // 1. Deflect / block incoming enemy bolts!
        for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
          const pr = this.projectiles[pi];
          if (!pr.active || !pr.fromEnemy || pr.isBoulder) continue;
          if (dist2(pr.x, pr.y, bx, by) <= 24 * 24) {
            pr.life = 0;
            this.spawnHitSpark(pr.x, pr.y, ringCol, 0.45, 0.12);
          }
        }

        // 2. Continuously slice/bash enemies touching the orbiting blade/shield!
        const hitR = (isShield ? 18 : 16) + (isMax ? 4 : 0);
        const cands = this.spatial.query(bx, by, hitR + 24);
        const list = cands.length ? cands : this.enemies;
        for (const e of list) {
          if (!e.active || (e._orbitHitCd || 0) > 0) continue;
          if (dist2(e.x, e.y, bx, by) <= (hitR + e.size) ** 2) {
            e._orbitHitCd = Math.max(0.18, stats.cd * 0.6);
            const hitDmg = stats.dmg * (isMax ? 1.25 : 1.0);
            this.damageEnemy(e, hitDmg, p.x, p.y);
            if (isMax) {
              this.spawnHitSpark(e.x, e.y, ringCol, 0.55, 0.14);
            }
            if (isShield) {
              e.knock = Math.max(e.knock || 0, (isMax ? 16 : 12) * (1 - (e.knockResist || 0)));
            }
          }
        }
      }
    }
  }

  updateMaxedPassives(dt, g) {
    const p = this.player;
    if (!p || !this.passives) return;
    const ps = this.passives;
    this._passivePulseTimers = this._passivePulseTimers || {};
    const auraColors = [];
    for (const id in PASSIVES) {
      const spec = PASSIVES[id];
      if ((ps[id] || 0) >= spec.max) {
        auraColors.push(spec.color);
        this._passivePulseTimers[id] = (this._passivePulseTimers[id] || 0) - dt;
        if (this._passivePulseTimers[id] <= 0) {
          this._passivePulseTimers[id] = 2.4;
          const baseDmg = 36 * (p.dmgMul || 1);
          if (id === 'might') {
            // Mastered Might Lv 5: Crimson War-God Explosion Nova!
            this.spawnExplosion(p.x, p.y, 0.55, 1.95, 0xff6b6b, 0.3);
            this.spawnShockwave(p.x, p.y, 0xff6b6b, 0.4, 2.1, 0.25);
            for (const e of this.enemies) {
              if (e.active && dist2(e.x, e.y, p.x, p.y) <= 130 * 130) {
                this.damageEnemy(e, baseDmg * 1.35, p.x, p.y);
              }
            }
          } else if (id === 'armor') {
            // Mastered Armor Lv 5: Sapphire Aegis Repulsion Pulse!
            this.spawnShockwave(p.x, p.y, 0x6b9fff, 0.45, 2.0, 0.25);
            for (const e of this.enemies) {
              if (e.active && dist2(e.x, e.y, p.x, p.y) <= 120 * 120) {
                this.damageEnemy(e, baseDmg, p.x, p.y);
                e.knock = Math.max(e.knock || 0, 15 * (1 - (e.knockResist || 0)));
              }
            }
          } else if (id === 'swiftness') {
            // Mastered Swiftness Lv 5: Emerald Gale-Step Wind-Shear Slash!
            const ne = this.nearestEnemy(p.x, p.y);
            const ang = ne ? angleTo(p.x, p.y, ne.x, ne.y) : this.time * 3;
            this.spawnSlash(p.x, p.y, 0x6bffb0, 1.35, ang);
            for (const e of this.enemies) {
              if (e.active && dist2(e.x, e.y, p.x, p.y) <= 115 * 115) {
                this.damageEnemy(e, baseDmg, p.x, p.y);
              }
            }
          } else if (id === 'cooldown') {
            // Mastered Cooldown Lv 5: Golden Chrono-Thunder Strike on nearest foe!
            const ne = this.nearestEnemy(p.x, p.y);
            if (ne) {
              this.spawnLevelUpVfx(ne.x, ne.y);
              this.spawnShockwave(ne.x, ne.y, 0xffb06b, 0.38, 1.65, 0.24);
              for (const e of this.enemies) {
                if (e.active && dist2(e.x, e.y, ne.x, ne.y) <= 90 * 90) {
                  this.damageEnemy(e, baseDmg * 1.4, p.x, p.y);
                }
              }
            }
          } else if (id === 'area') {
            // Mastered Area Lv 5: Violet Void Singularity Shockwave!
            this.spawnShockwave(p.x, p.y, 0xb06bff, 0.5, 2.6, 0.28);
            for (const e of this.enemies) {
              if (e.active && dist2(e.x, e.y, p.x, p.y) <= 165 * 165) {
                this.damageEnemy(e, baseDmg * 1.15, p.x, p.y);
              }
            }
          } else if (id === 'growth') {
            // Mastered Growth Lv 5: Golden Imperial Starfall Burst!
            const ne = this.nearestEnemy(p.x, p.y);
            const tx = ne ? ne.x : p.x;
            const ty = ne ? ne.y : p.y;
            this.spawnExplosion(tx, ty, 0.45, 1.55, 0xffff6b, 0.28);
            this.spawnSparkBurst(tx, ty, 0, 0xffff6b, 6, 165, 0.85, Math.PI);
            for (const e of this.enemies) {
              if (e.active && dist2(e.x, e.y, tx, ty) <= 95 * 95) {
                this.damageEnemy(e, baseDmg * 1.2, p.x, p.y);
              }
            }
          }
        }
      }
    }
    // Draw pulsing Mastered Skill Halo Ring(s) beneath the warrior!
    for (let i = 0; i < auraColors.length; i++) {
      const pulse = 20 + i * 5 + Math.sin(this.time * 6 + i) * 2.5;
      g.circle(Math.round(p.x), Math.round(p.y + 6), pulse)
        .stroke({ color: auraColors[i], alpha: 0.48, width: 1.8 });
    }
  }

  summonPet(id) {
    const spec = PETS[id];
    if (!spec) return null;
    const existing = this.pets.find((pt) => pt.id === id);
    if (existing) {
      existing.level = Math.min(spec.max || 5, existing.level + 1);
      this._loadoutDirty = true;
      if (this.player) {
        this.spawnLevelUpVfx(existing.x, existing.y);
        this.showFloatText(existing.x, existing.y - 16, `${spec.name.toUpperCase()} LV${existing.level}!`, spec.color);
      }
      return existing;
    }
    const shadow = new Graphics();
    shadow.ellipse(0, 10, 10, 4).fill({ color: 0x000000, alpha: 0.35 });
    this.petLayer.addChild(shadow);
    const texList = this.petTextures?.[id] || [this.effectTextures.impact];
    const sprite = new Sprite(texList[0]);
    sprite.anchor.set(0.5, 0.6);
    sprite.scale.set(1.25);
    this.petLayer.addChild(sprite);
    const initAng = (this.pets.length * Math.PI) / 2;
    const px = (this.player?.x || 0) + Math.cos(initAng) * 44;
    const py = (this.player?.y || 0) + Math.sin(initAng) * 34;
    const pet = {
      id,
      level: 1,
      spec,
      x: px,
      y: py,
      lungeX: 0,
      lungeY: 0,
      cdTimer: 0.5,
      healTimer: 7.0,
      frame: 0,
      sprite,
      shadow,
    };
    this.pets.push(pet);
    this._loadoutDirty = true;
    return pet;
  }

  updatePets(dt) {
    if (!this.pets.length || !this.player) return;
    const p = this.player;
    const count = this.pets.length;
    for (let i = 0; i < count; i++) {
      const pt = this.pets[i];
      const spec = pt.spec;
      const orbitAng = this.time * 2.0 + (i * Math.PI * 2) / count;
      const targetX = p.x + Math.cos(orbitAng) * 44 + pt.lungeX;
      const targetY = p.y + Math.sin(orbitAng) * 34 + pt.lungeY;
      pt.x += (targetX - pt.x) * Math.min(1, dt * 10);
      pt.y += (targetY - pt.y) * Math.min(1, dt * 10);
      pt.lungeX *= Math.pow(0.04, dt);
      pt.lungeY *= Math.pow(0.04, dt);

      if (pt.id === 'qilin') {
        pt.healTimer -= dt;
        if (pt.healTimer <= 0) {
          pt.healTimer = 7.5;
          if (p.hp < p.maxHp) {
            const healAmt = 4 + pt.level * 2;
            p.hp = Math.min(p.maxHp, p.hp + healAmt);
            this.spawnHealVfx(p.x, p.y);
            this.showFloatText(p.x, p.y - 18, `+${healAmt} QILIN`, 0x6bffb0);
          }
        }
      }

      pt.cdTimer -= dt;
      if (pt.cdTimer <= 0) {
        const cdScale = Math.pow(0.92, pt.level - 1) * (p.cdMul || 1);
        pt.cdTimer = Math.max(0.45, spec.cd * cdScale);
        const dmg = spec.dmg * (1 + (pt.level - 1) * 0.25) * (p.dmgMul || 1);
        const ne = this.nearestEnemy(pt.x, pt.y);
        if (!ne || dist2(pt.x, pt.y, ne.x, ne.y) > spec.range * spec.range) continue;
        const ang = angleTo(pt.x, pt.y, ne.x, ne.y);

        const isMaxPet = pt.level >= (spec.max || 5);
        const specialMul = isMaxPet ? 1.45 : 1.0;
        if (pt.id === 'redhare') {
          pt.lungeX = Math.cos(ang) * (isMaxPet ? 58 : 46);
          pt.lungeY = Math.sin(ang) * (isMaxPet ? 58 : 46);
          this.spawnExplosion(ne.x, ne.y, isMaxPet ? 0.65 : 0.45, isMaxPet ? 1.95 : 1.35, 0xff6b52, 0.3);
          if (isMaxPet) this.spawnShockwave(ne.x, ne.y, 0xffd166, 0.4, 1.85, 0.24);
          this.spawnSparkBurst(ne.x, ne.y, ang, 0xffd166, isMaxPet ? 7 : 4, 175, 0.85, 0.9);
          const r2 = (isMaxPet ? 96 : 68) ** 2;
          for (const e of this.enemies) {
            if (e.active && dist2(e.x, e.y, ne.x, ne.y) <= r2) {
              this.damageEnemy(e, dmg * specialMul, pt.x, pt.y);
            }
          }
        } else if (pt.id === 'vermilion') {
          const shots = isMaxPet ? 5 : (1 + Math.floor(pt.level / 3));
          for (let s = 0; s < shots; s++) {
            const sa = ang + (s - (shots - 1) / 2) * 0.2;
            this.spawnProjectile(pt.x, pt.y, sa, dmg * specialMul, isMaxPet ? 1.35 : 1.15, 0xffae42, null, true, isMaxPet ? 3 : 2, true, isMaxPet);
          }
          if (isMaxPet) this.spawnShockwave(pt.x, pt.y, 0xffae42, 0.35, 1.4, 0.2);
          this.spawnSparkBurst(pt.x, pt.y, ang, 0xffae42, isMaxPet ? 5 : 2, 145, 0.75, 0.6);
        } else if (pt.id === 'white_tiger') {
          pt.lungeX = Math.cos(ang) * (isMaxPet ? 64 : 52);
          pt.lungeY = Math.sin(ang) * (isMaxPet ? 64 : 52);
          this.spawnSlash(ne.x, ne.y, 0x7ce8ff, isMaxPet ? 1.35 : 0.95, ang);
          if (isMaxPet) {
            this.spawnSlash(ne.x, ne.y, 0xffffff, 1.15, ang + Math.PI / 2);
            this.spawnShockwave(ne.x, ne.y, 0x7ce8ff, 0.38, 1.75, 0.24);
          }
          let hits = 0;
          const maxHits = isMaxPet ? 10 : (2 + pt.level);
          const r2 = (isMaxPet ? 92 : 64) ** 2;
          for (const e of this.enemies) {
            if (e.active && dist2(e.x, e.y, ne.x, ne.y) <= r2) {
              this.damageEnemy(e, dmg * specialMul, pt.x, pt.y);
              if (++hits >= maxHits) break;
            }
          }
        } else if (pt.id === 'qilin') {
          this.spawnLevelUpVfx(ne.x, ne.y);
          if (isMaxPet) {
            this.spawnExplosion(ne.x, ne.y, 0.5, 1.7, 0x6bffb0, 0.28);
          }
          this.spawnShockwave(ne.x, ne.y, 0x6bffb0, 0.38, isMaxPet ? 1.9 : 1.35, 0.24);
          let hits = 0;
          const maxHits = isMaxPet ? 10 : (2 + pt.level);
          const r2 = (isMaxPet ? 105 : 80) ** 2;
          for (const e of this.enemies) {
            if (e.active && dist2(e.x, e.y, ne.x, ne.y) <= r2) {
              this.damageEnemy(e, dmg * specialMul, pt.x, pt.y);
              if (++hits >= maxHits) break;
            }
          }
        }
      }
    }
  }

  renderPets() {
    const frame = Math.floor(this.animTime * 8) % 4;
    for (let i = 0; i < this.pets.length; i++) {
      const pt = this.pets[i];
      const texList = this.petTextures?.[pt.id];
      if (texList && pt.frame !== frame) {
        pt.frame = frame;
        pt.sprite.texture = texList[frame];
      }
      const bob = Math.sin(this.animTime * 7 + i * 1.5) * 2.5;
      pt.shadow.x = Math.round(pt.x);
      pt.shadow.y = Math.round(pt.y);
      pt.sprite.x = Math.round(pt.x);
      pt.sprite.y = Math.round(pt.y + bob);
      const sc = 1.2 + (pt.level - 1) * 0.06;
      pt.sprite.scale.set(pt.x < (this.player?.x || 0) ? sc : -sc, sc);
    }
  }

  directionFromAngle(angle) {
    if (Math.abs(Math.cos(angle)) >= Math.abs(Math.sin(angle))) return Math.cos(angle) < 0 ? 'left' : 'right';
    return Math.sin(angle) < 0 ? 'up' : 'down';
  }

  beginAttack(direction = this.player.direction, duration = 0.26) {
    this.player.attackDirection = direction;
    this.player.attackDuration = duration;
    this.player.attackTimer = duration;
  }

  fireWeapon(w, stats = this.getWeaponStats(w)) {
    const p = this.player;
    const { base, wd, isMax, lvl, dmg, area, bonusCount, bonusPierce } = stats;
    const type = base.type;

    if (type === 'melee_arc') {
      const maxTargets = 7 + lvl * 2 + (isMax ? 6 : 0);
      const cands = this.spatial.query(p.x, p.y, 90 * area + 28);
      const pool = cands.length ? cands : this.enemies;
      const targets = pool.filter((e) => e.active).sort((a,b)=>dist2(a.x,a.y,p.x,p.y)-dist2(b.x,b.y,p.x,p.y)).slice(0, maxTargets);
      const slashAng = targets.length
        ? angleTo(p.x, p.y, targets[0].x, targets[0].y)
        : ({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[p.direction] ?? 0);
      const facing = this.directionFromAngle(slashAng);
      this.beginAttack(facing, 0.28);
      const specialBonus = isMax ? 1.35 : 1.0;
      for (const e of targets) {
        if (dist2(e.x,e.y,p.x,p.y) < (90*area)**2) {
          this.damageEnemy(e, dmg * specialBonus, p.x, p.y);
        }
      }
      this.sfx.play('slash');
      const col = wd ? wd.color : 0x5fd38d;
      this.spawnSlash(p.x, p.y, col, area, slashAng);
      // Progressive visual & attack upgrades on every weapon level!
      if (lvl >= 2 && !isMax) {
        this.spawnSlash(p.x, p.y, 0xa7f3d0, area * 0.86, slashAng + (lvl >= 4 ? 0.24 : 0.12));
      }
      if (lvl >= 4 && !isMax) {
        this.spawnShockwave(p.x, p.y, col, 0.35, 1.45 * area, 0.2);
      }
      if (lvl >= 6 && !isMax) {
        this.spawnSlash(p.x, p.y, 0xfef08a, area * 0.95, slashAng - 0.24);
        this.spawnProjectile(p.x, p.y, slashAng, dmg * 0.55, area, col, null, false, 3, true, false);
      }
      if (isMax) {
        // Max-Level Dragon Slayer Special: Twin Cross-Crescent Slash + Dragon-Fire Shockwave + 3 Piercing Dragon Flame Waves!
        this.spawnSlash(p.x, p.y, 0xffe066, area * 1.18, slashAng + 0.32);
        this.spawnShockwave(p.x, p.y, col, 0.5, 2.1 * area, 0.26);
        for (let i = -1; i <= 1; i++) {
          this.spawnProjectile(p.x, p.y, slashAng + i * 0.22, dmg * 0.65, area * 1.15, 0x1fff8a, wd, false, 4, true, true);
        }
      }
    } else if (type === 'thrust') {
      let ang = this.joystick.active ? Math.atan2(this.joystick.y, this.joystick.x) : 0;
      if (!this.joystick.active && this.enemies.length) {
        const ne = this.nearestEnemy(p.x, p.y);
        if (ne) ang = angleTo(p.x, p.y, ne.x, ne.y);
      }
      this.beginAttack(this.directionFromAngle(ang), 0.3);
      const len = 120 * area * (1 + stats.delta * 0.05);
      const specialBonus = isMax ? 1.35 : 1.0;
      for (const e of this.enemies) {
        const dx = e.x - p.x, dy = e.y - p.y;
        const proj = dx*Math.cos(ang) + dy*Math.sin(ang);
        if (proj >= 0 && proj <= len) {
          const perp = Math.abs(-dx*Math.sin(ang) + dy*Math.cos(ang));
          if (perp < (20 + stats.delta * 2) * area) this.damageEnemy(e, dmg * specialBonus, p.x, p.y);
        }
      }
      this.sfx.play('thrust');
      this.spawnThrust(p.x, p.y, ang, len, wd ? wd.color : 0xd35f5f);
      const tipX = p.x + Math.cos(ang) * len * 0.85;
      const tipY = p.y + Math.sin(ang) * len * 0.85;
      if (lvl >= 2 && !isMax) {
        this.spawnShockwave(tipX, tipY, 0xff8552, 0.28, 1.15 * area, 0.18);
      }
      if (lvl >= 4 && !isMax) {
        this.spawnThrust(p.x, p.y, ang + 0.12, len * 0.88, 0xffae42);
      }
      if (lvl >= 6 && !isMax) {
        this.spawnThrust(p.x, p.y, ang - 0.12, len * 0.88, 0xffae42);
      }
      if (isMax) {
        // Max-Level Iron Pike Special: Triple-Pronged Trident Thrust + Spear-Tip Explosion Detonation!
        this.spawnThrust(p.x, p.y, ang - 0.16, len * 0.92, 0xffd166);
        this.spawnThrust(p.x, p.y, ang + 0.16, len * 0.92, 0xffd166);
        this.spawnExplosion(tipX, tipY, 0.55, 1.85 * area, 0xff5f5f, 0.3);
        this.spawnShockwave(tipX, tipY, 0xffae42, 0.38, 1.65 * area, 0.22);
        const r2 = (75 * area) ** 2;
        for (const e of this.enemies) {
          if (e.active && dist2(e.x, e.y, tipX, tipY) <= r2) {
            this.damageEnemy(e, dmg * 0.65, tipX, tipY);
          }
        }
      }
    } else if (type === 'spin') {
      this.beginAttack(p.direction, 0.34);
      const specialBonus = isMax ? 1.4 : 1.0;
      for (const e of this.enemies) {
        if (dist2(e.x,e.y,p.x,p.y) < (110*area)**2) this.damageEnemy(e, dmg * specialBonus, p.x, p.y);
      }
      this.sfx.play('spin');
      this.spawnSpin(p.x, p.y, area, wd ? wd.color : 0xd38f5f);
      if (lvl >= 2 && !isMax) {
        this.spawnShockwave(p.x, p.y, 0xffaa5f, 0.35, 1.55 * area, 0.22);
      }
      if (lvl >= 4 && !isMax) {
        this.spawnSpin(p.x, p.y, area * 0.72, 0xffe066);
      }
      if (lvl >= 6 && !isMax) {
        for (let k = 0; k < 2; k++) {
          const ka = this.time * 2 + k * Math.PI;
          this.spawnExplosion(p.x + Math.cos(ka) * 60 * area, p.y + Math.sin(ka) * 60 * area, 0.35, 1.25, 0xff7b3d, 0.24);
        }
      }
      if (isMax) {
        // Max-Level Sky Halberd Special: Dual Counter-Rotating Whirlwind + 4 Cardinal Heaven-Splitter Explosions!
        this.spawnSpin(p.x, p.y, area * 1.25, 0xffe066);
        this.spawnShockwave(p.x, p.y, 0xffaa5f, 0.5, 2.3 * area, 0.28);
        for (let k = 0; k < 4; k++) {
          const ka = this.time * 2 + (k * Math.PI) / 2;
          const ex = p.x + Math.cos(ka) * 72 * area;
          const ey = p.y + Math.sin(ka) * 72 * area;
          this.spawnExplosion(ex, ey, 0.45, 1.55, 0xff7b3d, 0.28);
          for (const e of this.enemies) {
            if (e.active && dist2(e.x, e.y, ex, ey) <= (68 * area) ** 2) {
              this.damageEnemy(e, dmg * 0.6, ex, ey);
            }
          }
        }
      }
    } else if (type === 'projectile' || type === 'magic_bolt') {
      this.sfx.play('shoot');
      // Every weapon level increases projectile count!
      const count = (w.id === 'daggers' ? 1 : 0) + lvl + (isMax ? 2 : 0);
      const pierce = (isMax ? 4 : 1) + bonusPierce;
      const isMagic = type === 'magic_bolt' || lvl >= 4;
      const targets = this.nearestEnemies(p.x, p.y, count);
      const firstAng = targets.length ? angleTo(p.x, p.y, targets[0].x, targets[0].y) : 0;
      this.beginAttack(targets.length ? this.directionFromAngle(firstAng) : p.direction, 0.24);
      this.spawnSparkBurst(p.x + Math.cos(firstAng) * 12, p.y + Math.sin(firstAng) * 12, firstAng, wd ? wd.color : base.color, isMax ? 5 : 2, 135, 0.75, 0.55);
      if (isMax && type === 'magic_bolt') {
        this.spawnSpin(p.x, p.y, area * 1.15, 0xffffff);
      }
      if (targets.length === 0) {
        for (let i=0;i<count;i++) this.spawnProjectile(p.x, p.y, Math.random()*Math.PI*2, dmg, area, wd ? wd.color : base.color, wd, false, pierce, isMagic, isMax);
      } else {
        for (let i = 0; i < count; i++) {
          const t = targets[i % targets.length];
          const spread = i >= targets.length ? (i - targets.length + 1) * 0.12 : 0;
          const ang = angleTo(p.x, p.y, t.x, t.y) + spread;
          this.spawnProjectile(p.x, p.y, ang, dmg, area, wd ? wd.color : base.color, wd, w.id==='daggers' || lvl >= 6, pierce, isMagic, isMax);
        }
      }
    }
  }

  spawnProjectile(x, y, ang, dmg, area, color, wd, homing=false, pierceOverride=null, isMagic=false, isMaxSpecial=false) {
    const p = this.projPool.acquire();
    p.active = true;
    p.x = x; p.y = y;
    const speed = 320 * (wd || isMaxSpecial ? 1.32 : 1);
    p.vx = Math.cos(ang) * speed;
    p.vy = Math.sin(ang) * speed;
    p.dmg = dmg;
    p.life = 2.0;
    p.pierce = pierceOverride ?? (wd ? 3 : 1);
    p.size = (isMaxSpecial ? 7.5 : 6) * area;
    p.color = color;
    p.homing = homing || (wd && wd.name==='Twin Dragons');
    p.isMagic = isMagic || Boolean(wd);
    p.isMaxSpecial = Boolean(isMaxSpecial || wd);
    p.fromEnemy = false;
    p.isBoulder = false;
    p.sprite.texture = this.effectTextures.projectile;
    p.sprite.scale.set(p.isMaxSpecial ? 1.35 : 1.0);
    p.sprite.visible = true;
    p.sprite.tint = color;
    p.sprite.alpha = 1;
    this.projectiles.push(p);
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      if (!pr.active) continue;
      // homing
      if (pr.homing) {
        const ne = this.nearestEnemy(pr.x, pr.y);
        if (ne) {
          const ang = angleTo(pr.x, pr.y, ne.x, ne.y);
          const sp = Math.hypot(pr.vx, pr.vy);
          pr.vx += (Math.cos(ang)*sp - pr.vx) * dt * 4;
          pr.vy += (Math.sin(ang)*sp - pr.vy) * dt * 4;
        }
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (pr.life <= 0) {
        if (pr.isBoulder) {
          this.detonateEnemyBoulder(pr.x, pr.y, pr.dmg);
        }
        this.projPool.release(pr);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (pr.fromEnemy) continue;
      // collision with enemies
      const r = pr.size + 14;
      const cands = this.spatial.query(pr.x, pr.y, r + 20);
      const list = cands.length ? cands : this.enemies;
      for (const e of list) {
        if (!e.active) continue;
        if (pr.hit.has(e)) continue;
        if (dist2(pr.x, pr.y, e.x, e.y) < (pr.size + e.size) ** 2) {
          this.damageEnemy(e, pr.dmg, pr.x - pr.vx * 0.05, pr.y - pr.vy * 0.05);
          if (pr.isMaxSpecial) {
            // Max-Level Projectile Special: Explosive Elemental Burst + AoE Splash Damage!
            this.spawnExplosion(e.x, e.y, 0.36, 1.35, pr.color, 0.22);
            this.spawnShockwave(e.x, e.y, pr.color, 0.3, 1.3, 0.2);
            const splashDmg = pr.dmg * 0.45;
            for (const ne of list) {
              if (ne !== e && ne.active && dist2(e.x, e.y, ne.x, ne.y) <= 56 * 56) {
                this.damageEnemy(ne, splashDmg, e.x, e.y);
              }
            }
          } else if (pr.isMagic) {
            this.spawnShockwave(e.x, e.y, pr.color, 0.25, 0.9, 0.18);
          }
          pr.hit.add(e);
          pr.pierce--;
          if (pr.pierce <= 0) { pr.life = 0; break; }
        }
      }
    }
  }

  updateEnemies(dt) {
    this.spatial.clear();
    for (const e of this.enemies) {
      if (!e.active) continue;
      this.spatial.insert(e, e.x, e.y);
    }
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.active) continue;
      // knockback
      if (e.knock > 0) {
        e.x += e.kx * e.knock * dt;
        e.y += e.ky * e.knock * dt;
        e.knock -= dt * 8;
        if (e.knock < 0) e.knock = 0;
      }
      // Aerial Feather-Storm Hawks fly straight across the sky and unleash Bullet Rain volleys!
      if (e.isBird) {
        e.x += (e.flyVx || 200) * dt;
        e.y += (e.flyVy || 0) * dt;
        e.bombTimer = (e.bombTimer ?? 0.5) - dt;
        if (e.bombTimer <= 0 && (e.bombsLeft ?? 0) > 0) {
          e.bombsLeft--;
          e.bombTimer = 0.58;
          this.fireBirdBulletRain(e.x, e.y, e.dmg);
        }
        if (dist2(e.x, e.y, p.x, p.y) > 560 * 560) {
          e.active = false;
        }
      } else {
        // move toward player (Siege Catapults hold artillery distance at ~230px)
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d > 1 && (!e.isCatapult || d > 230)) {
          e.x += (dx / d) * e.speed * dt;
          e.y += (dy / d) * e.speed * dt;
        }
        // Colossal Kaiju Godzilla Titan: Continuous Seismic Stomp Area Damage (AoE) & Periodic Golden Egg Drops!
        if (e.isKaiju) {
          e.stompTimer = (e.stompTimer ?? 1.8) - dt;
          if (e.stompTimer <= 0) {
            e.stompTimer = 1.9;
            this.shake = Math.max(this.shake, 9);
            this.spawnShockwave(e.x, e.y, 0x00f5d4, 0.65, 2.9, 0.34);
            this.spawnExplosion(e.x, e.y, 0.65, 2.2, 0x00f5d4, 0.3);
            if (d <= 120) {
              this.damagePlayer(Math.max(2, Math.round(e.dmg * 0.85)));
            }
          }
          e.eggTimer = (e.eggTimer ?? 6.5) - dt;
          if (e.eggTimer <= 0) {
            e.eggTimer = 7.5;
            if (!this.items.some((it) => it.active && it.kind === 'golden_egg') && !this.ultraman) {
              const eggAng = Math.random() * Math.PI * 2;
              const ex = p.x + Math.cos(eggAng) * 105;
              const ey = p.y + Math.sin(eggAng) * 105;
              this.spawnItem('golden_egg', ex, ey);
              this.showFloatText(ex, ey - 16, '★ GOLDEN EGG! SUMMON ULTRAMAN!', 0xfde047);
            }
          }
        }
        // ranged shoot
        if (e.ranged) {
          e.shootCd -= dt;
          if (e.shootCd <= 0) {
            e.shootCd = e.isKaiju
              ? 2.1
              : (e.isMapBoss
                ? (e.enraged ? 1.25 : 1.65)
                : (e.isCatapult ? 2.8 + e.phase * 0.8 : 1.85 + e.phase * 0.7));
            const maxRange = e.isKaiju ? 440 : (e.isCatapult ? 420 : 350);
            if (d < maxRange && this.projectiles.length < 48) this.enemyShoot(e);
          }
        }
      }
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e._orbitHitCd > 0) e._orbitHitCd -= dt;
      // remove if dead
      if (e.hp <= 0) {
        this.killEnemy(e);
      }
    }
    // cleanup dead
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].active) {
        this.enemyPool.release(this.enemies[i]);
        this.enemies.splice(i, 1);
      }
    }
  }

  enemyShoot(e) {
    const p = this.player;
    const baseAng = angleTo(e.x, e.y, p.x, p.y);
    if (e.isCatapult) {
      this.fireCatapultBoulder(e.x, e.y, baseAng, e.dmg);
      return;
    }
    if (e.isKaiju) {
      // Colossal Kaiju Godzilla Atomic Breath Beam + 3-Zone Area Damage (AoE) Ground Explosions!
      this.sfx.play('bomb');
      this.shake = Math.max(this.shake, 11);
      this.spawnThrust(e.x, e.y, baseAng, 195, 0x00f5d4);
      const aoeDmg = Math.max(2, Math.round(e.dmg * 0.8));
      for (const distStep of [85, 155, 225]) {
        const gx = e.x + Math.cos(baseAng) * distStep;
        const gy = e.y + Math.sin(baseAng) * distStep;
        this.spawnExplosion(gx, gy, 0.55, 1.95, 0x00f5d4, 0.34);
        this.spawnShockwave(gx, gy, 0x7dd3fc, 0.4, 1.9, 0.26);
        if (dist2(gx, gy, p.x, p.y) <= 68 * 68) {
          this.damagePlayer(aoeDmg);
        }
      }
      for (let i = -2; i <= 2; i++) {
        this.fireEnemyBolt(e.x, e.y, baseAng + i * 0.16, 205, aoeDmg, 7, 0x00f5d4);
      }
      return;
    }
    if (!e.isMapBoss) {
      const { stage } = this.getStageSpec();
      const wStyle = stage.weaponStyle || 'crossbow_volley';
      const isSorcerer = e.type === 'sorcerer';
      const shots = isSorcerer || wStyle === 'crossbow_volley' ? 2 : 1;
      const spread = 0.18;
      const styleCols = {
        crossbow_volley: 0xffaa5f,
        fire_arrows: 0xff6b3d,
        poison_darts: 0x6bffb0,
        throwing_axes: 0xe2e8f0,
        taoist_thunder: 0xc77dff,
      };
      const col = isSorcerer ? 0xc77dff : (styleCols[wStyle] || 0xffaa5f);
      const spd = isSorcerer ? 175 : 195;
      for (let i = 0; i < shots; i++) {
        const ang = baseAng + (i - (shots - 1) / 2) * spread;
        this.fireEnemyBolt(e.x, e.y, ang, spd, e.dmg, 5, col);
      }
      return;
    }
    // 9 Distinct Stage & Map Boss Attack Patterns (with reduced, fair projectile damage)!
    const pat = e.bossPattern || 'thunder_nova';
    const col = e.color || 0xff5f5f;
    const bDmg = Math.max(3, Math.round(e.dmg * 0.68));
    if (pat === 'cleave') {
      e.x += Math.cos(baseAng) * 26;
      e.y += Math.sin(baseAng) * 26;
      this.spawnSlash(e.x, e.y, col, 1.2, baseAng);
      for (let i = -1; i <= 1; i++) {
        this.fireEnemyBolt(e.x, e.y, baseAng + i * 0.22, 185, bDmg, 6, col);
      }
    } else if (pat === 'bomb_barrage') {
      const bx = e.x + Math.cos(baseAng) * 95;
      const by = e.y + Math.sin(baseAng) * 95;
      this.spawnExplosion(bx, by, 0.5, 1.75, 0xff9248, 0.34);
      this.spawnShockwave(bx, by, 0xff6b3d, 0.35, 1.8, 0.25);
      for (let i = -1; i <= 1; i += 2) {
        this.fireEnemyBolt(e.x, e.y, baseAng + i * 0.18, 180, bDmg, 6, 0xff9248);
      }
    } else if (pat === 'thunder_nova') {
      this.spawnShockwave(e.x, e.y, 0xf5c84c, 0.35, 1.85, 0.26);
      for (let i = -2; i <= 2; i++) {
        this.fireEnemyBolt(e.x, e.y, baseAng + i * 0.2, 190, bDmg, 6, 0xf5c84c);
      }
      if (this.enemies.length < 40) this.spawnEnemy('bomber');
    } else if (pat === 'lance_rush') {
      e.x += Math.cos(baseAng) * 38;
      e.y += Math.sin(baseAng) * 38;
      this.spawnThrust(e.x, e.y, baseAng, 95, col);
      for (let i = -1; i <= 1; i++) {
        this.fireEnemyBolt(e.x, e.y, baseAng + i * 0.14, 210, bDmg, 6, col);
      }
    } else if (pat === 'whirlwind_nova') {
      this.spawnSpin(e.x, e.y, 1.15, col);
      for (let i = 0; i < 6; i++) {
        this.fireEnemyBolt(e.x, e.y, baseAng + (i * Math.PI) / 3, 175, bDmg, 6, col);
      }
    } else if (pat === 'demon_slam') {
      this.spawnExplosion(e.x, e.y, 0.65, 2.1, 0xff5f5f, 0.36);
      this.shake = Math.max(this.shake, 8);
      for (let i = -2; i <= 2; i++) {
        this.fireEnemyBolt(e.x, e.y, baseAng + i * 0.24, 195, bDmg, 7, 0xff5f5f);
      }
    } else if (pat === 'arrow_rain') {
      for (let i = -2; i <= 2; i++) {
        this.fireEnemyBolt(e.x, e.y, baseAng + i * 0.15, 215, bDmg, 5, 0x5ca8ff);
      }
    } else if (pat === 'tidal_ring') {
      this.spawnShockwave(e.x, e.y, 0x7cb8ff, 0.4, 2.0, 0.28);
      for (let i = 0; i < 8; i++) {
        this.fireEnemyBolt(e.x, e.y, (i * Math.PI) / 4 + this.time, 180, bDmg, 6, 0x7cb8ff);
      }
    } else {
      // imperial_storm (Cao Ren)
      this.spawnExplosion(e.x, e.y, 0.55, 1.9, 0x6b9fff, 0.32);
      for (let i = 0; i < 8; i++) {
        this.fireEnemyBolt(e.x, e.y, baseAng + (i * Math.PI) / 4, 195, bDmg, 6, 0x6b9fff);
      }
      if (this.enemies.length < 40) this.spawnEnemy('shield');
    }
  }

  fireEnemyBolt(x, y, ang, spd, dmg, size, col, isBoulder = false, life = 2.5) {
    if (this.projectiles.length >= 76) return;
    const pr = this.projPool.acquire();
    pr.active = true;
    pr.x = x; pr.y = y;
    pr.vx = Math.cos(ang) * spd;
    pr.vy = Math.sin(ang) * spd;
    pr.dmg = dmg;
    pr.life = life;
    pr.pierce = 1;
    pr.size = size;
    pr.color = col;
    pr.homing = false;
    pr.fromEnemy = true;
    pr.isBoulder = isBoulder;
    pr.sprite.texture = isBoulder ? this.effectTextures.bomb : this.effectTextures.projectile;
    pr.sprite.visible = true;
    pr.sprite.tint = isBoulder ? 0xffffff : col;
    pr.sprite.scale.set(isBoulder ? 1.15 : 1.0);
    this.projectiles.push(pr);
    return pr;
  }

  fireCatapultBoulder(x, y, ang, dmg) {
    const p = this.player;
    const dist = clamp(Math.hypot(p.x - x, p.y - y), 110, 360);
    const spd = 195;
    const flightTime = dist / spd;
    const targetX = x + Math.cos(ang) * dist;
    const targetY = y + Math.sin(ang) * dist;
    this.spawnSparkBurst(x, y - 8, ang, 0xffae42, 3, 130, 0.7, 0.5);
    // Ground warning ring at impact zone
    this.spawnShockwave(targetX, targetY, 0xff5f5f, 0.5, 0.3, Math.min(0.45, flightTime));
    this.fireEnemyBolt(x, y - 6, ang, spd, Math.max(3, Math.round(dmg * 0.7)), 9, 0xff7b3d, true, flightTime);
  }

  fireBirdBulletRain(x, y, dmg) {
    if (!this.player) return;
    const p = this.player;
    const baseAng = angleTo(x, y, p.x, p.y);
    const bullets = this.mapIndex === 0 ? 3 : 5;
    const spread = 0.22;
    const boltDmg = Math.max(2, Math.round(dmg * 0.55));
    this.spawnSparkBurst(x, y, baseAng, 0xffd166, 2, 130, 0.65, 0.55);
    for (let i = 0; i < bullets; i++) {
      const ang = baseAng + (i - (bullets - 1) / 2) * spread;
      const col = i % 2 === 0 ? 0xff5f5f : 0xffd166;
      const spd = 220 + (i % 2) * 18;
      this.fireEnemyBolt(x, y, ang, spd, boltDmg, 5, col, false, 2.2);
    }
  }

  detonateEnemyBoulder(x, y, dmg) {
    this.spawnExplosion(x, y, 0.48, 1.65, 0xff8552, 0.32);
    this.spawnShockwave(x, y, 0xff5f5f, 0.38, 1.75, 0.24);
    this.spawnSparkBurst(x, y, Math.random() * Math.PI * 2, 0xffd166, 3, 145, 0.75, Math.PI);
    this.shake = Math.max(this.shake, 5);
    if (this.player && dist2(x, y, this.player.x, this.player.y) <= 42 * 42) {
      this.damagePlayer(dmg);
    }
  }

  // override projectile collision for enemy bullets
  // handled in updateProjectiles already uses dmg; need to check fromEnemy flag for player hit
  handlePlayerCollisions(dt) {
    const p = this.player;
    // enemy bullets hit player
    for (const pr of this.projectiles) {
      if (!pr.active || !pr.fromEnemy) continue;
      if (dist2(pr.x, pr.y, p.x, p.y) < (pr.size + 12) ** 2) {
        this.damagePlayer(pr.dmg);
        pr.life = 0;
      }
    }
    // enemy body collision
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (dist2(e.x, e.y, p.x, p.y) < (e.size + 12) ** 2) {
        this.damagePlayer(e.dmg * dt * 2); // per second
      }
    }
    // gems pickup
    for (const g of this.gems) {
      if (!g.active) continue;
      const d2 = dist2(g.x, g.y, p.x, p.y);
      if (d2 < 20*20 || g.magnet) {
        // move toward player
        g.magnet = true;
        const ang = angleTo(g.x, g.y, p.x, p.y);
        g.x += Math.cos(ang) * 300 * dt;
        g.y += Math.sin(ang) * 300 * dt;
        if (d2 < 14*14) {
          this.xp += g.val * p.xpMul;
          g.active = false;
          this.sfx.play('gem');
        }
      }
      // auto magnet range
      if (d2 < 120*120) g.magnet = true;
    }
    // cleanup gems
    for (let i = this.gems.length - 1; i >= 0; i--) {
      if (!this.gems[i].active) { this.gemPool.release(this.gems[i]); this.gems.splice(i,1); }
    }
    // items pickup (heart / bomb)
    for (const it of this.items) {
      if (!it.active) continue;
      const d2 = dist2(it.x, it.y, p.x, p.y);
      if (d2 < 85 * 85) it.magnet = true;
      if (it.magnet) {
        const ang = angleTo(it.x, it.y, p.x, p.y);
        it.x += Math.cos(ang) * 280 * dt;
        it.y += Math.sin(ang) * 280 * dt;
      }
      if (d2 < 20 * 20) {
        this.collectItem(it);
      }
    }
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (!this.items[i].active) {
        this.itemPool.release(this.items[i]);
        this.items.splice(i, 1);
      }
    }
    // chests interact (walk over chest or tap chest)
    for (let i = this.chests.length - 1; i >= 0; i--) {
      const c = this.chests[i];
      if (dist2(c.x, c.y, p.x, p.y) < 34 * 34) {
        this.openChest(c);
      }
    }
    if (this.rightTap) {
      const rt = this.rightTap;
      this.rightTap = null;
      const ws = this.worldScale || 1;
      const tapWX = (rt.x - this.W / 2) / ws + this.camX;
      const tapWY = (rt.y - this.H / 2) / ws + this.camY;
      for (let i = this.chests.length - 1; i >= 0; i--) {
        const c = this.chests[i];
        if (dist2(c.x, c.y, tapWX, tapWY) < 60 * 60) {
          this.openChest(c);
        }
      }
    }
  }

  damagePlayer(dmg) {
    const p = this.player;
    if (p.invuln > 0) return;
    const actual = Math.max(1, dmg - p.armor);
    p.hp -= actual;
    p.invuln = 0.35;
    this.shake = 10;
    this.sfx.play('hurt');
    this.flashScreen(0xff0000, 0.25);
    if (p.hp <= 0) {
      p.hp = 0;
      this.gameOver();
    }
  }

  damageEnemy(e, dmg, sx, sy) {
    // Colossal Kaiju Godzilla Titan has 40% Scales Mitigation + 12% Max-HP single-hit cap (hard to kill!)
    if (e.isKaiju) {
      dmg = Math.min(dmg * 0.60, e.maxHp * 0.12);
    } else if (e.isMapBoss) {
      // Stage & Campaign Bosses have 15% Warlord Armor Mitigation + 30% Max-HP single-hit cap
      dmg = Math.min(dmg * 0.85, e.maxHp * 0.30);
    }
    e.hp -= dmg;
    e.hitFlash = 0.12;
    this.sfx.play('hit');
    const ang = angleTo(sx, sy, e.x, e.y);
    e.kx = Math.cos(ang); e.ky = Math.sin(ang);
    e.knock = 6 * (1 - (e.knockResist || 0));
    this.spawnHitSpark(e.x, e.y, 0xfff3b0, e.isBoss ? 0.78 : 0.46, 0.14);
    this.spawnSparkBurst(e.x, e.y, ang, e.color, 1, 135, e.isBoss ? 0.85 : 0.6, 0.5);
    if (this._floatTextThisFrame < 1 && this.textPool.active.length < 6) {
      this._floatTextThisFrame++;
      this.showFloatText(e.x, e.y - 8, Math.round(dmg).toString(), 0xffffff);
    }
    // 50% HP Boss Warlord Enrage Phase: +14% Speed, +12% DMG, crimson aura, and 2 Halberdier bodyguards!
    if (e.isMapBoss && e.hp > 0 && !e.enraged && e.hp <= e.maxHp * 0.5) {
      e.enraged = true;
      e.speed *= 1.14;
      e.dmg *= 1.12;
      e.baseScale *= 1.1;
      e.baseTint = 0xff9e9e;
      e.shootCd = Math.min(e.shootCd || 0.7, 0.55);
      this.sfx.play('explosion');
      this.shake = Math.max(this.shake, 12);
      this.spawnExplosion(e.x, e.y, 0.65, 2.0, 0xff4d29, 0.36);
      this.spawnShockwave(e.x, e.y, 0xff3b3b, 0.42, 2.1, 0.28);
      this.showFloatText(e.x, e.y - 26, `${(e.bossName || 'BOSS').toUpperCase()} ENRAGED!`, 0xff3b3b);
      for (let g = 0; g < 2; g++) {
        const guard = this.spawnEnemy('halberdier');
        guard.x = e.x + (g === 0 ? -48 : 48);
        guard.y = e.y + 18;
        this.waveTotalEnemies++;
        this.waveSpawnedCount++;
      }
    }
    if (e.hp <= 0) {
      // spawn gem (or merge into existing gem when >40 gems active)
      if (this.gems.length >= 40) {
        this.gems[this.gems.length - 1].val += e.xp;
      } else {
        const g = this.gemPool.acquire();
        g.active = true;
        g.x = e.x; g.y = e.y;
        g.val = e.xp;
        g.magnet = false;
        g.sprite.visible = true;
        this.gems.push(g);
      }
      this.kills++;
      if (!this.stageBoss) {
        this.stageProgress += 0.35;
      }
      // pooled death shockwave + directional spark burst
      // pooled death shockwave + directional spark burst (+ bomber fiery blast)
      if (e.explosive) {
        this.spawnExplosion(e.x, e.y, 0.42, 1.55, 0xff9248, 0.28, 2.0);
        this.spawnShockwave(e.x, e.y, 0xff6b3d, 0.35, 1.9, 0.25);
      } else {
        this.spawnShockwave(e.x, e.y, e.color, 0.3, e.isBoss ? 1.85 : 1.05, 0.22);
      }
      this.spawnSparkBurst(e.x, e.y, ang, e.color, e.isBoss ? 5 : (e.explosive ? 6 : 2), 155, e.isBoss ? 0.95 : 0.68, 1.9);
      if (e.isBoss) {
        this.spawnChest(e.x, e.y);
        if (e.isKaiju) {
          this.spawnChest(e.x + 28, e.y);
          this.spawnItem('heart', e.x - 24, e.y + 18);
          this.spawnItem('bomb', e.x + 24, e.y + 18);
          this.gold += 100;
          this.showFloatText(e.x, e.y - 34, 'KAIJU TITAN SLAIN! +100G', 0x00f5d4);
        }
      }
      if (this.items.length < 12) {
        const dropRoll = Math.random();
        const heartChance = this.player.hp < this.player.maxHp * 0.7 ? 0.055 : 0.03;
        if (dropRoll < heartChance) {
          this.spawnItem('heart', e.x, e.y);
        } else if (dropRoll < heartChance + 0.025) {
          this.spawnItem('bomb', e.x, e.y);
        }
      }
      e.active = false;
      this.waveKills = (this.waveKills || 0) + 1;
      if (e.isMapBoss && this.stageBoss === e) {
        this.stageBoss = null;
      }
      if (this.waveSpawnedCount >= this.waveTotalEnemies && !this.stageBoss && this.getActiveEnemyCount() === 0) {
        this.onWaveCleared();
      }
    }
  }

  killEnemy(e) {
    e.active = false;
  }

  spawnChest(x, y) {
    const sprite = new Sprite(this.effectTextures.chest);
    sprite.anchor.set(0.5, 0.6);
    sprite.scale.set(1.25);
    this.chestLayer.addChild(sprite);
    const c = { x, y, opened:false, t:0, sprite };
    this.chests.push(c);
  }

  openChest(c) {
    if (c.opened) return;
    c.opened = true;
    // evolution check
    let evolved = false;
    for (const w of this.weapons) {
      if (w.evo) continue;
      const base = WEAPONS[w.id];
      const passId = base.pass;
      const passLvl = this.passives[passId] || 0;
      if (w.level >= 8 && passLvl >= 1) {
        // evolve
        w.evo = true;
        w.evoId = base.evo;
        evolved = true;
        this._loadoutDirty = true;
        this.sfx.play('evolve');
        this.showFloatText(c.x, c.y, 'EVOLVED: ' + EVOLUTIONS[base.evo].name, 0xffd700);
      }
    }
    if (!evolved) {
      // random upgrade
      this.gold += 10;
      this.sfx.play('chest');
      this.showFloatText(c.x, c.y, '+10 Gold', 0xffd700);
    }
    // remove chest
    const i = this.chests.indexOf(c);
    if (i >= 0) this.chests.splice(i, 1);
    c.sprite.destroy();
  }

  updateChests(dt) {
    for (const c of this.chests) {
      c.t += dt;
      // bob
    }
  }

  updateGems(dt) {
    // gems handled in collisions; magnet range set there. Just cleanup active flags already.
  }

  releaseParticle(pt) {
    if (pt.pooled === 'hit') this.hitPool.release(pt.poolObject);
    else if (pt.pooled === 'slash') this.slashPool.release(pt.poolObject);
    else if (pt.pooled === 'thrust') this.thrustPool.release(pt.poolObject);
    else if (pt.pooled === 'spin') this.spinPool.release(pt.poolObject);
    else if (pt.pooled === 'ring') this.ringPool.release(pt.poolObject);
    else if (pt.pooled === 'spark') this.sparkPool.release(pt.poolObject);
    else if (pt.pooled === 'explosion') this.explosionPool.release(pt.poolObject);
    else if (pt.pooled === 'heal') this.healPool.release(pt.poolObject);
    else if (pt.pooled === 'levelup') this.levelupPool.release(pt.poolObject);
    else if (pt.pooled === 'text') this.textPool.release(pt.poolObject);
    else if (pt.g) pt.g.destroy();
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.gravity) pt.vy += pt.gravity * dt;
      if (pt.g) {
        pt.g.x = Math.round(pt.x);
        pt.g.y = Math.round(pt.y);
        if (pt.spin) pt.g.rotation += pt.spin * dt;
        const duration = pt.maxLife || 0.4;
        const progress = clamp(1 - pt.life / duration, 0, 1);
        if (pt.isText) {
          pt.g.alpha = Math.max(0, pt.life / duration);
        } else if (pt.frames) {
          const fIdx = Math.min(pt.frames.length - 1, Math.floor(progress * pt.frames.length));
          if (pt.lastFrame !== fIdx) {
            pt.lastFrame = fIdx;
            pt.g.texture = pt.frames[fIdx];
          }
          pt.g.alpha = pt.startAlpha ?? 1;
          if (pt.endScaleX !== undefined) {
            const sx = pt.baseScaleX + (pt.endScaleX - pt.baseScaleX) * progress;
            const sy = pt.baseScaleY + (pt.endScaleY - pt.baseScaleY) * progress;
            pt.g.scale.set(sx, sy);
          }
        } else {
          pt.g.alpha = Math.max(0, (1 - progress) * (pt.startAlpha ?? 1));
          if (pt.endScaleX !== undefined) {
            const sx = pt.baseScaleX + (pt.endScaleX - pt.baseScaleX) * progress;
            const sy = pt.baseScaleY + (pt.endScaleY - pt.baseScaleY) * progress;
            pt.g.scale.set(sx, sy);
          } else if (pt.baseScaleX !== undefined) {
            const growth = 1 + progress * (pt.growthRate ?? 0.35);
            pt.g.scale.set(pt.baseScaleX * growth, pt.baseScaleY * growth);
          }
        }
      }
      if (pt.life <= 0) {
        this.releaseParticle(pt);
        this.particles.splice(i, 1);
      }
    }
  }

  levelUp() {
    this.level++;
    this.player.level = this.level;
    this.xp = Math.max(0, this.xp - this.xpNext);
    this.xpNext = LEVEL_XP(this.level);
    this.state = 'levelup';
    this.sfx.play('levelup');
    if (this.player) this.spawnLevelUpVfx(this.player.x, this.player.y);
    this.showLevelUpUI();
  }

  showLevelUpUI() {
    if (this.luContainer) this.luContainer.destroy({ children:true });
    this.luContainer = new Container();
    this.uiLayer.addChild(this.luContainer);

    const choices = this.generateChoices(3);
    const bw = Math.min(324, this.W - 32);
    const panelW = bw + 24;
    const panelH = 58 + choices.length * 74 + 12;
    const panelX = (this.W - panelW) / 2;
    const panelY = Math.max((this.hudTop ?? 34) + 98, (this.H - panelH) / 2);

    const panel = new Graphics();
    panel.roundRect(panelX + 3, panelY + 5, panelW, panelH, 8).fill({ color:0x000000, alpha:0.55 });
    panel.roundRect(panelX, panelY, panelW, panelH, 8)
      .fill({ color:0x0d131c, alpha:0.96 })
      .stroke({ color:0xd4a017, width:2, alpha:0.95 });
    this.luContainer.addChild(panel);

    const title = new Text({
      text: this.pendingNextWave ? `WAVE ${this.currentWave} CLEARED! · CHOOSE UPGRADE` : 'LEVEL UP!  CHOOSE UPGRADE',
      style: new TextStyle({ fill:0xf5c84c, fontSize:13, fontFamily:'monospace', fontWeight:'bold', letterSpacing:0.7 }),
    });
    title.anchor.set(0.5);
    title.x = this.W / 2; title.y = panelY + 26;
    this.luContainer.addChild(title);

    choices.forEach((ch, i) => {
      const btn = new Container();
      const g = new Graphics();
      g.roundRect(0, 0, bw, 64, 6).fill(0x182230).stroke({ color:ch.color, width:2 });
      g.rect(0, 0, 5, 64).fill(ch.color);
      g.roundRect(12, 12, 40, 40, 5).fill(0x0c121a).stroke({ color:ch.color, width:1, alpha:0.75 });
      btn.addChild(g);

      const iconKey = ch.icon || ch.id || 'heal';
      if (this.iconTextures?.[iconKey]) {
        const icon = new Sprite(this.iconTextures[iconKey]);
        icon.scale.set(2);
        icon.x = 16; icon.y = 16;
        btn.addChild(icon);
      }

      const t = new Text({ text:ch.name, style: new TextStyle({ fill:0xffffff, fontSize:11.5, fontFamily:'monospace', fontWeight:'bold' }) });
      t.x = 60; t.y = 10; btn.addChild(t);

      if (ch.tag) {
        const tag = new Text({ text:ch.tag, style: new TextStyle({ fill:0xf5c84c, fontSize:8.5, fontFamily:'monospace', fontWeight:'bold' }) });
        tag.anchor.set(1, 0);
        tag.x = bw - 10; tag.y = 11;
        btn.addChild(tag);
        const maxTitleW = bw - 60 - tag.width - 18;
        if (t.width > maxTitleW) {
          t.scale.set(maxTitleW / t.width);
        }
      }

      const d = new Text({
        text:ch.desc,
        style: new TextStyle({ fill:0xc2ccd6, fontSize:9.5, fontFamily:'monospace', wordWrap:true, wordWrapWidth:bw - 70 }),
      });
      d.x = 60; d.y = 31; btn.addChild(d);

      btn.x = (this.W - bw) / 2;
      btn.y = panelY + 52 + i * 72;
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointertap', () => this.pickChoice(ch));
      this.luContainer.addChild(btn);
    });
  }

  showCampaignMapModal() {
    if (this.luContainer) {
      this.luContainer.destroy({ children: true });
      this.luContainer = null;
    }
    if (this.campaignMapContainer) this.campaignMapContainer.destroy({ children: true });
    this.campaignMapContainer = new Container();
    this.uiLayer.addChild(this.campaignMapContainer);

    const W = this.W, H = this.H;
    const landscape = W >= H;
    const hudOffset = (this.hudTop ?? (H > W ? 34 : 8)) + 88;
    const panelW = Math.min(landscape ? 680 : 366, W - 16);
    const panelH = landscape
      ? Math.min(352, H - 24)
      : Math.min(548, H - hudOffset - 10);
    const panelX = Math.round((W - panelW) / 2);
    const panelY = landscape
      ? Math.round((H - panelH) / 2)
      : Math.max(hudOffset, Math.round((H - panelH) / 2 + 22));

    const backdrop = new Graphics();
    backdrop.rect(0, 0, W, H).fill({ color: 0x05080d, alpha: 0.72 });
    backdrop.roundRect(panelX + 3, panelY + 5, panelW, panelH, 8).fill({ color: 0x000000, alpha: 0.65 });
    backdrop.roundRect(panelX, panelY, panelW, panelH, 8)
      .fill({ color: 0x0d141e, alpha: 0.98 })
      .stroke({ color: 0xf5c84c, width: 2, alpha: 0.95 });
    this.campaignMapContainer.addChild(backdrop);

    const levelsPerMap = 10;
    const totalStages = CAMPAIGN_MAPS.length * levelsPerMap;
    const selOrder = clamp(this.selectedCheckpointOrder ?? this.unlockedStageOrder ?? 0, 0, totalStages - 1);
    const unlockedMax = this.unlockedStageOrder ?? 0;
    const viewMapIdx = clamp(this.viewingCampaignIndex ?? Math.floor(selOrder / levelsPerMap), 0, CAMPAIGN_MAPS.length - 1);
    const viewMap = CAMPAIGN_MAPS[viewMapIdx] || CAMPAIGN_MAPS[0];

    const title = new Text({
      text: 'STAGE CLEARED! · CAMPAIGN CHECKPOINT MAP',
      style: new TextStyle({ fill: 0xf5c84c, fontSize: landscape ? 12 : 12.5, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 0.6 }),
    });
    title.anchor.set(0.5);
    title.x = Math.round(W / 2);
    title.y = panelY + (landscape ? 13 : 16);
    this.campaignMapContainer.addChild(title);

    const savedTag = this.lastAutoSavedCampaign !== null
      ? `✓ CAMPAIGN ${this.lastAutoSavedCampaign + 1} AUTO-SAVED`
      : '✓ CHECKPOINT AUTO-SAVED';
    const sub = new Text({
      text: `${savedTag} · 10 CAMPAIGNS × 10 LEVELS · NEW CAMPAIGN RESETS LOADOUT`,
      style: new TextStyle({ fill: 0x6bffb0, fontSize: landscape ? 7.5 : 8, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    if (sub.width > panelW - 24) {
      sub.scale.set((panelW - 24) / sub.width);
    }
    sub.anchor.set(0.5);
    sub.x = Math.round(W / 2);
    sub.y = panelY + (landscape ? 26 : 30);
    this.campaignMapContainer.addChild(sub);

    const innerW = panelW - 24;
    // 1. 10 Campaign Selector Tabs (C1 .. C10)
    const tabGap = 3;
    const tabW = Math.floor((innerW - tabGap * (CAMPAIGN_MAPS.length - 1)) / CAMPAIGN_MAPS.length);
    const tabH = landscape ? 20 : 22;
    const tabY = panelY + (landscape ? 35 : 40);
    CAMPAIGN_MAPS.forEach((cm, cIdx) => {
      const cStartOrder = cIdx * levelsPerMap;
      const cUnlocked = cStartOrder <= unlockedMax;
      const cAllCleared = cm.levels.every((_, l) => this.clearedStages?.has(cStartOrder + l));
      const cActive = cIdx === viewMapIdx;
      const tab = new Container();
      tab.x = panelX + 12 + cIdx * (tabW + tabGap);
      tab.y = tabY;
      const tg = new Graphics();
      const tBorder = cActive ? 0xf5c84c : (cAllCleared ? 0x6bffb0 : (cUnlocked ? 0x6b9fff : 0x34414e));
      const tFill = cActive ? 0x293b52 : (cUnlocked ? 0x162230 : 0x0b1017);
      tg.roundRect(0, 0, tabW, tabH, 4)
        .fill({ color: tFill, alpha: 0.96 })
        .stroke({ color: tBorder, width: cActive ? 1.8 : 1 });
      tab.addChild(tg);
      const tt = new Text({
        text: `C${cIdx + 1}`,
        style: new TextStyle({ fill: cActive ? 0xfff3c4 : (cUnlocked ? 0xffffff : 0x64748b), fontSize: 8, fontFamily: 'monospace', fontWeight: 'bold' }),
      });
      tt.anchor.set(0.5);
      tt.x = Math.round(tabW / 2);
      tt.y = Math.round(tabH / 2);
      tab.addChild(tt);
      tab.eventMode = 'static';
      tab.cursor = 'pointer';
      tab.on('pointertap', () => {
        this.sfx.play('select');
        this.viewingCampaignIndex = cIdx;
        if (cUnlocked) {
          let targetOrder = cStartOrder;
          for (let l = 0; l < levelsPerMap; l++) {
            if (cStartOrder + l <= unlockedMax) targetOrder = cStartOrder + l;
          }
          this.selectedCheckpointOrder = targetOrder;
        }
        this.showCampaignMapModal();
      });
      this.campaignMapContainer.addChild(tab);
    });

    // 2. Active Campaign Header Banner
    const hdrY = tabY + tabH + (landscape ? 4 : 6);
    const propKeys = ['tree', 'mountain', 'watchtower', 'pine', 'banner', 'castle', 'house', 'tent', 'tree', 'castle'];
    const pKey = propKeys[viewMapIdx % propKeys.length];
    const sPropMap = this.propTextures?.[this.activeSeason] || this.propTextures;
    if (sPropMap?.[pKey]) {
      const rp = new Sprite(sPropMap[pKey]);
      rp.scale.set(0.28);
      rp.x = panelX + 12;
      rp.y = hdrY - 2;
      this.campaignMapContainer.addChild(rp);
    }
    const mapLabel = new Text({
      text: `CAMPAIGN ${viewMapIdx + 1}/10: ${viewMap.name.toUpperCase()} (10 LEVELS × 5 WAVES)`,
      style: new TextStyle({ fill: 0xe6dec8, fontSize: landscape ? 8.5 : 9, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    mapLabel.x = panelX + 28;
    mapLabel.y = hdrY;
    this.campaignMapContainer.addChild(mapLabel);

    // 3. 10 Illustrated Level Checkpoint Cards (X-1 through X-10) in a 2-column (Portrait) or 5x2 (Landscape) grid
    const listStartY = hdrY + (landscape ? 14 : 16);
    const bottomBlockH = landscape ? 98 : 110;
    const availListH = panelH - (listStartY - panelY) - bottomBlockH - 6;

    const cols = landscape ? 5 : 2;
    const rows = landscape ? 2 : 5;
    const colGap = 6;
    const rowGap = 5;
    const cardW = Math.floor((innerW - colGap * (cols - 1)) / cols);
    const cardH = Math.max(36, Math.floor((availListH - rowGap * (rows - 1)) / rows));

    viewMap.levels.forEach((lv, lIdx) => {
      const order = viewMapIdx * levelsPerMap + lIdx;
      const isUnlocked = order <= unlockedMax;
      const isCleared = this.clearedStages?.has(order);
      const isSelected = order === selOrder;
      const cCol = lIdx % cols;
      const cRow = Math.floor(lIdx / cols);
      const cx = panelX + 12 + cCol * (cardW + colGap);
      const cy = listStartY + cRow * (cardH + rowGap);

      const node = new Container();
      node.x = cx;
      node.y = cy;
      const g = new Graphics();
      const borderCol = isSelected ? 0xf5c84c : (isCleared ? 0x6bffb0 : (isUnlocked ? 0x6b9fff : 0x34414e));
      const fillCol = isSelected ? 0x202f42 : (isUnlocked ? 0x15202e : 0x0c1118);
      g.roundRect(0, 0, cardW, cardH, 5)
        .fill({ color: fillCol, alpha: 0.96 })
        .stroke({ color: borderCol, width: isSelected ? 2.2 : 1.3 });
      node.addChild(g);

      const thumbW = landscape ? 38 : 44;
      const thumbH = cardH - 8;
      const thumbIdx = order % (this.stageTextures?.length || 9);
      if (this.stageTextures?.[thumbIdx]) {
        const thumb = new Sprite(this.stageTextures[thumbIdx]);
        thumb.x = 4;
        thumb.y = 4;
        thumb.width = thumbW;
        thumb.height = thumbH;
        thumb.tint = isUnlocked ? 0xffffff : 0x45505e;
        node.addChild(thumb);
      }
      const thumbFrame = new Graphics();
      thumbFrame.rect(4, 4, thumbW, thumbH)
        .stroke({ color: isSelected ? 0xf5c84c : 0x3b4d63, width: 1 });
      node.addChild(thumbFrame);

      const bossSpec = lv.levelBoss || viewMap.boss;
      const bossKey = bossSpec.spriteType && this.enemyTextures?.[bossSpec.spriteType] ? bossSpec.spriteType : 'elite';
      if (this.enemyTextures?.[bossKey]?.[0]) {
        const bossSp = new Sprite(this.enemyTextures[bossKey][0]);
        bossSp.anchor.set(0.5, 0.6);
        bossSp.scale.set(0.46);
        bossSp.x = 4 + Math.round(thumbW / 2);
        bossSp.y = 4 + Math.round(thumbH / 2) + 2;
        bossSp.tint = isUnlocked ? 0xffffff : 0x2a333d;
        node.addChild(bossSp);
      }

      const textX = 4 + thumbW + 5;
      const maxTxtW = cardW - textX - 4;
      const statusSym = isCleared ? '✓' : (isUnlocked ? '★' : '🔒');
      const tagCol = isCleared ? 0x6bffb0 : (isUnlocked ? 0xf5c84c : 0x687685);
      const st = new Text({
        text: `${viewMapIdx + 1}-${lIdx + 1} ${statusSym}`,
        style: new TextStyle({ fill: tagCol, fontSize: 8, fontFamily: 'monospace', fontWeight: 'bold' }),
      });
      st.x = textX;
      st.y = 4;
      node.addChild(st);

      const nm = new Text({
        text: lv.name,
        style: new TextStyle({ fill: isUnlocked ? 0xffffff : 0x687685, fontSize: 7.5, fontFamily: 'monospace', fontWeight: 'bold' }),
      });
      if (nm.width > maxTxtW) nm.scale.set(maxTxtW / nm.width);
      nm.x = textX;
      nm.y = Math.round(cardH / 2) - 2;
      node.addChild(nm);

      const bs = new Text({
        text: bossSpec.name,
        style: new TextStyle({ fill: isUnlocked ? 0xff9e80 : 0x525e6b, fontSize: 7, fontFamily: 'monospace' }),
      });
      if (bs.width > maxTxtW) bs.scale.set(maxTxtW / bs.width);
      bs.x = textX;
      bs.y = cardH - 12;
      node.addChild(bs);

      if (isUnlocked) {
        node.eventMode = 'static';
        node.cursor = 'pointer';
        node.on('pointertap', () => {
          this.sfx.play('select');
          this.selectedCheckpointOrder = order;
          this.showCampaignMapModal();
        });
      }
      this.campaignMapContainer.addChild(node);
    });

    const selMapIdx = Math.floor(selOrder / levelsPerMap);
    const selLvIdx = selOrder % levelsPerMap;
    const selMap = CAMPAIGN_MAPS[selMapIdx] || CAMPAIGN_MAPS[0];
    const selLv = selMap.levels[selLvIdx] || selMap.levels[0];
    const selBoss = selLv.levelBoss || selMap.boss;
    const uniqueEnemyKeys = [...new Set(selLv.enemies || ['soldier', 'archer'])];

    const infoH = landscape ? 56 : 60;
    const infoY = panelY + panelH - infoH - (landscape ? 40 : 46);
    const infoBox = new Graphics();
    infoBox.roundRect(panelX + 12, infoY, innerW, infoH, 5)
      .fill({ color: 0x131d29, alpha: 0.96 })
      .stroke({ color: 0x58738e, width: 1.2 });
    this.campaignMapContainer.addChild(infoBox);

    // Selected Stage Large Diorama Thumbnail + Boss Portrait on the left of the Briefing Box
    const pvW = landscape ? 74 : 74;
    const pvH = infoH - 10;
    const selThumbIdx = selOrder % (this.stageTextures?.length || 9);
    if (this.stageTextures?.[selThumbIdx]) {
      const pv = new Sprite(this.stageTextures[selThumbIdx]);
      pv.x = panelX + 17;
      pv.y = infoY + 5;
      pv.width = pvW;
      pv.height = pvH;
      this.campaignMapContainer.addChild(pv);
    }
    const pvBorder = new Graphics();
    pvBorder.rect(panelX + 17, infoY + 5, pvW, pvH)
      .stroke({ color: 0xf5c84c, width: 1.2 });
    this.campaignMapContainer.addChild(pvBorder);

    const selBossKey = selBoss.spriteType && this.enemyTextures?.[selBoss.spriteType] ? selBoss.spriteType : 'elite';
    if (this.enemyTextures?.[selBossKey]?.[0]) {
      const bossFrame = new Graphics();
      bossFrame.roundRect(panelX + 17 + pvW + 5, infoY + 5, pvH, pvH, 4)
        .fill({ color: 0x0c121a })
        .stroke({ color: selBoss.color || 0xff6b6b, width: 1.2 });
      this.campaignMapContainer.addChild(bossFrame);
      const bp = new Sprite(this.enemyTextures[selBossKey][0]);
      bp.anchor.set(0.5, 0.6);
      bp.scale.set(landscape ? 0.82 : 0.88);
      bp.x = panelX + 17 + pvW + 5 + Math.round(pvH / 2);
      bp.y = infoY + 5 + Math.round(pvH / 2) + 1;
      this.campaignMapContainer.addChild(bp);
    }

    const textLeft = panelX + 17 + pvW + pvH + 12;
    const selWeather = WEATHER_TYPES[selLv.weather || 'clear'] || WEATHER_TYPES.clear;
    const selSeason = SEASONS[selLv.season || 'spring'] || SEASONS.spring;
    const infoTitle = new Text({
      text: `C${selMapIdx + 1}-${selLvIdx + 1}: ${selLv.name.toUpperCase()} (${selSeason.short}/${selWeather.short})`,
      style: new TextStyle({ fill: 0xfff3c4, fontSize: 8.5, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    const maxInfoW = panelX + panelW - 16 - textLeft;
    if (infoTitle.width > maxInfoW) {
      infoTitle.scale.set(maxInfoW / infoTitle.width);
    }
    infoTitle.x = textLeft;
    infoTitle.y = infoY + 4;
    this.campaignMapContainer.addChild(infoTitle);

    const bossTitle = new Text({
      text: `BOSS: ${selBoss.name.toUpperCase()} (${(selBoss.title || 'General').toUpperCase()})`,
      style: new TextStyle({ fill: 0xff9e80, fontSize: 8, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    bossTitle.x = textLeft;
    bossTitle.y = infoY + 16;
    this.campaignMapContainer.addChild(bossTitle);

    const badgeY = infoY + (landscape ? 31 : 33);
    const badgeSize = 20;
    const foesLbl = new Text({
      text: 'FOES:',
      style: new TextStyle({ fill: 0x9ec5e8, fontSize: 8, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    foesLbl.x = textLeft;
    foesLbl.y = badgeY + 5;
    this.campaignMapContainer.addChild(foesLbl);

    // Framed 20x20 minion icon badges (with full names in landscape, compact badges in portrait)
    uniqueEnemyKeys.forEach((ek, idx) => {
      const step = landscape ? 94 : 25;
      const bx = textLeft + 32 + idx * step;
      const slot = new Graphics();
      slot.roundRect(bx, badgeY, badgeSize, badgeSize, 3)
        .fill({ color: 0x0c131d })
        .stroke({ color: ENEMY_TYPES[ek]?.color || 0x58738e, width: 1 });
      this.campaignMapContainer.addChild(slot);
      if (this.enemyTextures?.[ek]?.[0]) {
        const es = new Sprite(this.enemyTextures[ek][0]);
        es.anchor.set(0.5, 0.6);
        es.scale.set(0.38);
        es.x = bx + 10;
        es.y = badgeY + 10;
        this.campaignMapContainer.addChild(es);
      }
      if (landscape) {
        const shortName = ENEMY_TYPES[ek]?.name.split(' ').pop() || ek;
        const et = new Text({
          text: shortName,
          style: new TextStyle({ fill: 0xdbe6f2, fontSize: 7.5, fontFamily: 'monospace' }),
        });
        et.x = bx + 24;
        et.y = badgeY + 5;
        this.campaignMapContainer.addChild(et);
      }
    });
    const deployBtn = new Container();
    const btnW = innerW, btnH = landscape ? 32 : 36;
    deployBtn.x = panelX + 12;
    deployBtn.y = panelY + panelH - btnH - 6;
    const btnBg = new Graphics();
    btnBg.roundRect(0, 0, btnW, btnH, 6)
      .fill({ color: 0xb93829 })
      .stroke({ color: 0xf5c84c, width: 2 });
    deployBtn.addChild(btnBg);
    const btnTxt = new Text({
      text: `DEPLOY TO STAGE ${selMapIdx + 1}-${selLvIdx + 1} · CONTINUE`,
      style: new TextStyle({ fill: 0xfff4d2, fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 0.8 }),
    });
    btnTxt.anchor.set(0.5);
    btnTxt.x = Math.round(btnW / 2);
    btnTxt.y = Math.round(btnH / 2);
    deployBtn.addChild(btnTxt);
    deployBtn.eventMode = 'static';
    deployBtn.cursor = 'pointer';
    deployBtn.on('pointertap', () => this.deployToCheckpoint(selOrder));
    this.campaignMapContainer.addChild(deployBtn);
  }

  triggerMaxLevelAwakening(titleText, color = 0xf5c84c) {
    if (!this.player) return;
    const p = this.player;
    this.sfx.play('evolve');
    this.shake = Math.max(this.shake, 12);
    this.spawnLevelUpVfx(p.x, p.y);
    this.spawnExplosion(p.x, p.y, 0.65, 2.35, color, 0.36);
    this.spawnShockwave(p.x, p.y, 0xf5c84c, 0.45, 2.8, 0.3);
    this.showFloatText(p.x, p.y - 32, `MAX LV AWAKENED: ${titleText.toUpperCase()}!`, 0xffe066);
  }

  describeWeaponUpgrade(w, base) {
    const nextLvl = w.level + 1;
    const isProj = base.type === 'projectile' || base.type === 'magic_bolt';
    const isOrbit = base.type === 'orbit';
    const bonus = nextLvl % 2 === 1
      ? (isOrbit ? '+1 Rotating Blade/Shield, +15% DMG' : (isProj ? '+1 Projectile, +15% DMG' : '+2 Targets/Reach, +15% DMG'))
      : '+15% DMG, +8% Orbit/Area, -5% CD';
    if (nextLvl === 8) {
      const evoSpec = EVOLUTIONS[base.evo];
      return `${bonus} • AWAKENS ${evoSpec ? evoSpec.name.toUpperCase() : 'ULTIMATE'} SPECIAL!`;
    }
    return bonus;
  }

  generateChoices(n) {
    const choices = [];
    const pool = [];
    // weapon upgrades
    for (const w of this.weapons) {
      if (w.level < 8) {
        const base = WEAPONS[w.id];
        const nextLvl = w.level + 1;
        pool.push({
          kind:'wup', id:w.id, icon:w.id,
          name: `${base.name} Lv${nextLvl}`,
          tag: nextLvl === 8 ? 'MAX LV 8' : `LV ${nextLvl}/8`,
          desc: this.describeWeaponUpgrade(w, base),
          color: nextLvl === 8 ? 0xf5c84c : base.color,
          apply: () => {
            w.level++;
            if (w.level >= 8) {
              w.evo = true;
              w.evoId = base.evo;
              const evoSpec = EVOLUTIONS[base.evo];
              this.triggerMaxLevelAwakening(evoSpec ? evoSpec.name : base.name, base.color);
            } else if (this.player) {
              this.spawnShockwave(this.player.x, this.player.y, base.color, 0.35, 1.85, 0.24);
              this.spawnSparkBurst(this.player.x, this.player.y, 0, base.color, 6, 165, 0.85, Math.PI);
              this.showFloatText(this.player.x, this.player.y - 26, `${base.name.toUpperCase()} LV${w.level} UPGRADED!`, base.color);
            }
            this._loadoutDirty = true;
          },
        });
      }
    }
    // new weapon if slots available
    if (this.weapons.length < 6) {
      for (const id in WEAPONS) {
        if (!this.weapons.find(w=>w.id===id)) {
          const base = WEAPONS[id];
          const passName = PASSIVES[base.pass]?.name || base.pass;
          const isDef = base.type === 'orbit';
          pool.push({
            kind:'wnew', id, icon:id, isDefense: isDef,
            name: `New: ${base.name}`,
            tag: isDef ? 'DEFENSE WEAPON' : 'NEW WEAPON',
            desc: `${base.desc} • Pairs w/ ${passName}`,
            color: base.color,
            apply: () => { this.weapons.push({ id, level:1, data:base, evo:false, cdTimer:0 }); this._loadoutDirty = true; },
          });
        }
      }
    }
    // passives
    for (const id in PASSIVES) {
      const p = PASSIVES[id];
      const lvl = this.passives[id] || 0;
      if (lvl < p.max) {
        const pairedWeapon = Object.values(WEAPONS).find((w) => w.pass === id);
        const nextLvl = lvl + 1;
        pool.push({
          kind:'pass', id, icon:id,
          name: `${p.name} Lv${nextLvl}`,
          tag: nextLvl === p.max ? 'MAX SKILL ★' : `PASSIVE ${nextLvl}/${p.max}`,
          desc: nextLvl === p.max
            ? `${p.desc} • AWAKENS MASTERED ${p.name.toUpperCase()} NOVA!`
            : (pairedWeapon ? `${p.desc} • Evolves ${pairedWeapon.name}` : p.desc),
          color: nextLvl === p.max ? 0xf5c84c : p.color,
          apply: () => {
            this.passives[id] = nextLvl;
            this.applyPassive(id);
            if (nextLvl >= p.max) {
              this.triggerMaxLevelAwakening(`${p.name} Mastery`, p.color);
            }
          },
        });
      }
    }
    // summon pets & pet upgrades
    for (const id in PETS) {
      const spec = PETS[id];
      const existing = this.pets.find((pt) => pt.id === id);
      const lvl = existing ? existing.level : 0;
      if (lvl < spec.max) {
        const nextLvl = lvl + 1;
        pool.push({
          kind: 'pet', id, icon: id,
          name: lvl === 0 ? `Summon: ${spec.name}` : `${spec.name} Lv${nextLvl}`,
          tag: lvl === 0 ? 'SUMMON PET' : (nextLvl === spec.max ? 'MAX PET ★' : `PET LV ${nextLvl}/${spec.max}`),
          desc: lvl === 0
            ? `${spec.title} • ${spec.desc}`
            : (nextLvl === spec.max
              ? `+45% Ultimate Pet DMG & Awakened ${spec.name} Special!`
              : `+25% Pet DMG, -8% Pet CD • ${spec.desc}`),
          color: nextLvl === spec.max ? 0xf5c84c : spec.color,
          apply: () => {
            this.summonPet(id);
            if (nextLvl >= spec.max) {
              this.triggerMaxLevelAwakening(`${spec.name} Awakened`, spec.color);
            }
          },
        });
      }
    }
    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // Ensure at least 1 Defensive Orbit Weapon ('flying_blades' or 'bagua_shields') is offered if available!
    const seen = new Set();
    const defCandidate = pool.find((c) => c.id === 'flying_blades' || c.id === 'bagua_shields');
    if (defCandidate) {
      seen.add(defCandidate.id + defCandidate.kind);
      choices.push(defCandidate);
    }
    for (const c of pool) {
      if (seen.has(c.id + c.kind)) continue;
      seen.add(c.id + c.kind);
      choices.push(c);
      if (choices.length >= n) break;
    }
    while (choices.length < n) {
      choices.push({
        id:'heal', icon:'heal', name:'War Ration', tag:'RECOVERY', desc:'Restore +30 HP immediately', color:0xff6b6b,
        apply: () => { this.player.hp = Math.min(this.player.maxHp, this.player.hp+30); },
      });
    }
    return choices;
  }

  applyPassive() {
    this.recomputeStats();
    this._loadoutDirty = true;
  }

  pickChoice(ch) {
    this.sfx.play('upgrade');
    ch.apply();
    if (this._loadoutDirty) this.renderHudSlots();
    if (this.luContainer) {
      this.luContainer.destroy({ children: true });
      this.luContainer = null;
    }
    this.state = 'playing';
    if (this.pendingNextWave) {
      const nextW = this.pendingNextWave;
      this.pendingNextWave = null;
      this.startWave(nextW);
    }
  }

  showFloatText(x, y, text, color) {
    if (this.textPool.active.length >= 6) return;
    const entry = this.textPool.acquire();
    entry.active = true;
    const t = entry.sprite;
    if (t.text !== text) t.text = text;
    t.tint = color;
    t.visible = true;
    t.alpha = 1;
    t.x = Math.round(x); t.y = Math.round(y);
    this.particles.push({ g:t, x, y, vx:0, vy:-56, gravity:40, life:0.55, maxLife:0.55, isText:true, pooled:'text', poolObject:entry });
  }

  spawnHitSpark(x, y, color = 0xffffff, scale = 0.85, life = 0.22, vx = 0, vy = 0) {
    if (this.hitPool.active.length >= 20) return;
    const spark = this.hitPool.acquire();
    spark.active = true;
    const frames = this.vfxFrames?.hit;
    if (frames?.[0]) spark.sprite.texture = frames[0];
    spark.sprite.visible = true;
    spark.sprite.alpha = 0.98;
    spark.sprite.tint = color || 0xffffff;
    const sc = Math.max(0.75, scale * 1.45);
    spark.sprite.scale.set(sc);
    spark.sprite.x = Math.round(x);
    spark.sprite.y = Math.round(y);
    this.particles.push({
      g: spark.sprite, x, y, vx, vy, life, maxLife: life,
      frames, lastFrame: 0, startAlpha: 0.98,
      isSlash: true, pooled: 'hit', poolObject: spark,
    });
  }

  spawnHealVfx(x, y) {
    if (!this.healPool || this.healPool.active.length >= 8) return;
    const entry = this.healPool.acquire();
    entry.active = true;
    const frames = this.vfxFrames?.heal;
    const s = entry.sprite;
    if (frames?.[0]) s.texture = frames[0];
    s.visible = true;
    s.alpha = 0.96;
    s.tint = 0xffffff;
    s.scale.set(1.35);
    s.x = Math.round(x);
    s.y = Math.round(y);
    this.particles.push({
      g: s, x, y, vx: 0, vy: 0, life: 0.55, maxLife: 0.55,
      frames, lastFrame: 0, startAlpha: 0.96,
      pooled: 'heal', poolObject: entry,
    });
  }

  spawnLevelUpVfx(x, y) {
    if (!this.levelupPool || this.levelupPool.active.length >= 6) return;
    const entry = this.levelupPool.acquire();
    entry.active = true;
    const frames = this.vfxFrames?.levelup;
    const s = entry.sprite;
    if (frames?.[0]) s.texture = frames[0];
    s.visible = true;
    s.alpha = 0.98;
    s.tint = 0xffffff;
    s.scale.set(1.5);
    s.x = Math.round(x);
    s.y = Math.round(y);
    this.particles.push({
      g: s, x, y, vx: 0, vy: 0, life: 0.65, maxLife: 0.65,
      frames, lastFrame: 0, startAlpha: 0.98,
      pooled: 'levelup', poolObject: entry,
    });
  }

  spawnShockwave(x, y, color = 0xffffff, startScale = 0.35, endScale = 1.45, life = 0.22) {
    if (this.ringPool.active.length >= 14) return;
    const entry = this.ringPool.acquire();
    entry.active = true;
    const s = entry.sprite;
    s.visible = true;
    s.alpha = 0.92;
    s.tint = color;
    s.scale.set(startScale);
    s.x = Math.round(x);
    s.y = Math.round(y);
    this.particles.push({
      g:s, x, y, vx:0, vy:0, life, maxLife:life, startAlpha:0.92,
      pooled:'ring', poolObject:entry,
      baseScaleX:startScale, baseScaleY:startScale,
      endScaleX:endScale, endScaleY:endScale,
    });
  }

  spawnExplosion(x, y, startScale = 0.95, endScale = 2.6, tint = 0xffffff, life = 0.52, spin = 0) {
    if (!this.explosionPool || this.explosionPool.active.length >= 16) return;
    const entry = this.explosionPool.acquire();
    entry.active = true;
    const frames = this.vfxFrames?.explosion;
    const s = entry.sprite;
    if (frames?.[0]) s.texture = frames[0];
    s.visible = true;
    s.alpha = 0.98;
    s.tint = tint;
    const sc = Math.max(1.2, endScale * 0.72);
    s.scale.set(sc);
    s.rotation = 0;
    s.x = Math.round(x);
    s.y = Math.round(y);
    this.particles.push({
      g: s, x, y, vx: 0, vy: 0, life, maxLife: life,
      frames, lastFrame: 0, startAlpha: 0.98, spin: 0,
      pooled: 'explosion', poolObject: entry,
    });
  }

  spawnSparkBurst(x, y, ang, color = 0xfff0a8, count = 2, speed = 140, scale = 0.68, spread = 0.6) {
    for (let i = 0; i < count; i++) {
      if (this.sparkPool.active.length >= 24) break;
      const entry = this.sparkPool.acquire();
      entry.active = true;
      const s = entry.sprite;
      const a = ang + (i - (count - 1) / 2) * spread + (Math.random() - 0.5) * 0.18;
      const sp = speed * (0.85 + Math.random() * 0.3);
      s.visible = true;
      s.alpha = 1;
      s.tint = i % 2 === 0 ? 0xffffff : color;
      s.scale.set(scale * 1.25, scale * 0.75);
      s.rotation = a;
      s.x = Math.round(x);
      s.y = Math.round(y);
      this.particles.push({
        g:s, x, y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp,
        life:0.16, maxLife:0.16,
        pooled:'spark', poolObject:entry,
        baseScaleX:scale * 1.25, baseScaleY:scale * 0.75,
        endScaleX:scale * 0.35, endScaleY:scale * 0.25,
      });
    }
  }

  spawnSlash(x, y, color, area, ang = 0) {
    const cx = x + Math.cos(ang) * 22 * area;
    const cy = y + Math.sin(ang) * 22 * area;
    const entry = this.slashPool.acquire();
    entry.active = true;
    const frames = this.vfxFrames?.slash;
    const sprite = entry.sprite;
    if (frames?.[0]) sprite.texture = frames[0];
    sprite.visible = true;
    sprite.alpha = 0.98;
    sprite.tint = color;
    const sc = 1.55 * area;
    sprite.scale.set(sc);
    sprite.rotation = ang + Math.PI / 4;
    sprite.x = Math.round(cx); sprite.y = Math.round(cy);
    this.particles.push({
      g: sprite, x: cx, y: cy, vx: Math.cos(ang) * 35, vy: Math.sin(ang) * 35,
      life: 0.34, maxLife: 0.34, frames, lastFrame: 0, startAlpha: 0.98,
      isSlash: true, pooled: 'slash', poolObject: entry,
    });
    this.spawnSparkBurst(cx, cy, ang, color, 3, 155, 0.72, 0.65);
  }

  spawnThrust(x, y, ang, len, color) {
    const entry = this.thrustPool.acquire();
    entry.active = true;
    const frames = this.vfxFrames?.thrust;
    const sprite = entry.sprite;
    if (frames?.[0]) sprite.texture = frames[0];
    sprite.visible = true;
    sprite.alpha = 0.98;
    sprite.tint = color;
    const sx = (len / 54) * 1.15, sy = 1.15;
    sprite.scale.set(sx, sy);
    sprite.rotation = ang;
    const startX = x + Math.cos(ang) * len * 0.46;
    const startY = y + Math.sin(ang) * len * 0.46;
    sprite.x = Math.round(startX);
    sprite.y = Math.round(startY);
    this.particles.push({
      g: sprite, x: startX, y: startY,
      vx: Math.cos(ang) * 90, vy: Math.sin(ang) * 90,
      life: 0.32, maxLife: 0.32, frames, lastFrame: 0, startAlpha: 0.98,
      isSlash: true, pooled: 'thrust', poolObject: entry,
    });
    const tipX = x + Math.cos(ang) * len * 0.82;
    const tipY = y + Math.sin(ang) * len * 0.82;
    this.spawnSparkBurst(tipX, tipY, ang, color, 3, 175, 0.75, 0.45);
  }

  spawnSpin(x, y, area, color) {
    const entry = this.spinPool.acquire();
    entry.active = true;
    const frames = this.vfxFrames?.whirlwind;
    const sprite = entry.sprite;
    if (frames?.[0]) sprite.texture = frames[0];
    sprite.visible = true;
    sprite.alpha = 0.96;
    sprite.tint = color;
    const sc = 2.15 * area;
    sprite.scale.set(sc);
    sprite.rotation = 0;
    sprite.x = Math.round(x); sprite.y = Math.round(y);
    this.particles.push({
      g: sprite, x, y, vx: 0, vy: 0, life: 0.42, maxLife: 0.42,
      frames, lastFrame: 0, startAlpha: 0.96,
      isSlash: true, spin: 4.5, pooled: 'spin', poolObject: entry,
    });
    this.spawnSparkBurst(x, y, Math.random() * Math.PI * 2, color, 4, 150, 0.75, Math.PI / 2);
  }

  flashScreen() {
    if (this.playerSprite) this.playerSprite.tint = 0xff6b6b;
  }

  renderPlayer() {
    const p = this.player;
    const sprite = this.playerSprite;
    if (!sprite) return;
    const attacking = p.attackTimer > 0;
    const direction = attacking ? p.attackDirection : p.direction;
    const dirIndex = { down:0, left:1, right:2, up:3 }[direction] ?? 0;
    const frames = attacking
      ? this.heroAttackFrames[this.hero.id][dirIndex]
      : this.heroFrames[this.hero.id][dirIndex];
    if (sprite.textures !== frames) {
      sprite.textures = frames;
      sprite.currentFrame = 0;
    }
    if (attacking) {
      const progress = 1 - p.attackTimer / p.attackDuration;
      sprite.currentFrame = Math.min(frames.length - 1, Math.floor(progress * frames.length));
    } else if (p.moving) {
      sprite.currentFrame = Math.floor(this.animTime * 9) % frames.length;
    } else {
      sprite.currentFrame = 0;
    }
    sprite.x = Math.round(p.x);
    sprite.y = Math.round(p.y);
    sprite.tint = p.invuln > 0 ? 0xff8888 : 0xffffff;
    sprite.alpha = p.invuln > 0 && Math.floor(this.animTime * 14) % 2 === 0 ? 0.65 : 1;
    this.playerShadow.x = Math.round(p.x);
    this.playerShadow.y = Math.round(p.y);
    this.playerShadow.alpha = 0.85;
  }

  renderEnemies() {
    const g = this.enemyLayer;
    g.clear();
    const cx = this.camX || 0;
    const cy = this.camY || 0;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const s = e.sprite;
      s.x = Math.round(e.x);
      const bob = Math.sin(this.animTime * 8 + e.x * 0.05 + e.y * 0.03) * 1.5;
      s.y = Math.round(e.y + bob);
      s.alpha = 1;
      const frame = Math.floor(this.animTime * 8 + e.phase * 4) % this.enemyTextures[e.type].length;
      if (e.frame !== frame) {
        e.frame = frame;
        s.texture = this.enemyTextures[e.type][frame];
      }
      const sc = e.baseScale || 1;
      const dirSign = (e.isBird && (e.flyVx || 0) < 0) ? -1 : 1;
      if (e.hitFlash > 0) {
        s.tint = 0xfff0b0;
        s.scaleX = sc * 1.16 * dirSign;
        s.scaleY = sc * 0.86;
      } else {
        s.tint = e.baseTint || 0xffffff;
        s.scaleX = sc * dirSign;
        s.scaleY = sc;
      }
      // Overhead Health Bar for all on-screen horde enemies, warlord bosses, and Colossal Kaiju Godzilla Titans!
      if (e.hp > 0 && !e.isBird && Math.abs(e.x - cx) < 360 && Math.abs(e.y - cy) < 500) {
        const ratio = clamp(e.hp / (e.maxHp || 1), 0, 1);
        const bw = e.isKaiju ? 68 : (e.isBoss ? 36 : 20);
        const bh = e.isKaiju ? 5 : (e.isBoss ? 4 : 2.5);
        const bx = Math.round(e.x - bw / 2);
        const by = Math.round(e.y - e.size - (e.isKaiju ? 22 : (e.isBoss ? 14 : 9)));
        const barCol = e.isKaiju
          ? 0x00f5d4
          : (e.isBoss ? 0xff3b3b : (ratio > 0.55 ? 0x4ade80 : (ratio > 0.25 ? 0xfbbf24 : 0xef4444)));
        g.rect(bx - 1, by - 1, bw + 2, bh + 2).fill(0x0c0e14);
        g.rect(bx, by, Math.max(1, Math.round(bw * ratio)), bh).fill(barCol);
      }
    }
  }
  renderProjectiles() {
    for (const pr of this.projectiles) {
      if (!pr.active) continue;
      pr.sprite.visible = true;
      pr.sprite.x = pr.x;
      pr.sprite.y = pr.y;
      pr.sprite.rotation = Math.atan2(pr.vy, pr.vx);
      const scale = pr.size / 6;
      pr.sprite.scale.set(scale);
    }
  }
  renderGems() {
    for (const gm of this.gems) {
      if (!gm.active) continue;
      gm.sprite.visible = true;
      gm.sprite.x = gm.x;
      gm.sprite.y = gm.y + Math.sin(this.animTime * 6 + gm.x * 0.03) * 2;
      gm.sprite.scale.set(0.8 + Math.min(gm.val, 5) * 0.08);
    }
  }
  renderItems() {
    for (const it of this.items) {
      if (!it.active) continue;
      it.sprite.visible = true;
      it.sprite.x = Math.round(it.x);
      it.sprite.y = Math.round(it.y + Math.sin(this.animTime * 5 + it.phase) * 2.5);
      const pulse = 1.2 + Math.sin(this.animTime * 7 + it.phase) * 0.1;
      it.sprite.scale.set(pulse);
    }
  }
  renderChests() {
    for (const c of this.chests) {
      const bob = Math.sin(c.t*3)*4;
      c.sprite.x = c.x;
      c.sprite.y = c.y + bob;
    }
  }
  renderParticles() {
    // burst particles handled in updateParticles; nothing extra
  }

  updateHud() {
    const p = this.player;
    const hudTop = this.hudTop ?? (this.H > this.W ? 34 : 8);
    const barX = this.hudBarX ?? 18;
    const barW = this.hudBarW ?? (this.W - 36);
    if (this._loadoutDirty) this.renderHudSlots();
    const hpRatio = Math.max(0, p.hp / p.maxHp);
    const hpQuant = Math.round(hpRatio * 100);
    if (hpQuant !== this._lastHpQuant) {
      this._lastHpQuant = hpQuant;
      const hpW = Math.round(Math.min(136, barW * 0.42));
      this.hudHp.clear();
      if (hpRatio > 0) this.hudHp.roundRect(barX, hudTop + 18, Math.round(hpW * hpRatio), 6, 2).fill(0xe5484d);
    }
    const xpRatio = Math.max(0, Math.min(1, this.xp / this.xpNext));
    const xpQuant = Math.round(xpRatio * 200);
    if (xpQuant !== this._lastXpQuant) {
      this._lastXpQuant = xpQuant;
      this.hudXp.clear();
      if (xpRatio > 0) this.hudXp.roundRect(barX, hudTop + 6, Math.round(barW * xpRatio), 7, 3).fill(0x4c8dff);
    }
    const { map, stage, mapNum, levelNum, totalDuration } = this.getStageSpec();
    const bossActive = Boolean(this.stageBoss && this.stageBoss.active && this.stageBoss.hp > 0);
    const waveRatio = bossActive
      ? clamp(this.stageBoss.hp / this.stageBoss.maxHp, 0, 1)
      : clamp(this.stageProgress / totalDuration, 0, 1);
    const waveQuant = Math.round(waveRatio * 200);
    if (waveQuant !== this._lastWaveQuant || bossActive !== this._lastWaveBossMode) {
      this._lastWaveQuant = waveQuant;
      this._lastWaveBossMode = bossActive;
      this.hudWaveFill.clear();
      if (waveRatio > 0) {
        const fillCol = bossActive ? 0xe5484d : (stage.bossStage && this.currentWave === stage.waves ? 0xff9f43 : 0xd4a017);
        this.hudWaveFill.roundRect(barX, hudTop + 29, Math.round(barW * waveRatio), 11, 3).fill(fillCol);
      }
    }
    const pct = Math.round(waveRatio * 100);
    const curWeather = WEATHER_TYPES[this.activeWeather] || WEATHER_TYPES.clear;
    const curSeason = SEASONS[this.activeSeason] || SEASONS.spring;
    const bossName = (this.stageBoss?.bossName || (stage.levelBoss || map.boss).name).toUpperCase();
    const activeFoes = this.getActiveEnemyCount();
    const remainingWaveFoes = Math.max(0, (this.waveTotalEnemies - this.waveSpawnedCount) + activeFoes);
    let waveLabel;
    if (this.finalWaveSpawned) {
      waveLabel = bossActive
        ? `WAVE 5/5 · BOSS: ${bossName} (${Math.ceil(this.stageBoss.hp)}/${Math.ceil(this.stageBoss.maxHp)}) · FOES: ${remainingWaveFoes}`
        : `WAVE 5/5 · BOSS SLAIN! KILL ALL FOES (${remainingWaveFoes} LEFT)`;
    } else {
      waveLabel = `C${mapNum}-${levelNum} · ${curSeason.short}/${curWeather.short} · WAVE ${this.currentWave}/${stage.waves} · FOES: ${remainingWaveFoes}`;
    }
    if (waveLabel !== this._lastHudWaveText) {
      this._lastHudWaveText = waveLabel;
      this.hudWaveText.text = waveLabel;
    }
    const heroText = `${this.hero.name.toUpperCase()} · LV ${this.level}`;
    if (heroText !== this._lastHudText) {
      this._lastHudText = heroText;
      this.hudText.text = heroText;
    }
    const petTag = this.pets.length ? ` · PET: ${this.pets[0].spec.name.split(' ')[0].toUpperCase()} LV${this.pets[0].level}${this.pets.length > 1 ? `+${this.pets.length - 1}` : ''}` : '';
    const perkText = this.perk ? `★ ${this.perk.short}${petTag}` : petTag;
    if (perkText !== this._lastHudPerk) {
      this._lastHudPerk = perkText;
      this.hudPerk.text = perkText;
    }
    const mins = Math.floor(this.time / 60);
    const secs = Math.floor(this.time % 60);
    const timeText = `${mins}:${secs.toString().padStart(2,'0')}`;
    if (timeText !== this._lastHudTime) {
      this._lastHudTime = timeText;
      this.hudTime.text = timeText;
    }
    const goldPart = this.gold > 0 ? ` · G:${this.gold}` : '';
    const killsText = `K:${this.kills}${goldPart} · FOES:${this.enemies.length}`;
    if (killsText !== this._lastHudKills) {
      this._lastHudKills = killsText;
      this.hudKills.text = killsText;
    }
  }

  nearestEnemy(x, y) {
    let best = null, bestD = Infinity;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const d = dist2(e.x, e.y, x, y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }
  nearestEnemies(x, y, n) {
    const cands = this.spatial.query(x, y, 280);
    const pool = cands.length >= n ? cands : this.enemies;
    return pool.filter((e) => e.active)
      .sort((a,b)=>dist2(a.x,a.y,x,y)-dist2(b.x,b.y,x,y))
      .slice(0, n);
  }

  gameOver() {
    this.state = 'gameover';
    this.sfx.play('gameover');
    if (this.goContainer) this.goContainer.destroy({ children:true });
    this.goContainer = new Container();
    this.uiLayer.addChild(this.goContainer);

    const panelW = Math.min(320, this.W - 32);
    const panelH = 266;
    const panelX = (this.W - panelW) / 2;
    const panelY = Math.max((this.hudTop ?? 34) + 98, (this.H - panelH) / 2);

    const panel = new Graphics();
    panel.roundRect(panelX + 4, panelY + 6, panelW, panelH, 8).fill({ color:0x000000, alpha:0.65 });
    panel.roundRect(panelX, panelY, panelW, panelH, 8)
      .fill({ color:0x0f151e, alpha:0.97 })
      .stroke({ color:0xd35f5f, width:2.5, alpha:0.95 });
    panel.roundRect(panelX + 14, panelY + 52, panelW - 28, 132, 6)
      .fill({ color:0x161f2c, alpha:0.95 })
      .stroke({ color:0x2d3a4b, width:1 });
    this.goContainer.addChild(panel);

    const t = new Text({
      text:'FALLEN IN BATTLE',
      style: new TextStyle({ fill:0xff6b6b, fontSize:20, fontFamily:'monospace', fontWeight:'bold', letterSpacing:1.2, stroke:{ color:0x080b10, width:4 } }),
    });
    t.anchor.set(0.5);
    t.x = this.W / 2; t.y = panelY + 28;
    this.goContainer.addChild(t);

    if (this.hero && this.heroFrames?.[this.hero.id]) {
      const portrait = new Sprite(this.heroFrames[this.hero.id][0][0]);
      portrait.anchor.set(0.5, 0.6);
      portrait.scale.set(1.05);
      portrait.x = panelX + 48;
      portrait.y = panelY + 116;
      this.goContainer.addChild(portrait);
    }

    const mins = Math.floor(this.time / 60);
    const secs = Math.floor(this.time % 60).toString().padStart(2, '0');
    const { map, mapNum, levelNum } = this.getStageSpec();
    const summaryLines = [
      `WARRIOR:  ${this.hero ? this.hero.name.toUpperCase() : 'UNKNOWN'} (${this.perk ? this.perk.short : 'NONE'})`,
      `STAGE:    MAP ${mapNum}-${levelNum} (${map.short})  •  LV ${this.level}`,
      `SLAIN:    ${this.kills} FOES   •   TIME ${mins}:${secs}   •   G:${this.gold}`,
    ];
    const s = new Text({
      text: summaryLines.join('\n'),
      style: new TextStyle({ fill:0xe6edf5, fontSize:10.5, fontFamily:'monospace', lineHeight:18 }),
    });
    s.x = panelX + 84;
    s.y = panelY + 64;
    this.goContainer.addChild(s);

    const arsenalLabel = new Text({
      text: 'ARSENAL:',
      style: new TextStyle({ fill:0xf5c84c, fontSize:10, fontFamily:'monospace', fontWeight:'bold' }),
    });
    arsenalLabel.x = panelX + 84;
    arsenalLabel.y = panelY + 128;
    this.goContainer.addChild(arsenalLabel);

    this.weapons.forEach((w, idx) => {
      const wx = panelX + 84 + idx * 30;
      const wy = panelY + 145;
      const base = WEAPONS[w.id];
      const slot = new Graphics();
      slot.roundRect(wx, wy, 24, 24, 3)
        .fill(0x101822)
        .stroke({ color: w.evo ? 0xf5c84c : base.color, width: 1.5 });
      this.goContainer.addChild(slot);
      if (this.iconTextures?.[w.id]) {
        const ic = new Sprite(this.iconTextures[w.id]);
        ic.x = wx + 4; ic.y = wy + 4;
        this.goContainer.addChild(ic);
      }
      const b = new Text({
        text: w.evo ? 'E' : `${w.level}`,
        style: new TextStyle({ fill: w.evo ? 0xffe066 : 0xffffff, fontSize: 8.5, fontFamily: 'monospace', fontWeight: 'bold', stroke:{ color:0x05080d, width:2 } }),
      });
      b.anchor.set(1, 1);
      b.x = wx + 23; b.y = wy + 23;
      this.goContainer.addChild(b);
    });
    const btnW = (panelW - 38) / 2;
    const btnH = 44;
    const btnY = panelY + panelH - btnH - 16;

    const makeBtn = (bx, label, fillCol, strokeCol, textCol, onTap) => {
      const btn = new Container();
      const g = new Graphics();
      g.roundRect(0, 0, btnW, btnH, 5).fill(fillCol).stroke({ color:strokeCol, width:2 });
      btn.addChild(g);
      const bt = new Text({
        text:label,
        style: new TextStyle({ fill:textCol, fontSize:11, fontFamily:'monospace', fontWeight:'bold', letterSpacing:0.5 }),
      });
      bt.anchor.set(0.5);
      bt.x = btnW / 2; bt.y = btnH / 2;
      btn.addChild(bt);
      btn.x = bx; btn.y = btnY;
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointertap', onTap);
      this.goContainer.addChild(btn);
    };

    makeBtn(panelX + 14, 'RETRY RUN', 0xe0b64d, 0xffe7a1, 0x18130b, () => {
      this.goContainer.destroy({ children:true });
      this.goContainer = null;
      this.startRun(this.hero || this.selectedHero);
    });

    makeBtn(panelX + 24 + btnW, 'WARRIOR MENU', 0x1d2735, 0x627388, 0xe8eff7, () => {
      this.goContainer.destroy({ children:true });
      this.goContainer = null;
      this.menuContainer.visible = true;
      this.state = 'menu';
      this.resetRun();
    });
  }
}

function hero_weapon(h) { return h.weapon; }