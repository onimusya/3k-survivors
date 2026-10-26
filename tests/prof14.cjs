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
    const app = g.app;
    g.handleSpawns = () => {};
    g.weapons = [];
    g.bgGrid.visible = false;
    g.enemyLayer.visible = false;
    window.__spawnEnemies(300);
    // hook render
    const origRender = app.render.bind(app);
    let t=0,c=0;
    app.render = () => { const a=performance.now(); origRender(); const b=performance.now(); t+=b-a;c++; if(c%60===0){ console.log('render avg',(t/c).toFixed(2)); t=0;c=0;} };
  });
  await page.waitForTimeout(8000);
  await browser.close();
})();
