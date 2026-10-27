import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle, Particle, ParticleContainer, TilingSprite } from 'pixi.js';
import { HEROES, STARTING_PERKS, CAMPAIGN_MAPS, WEATHER_TYPES, WEAPONS, EVOLUTIONS, PASSIVES, ENEMY_TYPES, LEVEL_XP } from './data.js';
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
    this.unlockedStageOrder = 0;
    this.selectedCheckpointOrder = 0;
    this.clearedStages = new Set();
    this.stageProgress = 0;
    this.currentWave = 1;
    this.stageBoss = null;
    this.weapons = []; // {id, level, ...}
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

    window.__spawnEnemies = (n) => { for (let i=0;i<n;i++) this.spawnEnemy(); };
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
    if (this.stageTextures?.[curMapIdx * 3]) {
      const mThumb = new Sprite(this.stageTextures[curMapIdx * 3]);
      mThumb.x = Math.round(3 * s);
      mThumb.y = Math.round(3 * s);
      mThumb.width = Math.round(26 * s);
      mThumb.height = Math.round(16 * s);
      mapBtn.addChild(mThumb);
    }
    const mapTxt = new Text({
      text: `MAP ${curMapIdx + 1}: ${curMap.short}`,
      style: new TextStyle({ fill:0xfff3c4, fontSize:Math.round(8.5 * s), fontFamily:'monospace', fontWeight:'bold' }),
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

  cycleMap() {
    this.sfx.unlock();
    this.selectedMapIndex = ((this.selectedMapIndex || 0) + 1) % CAMPAIGN_MAPS.length;
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
    if (this.appEl) {
      this.appEl.style.backgroundColor = stage.bgColor || map.bgColor || '#263820';
      this.appEl.style.backgroundBlendMode = 'overlay';
      this.appEl.style.filter = 'none';
    }
  }
  startRun(hero, perk = this.selectedPerk, mapIndex = this.selectedMapIndex) {
    this.sfx.unlock();
    this.sfx.play('start');
    this.hero = hero;
    this.perk = perk || this.selectedPerk || STARTING_PERKS[0];
    this.mapIndex = mapIndex ?? this.selectedMapIndex ?? 0;
    this.stageIndex = 0;
    this.unlockedStageOrder = this.mapIndex * 3;
    this.selectedCheckpointOrder = this.unlockedStageOrder;
    this.clearedStages = new Set();
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

    this.time = 0;
    this.itemTimer = 14;
    this.stageProgress = 0;
    this.currentWave = 1;
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
    this.spawnItem('heart', -110, -75);
    this.spawnItem('bomb', 120, -65);
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
    const count = this.activeWeather === 'clear' ? 24 : (this.activeWeather === 'embers' ? 48 : 56);
    for (let i = 0; i < this.weatherDrops.length; i++) {
      const d = this.weatherDrops[i];
      const active = i < count;
      d.sprite.visible = active;
      if (!active) continue;
      d.x = ((i * 73) % 100) * 0.01 * this.W;
      d.y = ((i * 41) % 100) * 0.01 * this.H;
      if (this.activeWeather === 'rain' || this.activeWeather === 'storm') {
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
        d.sprite.tint = i % 2 === 0 ? 0xffe89e : 0x95d5b2;
        d.sprite.scale.set(0.28, 0.28);
        d.sprite.rotation = 0.3;
        d.sprite.alpha = 0.52;
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
        d.x += (24 + Math.cos(this.time * 1.6 + d.phase) * 18) * dt;
        d.y += 34 * sm * dt;
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
    this.player.dmgMul = (1 + (ps.might || 0) * PASSIVES.might.val) * (1 + (pk.dmgBonus || 0));
    this.player.armor = (ps.armor || 0) * PASSIVES.armor.val + (pk.armorBonus || 0);
    this.player.speedMul = (1 + (ps.swiftness || 0) * PASSIVES.swiftness.val) * (1 + (pk.speedBonus || 0));
    this.player.cdMul = Math.pow(1 - PASSIVES.cooldown.val, ps.cooldown || 0) * (1 - (pk.cdBonus || 0));
    this.player.areaMul = (1 + (ps.area || 0) * PASSIVES.area.val) * (1 + (pk.areaBonus || 0));
    this.player.xpMul = (1 + (ps.growth || 0) * PASSIVES.growth.val) * (1 + (pk.xpBonus || 0));
  }

  getWeaponStats(w) {
    const base = WEAPONS[w.id];
    const wd = w.evo ? EVOLUTIONS[w.evoId || base.evo] : null;
    const lvl = Math.max(1, w.level || 1);
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
    return { base, wd, lvl, delta, dmg, area, cd, bonusCount, bonusPierce };
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
    this.hudWaveBg.moveTo(Math.round(barX + barW / 3), hudTop + 29).lineTo(Math.round(barX + barW / 3), hudTop + 40).stroke({ color:0x607084, width:1, alpha:0.7 });
    this.hudWaveBg.moveTo(Math.round(barX + (barW * 2) / 3), hudTop + 29).lineTo(Math.round(barX + (barW * 2) / 3), hudTop + 40).stroke({ color:0x607084, width:1, alpha:0.7 });
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

    const passKeys = Object.keys(this.passives).filter((k) => this.passives[k] > 0);
    const passStartX = startX + 6 * step - (step - slotSize) + groupGap;
    for (let i = 0; i < 6; i++) {
      const sx = passStartX + i * step;
      const item = this.hudSlotItems[6 + i];
      const pid = passKeys[i];
      if (pid) {
        const pdef = PASSIVES[pid];
        const plvl = this.passives[pid];
        bg.rect(sx, slotY, slotSize, slotSize)
          .fill({ color:0x131d28, alpha:0.96 })
          .stroke({ color:pdef.color, width:1.5, alpha:0.95 });
        if (this.iconTextures?.[pid]) {
          item.icon.texture = this.iconTextures[pid];
          item.icon.x = sx + 3;
          item.icon.y = slotY + 2;
          item.icon.visible = true;
        } else {
          item.icon.visible = false;
        }
        bg.rect(sx + slotSize - 10, slotY + slotSize - 10, 10, 10)
          .fill({ color:0x05080d, alpha:0.95 });
        const lbl = `${plvl}`;
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
    this.handleWeapons(dt);
    if (p.attackTimer > 0) p.attackTimer = Math.max(0, p.attackTimer - dt);

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

    // xp check
    if (this.xp >= this.xpNext) this.levelUp();

    // invuln
    if (p.invuln > 0) p.invuln -= dt;

    // render
    this.renderPlayer();
    this.renderEnemies();
    this.renderProjectiles();
    this.renderGems();
    this.renderItems();
    this.renderChests();
    this.renderParticles();

    this.updateHud();
  }

  handleSpawns(dt) {
    const { map, stage } = this.getStageSpec();
    this.updateStageProgression(dt, map, stage);

    // spawn rate increases with stage spawnMul and time
    this.spawnTimer = (this.spawnTimer || 0) - dt;
    if (this.spawnTimer <= 0) {
      const baseInterval = Math.max(0.05, 0.6 - this.time * 0.004);
      this.spawnTimer = Math.max(0.04, baseInterval / (stage.spawnMul || 1));
      const count = 1 + Math.floor(this.time / 60) + (this.currentWave - 1);
      for (let i = 0; i < count; i++) this.spawnEnemy();
    }
    // periodic elite lieutenant every 90s
    this.bossTimer = (this.bossTimer || 90) - dt;
    if (this.bossTimer <= 0) {
      this.bossTimer = 90;
      this.spawnElite();
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
    if (this.stageBoss) {
      if (!this.stageBoss.active || this.stageBoss.hp <= 0) {
        this.stageBoss = null;
        this.advanceStage();
      }
      return;
    }

    this.stageProgress += dt;
    const ratio = clamp(this.stageProgress / totalDuration, 0, 1);
    const wave = Math.min(stage.waves, 1 + Math.floor(ratio * stage.waves));
    if (wave > this.currentWave) {
      this.currentWave = wave;
      this.sfx.play('select');
      this.showFloatText(this.player.x, this.player.y - 26, `WAVE ${wave}/${stage.waves}!`, 0xf5c84c);
      for (let i = 0; i < 6 + wave * 3; i++) this.spawnEnemy();
    }

    if (this.stageProgress >= totalDuration) {
      this.stageProgress = totalDuration;
      const bossSpec = stage.levelBoss || map.boss;
      this.stageBoss = this.spawnMapBoss(map, stage, bossSpec);
      this.sfx.play('hurt');
      this.shake = 12;
      this.showFloatText(this.player.x, this.player.y - 30, `BOSS: ${bossSpec.name.toUpperCase()}!`, 0xff5f5f);
    }
  }

  advanceStage() {
    const curOrder = this.mapIndex * 3 + this.stageIndex;
    this.clearedStages.add(curOrder);
    const nextOrder = Math.min(CAMPAIGN_MAPS.length * 3 - 1, curOrder + 1);
    this.unlockedStageOrder = Math.max(this.unlockedStageOrder || 0, nextOrder);
    this.selectedCheckpointOrder = nextOrder;

    const wasBossStage = this.stageIndex >= 2;
    this.gold += wasBossStage ? 50 : 25;
    const healAmt = Math.round(this.player.maxHp * (wasBossStage ? 0.5 : 0.35));
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
    this.sfx.play('evolve');
    this.spawnLevelUpVfx(this.player.x, this.player.y);
    this.spawnShockwave(this.player.x, this.player.y, 0xf5c84c, 0.4, 2.5, 0.3);

    this.stageBoss = null;
    this.state = 'campaignmap';
    this.showCampaignMapModal(curOrder, nextOrder);
  }

  deployToCheckpoint(stageOrder = this.selectedCheckpointOrder) {
    const clamped = clamp(stageOrder ?? 0, 0, CAMPAIGN_MAPS.length * 3 - 1);
    if (clamped > (this.unlockedStageOrder || 0)) return;
    this.sfx.play('start');
    this.mapIndex = Math.floor(clamped / 3);
    this.stageIndex = clamped % 3;
    this.stageProgress = 0;
    this.currentWave = 1;
    this.stageBoss = null;

    // Clear leftover non-boss enemies/projectiles for clean stage transition
    for (const e of this.enemies) this.enemyPool.release(e);
    this.enemies.length = 0;
    for (const p of this.projectiles) this.projPool.release(p);
    this.projectiles.length = 0;

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
    this.showFloatText(this.player.x, this.player.y - 28, `STAGE ${mapNum}-${levelNum}: ${stage.name.toUpperCase()}!`, 0x6bffb0);
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
    it.sprite.texture = kind === 'bomb' ? this.effectTextures.bomb : this.effectTextures.heart;
    it.sprite.scale.set(1.25);
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
    }
  }

  explodeBomb(x, y) {
    this.sfx.play('bomb');
    this.shake = 18;
    this.flashScreen(0xffae42, 0.28);
    this.spawnExplosion(x, y, 0.75, 3.3, 0xffffff, 0.42, 2.2);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      this.spawnExplosion(x + Math.cos(a) * 58, y + Math.sin(a) * 58, 0.45, 1.85, 0xffb84d, 0.32, i % 2 ? -2.4 : 2.4);
    }
    this.spawnShockwave(x, y, 0xff4d29, 0.5, 4.2, 0.38);
    this.spawnShockwave(x, y, 0xffae42, 0.35, 3.0, 0.28);
    this.spawnShockwave(x, y, 0xfff3b0, 0.2, 1.9, 0.2);
    this.spawnSparkBurst(x, y, 0, 0xffd166, 16, 260, 1.15, Math.PI / 8);
    this.showFloatText(x, y - 36, 'KABOOM!', 0xffe066);
    const blastRadius2 = 250 * 250;
    const blastDmg = 95 * (this.player?.dmgMul || 1);
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
    const r = 420 + Math.random() * 120;
    const x = this.player.x + Math.cos(ang) * r;
    const y = this.player.y + Math.sin(ang) * r;

    const e = this.enemyPool.acquire();
    e.active = true;
    e.type = t;
    e.x = x; e.y = y;
    const frames = this.enemyTextures[t] || this.enemyTextures.soldier;
    e.sprite.texture = frames[0];
    e.sprite.tint = 0xffffff;
    e.sprite.alpha = 1;
    const sc = d.size >= 17 ? 0.95 : 0.82;
    e.baseScale = sc;
    e.sprite.scaleX = sc;
    e.sprite.scaleY = sc;
    e.phase = (this.enemySerial++ * 0.61803398875) % 1;
    e.hp = d.hp * (stage.hpMul || 1) * (1 + this.time * 0.015);
    e.maxHp = e.hp;
    e.speed = d.speed * (stage.speedMul || 1);
    e.dmg = d.dmg * (stage.dmgMul || 1);
    e.size = d.size;
    e.xp = d.xp;
    e.color = d.color;
    e.ranged = !!d.ranged;
    e.explosive = !!d.explosive;
    e.knockResist = d.knockResist || 0;
    e.isBoss = false;
    e.isMapBoss = false;
    e.shootCd = 1.4 + e.phase * 2.2;
    e.hitFlash = 0;
    e.knock = 0;
    e.kx = 0; e.ky = 0;
    this.enemies.push(e);
    return e;
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
    e.hp = b.hp * (stage.hpMul || 1);
    e.maxHp = e.hp;
    e.speed = b.speed;
    e.dmg = b.dmg;
    e.size = 24;
    e.xp = 45;
    e.color = b.color || 0xf5c84c;
    e.ranged = true;
    e.explosive = false;
    e.knockResist = 0.75;
    e.shootCd = 1.2;
    e.isBoss = true;
    e.isMapBoss = true;
    e.bossName = b.name;
    e.hitFlash = 0; e.knock = 0; e.kx = 0; e.ky = 0;
    this.enemies.push(e);
    return e;
  }

  handleWeapons(dt) {
    for (const w of this.weapons) {
      w.cdTimer = (w.cdTimer || 0) - dt;
      if (w.cdTimer <= 0) {
        const stats = this.getWeaponStats(w);
        w.cdTimer = stats.cd;
        this.fireWeapon(w, stats);
      }
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
    const { base, wd, dmg, area, bonusCount, bonusPierce } = stats;
    const type = base.type;

    if (type === 'melee_arc') {
      // slash nearest enemies within range using spatial hash
      const maxTargets = 8 + bonusCount * 2 + (wd ? 4 : 0);
      const cands = this.spatial.query(p.x, p.y, 90 * area + 24);
      const pool = cands.length ? cands : this.enemies;
      const targets = pool.filter((e) => e.active).sort((a,b)=>dist2(a.x,a.y,p.x,p.y)-dist2(b.x,b.y,p.x,p.y)).slice(0, maxTargets);
      const slashAng = targets.length
        ? angleTo(p.x, p.y, targets[0].x, targets[0].y)
        : ({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[p.direction] ?? 0);
      const facing = this.directionFromAngle(slashAng);
      this.beginAttack(facing, 0.28);
      for (const e of targets) {
        if (dist2(e.x,e.y,p.x,p.y) < (90*area)**2) {
          this.damageEnemy(e, dmg, p.x, p.y);
        }
      }
      this.sfx.play('slash');
      const col = wd ? wd.color : 0x5fd38d;
      this.spawnSlash(p.x, p.y, col, area, slashAng);
      if (wd) this.spawnShockwave(p.x, p.y, wd.color, 0.45, 1.85 * area, 0.24);
    } else if (type === 'thrust') {
      let ang = this.joystick.active ? Math.atan2(this.joystick.y, this.joystick.x) : 0;
      if (!this.joystick.active && this.enemies.length) {
        const ne = this.nearestEnemy(p.x, p.y);
        if (ne) ang = angleTo(p.x, p.y, ne.x, ne.y);
      }
      this.beginAttack(this.directionFromAngle(ang), 0.3);
      const len = 120 * area * (1 + stats.delta * 0.04);
      for (const e of this.enemies) {
        const dx = e.x - p.x, dy = e.y - p.y;
        const proj = dx*Math.cos(ang) + dy*Math.sin(ang);
        if (proj >= 0 && proj <= len) {
          const perp = Math.abs(-dx*Math.sin(ang) + dy*Math.cos(ang));
          if (perp < 20*area) this.damageEnemy(e, dmg, p.x, p.y);
        }
      }
      this.sfx.play('thrust');
      this.spawnThrust(p.x, p.y, ang, len, wd ? wd.color : 0xd35f5f);
    } else if (type === 'spin') {
      this.beginAttack(p.direction, 0.34);
      for (const e of this.enemies) {
        if (dist2(e.x,e.y,p.x,p.y) < (110*area)**2) this.damageEnemy(e, dmg, p.x, p.y);
      }
      this.sfx.play('spin');
      this.spawnSpin(p.x, p.y, area, wd ? wd.color : 0xd38f5f);
    } else if (type === 'projectile' || type === 'magic_bolt') {
      this.sfx.play('shoot');
      const count = (wd ? 5 : (w.id === 'daggers' ? 2 : 1)) + bonusCount;
      const pierce = (wd ? 3 : 1) + bonusPierce;
      const isMagic = type === 'magic_bolt';
      const targets = this.nearestEnemies(p.x, p.y, count);
      const firstAng = targets.length ? angleTo(p.x, p.y, targets[0].x, targets[0].y) : 0;
      this.beginAttack(targets.length ? this.directionFromAngle(firstAng) : p.direction, 0.24);
      this.spawnSparkBurst(p.x + Math.cos(firstAng) * 12, p.y + Math.sin(firstAng) * 12, firstAng, wd ? wd.color : base.color, 2, 115, 0.65, 0.45);
      if (targets.length === 0) {
        for (let i=0;i<count;i++) this.spawnProjectile(p.x, p.y, Math.random()*Math.PI*2, dmg, area, wd ? wd.color : base.color, wd, false, pierce, isMagic);
      } else {
        for (let i = 0; i < count; i++) {
          const t = targets[i % targets.length];
          const spread = i >= targets.length ? (i - targets.length + 1) * 0.14 : 0;
          const ang = angleTo(p.x, p.y, t.x, t.y) + spread;
          this.spawnProjectile(p.x, p.y, ang, dmg, area, wd ? wd.color : base.color, wd, w.id==='daggers', pierce, isMagic);
        }
      }
      if (isMagic && !wd) {
        const extraBolts = 1 + Math.floor(stats.delta / 3);
        for (let i = 0; i < extraBolts; i++) {
          this.spawnProjectile(p.x, p.y, Math.random()*Math.PI*2, dmg, area, base.color, wd, false, pierce, true);
        }
      }
    }
  }

  spawnProjectile(x, y, ang, dmg, area, color, wd, homing=false, pierceOverride=null, isMagic=false) {
    const p = this.projPool.acquire();
    p.active = true;
    p.x = x; p.y = y;
    const speed = 320 * (wd?1.3:1);
    p.vx = Math.cos(ang) * speed;
    p.vy = Math.sin(ang) * speed;
    p.dmg = dmg;
    p.life = 2.0;
    p.pierce = pierceOverride ?? (wd ? 3 : 1);
    p.size = 6 * area;
    p.color = color;
    p.homing = homing || (wd && wd.name==='Twin Dragons');
    p.isMagic = isMagic || Boolean(wd);
    p.fromEnemy = false;
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
      if (pr.life <= 0) { this.projPool.release(pr); this.projectiles.splice(i,1); continue; }
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
          if (pr.isMagic) this.spawnShockwave(e.x, e.y, pr.color, 0.25, 0.9, 0.18);
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
      // move toward player
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        e.x += (dx / d) * e.speed * dt;
        e.y += (dy / d) * e.speed * dt;
      }
      // ranged shoot
      if (e.ranged) {
        e.shootCd -= dt;
        if (e.shootCd <= 0) {
          e.shootCd = 2.2 + e.phase * 0.8;
          if (d < 340 && this.projectiles.length < 24) this.enemyShoot(e);
        }
      }
      if (e.hitFlash > 0) e.hitFlash -= dt;
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
    const isSorcerer = e.type === 'sorcerer';
    const shots = e.isMapBoss ? 3 : (isSorcerer ? 2 : 1);
    const spread = e.isMapBoss ? 0.24 : 0.18;
    const col = e.isMapBoss ? (e.color || 0xff5f5f) : (isSorcerer ? 0xc77dff : 0xffaa5f);
    const spd = e.isMapBoss ? 205 : (isSorcerer ? 165 : 180);
    for (let i = 0; i < shots; i++) {
      const ang = baseAng + (i - (shots - 1) / 2) * spread;
      const pr = this.projPool.acquire();
      pr.active = true;
      pr.x = e.x; pr.y = e.y;
      pr.vx = Math.cos(ang) * spd;
      pr.vy = Math.sin(ang) * spd;
      pr.dmg = e.dmg;
      pr.life = 2.5;
      pr.pierce = 1;
      pr.size = e.isMapBoss ? 6 : 5;
      pr.color = col;
      pr.homing = false;
      pr.fromEnemy = true;
      pr.sprite.visible = true;
      pr.sprite.tint = col;
      this.projectiles.push(pr);
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
    const armor = 0;
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
      if (e.isMapBoss && this.stageBoss === e) {
        this.stageBoss = null;
        this.advanceStage();
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
    this.xp -= this.xpNext;
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
      text:'LEVEL UP!  CHOOSE UPGRADE',
      style: new TextStyle({ fill:0xf5c84c, fontSize:14, fontFamily:'monospace', fontWeight:'bold', letterSpacing:0.8 }),
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

      const t = new Text({ text:ch.name, style: new TextStyle({ fill:0xffffff, fontSize:12, fontFamily:'monospace', fontWeight:'bold' }) });
      t.x = 60; t.y = 10; btn.addChild(t);

      if (ch.tag) {
        const tag = new Text({ text:ch.tag, style: new TextStyle({ fill:0xf5c84c, fontSize:8.5, fontFamily:'monospace', fontWeight:'bold' }) });
        tag.anchor.set(1, 0);
        tag.x = bw - 10; tag.y = 11;
        btn.addChild(tag);
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
      ? Math.min(368, H - 12)
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

    const title = new Text({
      text: 'STAGE CLEARED! · CAMPAIGN MAP',
      style: new TextStyle({ fill: 0xf5c84c, fontSize: landscape ? 12.5 : 13.5, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 0.8 }),
    });
    title.anchor.set(0.5);
    title.x = Math.round(W / 2);
    title.y = panelY + (landscape ? 14 : 17);
    this.campaignMapContainer.addChild(title);

    const sub = new Text({
      text: 'NEXT CHECKPOINT UNLOCKED · SELECT STAGE TO CONTINUE',
      style: new TextStyle({ fill: 0x9ec5e8, fontSize: landscape ? 8.5 : 9, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
    sub.anchor.set(0.5);
    sub.x = Math.round(W / 2);
    sub.y = panelY + (landscape ? 28 : 32);
    this.campaignMapContainer.addChild(sub);

    const selOrder = clamp(this.selectedCheckpointOrder ?? this.unlockedStageOrder ?? 0, 0, 8);
    const unlockedMax = this.unlockedStageOrder ?? 0;

    const bottomBlockH = landscape ? 98 : 114;
    const rowStartY = panelY + (landscape ? 38 : 44);
    const rowH = Math.floor((panelH - (landscape ? 42 : 48) - bottomBlockH) / 3);
    const innerW = panelW - 24;
    const nodeGap = 8;
    const nodeW = Math.floor((innerW - nodeGap * 2) / 3);
    const nodeH = Math.max(48, rowH - (landscape ? 15 : 18));
    const regionPropKeys = ['tree', 'mountain', 'banner'];

    CAMPAIGN_MAPS.forEach((m, mIdx) => {
      const ry = rowStartY + mIdx * rowH;
      const propKey = regionPropKeys[mIdx] || 'tree';
      if (this.propTextures?.[propKey]) {
        const rp = new Sprite(this.propTextures[propKey]);
        rp.scale.set(0.28);
        rp.x = panelX + 12;
        rp.y = ry - 2;
        this.campaignMapContainer.addChild(rp);
      }
      const mapLabel = new Text({
        text: `MAP ${mIdx + 1}: ${m.name.toUpperCase()}`,
        style: new TextStyle({ fill: 0xe6dec8, fontSize: landscape ? 8.5 : 9.5, fontFamily: 'monospace', fontWeight: 'bold' }),
      });
      mapLabel.x = panelX + 28;
      mapLabel.y = ry;
      this.campaignMapContainer.addChild(mapLabel);

      const routeLine = new Graphics();
      const lineY = ry + (landscape ? 12 : 14) + Math.round(nodeH / 2);
      routeLine.moveTo(panelX + 12 + nodeW * 0.5, lineY)
        .lineTo(panelX + 12 + nodeW * 2.5 + nodeGap * 2, lineY)
        .stroke({ color: 0x45586c, width: 2, alpha: 0.85 });
      this.campaignMapContainer.addChild(routeLine);

      m.levels.forEach((lv, lIdx) => {
        const order = mIdx * 3 + lIdx;
        const isUnlocked = order <= unlockedMax;
        const isCleared = this.clearedStages?.has(order);
        const isSelected = order === selOrder;
        const nx = panelX + 12 + lIdx * (nodeW + nodeGap);
        const ny = ry + (landscape ? 12 : 14);

        const node = new Container();
        node.x = nx;
        node.y = ny;
        const g = new Graphics();
        const borderCol = isSelected
          ? 0xf5c84c
          : (isCleared ? 0x6bffb0 : (isUnlocked ? 0x6b9fff : 0x34414e));
        const fillCol = isSelected
          ? 0x202f42
          : (isUnlocked ? 0x15202e : 0x0c1118);
        g.roundRect(0, 0, nodeW, nodeH, 5)
          .fill({ color: fillCol, alpha: 0.96 })
          .stroke({ color: borderCol, width: isSelected ? 2.2 : 1.3 });
        node.addChild(g);

        const statusTag = isCleared ? '✓ CLEARED' : (isUnlocked ? '★ UNLOCKED' : 'LOCKED');
        const tagCol = isCleared ? 0x6bffb0 : (isUnlocked ? 0xf5c84c : 0x687685);
        const st = new Text({
          text: `${mIdx + 1}-${lIdx + 1} ${statusTag}`,
          style: new TextStyle({ fill: tagCol, fontSize: 8, fontFamily: 'monospace', fontWeight: 'bold' }),
        });
        st.x = 5;
        st.y = 3;
        node.addChild(st);

        const bossSpec = lv.levelBoss || m.boss;
        const bossKey = bossSpec.spriteType && this.enemyTextures?.[bossSpec.spriteType] ? bossSpec.spriteType : 'elite';

        if (!landscape && nodeH >= 78) {
          // Portrait card layout: Full-width Stage Map Preview Banner in the middle of the card
          const thumbW = nodeW - 10;
          const thumbH = Math.max(30, nodeH - 46);
          const thumbY = 16;
          if (this.stageTextures?.[order]) {
            const thumb = new Sprite(this.stageTextures[order]);
            thumb.x = 5;
            thumb.y = thumbY;
            thumb.width = thumbW;
            thumb.height = thumbH;
            thumb.tint = isUnlocked ? 0xffffff : 0x45505e;
            node.addChild(thumb);
          }
          const thumbFrame = new Graphics();
          thumbFrame.rect(5, thumbY, thumbW, thumbH)
            .stroke({ color: isSelected ? 0xf5c84c : 0x3b4d63, width: 1, alpha: 0.9 });
          node.addChild(thumbFrame);

          // Stage enemy sample sprite on left + Boss sprite on right inside the map preview
          const firstFoe = (lv.enemies && lv.enemies[0]) || 'soldier';
          if (this.enemyTextures?.[firstFoe]?.[0]) {
            const foeSp = new Sprite(this.enemyTextures[firstFoe][0]);
            foeSp.anchor.set(0.5, 0.6);
            foeSp.scale.set(0.52);
            foeSp.x = 20;
            foeSp.y = thumbY + Math.round(thumbH / 2) + 1;
            foeSp.tint = isUnlocked ? 0xffffff : 0x2a333d;
            node.addChild(foeSp);
          }
          if (this.enemyTextures?.[bossKey]?.[0]) {
            const bossSp = new Sprite(this.enemyTextures[bossKey][0]);
            bossSp.anchor.set(0.5, 0.6);
            bossSp.scale.set(0.58);
            bossSp.x = nodeW - 22;
            bossSp.y = thumbY + Math.round(thumbH / 2) + 1;
            bossSp.tint = isUnlocked ? 0xffffff : 0x2a333d;
            node.addChild(bossSp);
          }

          const nm = new Text({
            text: lv.name,
            style: new TextStyle({ fill: isUnlocked ? 0xffffff : 0x687685, fontSize: 7.5, fontFamily: 'monospace', fontWeight: 'bold' }),
          });
          nm.x = 5;
          nm.y = thumbY + thumbH + 3;
          node.addChild(nm);

          const bs = new Text({
            text: `Boss: ${bossSpec.name}`,
            style: new TextStyle({ fill: isUnlocked ? 0xff9e80 : 0x525e6b, fontSize: 7.5, fontFamily: 'monospace' }),
          });
          bs.x = 5;
          bs.y = nodeH - 12;
          node.addChild(bs);
        } else {
          // Landscape card layout: Stage Map Preview on left, text + Boss sprite on right
          const thumbW = 62;
          const thumbH = Math.max(28, nodeH - 20);
          const thumbY = 15;
          if (this.stageTextures?.[order]) {
            const thumb = new Sprite(this.stageTextures[order]);
            thumb.x = 5;
            thumb.y = thumbY;
            thumb.width = thumbW;
            thumb.height = thumbH;
            thumb.tint = isUnlocked ? 0xffffff : 0x45505e;
            node.addChild(thumb);
          }
          const thumbFrame = new Graphics();
          thumbFrame.rect(5, thumbY, thumbW, thumbH)
            .stroke({ color: isSelected ? 0xf5c84c : 0x3b4d63, width: 1, alpha: 0.9 });
          node.addChild(thumbFrame);

          if (this.enemyTextures?.[bossKey]?.[0]) {
            const bossSp = new Sprite(this.enemyTextures[bossKey][0]);
            bossSp.anchor.set(0.5, 0.6);
            bossSp.scale.set(0.58);
            bossSp.x = 5 + thumbW - 14;
            bossSp.y = thumbY + Math.round(thumbH / 2) + 1;
            bossSp.tint = isUnlocked ? 0xffffff : 0x2a333d;
            node.addChild(bossSp);
          }

          const nm = new Text({
            text: lv.name,
            style: new TextStyle({ fill: isUnlocked ? 0xffffff : 0x687685, fontSize: 8.5, fontFamily: 'monospace', fontWeight: 'bold' }),
          });
          nm.x = 73;
          nm.y = 17;
          node.addChild(nm);

          const bs = new Text({
            text: `Boss: ${bossSpec.name}`,
            style: new TextStyle({ fill: isUnlocked ? 0xff9e80 : 0x525e6b, fontSize: 7.5, fontFamily: 'monospace' }),
          });
          bs.x = 73;
          bs.y = 31;
          node.addChild(bs);
        }

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
    });

    const selMapIdx = Math.floor(selOrder / 3);
    const selLvIdx = selOrder % 3;
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
    if (this.stageTextures?.[selOrder]) {
      const pv = new Sprite(this.stageTextures[selOrder]);
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
    const infoTitle = new Text({
      text: `STAGE ${selMapIdx + 1}-${selLvIdx + 1}: ${selLv.name.toUpperCase()} (${(selLv.layoutPattern || 'glade').toUpperCase()} · ${selWeather.short})`,
      style: new TextStyle({ fill: 0xfff3c4, fontSize: 8.5, fontFamily: 'monospace', fontWeight: 'bold' }),
    });
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

  describeWeaponUpgrade(w, base) {
    const nextLvl = w.level + 1;
    const isProj = base.type === 'projectile' || base.type === 'magic_bolt';
    const bonus = nextLvl % 2 === 1
      ? (isProj ? '+1 Projectile, +15% DMG' : '+2 Targets/Reach, +15% DMG')
      : '+15% DMG, +8% Area, -5% CD';
    if (nextLvl === 8) {
      const passName = PASSIVES[base.pass]?.name || base.pass;
      return `${bonus} • Max Lv (Evo w/ ${passName})`;
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
          color: base.color,
          apply: () => { w.level++; this._loadoutDirty = true; },
        });
      }
    }
    // new weapon if slots available
    if (this.weapons.length < 6) {
      for (const id in WEAPONS) {
        if (!this.weapons.find(w=>w.id===id)) {
          const base = WEAPONS[id];
          const passName = PASSIVES[base.pass]?.name || base.pass;
          pool.push({
            kind:'wnew', id, icon:id,
            name: `New: ${base.name}`,
            tag: 'NEW WEAPON',
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
          tag: `PASSIVE ${nextLvl}/${p.max}`,
          desc: pairedWeapon ? `${p.desc} • Evolves ${pairedWeapon.name}` : p.desc,
          color: p.color,
          apply: () => { this.passives[id] = nextLvl; this.applyPassive(id); },
        });
      }
    }
    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // pick unique
    const seen = new Set();
    for (const c of pool) {
      if (seen.has(c.id + c.kind)) continue;
      seen.add(c.id + c.kind);
      choices.push(c);
      if (choices.length >= n) break;
    }
    // fallback
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
      this.luContainer.destroy({ children:true });
      this.luContainer = null;
    }
    this.state = 'playing';
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
    let drewBossBar = false;
    if (this._hadBossBar) g.clear();
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
      if (e.hitFlash > 0) {
        s.tint = 0xfff0b0;
        s.scaleX = sc * 1.16;
        s.scaleY = sc * 0.86;
      } else {
        s.tint = 0xffffff;
        s.scaleX = sc;
        s.scaleY = sc;
      }
      if (e.isBoss && e.hp < e.maxHp) {
        if (!drewBossBar && !this._hadBossBar) g.clear();
        drewBossBar = true;
        const w = e.size * 2;
        g.rect(Math.round(e.x - e.size), Math.round(e.y - e.size - 10), w, 3).fill(0x330000);
        g.rect(Math.round(e.x - e.size), Math.round(e.y - e.size - 10), Math.round(w * (e.hp/e.maxHp)), 3).fill(0xff3333);
      }
    }
    this._hadBossBar = drewBossBar;
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
    const bossName = (this.stageBoss?.bossName || map.boss.name).toUpperCase();
    const waveLabel = bossActive
      ? `BOSS: ${bossName} · HP ${Math.ceil(this.stageBoss.hp)}/${Math.ceil(this.stageBoss.maxHp)}`
      : `MAP ${mapNum}-${levelNum} ${map.short} · ${curWeather.short} · WAVE ${this.currentWave}/${stage.waves} (${pct}%)`;
    if (waveLabel !== this._lastHudWaveText) {
      this._lastHudWaveText = waveLabel;
      this.hudWaveText.text = waveLabel;
    }
    const heroText = `${this.hero.name.toUpperCase()} · LV ${this.level}`;
    if (heroText !== this._lastHudText) {
      this._lastHudText = heroText;
      this.hudText.text = heroText;
    }
    const perkText = this.perk ? `★ PERK: ${this.perk.short}` : '';
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