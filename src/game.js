import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle, Particle, ParticleContainer, TilingSprite } from 'pixi.js';
import { HEROES, STARTING_PERKS, WEAPONS, EVOLUTIONS, PASSIVES, ENEMY_TYPES, LEVEL_XP } from './data.js';
import { clamp, dist2, rand, randInt, pick, angleTo, Pool } from './utils.js';
import { SpatialHash } from './spatial.js';
import { loadSpriteAssets } from './sprites.js';
import { SoundManager } from './audio.js';

export class Game {
  constructor(app) {
    this.app = app;
    this.W = window.innerWidth || app.screen.width;
    this.H = window.innerHeight || app.screen.height;
    this.stage = app.stage;
    this.world = new Container();
    this.uiLayer = new Container();
    this.stage.addChild(this.world);
    this.stage.addChild(this.uiLayer);
    this.bgGrid = new Container();
    this.world.addChildAt(this.bgGrid, 0);
    this.enemyContainer = new ParticleContainer({
      texture: null,
      dynamicProperties: { position: true, rotation: false, vertex: true, uvs: true, color: true },
    });
    this.world.addChild(this.enemyContainer);
    this.enemyLayer = new Graphics();
    this.world.addChild(this.enemyLayer);
    this.projLayer = new Container();
    this.gemLayer = new Container();
    this.chestLayer = new Container();
    this.fxLayer = new Container();
    this.world.addChild(this.projLayer);
    this.world.addChild(this.gemLayer);
    this.world.addChild(this.chestLayer);
    this.world.addChild(this.fxLayer);
    this.state = 'menu'; // menu | playing | levelup | gameover
    this.time = 0;
    this.animTime = 0;
    this.kills = 0;
    this.gold = 0;

    this.enemies = [];
    this.projectiles = [];
    this.gems = [];
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
    this.player = null;
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

  applyViewportSize() {
    const nextW = window.innerWidth || this.app.screen.width;
    const nextH = window.innerHeight || this.app.screen.height;
    this.W = nextW;
    this.H = nextH;
    this.layoutVignette();
    if (this.hud) this.layoutHud();
    if (this.menuContainer) {
      const visible = this.menuContainer.visible;
      this.buildMenu();
      this.menuContainer.visible = visible;
    }
    if (this.state === 'levelup') this.showLevelUpUI();
    if (this.state === 'gameover') this.gameOver();
  }

  layoutVignette() {
    if (this.terrain) {
      this.terrain.width = this.W + 32;
      this.terrain.height = this.H + 32;
    }
  }

  setupTextures() {
    this.enemyTextures = this.assets.enemyFrames;
    this.heroFrames = this.assets.heroFrames;
    this.heroAttackFrames = this.assets.heroAttackFrames;
    this.effectTextures = this.assets.effects;
    this.iconTextures = this.assets.icons;

    this.terrain = new TilingSprite({
      texture: this.assets.terrain,
      width: this.W + 32,
      height: this.H + 32,
    });
    this.terrain.tileScale.set(2);
    this.terrain.alpha = 1;
    this.bgGrid.addChild(this.terrain);
    this.layoutVignette();
  }

  setupPools() {
    this.enemyContainer.texture = this.assets.enemyBase;
    this.enemyPool = new Pool(() => {
      const p = new Particle(this.enemyTextures.soldier[0]);
      p.anchorX = 0.5; p.anchorY = 0.64;
      this.enemyContainer.addParticle(p);
      return { active:false, type:'soldier', x:0, y:0, hp:0, maxHp:0, speed:0, dmg:0, size:14, xp:1, color:0x7a7a7a, hitFlash:0, knock:0, kx:0, ky:0, ranged:false, isBoss:false, shootCd:0, sprite:p, frame:-1 };
    }, (e) => { e.active = false; if (e.sprite) { e.sprite.alpha = 0; } });
    this.projPool = new Pool(() => {
      const sprite = new Sprite(this.effectTextures.projectile);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.projLayer.addChild(sprite);
      return {
        active:false, x:0, y:0, vx:0, vy:0, dmg:0, life:0, pierce:0, size:6, color:0xffffff, hit:new Set(), fromEnemy:false, homing:false, sprite,
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
    this.hitPool = new Pool(() => {
      const sprite = new Sprite(this.effectTextures.impact);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.fxLayer.addChild(sprite);
      return { active:false, sprite };
    }, (h) => { h.active = false; h.sprite.visible = false; h.sprite.rotation = 0; });
    this.slashPool = new Pool(() => {
      const sprite = new Sprite(this.effectTextures.slash);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.fxLayer.addChild(sprite);
      return { active:false, sprite };
    }, (s) => { s.active = false; s.sprite.visible = false; s.sprite.rotation = 0; });
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
  }

  buildMenu() {
    if (this.menuContainer) this.menuContainer.destroy({ children:true });
    this.menuContainer = new Container();
    this.uiLayer.addChild(this.menuContainer);

    const W = this.W;
    const H = this.H;
    const landscape = W >= H;
    const margin = landscape ? 20 : 16;
    const gap = 8;
    const topSafe = landscape ? 8 : 28;
    const bottomSafe = landscape ? 16 : 38;

    const bg = new Graphics();
    bg.rect(0, 0, W, H).fill({ color:0x0b1117, alpha:0.98 });
    const menuTerrain = new TilingSprite({ texture:this.assets.terrain, width:W, height:H });
    menuTerrain.tileScale.set(landscape ? 1.15 : 1.45);
    menuTerrain.alpha = 0.28;
    this.menuContainer.addChild(bg, menuTerrain);

    const bannerH = landscape ? 62 : Math.min(114, topSafe + 84);
    const banner = new Graphics();
    banner.rect(0, 0, W, bannerH).fill({ color:0x121a21, alpha:0.96 });
    banner.moveTo(0, bannerH - 2).lineTo(W, bannerH - 2).stroke({ color:0xd4a017, width:2, alpha:0.9 });
    banner.moveTo(margin, topSafe).lineTo(W - margin, topSafe).stroke({ color:0xd4a017, width:1, alpha:0.22 });
    banner.circle(margin + 8, bannerH - 10, 3).fill(0xd4a017);
    banner.circle(W - margin - 8, bannerH - 10, 3).fill(0xd4a017);
    this.menuContainer.addChild(banner);

    const title = new Text({
      text:'3K SURVIVORS',
      style: new TextStyle({ fill:0xf2c75b, fontSize:landscape ? 22 : 29, fontFamily:'monospace', fontWeight:'bold', letterSpacing:1.6, stroke:{ color:0x080b10, width:5 } }),
    });
    title.anchor.set(0.5);
    title.x = W / 2;
    title.y = topSafe + (bannerH - topSafe) * 0.36;
    this.menuContainer.addChild(title);

    const sub = new Text({
      text:'ROMANCE OF THE THREE KINGDOMS',
      style: new TextStyle({ fill:0xcbd3dc, fontSize:landscape ? 8.5 : 9.5, fontFamily:'monospace', letterSpacing:1.0 }),
    });
    sub.anchor.set(0.5);
    sub.x = W / 2;
    sub.y = topSafe + (bannerH - topSafe) * 0.7;
    this.menuContainer.addChild(sub);


    const muteBtn = new Container();
    const muteW = 58, muteH = 22;
    const muteBg = new Graphics();
    muteBg.roundRect(0, 0, muteW, muteH, 4)
      .fill({ color:0x16202b, alpha:0.95 })
      .stroke({ color:this.sfx.enabled ? 0x6bffb0 : 0x52606e, width:1.2, alpha:0.85 });
    muteBtn.addChild(muteBg);
    const muteIconKey = this.sfx.enabled ? 'sound_on' : 'sound_off';
    if (this.iconTextures?.[muteIconKey]) {
      const mic = new Sprite(this.iconTextures[muteIconKey]);
      mic.x = 5; mic.y = 3;
      muteBtn.addChild(mic);
    }
    const muteTxt = new Text({
      text: this.sfx.enabled ? 'SFX' : 'MUTE',
      style: new TextStyle({ fill:this.sfx.enabled ? 0xd8f5e5 : 0x9aa6b4, fontSize:8.5, fontFamily:'monospace', fontWeight:'bold' }),
    });
    muteTxt.x = 24; muteTxt.y = 6;
    muteBtn.addChild(muteTxt);
    muteBtn.x = W - margin - muteW;
    muteBtn.y = bannerH + (landscape ? 2 : 5);
    muteBtn.eventMode = 'static';
    muteBtn.cursor = 'pointer';
    muteBtn.on('pointertap', () => this.toggleSound());
    this.menuContainer.addChild(muteBtn);
    const section = new Text({
      text:'1. CHOOSE YOUR WARRIOR',
      style: new TextStyle({ fill:0xe7e2d2, fontSize:landscape ? 10 : 11, fontFamily:'monospace', fontWeight:'bold', letterSpacing:1.2 }),
    });
    section.anchor.set(0.5);
    section.x = W / 2;
    section.y = bannerH + (landscape ? 12 : 16);
    this.menuContainer.addChild(section);

    const cols = landscape ? 3 : 2;
    const rows = landscape ? 2 : 3;
    const cardW = Math.min(240, (W - margin * 2 - gap * (cols - 1)) / cols);
    const gridY = bannerH + (landscape ? 24 : 30);
    const cardH = landscape ? 70 : 90;
    const gridX = (W - (cols * cardW + (cols - 1) * gap)) / 2;

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
      portrait.roundRect(9, 8, 44, cardH - 16, 5)
        .fill({ color:selected ? 0x101922 : 0x090f15, alpha:0.9 })
        .stroke({ color:selected ? 0xf5c84c : 0x3b4754, width:1, alpha:selected ? 0.9 : 0.5 });
      btn.addChild(portrait);

      const thumb = new Sprite(this.heroFrames[h.id][0][0]);
      thumb.anchor.set(0.5, 0.62);
      thumb.scale.set(landscape ? 1.08 : 1.16);
      thumb.x = 31;
      thumb.y = 8 + (cardH - (selected ? 24 : 16)) / 2;
      btn.addChild(thumb);

      const textX = 59;
      const maxTextW = cardW - textX - 8;
      const name = new Text({
        text:h.name.toUpperCase(),
        style: new TextStyle({ fill:selected ? 0xfff3c4 : 0xffffff, fontSize:landscape ? 10 : 11, fontFamily:'monospace', fontWeight:'bold', letterSpacing:0.2 }),
      });
      if (name.width > maxTextW) {
        name.scale.set(maxTextW / name.width);
      }
      name.x = textX; name.y = 8;
      btn.addChild(name);

      const desc = new Text({
        text:h.desc,
        style: new TextStyle({ fill:selected ? 0xd8e1ea : 0xaeb8c2, fontSize:landscape ? 8 : 8.5, fontFamily:'monospace', wordWrap:true, wordWrapWidth:maxTextW, breakWords:true }),
      });
      desc.x = textX; desc.y = 24;
      btn.addChild(desc);

      const stats = new Text({
        text:`HP ${h.hp}  SPD ${h.speed.toFixed(1)}`,
        style: new TextStyle({ fill:selected ? 0xf5c84c : 0xbac6d2, fontSize:8.5, fontFamily:'monospace', fontWeight:'bold' }),
      });
      stats.x = textX; stats.y = cardH - 19;
      btn.addChild(stats);

      if (selected) {
        const badgeW = 38;
        const badgeH = 11;
        const badge = new Graphics();
        badge.roundRect(12, cardH - badgeH - 10, badgeW, badgeH, 2)
          .fill(0xf5c84c);
        btn.addChild(badge);
        const marker = new Text({
          text:'PICK',
          style:new TextStyle({ fill:0x141008, fontSize:7.5, fontFamily:'monospace', fontWeight:'bold', letterSpacing:0.3 }),
        });
        marker.anchor.set(0.5);
        marker.x = 12 + badgeW / 2;
        marker.y = cardH - badgeH / 2 - 10;
        btn.addChild(marker);
      }

      btn.x = bx; btn.y = by;
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.on('pointertap', () => this.selectHero(h));
      this.menuContainer.addChild(btn);
    });

    const gridBottom = gridY + rows * cardH + (rows - 1) * gap;

    // 3 Pre-game Starting Perks (War Decrees)
    const perkHeader = new Text({
      text:'2. CHOOSE STARTING PERK (1 OF 3)',
      style: new TextStyle({ fill:0xe7e2d2, fontSize:landscape ? 10 : 11, fontFamily:'monospace', fontWeight:'bold', letterSpacing:1.1 }),
    });
    perkHeader.anchor.set(0.5);
    perkHeader.x = W / 2;
    perkHeader.y = gridBottom + (landscape ? 12 : 16);
    this.menuContainer.addChild(perkHeader);

    const perkY = gridBottom + (landscape ? 24 : 30);
    const perkH = landscape ? 48 : 66;
    const totalGridW = cols * cardW + (cols - 1) * gap;
    const perkW = (totalGridW - gap * 2) / 3;

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
        ic.y = landscape ? 8 : 7;
        pBtn.addChild(ic);
      }

      const pTitle = new Text({
        text: pk.short,
        style: new TextStyle({ fill:isSel ? 0xfff3c4 : 0xffffff, fontSize:landscape ? 9.5 : 9.5, fontFamily:'monospace', fontWeight:'bold' }),
      });
      pTitle.x = 27;
      pTitle.y = landscape ? 8 : 8;
      pBtn.addChild(pTitle);

      if (isSel) {
        const star = new Text({
          text: '★',
          style: new TextStyle({ fill:0xf5c84c, fontSize:9.5, fontFamily:'monospace', fontWeight:'bold' }),
        });
        star.anchor.set(1, 0);
        star.x = perkW - 6;
        star.y = 6;
        pBtn.addChild(star);
      }

      const pDesc = new Text({
        text: landscape ? pk.desc : pk.lines,
        style: new TextStyle({
          fill: isSel ? 0xe5edf5 : 0xb2beca,
          fontSize: landscape ? 8.5 : 8,
          fontFamily: 'monospace',
          lineHeight: 11,
        }),
      });
      pDesc.x = landscape ? 27 : 8;
      pDesc.y = landscape ? 25 : 28;
      pBtn.addChild(pDesc);

      pBtn.x = px;
      pBtn.y = perkY;
      pBtn.eventMode = 'static';
      pBtn.cursor = 'pointer';
      pBtn.on('pointertap', () => this.selectPerk(pk));
      this.menuContainer.addChild(pBtn);
    });

    const perkBottom = perkY + perkH;
    const deployW = Math.min(268, W - 32);
    const deployH = landscape ? 40 : 48;
    const deployY = landscape ? Math.min(H - deployH - 18, perkBottom + 10) : perkBottom + 14;
    const deploy = new Container();
    const deployShadow = new Graphics();
    deployShadow.roundRect(3, 5, deployW, deployH, 4).fill({ color:0x000000, alpha:0.5 });
    deploy.addChild(deployShadow);
    const deployPanel = new Graphics();
    deployPanel.roundRect(0, 0, deployW, deployH, 4).fill(0xe0b64d).stroke({ color:0xffe7a1, width:2, alpha:0.95 });
    deploy.addChild(deployPanel);
    const deployText = new Text({
      text:`DEPLOY ${this.selectedHero.name.toUpperCase()}`,
      style:new TextStyle({ fill:0x18130b, fontSize:landscape ? 11.5 : 12.5, fontFamily:'monospace', fontWeight:'bold', letterSpacing:0.5 }),
    });
    deployText.anchor.set(0.5);
    deployText.x = deployW / 2; deployText.y = deployH * 0.36;
    deploy.addChild(deployText);
    const deploySub = new Text({
      text:`PERK: ${this.selectedPerk.name.toUpperCase()}`,
      style:new TextStyle({ fill:0x33260e, fontSize:landscape ? 8 : 8.5, fontFamily:'monospace', fontWeight:'bold', letterSpacing:0.3 }),
    });
    deploySub.anchor.set(0.5);
    deploySub.x = deployW / 2; deploySub.y = deployH * 0.72;
    deploy.addChild(deploySub);
    deploy.x = (W - deployW) / 2; deploy.y = deployY;
    deploy.eventMode = 'static';
    deploy.cursor = 'pointer';
    deploy.on('pointertap', () => this.startRun(this.selectedHero, this.selectedPerk));
    this.menuContainer.addChild(deploy);

    if (!landscape) {
      const hint = new Text({
        text:'SELECT WARRIOR & PERK  •  TAP DEPLOY TO BEGIN',
        style:new TextStyle({ fill:0x9aa6b4, fontSize:9, fontFamily:'monospace', letterSpacing:0.5 }),
      });
      hint.anchor.set(0.5);
      hint.x = W / 2;
      hint.y = Math.min(H - bottomSafe, deployY + deployH + 22);
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

  startRun(hero, perk = this.selectedPerk) {
    this.sfx.unlock();
    this.sfx.play('start');
    this.hero = hero;
    this.perk = perk || this.selectedPerk || STARTING_PERKS[0];
    this.menuContainer.visible = false;
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
    for (const c of this.chests) { c.sprite.destroy(); }
    this.chests.length = 0;
    for (const pt of this.particles) {
      if (pt.pooled === 'hit') this.hitPool.release(pt.poolObject);
      else if (pt.pooled === 'slash') this.slashPool.release(pt.poolObject);
      else if (pt.pooled === 'text') this.textPool.release(pt.poolObject);
      else if (pt.g) pt.g.destroy();
    }
    this.particles.length = 0;

    this.time = 0;
    this.kills = 0;
    this.gold = 0;
    this.xp = 0;
    this.level = 1;
    this.xpNext = LEVEL_XP(1);

    const w = WEAPONS[hero_weapon(this.hero)];
    this.weapons = [{ id: this.hero.weapon, level:1, data: w, evo:false }];
    this.passives = {};

    // player
    if (this.playerSprite) this.playerSprite.destroy();
    if (this.playerShadow) this.playerShadow.destroy();
    this.playerShadow = new Graphics();
    this.playerShadow.ellipse(0, 13, 13, 4).fill({ color:0x000000, alpha:0.35 });
    this.world.addChild(this.playerShadow);
    const directions = this.heroFrames[this.hero.id];
    this.playerSprite = new AnimatedSprite({
      textures: directions[0],
      animationSpeed: 0.16,
      autoPlay: false,
      autoUpdate: false,
      updateAnchor: false,
    });
    this.playerSprite.anchor.set(0.5, 0.64);
    this.playerSprite.scale.set(1.35);
    this.world.addChild(this.playerSprite);
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
    const W = this.W, H = this.H;
    const portrait = H > W;
    const hudTop = portrait ? 34 : 8;
    this.hudTop = hudTop;
    const joyR = 52;
    const jx = 72, jy = H - (portrait ? 84 : 68);
    this.joyOrigin = { x:jx, y:jy, r:joyR };
    this.joyBase.clear();
    this.joyBase.circle(jx, jy, joyR).fill({ color:0xffffff, alpha:0.035 }).stroke({ color:0xffffff, alpha:0.12, width:1.5 });
    this.joyKnob.clear();
    this.joyKnob.circle(jx, jy, 21).fill({ color:0xffffff, alpha:0.14 }).stroke({ color:0xffffff, alpha:0.2, width:1 });

    this.hudPanel.clear();
    this.hudPanel.roundRect(8, hudTop, W - 16, 78, 8)
      .fill({ color:0x070b10, alpha:0.84 })
      .stroke({ color:0x8f7a3e, width:1, alpha:0.5 });

    const barX = 18;
    const barW = W - 36;
    this.hudXpBg.clear();
    this.hudXpBg.roundRect(barX, hudTop + 7, barW, 8, 3).fill(0x151b29).stroke({ color:0xd4a017, width:1, alpha:0.75 });
    this.hudHpBg.clear();
    this.hudHpBg.roundRect(barX, hudTop + 20, Math.min(126, barW * 0.42), 6, 2).fill(0x2b1418);

    this.hudText.x = barX; this.hudText.y = hudTop + 31;
    this.hudTime.anchor = { x:0.5, y: 0 };
    this.hudTime.x = W / 2; this.hudTime.y = hudTop + 29;
    this.hudKills.anchor = { x:1, y: 0 };
    this.hudKills.x = W - 18; this.hudKills.y = hudTop + 32;
    this.hudPerk.anchor = { x:1, y: 0 };
    this.hudPerk.x = W - 18; this.hudPerk.y = hudTop + 17;
    this._lastHpQuant = -1;
    this._lastXpQuant = -1;
    this._loadoutDirty = true;
    this.renderHudSlots();
  }

  renderHudSlots() {
    if (!this.hudSlots || !this.hudSlotsBg) return;
    const hudTop = this.hudTop ?? (this.H > this.W ? 34 : 8);
    const slotY = hudTop + 49;
    const slotSize = 22;
    const step = 25;
    const groupGap = 10;
    const startX = 18;
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
          .fill({ color:0x0b1017, alpha:0.55 });
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
          .fill({ color:0x0b1017, alpha:0.45 });
        item.icon.visible = false;
        item.badge.visible = false;
      }
    }
    if (this.hudMuteBtn) {
      const mx = this.W - 18 - slotSize;
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
    if (x < this.W * 0.5) {
      // joystick
      this.joystick.active = true;
      this.joystick.id = e.pointerId;
      this.joystick.originX = x;
      this.joystick.originY = y;
      this.joystick.curX = x;
      this.joystick.curY = y;
      this.joystick.x = 0; this.joystick.y = 0;
    } else {
      // right side tap: could be interact chest; handled in tick
      this.rightTap = { x, y, t: performance.now() };
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

    // camera
    this.camX += (p.x - this.camX) * 0.15;
    this.camY += (p.y - this.camY) * 0.15;

    // world transform
    this.world.x = this.W/2 - this.camX;
    this.world.y = this.H/2 - this.camY;
    this.terrain.x = this.camX - this.W / 2 - 16;
    this.terrain.y = this.camY - this.H / 2 - 16;
    this.terrain.tilePosition.set(-this.camX, -this.camY);
    if (this.shake > 0) {
      this.world.x += (Math.random()-0.5)*this.shake;
      this.world.y += (Math.random()-0.5)*this.shake;
      this.shake *= 0.82;
      if (this.shake < 0.15) this.shake = 0;
    }

    // update joystick knob visual only on active touch or state transition
    if (this.joystick.active) {
      const kx = this.joystick.originX + this.joystick.x * 60;
      const ky = this.joystick.originY + this.joystick.y * 60;
      this.joyKnob.clear();
      this.joyKnob.circle(kx, ky, 22).fill({ color:0xffffff, alpha:0.2 });
      this.joyBase.clear();
      this.joyBase.circle(this.joystick.originX, this.joystick.originY, 52).fill({ color:0xffffff, alpha:0.05 }).stroke({ color:0xffffff, alpha:0.14, width:1.5 });
      this._joyWasActive = true;
    } else if (this._joyWasActive) {
      this.joyKnob.clear();
      this.joyKnob.circle(this.joyOrigin.x, this.joyOrigin.y, 21).fill({ color:0xffffff, alpha:0.14 });
      this.joyBase.clear();
      this.joyBase.circle(this.joyOrigin.x, this.joyOrigin.y, 52).fill({ color:0xffffff, alpha:0.035 }).stroke({ color:0xffffff, alpha:0.12, width:1.5 });
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
    this.renderChests();
    this.renderParticles();

    this.updateHud();
  }

  handleSpawns(dt) {
    // spawn rate increases over time
    this.spawnTimer = (this.spawnTimer || 0) - dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.05, 0.6 - this.time * 0.005);
      const count = 1 + Math.floor(this.time / 60);
      for (let i = 0; i < count; i++) this.spawnEnemy();
    }
    // elite boss every 2 min
    this.bossTimer = (this.bossTimer || 120) - dt;
    if (this.bossTimer <= 0) {
      this.bossTimer = 120;
      this.spawnElite();
    }
    // cap enemies? allow 300+
    // no cap, but pool grows
  }

  spawnEnemy() {
    // pick type by weights
    const types = ['soldier','soldier','soldier','archer','cavalry'];
    const t = pick(types);
    const d = ENEMY_TYPES[t];
    // spawn offscreen around player
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
    const sc = d.size / 16;
    e.sprite.scaleX = sc;
    e.sprite.scaleY = sc;
    e.phase = (this.enemySerial++ * 0.61803398875) % 1;
    e.hp = d.hp * (1 + this.time * 0.02);
    e.maxHp = e.hp;
    e.speed = d.speed;
    e.dmg = d.dmg;
    e.size = d.size;
    e.xp = d.xp;
    e.color = d.color;
    e.ranged = !!d.ranged;
    e.shootCd = 1.4 + e.phase * 2.4;
    e.hitFlash = 0;
    e.knock = 0;
    e.kx = 0; e.ky = 0;
    this.enemies.push(e);
  }

  spawnElite() {
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
    const sc = d.size / 16;
    e.sprite.scaleX = sc;
    e.sprite.scaleY = sc;
    e.phase = (this.enemySerial++ * 0.61803398875) % 1;
    e.hp = d.hp * (1 + this.time * 0.05);
    e.maxHp = e.hp;
    e.speed = d.speed;
    e.dmg = d.dmg;
    e.size = d.size;
    e.xp = d.xp;
    e.color = d.color;
    e.ranged = false;
    e.isBoss = true;
    e.hitFlash = 0; e.knock=0; e.kx=0; e.ky=0;
    this.enemies.push(e);
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
      const facing = targets.length ? this.directionFromAngle(angleTo(p.x, p.y, targets[0].x, targets[0].y)) : p.direction;
      this.beginAttack(facing, 0.28);
      for (const e of targets) {
        if (dist2(e.x,e.y,p.x,p.y) < (90*area)**2) {
          this.damageEnemy(e, dmg, p.x, p.y);
        }
      }
      // visual slash
      this.sfx.play('slash');
      this.spawnSlash(p.x, p.y, wd ? wd.color : 0x5fd38d, area);
    } else if (type === 'thrust') {
      // line in facing direction (joystick or nearest enemy)
      let ang = this.joystick.active ? Math.atan2(this.joystick.y, this.joystick.x) : 0;
      if (!this.joystick.active && this.enemies.length) {
        const ne = this.nearestEnemy(p.x, p.y);
        if (ne) ang = angleTo(p.x, p.y, ne.x, ne.y);
      }
      this.beginAttack(this.directionFromAngle(ang), 0.3);
      const len = 120 * area * (1 + stats.delta * 0.04);
      for (const e of this.enemies) {
        // point to segment distance
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
      // fire at nearest enemy (or multiple)
      this.sfx.play('shoot');
      const count = (wd ? 5 : (w.id === 'daggers' ? 2 : 1)) + bonusCount;
      const pierce = (wd ? 3 : 1) + bonusPierce;
      const targets = this.nearestEnemies(p.x, p.y, count);
      this.beginAttack(targets.length ? this.directionFromAngle(angleTo(p.x, p.y, targets[0].x, targets[0].y)) : p.direction, 0.24);
      if (targets.length === 0) {
        // fire in random directions
        for (let i=0;i<count;i++) this.spawnProjectile(p.x, p.y, Math.random()*Math.PI*2, dmg, area, base.color, wd, false, pierce);
      } else {
        for (let i = 0; i < count; i++) {
          const t = targets[i % targets.length];
          const spread = i >= targets.length ? (i - targets.length + 1) * 0.14 : 0;
          const ang = angleTo(p.x, p.y, t.x, t.y) + spread;
          this.spawnProjectile(p.x, p.y, ang, dmg, area, base.color, wd, w.id==='daggers', pierce);
        }
      }
      if (type === 'magic_bolt' && !wd) {
        const extraBolts = 1 + Math.floor(stats.delta / 3);
        for (let i = 0; i < extraBolts; i++) {
          this.spawnProjectile(p.x, p.y, Math.random()*Math.PI*2, dmg, area, base.color, wd, false, pierce);
        }
      }
    }
  }

  spawnProjectile(x, y, ang, dmg, area, color, wd, homing=false, pierceOverride=null) {
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
          this.damageEnemy(e, pr.dmg, pr.x, pr.y);
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
    const ang = angleTo(e.x, e.y, p.x, p.y);
    const pr = this.projPool.acquire();
    pr.active = true;
    pr.x = e.x; pr.y = e.y;
    pr.vx = Math.cos(ang) * 180;
    pr.vy = Math.sin(ang) * 180;
    pr.dmg = e.dmg;
    pr.life = 2.5;
    pr.pierce = 1;
    pr.size = 5;
    pr.color = 0xffaa5f;
    pr.homing = false;
    pr.fromEnemy = true;
    pr.sprite.visible = true;
    pr.sprite.tint = 0xffaa5f;
    this.projectiles.push(pr);
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
    // chests interact
    if (this.rightTap) {
      const rt = this.rightTap;
      this.rightTap = null;
      for (const c of this.chests) {
        if (dist2(c.x, c.y, rt.x + this.camX - this.W/2, rt.y + this.camY - this.H/2) < 60*60) {
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
    e.hitFlash = 0.1;
    this.sfx.play('hit');
    this.spawnHitSpark(e.x, e.y, e.color, e.isBoss ? 0.68 : 0.38);
    if (this._floatTextThisFrame < 1 && this.textPool.active.length < 6) {
      this._floatTextThisFrame++;
      this.showFloatText(e.x, e.y, Math.round(dmg).toString(), 0xffffff);
    }
    // knockback
    const ang = angleTo(sx, sy, e.x, e.y);
    e.kx = Math.cos(ang); e.ky = Math.sin(ang);
    e.knock = 6;
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
      // pooled death burst
      this.spawnHitSpark(e.x, e.y, e.color, e.isBoss ? 1.35 : 0.72, 0.22);
      if (e.isBoss) {
        // spawn chest
        this.spawnChest(e.x, e.y);
      }
      e.active = false;
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

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 40 * dt;
      if (pt.g) {
        pt.g.x = pt.x; pt.g.y = pt.y;
        if (pt.spin) pt.g.rotation += pt.spin * dt;
        if (pt.isText) pt.g.alpha = Math.max(0, pt.life);
        else {
          const duration = pt.maxLife || 0.4;
          pt.g.alpha = Math.max(0, pt.life / duration);
          if (!pt.isText && pt.g.scale && pt.baseScaleX !== undefined) {
            const growth = 1 + (1 - pt.life / duration) * 0.35;
            pt.g.scale.set(pt.baseScaleX * growth, pt.baseScaleY * growth);
          }
        }
      }
      if (pt.life <= 0) {
        if (pt.pooled === 'hit') this.hitPool.release(pt.poolObject);
        else if (pt.pooled === 'slash') this.slashPool.release(pt.poolObject);
        else if (pt.pooled === 'text') this.textPool.release(pt.poolObject);
        else if (pt.g) pt.g.destroy();
        this.particles.splice(i,1);
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
    const panelY = Math.max((this.hudTop ?? 34) + 84, (this.H - panelH) / 2);

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
    t.x = x; t.y = y;
    this.particles.push({ g:t, x, y, vx:0, vy:-56, life:0.55, maxLife:0.55, isText:true, pooled:'text', poolObject:entry });
  }

  spawnHitSpark(x, y, color = 0xffffff, scale = 0.42, life = 0.14, vx = 0, vy = 0) {
    if (this.hitPool.active.length >= 18) return;
    const spark = this.hitPool.acquire();
    spark.active = true;
    spark.sprite.visible = true;
    spark.sprite.alpha = 0.95;
    spark.sprite.tint = color || 0xffffff;
    spark.sprite.scale.set(scale);
    spark.sprite.x = x;
    spark.sprite.y = y;
    this.particles.push({
      g:spark.sprite, x, y, vx, vy, life, maxLife:life,
      isSlash:true, pooled:'hit', poolObject:spark,
      baseScaleX:scale, baseScaleY:scale,
    });
  }

  spawnSlash(x, y, color, area) {
    const entry = this.slashPool.acquire();
    entry.active = true;
    const sprite = entry.sprite;
    sprite.visible = true;
    sprite.alpha = 1;
    sprite.tint = color;
    const sc = 1.55 * area;
    sprite.scale.set(sc);
    sprite.rotation = this.player?.direction === 'left' ? Math.PI : this.player?.direction === 'up' ? -Math.PI / 2 : 0;
    sprite.x = x; sprite.y = y;
    this.particles.push({ g:sprite, x, y, vx:0, vy:0, life:0.26, maxLife:0.26, isSlash:true, spin:-0.8, pooled:'slash', poolObject:entry, baseScaleX:sc, baseScaleY:sc });
  }
  spawnThrust(x, y, ang, len, color) {
    const entry = this.slashPool.acquire();
    entry.active = true;
    const sprite = entry.sprite;
    sprite.visible = true;
    sprite.alpha = 1;
    sprite.tint = color;
    const sx = len / 55, sy = 0.75;
    sprite.scale.set(sx, sy);
    sprite.rotation = ang + Math.PI / 2;
    sprite.x = x + Math.cos(ang) * len * 0.35;
    sprite.y = y + Math.sin(ang) * len * 0.35;
    this.particles.push({ g:sprite, x:sprite.x, y:sprite.y, vx:0, vy:0, life:0.22, maxLife:0.22, isSlash:true, pooled:'slash', poolObject:entry, baseScaleX:sx, baseScaleY:sy });
  }
  spawnSpin(x, y, area, color) {
    const entry = this.slashPool.acquire();
    entry.active = true;
    const sprite = entry.sprite;
    sprite.visible = true;
    sprite.alpha = 1;
    sprite.tint = color;
    const sc = 2.2 * area;
    sprite.scale.set(sc);
    sprite.rotation = 0;
    sprite.x = x; sprite.y = y;
    this.particles.push({ g:sprite, x, y, vx:0, vy:0, life:0.32, maxLife:0.32, isSlash:true, spin:5.5, pooled:'slash', poolObject:entry, baseScaleX:sc, baseScaleY:sc });
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
    sprite.x = p.x;
    sprite.y = p.y;
    sprite.tint = p.invuln > 0 ? 0xff8888 : 0xffffff;
    sprite.alpha = p.invuln > 0 && Math.floor(this.animTime * 14) % 2 === 0 ? 0.65 : 1;
    this.playerShadow.x = p.x;
    this.playerShadow.y = p.y;
    this.playerShadow.alpha = 0.85;
  }

  renderEnemies() {
    const g = this.enemyLayer;
    let drewBossBar = false;
    if (this._hadBossBar) g.clear();
    for (const e of this.enemies) {
      if (!e.active) continue;
      const s = e.sprite;
      s.x = e.x;
      const bob = Math.sin(this.animTime * 8 + e.x * 0.05 + e.y * 0.03) * 1.5;
      s.y = e.y + bob;
      s.alpha = 1;
      const frame = Math.floor(this.animTime * 8 + e.phase * 4) % this.enemyTextures[e.type].length;
      if (e.frame !== frame) {
        e.frame = frame;
        s.texture = this.enemyTextures[e.type][frame];
      }
      s.tint = e.hitFlash > 0 ? 0xff9999 : 0xffffff;
      if (e.isBoss && e.hp < e.maxHp) {
        if (!drewBossBar && !this._hadBossBar) g.clear();
        drewBossBar = true;
        const w = e.size * 2;
        g.rect(e.x - e.size, e.y - e.size - 8, w, 3).fill(0x330000);
        g.rect(e.x - e.size, e.y - e.size - 8, w * (e.hp/e.maxHp), 3).fill(0xff3333);
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
    const W = this.W;
    const hudTop = this.hudTop ?? (this.H > W ? 34 : 8);
    if (this._loadoutDirty) this.renderHudSlots();
    const hpRatio = Math.max(0, p.hp / p.maxHp);
    const hpQuant = Math.round(hpRatio * 100);
    if (hpQuant !== this._lastHpQuant) {
      this._lastHpQuant = hpQuant;
      const hpW = Math.min(126, (W - 36) * 0.42);
      this.hudHp.clear();
      if (hpRatio > 0) this.hudHp.roundRect(18, hudTop + 20, hpW * hpRatio, 6, 2).fill(0xe5484d);
    }
    const xpRatio = Math.max(0, Math.min(1, this.xp / this.xpNext));
    const xpQuant = Math.round(xpRatio * 200);
    if (xpQuant !== this._lastXpQuant) {
      this._lastXpQuant = xpQuant;
      const barW = W - 36;
      this.hudXp.clear();
      if (xpRatio > 0) this.hudXp.roundRect(18, hudTop + 7, barW * xpRatio, 8, 3).fill(0x4c8dff);
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
    const panelY = Math.max((this.hudTop ?? 34) + 84, (this.H - panelH) / 2);

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
      portrait.anchor.set(0.5);
      portrait.scale.set(1.5);
      portrait.x = panelX + 48;
      portrait.y = panelY + 116;
      this.goContainer.addChild(portrait);
    }

    const mins = Math.floor(this.time / 60);
    const secs = Math.floor(this.time % 60).toString().padStart(2, '0');
    const summaryLines = [
      `WARRIOR:  ${this.hero ? this.hero.name.toUpperCase() : 'UNKNOWN'} (${this.perk ? this.perk.short : 'NONE'})`,
      `SURVIVED: ${mins}:${secs}   •   LV ${this.level}`,
      `SLAIN:    ${this.kills} FOES   •   GOLD ${this.gold}`,
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