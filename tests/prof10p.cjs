const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('console', m => console.log('PAGE:', m.text()));
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(1500);
  await page.mouse.click(100, 400);
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const g = window.__game;
    g.handleSpawns = () => {};
    g.weapons = [];
    g.bgGrid.visible = false;
    g.renderEnemies = () => {};
    g.renderProjectiles = () => {};
    g.renderGems = () => {};
    g.renderChests = () => {};
    g.renderParticles = () => {};
    g.renderPlayer = () => {};
    window.__spawnEnemies(300);
    const origTick = g.tick.bind(g);
    let times = {};
    // wrap updatePlaying by overriding? Instead measure inside via monkey of updatePlaying
    const origUP = g.updatePlaying.bind(g);
    let t=0,c=0,sum=0;
    g.updatePlaying = (dt) => {
      const a=performance.now();
      origUP(dt);
      const b=performance.now();
      const d=b-a;
      sum+=d;c++;
      if(c%60===0){ console.log('updatePlaying avg',(sum/c).toFixed(2),'last',d.toFixed(2)); sum=0;c=0; }
    };
  });
  await page.waitForTimeout(8000);
  await browser.close();
})();
