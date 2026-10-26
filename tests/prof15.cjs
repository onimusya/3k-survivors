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
    console.log('render type', typeof app.render, 'ticker', !!app.ticker);
    // hook ticker update
    const orig = app.ticker.update.bind(app.ticker);
    let t=0,c=0;
    app.ticker.update = (dt) => { const a=performance.now(); orig(dt); const b=performance.now(); t+=b-a;c++; if(c%60===0){ console.log('ticker.update avg',(t/c).toFixed(2)); t=0;c=0;} };
  });
  await page.waitForTimeout(4000);
  await browser.close();
})();
