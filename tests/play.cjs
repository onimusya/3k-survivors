const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);
  // click first hero
  await page.mouse.click(100, 400);
  await page.waitForTimeout(1000);
  // move joystick
  await page.mouse.down({ x: 90, y: 750 });
  await page.mouse.move(120, 780);
  await page.waitForTimeout(5000);
  const fps = await page.evaluate(() => window.__fps);
  console.log('FPS:', fps);
  await page.screenshot({ path: '/tmp/commandcode-1000/-home-francishor-Projects-3k-survivors/eb83bce8-cf80-4d8b-8197-2920eb08374d/scratchpad/screen.png' });
  await browser.close();
})();