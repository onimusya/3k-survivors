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
    window.__spawnEnemies(300);
  });
  await page.waitForTimeout(2000);
  for (let i=0;i<6;i++) {
    await page.waitForTimeout(1000);
    const f = await page.evaluate(() => window.__fps);
    const n = await page.evaluate(() => window.__game.enemies.length);
    console.log('PAGE: fps', f, 'enemies', n);
  }
  await browser.close();
})();
