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
  for (const n of [50, 100, 200, 300]) {
    await page.evaluate((n) => {
      const g = window.__game;
      // clear enemies
      for (const e of g.enemies) { e.active=false; if(e.sprite) e.sprite.visible=false; }
      g.enemies.length=0;
      g.handleSpawns = () => {};
      g.weapons = [];
      g.bgGrid.visible = false;
      window.__spawnEnemies(n);
    }, n);
    await page.waitForTimeout(2000);
    // sample
    let sum=0,c=0;
    for (let i=0;i<3;i++){ await page.waitForTimeout(1000); const f=await page.evaluate(()=>window.__fps); sum+=f;c++; }
    console.log('PAGE: n='+n+' fps='+(sum/c).toFixed(1));
  }
  await browser.close();
})();
