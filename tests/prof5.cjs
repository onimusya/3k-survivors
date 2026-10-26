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
    // keep renderEnemies enabled, disable others
    g.renderProjectiles = () => {};
    g.renderGems = () => {};
    g.renderChests = () => {};
    g.renderParticles = () => {};
    g.renderPlayer = () => {};
    g.bgGrid.visible = false;
    window.__spawnEnemies(300);
  });
  await page.waitForTimeout(2000);
  for (let i=0;i<5;i++) {
    await page.waitForTimeout(1000);
    const f = await page.evaluate(() => window.__fps);
    console.log('PAGE: fps', f);
  }
  await browser.close();
})();
