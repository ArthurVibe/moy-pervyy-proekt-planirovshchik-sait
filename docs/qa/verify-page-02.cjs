'use strict';
// These dependencies are for review only; the landing page uses native browser APIs.
const { chromium, webkit } = require(process.env.PRIVATE_CLUB_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const base = '0ed62f88d53e32d25a628ec8b94b69f05b5a7a91';
const baseline = cp.execFileSync('git', ['show', `${base}:index.html`], { cwd: root, encoding: 'utf8' });
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const url = process.env.PRIVATE_CLUB_PREVIEW_URL || 'http://127.0.0.1:8797/';
const out = path.join(root, 'docs/previews/page-02-v2.0'), temp = '/tmp/private-club-page-02';
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(temp, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/page-02/manifest.json'), 'utf8'));
const selectors = ['.hero', '.header-inner', '.brand', '.wordmark-top', '.wordmark-bottom', '.brand-tagline',
  '.main-nav', '.invitation', '.hero-content', '.hero-title', '.hero-tagline', '.hero-description',
  '.hero-actions', '#meet-bro', '.button-outline', '.hero-scene', '#club-photo', '.mini-bro'];
const report = { baseline: base, viewports: [], behavior: [], errors: [], webkitInstalled: fs.existsSync(webkit.executablePath()) };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const readyHero = page => page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.querySelectorAll('.hero img')].map(i => i.decode()));
  document.querySelector('.hero-content').setAttribute('data-intro-complete', '');
});
const geometry = page => page.evaluate(selectors => Object.fromEntries(selectors.map(selector => {
  const e = document.querySelector(selector), r = e.getBoundingClientRect(), s = getComputedStyle(e);
  return [selector, { x: r.x, y: r.y, width: r.width, height: r.height, font: s.fontFamily, size: s.fontSize, lineHeight: s.lineHeight }];
})), selectors);
const current = async (page, index) => {
  await page.waitForFunction(i => document.querySelector('.page-two-count').textContent === `${String(i + 1).padStart(2, '0')} / 04`, index);
  await page.waitForFunction(i => {
    const t = document.querySelector('.page-two-track'), slides = [...t.children];
    return Math.abs(t.scrollLeft - (slides[i].offsetLeft - slides[0].offsetLeft)) < 1.1;
  }, index);
  await page.locator('.page-two-slide img').nth(index).evaluate(image => image.decode());
};
const enter = async (page, viaMenu = false) => {
  if (viaMenu) { await page.locator('#menu-toggle').click(); await page.locator('.nav-action[data-section-link]').click(); }
  else await page.locator('.button-outline').click();
  await page.waitForFunction(() => Math.abs(document.getElementById('how-it-works').getBoundingClientRect().top) < 1);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'how-it-works');
  assert.equal(await page.locator('#coming-soon').isHidden(), true);
  assert.equal(new URL(page.url()).hash, '#how-it-works');
};
const fit = page => page.evaluate(() => {
  const track = document.querySelector('.page-two-track'), tr = track.getBoundingClientRect();
  const slide = document.querySelector('.page-two-slide[aria-hidden="false"]'), image = slide.querySelector('img');
  const ir = image.getBoundingClientRect(), s = getComputedStyle(image);
  const scale = Math.min(ir.width / image.naturalWidth, ir.height / image.naturalHeight);
  const paint = { x: ir.x + (ir.width - image.naturalWidth * scale) / 2,
    y: ir.y + (ir.height - image.naturalHeight * scale) / 2,
    width: image.naturalWidth * scale, height: image.naturalHeight * scale };
  return { fit: s.objectFit, natural: [image.naturalWidth, image.naturalHeight], paint,
    track: tr.toJSON(), loading: image.loading, image: new URL(image.currentSrc).pathname,
    scrollLeft: track.scrollLeft, count: document.querySelector('.page-two-count').textContent,
    visibleToAccessibility: document.querySelectorAll('.page-two-slide[aria-hidden="false"]').length,
    activeDots: document.querySelectorAll('.page-two-dot[aria-current="true"]').length,
    overflow: document.documentElement.scrollWidth > innerWidth };
});
const assertFit = state => {
  assert.equal(state.fit, 'contain'); assert.equal(state.loading, 'lazy'); assert.equal(state.overflow, false);
  assert.equal(state.activeDots, 1); assert.equal(state.visibleToAccessibility, 1);
  assert(state.natural[0] > 0 && state.natural[1] > 0);
  assert(state.paint.x >= state.track.x && state.paint.x + state.paint.width <= state.track.right + 1);
  assert(state.paint.y >= state.track.y && state.paint.y + state.paint.height <= state.track.bottom + 1);
  assert(Math.abs(state.paint.width / state.paint.height - state.natural[0] / state.natural[1]) < 1e-8);
};
let browser;
(async () => {
  const oldScript = [...baseline.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const scripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.equal(scripts[0], oldScript[0], 'Original menu, Warm Welcome and button JavaScript must stay intact');
  assert.equal(source.replace(/    \/\* Page 02 is isolated[\s\S]*?(?=  <\/style>)/, '').match(/<style>([\s\S]*?)<\/style>/)[1],
    baseline.match(/<style>([\s\S]*?)<\/style>/)[1]);
  browser = await chromium.launch({ executablePath: process.env.PRIVATE_CLUB_CHROMIUM_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'] });
  report.browser = await browser.version();
  for (const [width, height] of [[1440, 900], [1280, 800], [1024, 768], [390, 844]]) {
    const name = `${width < 768 ? 'mobile' : width === 1024 ? 'tablet' : 'desktop'}-${width}x${height}`;
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('requestfailed', r => report.errors.push(r.url()));
    const reference = await browser.newPage({ viewport: { width, height } });
    await reference.route(url + '__page_02_baseline.html', route => route.fulfill({ contentType: 'text/html', body: baseline }));
    await Promise.all([page.goto(url), reference.goto(url + '__page_02_baseline.html')]);
    await Promise.all([readyHero(page), readyHero(reference)]);
    assert.deepEqual(await geometry(page), await geometry(reference), `${name}: Hero geometry changed`);
    await page.screenshot({ path: path.join(temp, `${name}-hero-after.png`) });
    await reference.screenshot({ path: path.join(temp, `${name}-hero-before.png`) });
    await reference.close();
    assert.equal(await page.locator('main').count(), 1);
    assert.equal(await page.locator('#page-two-title').count(), 1);
    assert.equal(await page.locator('.page-two-slide').count(), 4);
    assert.equal(await page.locator('.page-two-dot').count(), 4);
    await enter(page, width === 1024);
    const intro = await page.locator('.page-two-intro').innerHTML();
    const states = [];
    for (let index = 0; index < 4; index++) {
      if (index) await page.locator('.page-two-next').click();
      await current(page, index);
      const state = await fit(page); assertFit(state);
      const asset = manifest.find(row => state.image.endsWith(row.file));
      assert(asset && asset.file.startsWith(`0${index + 1}_`));
      assert.deepEqual(state.natural, [asset.width, asset.height]);
      assert.equal(await page.locator('.page-two-intro').innerHTML(), intro);
      await page.locator('.page-two-controls').evaluate(e => Promise.all(e.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))));
      await page.screenshot({ path: path.join(out, `${name}-slide-0${index + 1}.png`) });
      states.push(state);
    }
    assert.equal(await page.locator('.page-two-next').getAttribute('aria-disabled'), 'true');
    await page.locator('.page-two-next').evaluate(button => button.click()); await current(page, 3);
    await page.locator('.page-two-prev').click(); await current(page, 2);
    await page.locator('.page-two-dot').first().click(); await current(page, 0);
    await page.locator('.page-two-track').focus();
    await page.keyboard.press('ArrowRight'); await current(page, 1);
    await page.keyboard.press('End'); await current(page, 3);
    await page.keyboard.press('Home'); await current(page, 0);
    await page.locator('.page-two-dot').nth(2).focus(); await page.keyboard.press('Enter'); await current(page, 2);
    await page.keyboard.press('ArrowLeft'); await current(page, 1);
    const focused = await page.evaluate(() => ({ width: getComputedStyle(document.activeElement).outlineWidth,
      visible: document.activeElement.matches(':focus-visible') }));
    assert(focused.visible && parseFloat(focused.width) >= 2);
    await page.waitForTimeout(2000); await current(page, 1);
    await page.evaluate(() => { scrollTo(0, 0); });
    if (width <= 1100) { await page.locator('#menu-toggle').click(); await page.locator('.nav-action[data-coming-soon]').first().click(); }
    else await page.locator('#meet-bro').click();
    assert.equal(await page.locator('#notice-message').innerText(), 'Coming soon');
    await page.locator('#notice-close').click();
    if (width > 1100) {
      await page.locator('.button-outline').hover(); await page.waitForTimeout(450);
      const lift = await page.locator('.button-outline .button-face').evaluate(e => new DOMMatrix(getComputedStyle(e).transform).m42);
      assert.equal(lift, -4);
      await page.locator('#meet-bro').hover(); await page.waitForTimeout(550);
      assert.equal(await page.locator('.hero').getAttribute('data-warm-active'), '');
      assert.equal(await page.locator('#meet-bro .button-face').evaluate(e => new DOMMatrix(getComputedStyle(e).transform).m42), -6);
      await page.mouse.move(0, 0);
      await page.locator('.nav-action[data-section-link]').click();
      await page.waitForFunction(() => Math.abs(document.getElementById('how-it-works').getBoundingClientRect().top) < 1);
    } else {
      await enter(page, true);
      assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'false');
    }
    report.viewports.push({ name, viewport: { width, height }, heroGeometryUnchanged: true, slides: states,
      arrowsDotsKeyboardPassed: true, navigationPassed: true, comingSoonPreserved: true, noAutoplay: true });
    await page.close();
    console.log('PASS viewport, all slides, keyboard and Hero:', name);
  }
  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await reduced.goto(url); await readyHero(reduced); await enter(reduced);
  await reduced.locator('.page-two-dot').last().click(); await current(reduced, 3); assertFit(await fit(reduced));
  await reduced.locator('.page-two-dot').first().click(); await current(reduced, 0);
  await reduced.emulateMedia({ reducedMotion: 'no-preference' });
  await reduced.locator('.page-two-dot').last().click();
  await reduced.emulateMedia({ reducedMotion: 'reduce' }); await current(reduced, 3);
  await reduced.setViewportSize({ width: 390, height: 844 });
  await reduced.locator('.page-two-track').scrollIntoViewIfNeeded(); await delay(120); await current(reduced, 3); assertFit(await fit(reduced));
  report.behavior.push({ name: 'reduced motion before/during transition and resize preserves selected slide', status: 'passed' });
  await reduced.close();
  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const touch = await touchContext.newPage(); await touch.goto(url); await readyHero(touch); await enter(touch);
  const cdp = await touchContext.newCDPSession(touch);
  const swipe = async direction => {
    const r = await touch.locator('.page-two-track').boundingBox(), y = r.y + r.height / 2;
    const start = direction === 'left' ? r.x + r.width - 24 : r.x + 24;
    const end = direction === 'left' ? r.x + 24 : r.x + r.width - 24;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start, y }] });
    for (let step = 1; step <= 10; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start + (end - start) * step / 10, y }] });
      await delay(25);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await swipe('left'); await current(touch, 1);
  await swipe('left'); await current(touch, 2);
  await swipe('right'); await current(touch, 1);
  assertFit(await fit(touch));
  report.behavior.push({ name: 'native mobile touch swipes left and right', status: 'passed', method: 'CDP touchStart/touchMove/touchEnd, not synthetic scrollLeft assignment' });
  await touchContext.close();
  const noJs = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  await noJs.goto(url); await readyHero(noJs);
  await noJs.locator('.button-outline').click();
  await noJs.waitForFunction(() => Math.abs(document.getElementById('how-it-works').getBoundingClientRect().top) < 1);
  assert(await noJs.locator('.page-two-controls').isHidden());
  assert.equal(await noJs.locator('.page-two-slide[aria-hidden]').count(), 0);
  report.behavior.push({ name: 'JavaScript off: native anchor, scrollable images, no dead controls', status: 'passed' });
  await noJs.close();
  const direct = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await direct.goto(url + '#how-it-works'); await readyHero(direct);
  await direct.waitForFunction(() => Math.abs(document.getElementById('how-it-works').getBoundingClientRect().top) < 1);
  await direct.locator('.page-two-next').evaluate(button => { button.click(); button.click(); button.click(); });
  await current(direct, 3); assertFit(await fit(direct));
  report.behavior.push({ name: 'direct fragment navigation and rapid next clicks', status: 'passed' });
  await direct.close();
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
})().catch(error => { report.status = 'failed'; report.failure = error.stack; console.error(error); process.exitCode = 1; })
  .finally(async () => { fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n'); await browser?.close(); });
