'use strict';
// Refresh review images after every control transition has settled.
const { chromium } = require(process.env.PRIVATE_CLUB_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), out = path.join(root, 'docs/previews/page-02-v2.0');
const url = process.env.PRIVATE_CLUB_PREVIEW_URL || 'http://127.0.0.1:8797/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PRIVATE_CLUB_CHROMIUM_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const report = { status: 'pending', browser: await browser.version(), keyboardNavigation: [], screenshots: [] };
  try {
    for (const [width, height] of [[1440, 900], [1280, 800], [1024, 768], [390, 844]]) {
      const name = `${width < 768 ? 'mobile' : width === 1024 ? 'tablet' : 'desktop'}-${width}x${height}`;
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(url); await page.evaluate(async () => { await document.fonts.ready; });
      if (width === 1024) {
        await page.locator('#menu-toggle').focus(); await page.keyboard.press('Enter');
        await page.locator('.nav-action[data-section-link]').focus(); await page.keyboard.press('Enter');
        assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'false');
      } else {
        await page.locator('.button-outline').focus(); await page.keyboard.press('Enter');
      }
      await page.waitForFunction(() => Math.abs(document.getElementById('how-it-works').getBoundingClientRect().top) < 1);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'how-it-works');
      assert(await page.locator('#coming-soon').isHidden());
      for (let index = 0; index < 4; index++) {
        await page.locator('.page-two-dot').nth(index).evaluate(button => button.click());
        await page.waitForFunction(i => document.querySelector('.page-two-count').textContent === `${String(i + 1).padStart(2, '0')} / 04`, index);
        await page.locator('.page-two-slide img').nth(index).evaluate(image => image.decode());
        await page.locator('.page-two-controls').evaluate(e => Promise.all(e.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))));
        const file = `${name}-slide-0${index + 1}.png`;
        await page.screenshot({ path: path.join(out, file) });
        report.screenshots.push(file);
      }
      report.keyboardNavigation.push({ viewport: name, via: width === 1024 ? 'menu link, Enter' : 'Hero link, Enter', passed: true });
      await page.close(); console.log('PASS settled captures and keyboard section link:', name);
    }
    report.status = 'passed';
    fs.writeFileSync(path.join(out, 'capture-verification.json'), JSON.stringify(report, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
