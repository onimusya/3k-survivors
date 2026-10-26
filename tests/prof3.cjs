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
    const names = ['handleSpawns','handleWeapons','updateProjectiles','updateEnemies','handlePlayerCollisions','updateHud'];
    for (const n of names) {
      const orig = g[n].bind(g);
      let t=0,c=0;
      g[n] = function(dt){ const a=performance.now(); orig(dt); const b=performance.now(); t+=b-a;c++; if(c%60===0) console.log(n,'avg',(t/c).toFixed(2)); };
    }
    // wrap tick/updatePlaying
  });
  await page.waitForTimeout(7000);
  await browser.close();
})();
