const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('console', m => console.log('PAGE:', m.text()));
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1500);
  await page.mouse.click(100, 400);
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const g = window.__game;
    g.renderEnemies = () => {};
    g.renderProjectiles = () => {};
    g.renderGems = () => {};
    g.renderChests = () => {};
    g.renderParticles = () => {};
    g.renderPlayer = () => {};
    window.__spawnEnemies(300);
    // instrument updateEnemies
    const orig = g.updateEnemies.bind(g);
    let t1=0,t2=0,c=0;
    g.updateEnemies = (dt) => {
      const a=performance.now(); orig(dt); const b=performance.now();
      t1 += b-a; c++;
      if (c%60===0){ console.log('updateEnemies avg', (t1/c).toFixed(2)); }
    };
  });
  await page.waitForTimeout(6000);
  await browser.close();
})();
