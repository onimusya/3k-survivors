const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1500);
  await page.mouse.click(100, 400); // pick hero
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__spawnEnemies(300));
  await page.waitForTimeout(2000);
  // sample fps for 5s
  let min = 999, sum=0, n=0;
  for (let i=0;i<5;i++) {
    await page.waitForTimeout(1000);
    const f = await page.evaluate(() => window.__fps);
    console.log('fps', f);
    if (f < min) min = f;
    sum += f; n++;
  }
  console.log('AVG', (sum/n).toFixed(1), 'MIN', min);
  await page.screenshot({ path: '/tmp/commandcode-1000/-home-francishor-Projects-3k-survivors/eb83bce8-cf80-4d8b-8197-2920eb08374d/scratchpad/perf.png' });
  await browser.close();
})();