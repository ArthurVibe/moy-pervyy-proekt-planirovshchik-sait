'use strict';
const q = require('./club-awakens-common.cjs');
const report = { baseline: q.base, cases: [], webkit: { installed: q.fs.existsSync(q.webkit.executablePath()) } };
if (process.env.CLUB_LIGHTS_QA_RESUME === '1') {
  const previous = q.path.join(q.out, 'behavior-verification.json');
  if (q.fs.existsSync(previous)) report.cases = JSON.parse(q.fs.readFileSync(previous, 'utf8')).cases.filter(item =>
    item.status === 'passed' && !(item.name.includes('cached image') && !item.cachedResponseObserved));
}
let browser;
const test = async (name, run, options = {}) => {
  if (report.cases.some(item => item.name === name && item.status === 'passed')) return;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await q.instrument(page);
  try {
    const result = await run(page, context);
    q.assert.deepEqual(errors, result?.expectedErrors || [], `${name}: unexpected JavaScript errors`);
    report.cases.push({ name, status: 'passed', ...result });
    console.log('PASS', name);
  } catch (error) {
    report.cases.push({ name, status: 'failed', error: error.stack });
    throw error;
  } finally { await context.close(); }
};
const navigate = async (page, query = '') => { await page.goto(q.url + query); await q.waitState(page, 'running'); };
const visibilityHarness = async (page, hidden) => page.addInitScript(hidden => {
  let current = hidden;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => current });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => current ? 'hidden' : 'visible' });
  window.clubReviewVisibility = value => { current = value; document.dispatchEvent(new Event('visibilitychange')); };
}, hidden);
(async () => {
  q.assertOriginalPreserved();
  browser = await q.launch();
  report.browser = await browser.version();
  await test('natural lifecycle and zero final opacity', async page => {
    await navigate(page);
    q.assert((await q.layers(page))[0].opacity <= .18);
    await q.waitState(page, null);
    await q.assertDarknessGone(page);
    const records = await page.evaluate(() => window.clubReview);
    const start = records.states.find(item => item.state === 'running');
    const end = records.states.find(item => item.state === null);
    q.assert(start && end && end.time - start.time >= 1750 && end.time - start.time <= 1950);
    q.assert.equal(await page.locator('#club-photo').getAttribute('fetchpriority'), 'high');
    q.assert(await page.evaluate(() => [...document.images].every(image => image.complete && image.naturalWidth > 0)));
    return { durationMs: end.time - start.time, states: records.states, errors: records.errors };
  });
  for (const [query, club, warm] of [
    ['?clubLights=off', false, true], ['?warmWelcome=off', true, false],
    ['?clubLights=off&warmWelcome=off', false, false]
  ]) await test(`independent parameters ${query}`, async page => {
    await page.goto(q.url + query);
    if (club) await q.waitState(page, 'running'); else await q.assertDarknessGone(page);
    q.assert.equal(await page.locator('.hero').getAttribute('data-warm-welcome'), warm ? 'on' : 'off');
    await page.locator('#meet-bro').hover();
    await page.waitForTimeout(220);
    await q.assertDarknessGone(page);
    q.assert.equal(await page.locator('.hero').getAttribute('data-warm-active') !== null, warm);
    await page.locator('#meet-bro').click();
    q.assert.equal(await page.locator('#notice-message').innerText(), 'Coming soon');
  });
  for (const action of ['hover', 'keyboard focus', 'scroll intent']) await test(`early ${action} settles within 200 ms`, async page => {
    await navigate(page);
    await page.waitForTimeout(400);
    if (action === 'hover') await page.locator('#meet-bro').hover();
    else if (action === 'keyboard focus') await page.keyboard.press('Tab');
    else await page.mouse.wheel(0, 100);
    await q.waitState(page, null);
    await q.assertDarknessGone(page);
    const states = await page.evaluate(() => window.clubReview.states);
    const settling = states.find(item => item.state === 'settling');
    const end = states.find(item => item.state === null);
    q.assert(settling && end && end.time - settling.time <= 200);
    return { settlingMs: end.time - settling.time };
  });
  await test('reduced motion from first paint', async page => {
    await page.goto(q.url); await q.ready(page); await q.assertDarknessGone(page);
    q.assert.equal(await page.evaluate(() => window.clubLightEntrance), undefined);
  }, { reducedMotion: 'reduce' });
  await test('reduced motion toggled while playing', async page => {
    await navigate(page); await page.waitForTimeout(350);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    q.assert((await q.layers(page)).every(layer => layer.opacity === 0));
    await q.waitState(page, null); // matchMedia dispatch follows style resolution.
    await q.assertDarknessGone(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(150); await q.assertDarknessGone(page);
  });
  await test('JavaScript disabled', async page => {
    await page.goto(q.url); await q.ready(page); await q.assertDarknessGone(page);
    return { sourcePhotoLoaded: await page.locator('#club-photo').evaluate(image => image.naturalWidth === 2560) };
  }, { javaScriptEnabled: false });
  await test('runtime error restores plain lighting', async page => {
    await navigate(page);
    await page.evaluate(() => { setTimeout(() => { throw new Error('planned lighting safety test'); }, 0); });
    await q.waitState(page, null); await q.assertDarknessGone(page);
    return { expectedErrors: ['planned lighting safety test'] };
  });
  await test('missing controller cannot leave pending darkness', async page => {
    await page.route(q.url, route => route.fulfill({ contentType: 'text/html', body: q.source.replace(
      /  <script>\n    \/\/ Independent from the approved Warm Welcome[\s\S]*?  <\/script>\n/, '') }));
    await page.goto(q.url);
    q.assert.equal(await page.evaluate(() => document.documentElement.dataset.clubLights), 'pending');
    await q.waitState(page, null); await q.assertDarknessGone(page);
  });
  await test('slow image misses 1500 ms deadline without late restart', async page => {
    await page.route(/Whats_Up_Bro_Private_Club_Hero_2560x1440\.(png|webp)$/, async route => {
      await q.delay(1800); await route.continue();
    });
    await page.goto(q.url, { waitUntil: 'domcontentloaded' });
    q.assert.equal(await page.evaluate(() => document.documentElement.dataset.clubLights), 'pending');
    await q.waitState(page, null);
    await page.waitForLoadState('load'); await q.ready(page); await q.assertDarknessGone(page);
    const states = await page.evaluate(() => window.clubReview.states);
    q.assert(!states.some(item => item.state === 'running'));
    return { states };
  });
  await test('image ready inside deadline starts only after decoding', async page => {
    await page.route(/Whats_Up_Bro_Private_Club_Hero_2560x1440\.(png|webp)$/, async route => {
      await q.delay(700); await route.continue();
    });
    await page.goto(q.url, { waitUntil: 'domcontentloaded' });
    q.assert.equal(await page.evaluate(() => document.documentElement.dataset.clubLights), 'pending');
    q.assert.equal((await q.layers(page))[0].opacity, .18);
    await q.waitState(page, 'running');
    q.assert(await page.locator('#club-photo').evaluate(image => image.complete && image.naturalWidth > 0));
    return { startTimeMs: await page.evaluate(() => window.clubReview.states.find(s => s.state === 'running').time) };
  });
  await test('photo error removes every light layer', async page => {
    await page.route(/Whats_Up_Bro_Private_Club_Hero_2560x1440\.(png|webp)$/, route => route.abort('failed'));
    await page.goto(q.url); await q.waitState(page, null); await q.assertDarknessGone(page);
    q.assert.equal(await page.locator('#club-photo').getAttribute('hidden'), '');
  });
  await test('reload and cached image each get one entrance', async (page, context) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
    let cached = false;
    const requests = new Map();
    cdp.on('Network.requestWillBeSent', ({ requestId, request }) => requests.set(requestId, request.url));
    cdp.on('Network.requestServedFromCache', ({ requestId }) => {
      if (requests.get(requestId)?.endsWith('Hero_2560x1440.webp')) cached = true;
    });
    cdp.on('Network.responseReceived', ({ response }) => {
      if (response.url.endsWith('Hero_2560x1440.webp') && response.fromDiskCache) cached = true;
    });
    await navigate(page); await q.waitState(page, null);
    await page.reload(); await q.waitState(page, 'running'); await q.waitState(page, null);
    q.assert.equal(await page.evaluate(() => window.clubReview.states.filter(s => s.state === 'running').length), 1);
    const imageResource = await page.evaluate(() => {
      const r = performance.getEntriesByType('resource').find(r => r.name.endsWith('Hero_2560x1440.webp'));
      return { transferSize: r.transferSize, encodedBodySize: r.encodedBodySize, deliveryType: r.deliveryType };
    });
    const revalidated = imageResource.transferSize < imageResource.encodedBodySize;
    q.assert(cached || revalidated, 'Expected a cached or revalidated photograph on reload');
    return { cachedResponseObserved: cached || revalidated, revalidatedBody: revalidated, imageResource, reloadSingleEntrance: true };
  });
  await test('initially hidden tab starts only when shown within deadline', async page => {
    await visibilityHarness(page, true);
    await page.goto(q.url);
    q.assert.equal(await page.evaluate(() => document.documentElement.dataset.clubLights), 'pending');
    await page.waitForTimeout(250);
    await page.evaluate(() => window.clubReviewVisibility(false));
    await q.waitState(page, 'running');
    await page.evaluate(() => window.clubReviewVisibility(true));
    await q.assertDarknessGone(page);
    await page.evaluate(() => window.clubReviewVisibility(false));
    await page.waitForTimeout(150); await q.assertDarknessGone(page);
    return { method: 'visibilityState/hidden getters and visibilitychange event emulation' };
  });
  await test('initially hidden tab misses deadline and stays static', async page => {
    await visibilityHarness(page, true); await page.goto(q.url);
    await q.waitState(page, null);
    await page.evaluate(() => window.clubReviewVisibility(false));
    await page.waitForTimeout(150); await q.assertDarknessGone(page);
    q.assert(!await page.evaluate(() => window.clubReview.states.some(s => s.state === 'running')));
    return { method: 'visibilityState/hidden getters and visibilitychange event emulation' };
  });
  await test('bfcache and persisted pageshow never replay entrance', async page => {
    await page.addInitScript(() => {
      window.clubReviewPageshow = [];
      addEventListener('pageshow', event => window.clubReviewPageshow.push(event.persisted));
    });
    await navigate(page);
    await page.goto(q.url + 'assets/mini-bro/README.md');
    // A restored document does not dispatch a new load event.
    await page.goBack({ waitUntil: 'commit' });
    const persisted = await page.evaluate(() => window.clubReviewPageshow.includes(true));
    if (persisted) await q.assertDarknessGone(page);
    else {
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
      await q.assertDarknessGone(page);
    }
    return { actualBfcacheRestored: persisted, persistedEventFallback: !persisted };
  });
  await test('resize remaps cropped lamps without restarting', async page => {
    await page.clock.install(); await page.clock.pauseAt(Date.now());
    await navigate(page); await q.freeze(page); await q.frame(page, 600);
    for (const [width, height] of [[1024, 768], [390, 844], [360, 800], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      // ResizeObserver is a rendering callback, not an animation replay.
      await q.delay(60);
      const state = await page.evaluate(() => {
        const scene = document.querySelector('.hero-scene'), s = getComputedStyle(scene), r = scene.getBoundingClientRect();
        return { root: document.documentElement.dataset.clubLights,
          time: document.querySelector('.club-light-shade').getAnimations()[0]?.currentTime,
          width: r.width, height: r.height,
          lamps: ['left', 'right'].map(name => ({ hidden: document.querySelector(`.club-light-${name}`).hidden,
            x: parseFloat(s.getPropertyValue(`--club-${name}-x`)), y: parseFloat(s.getPropertyValue(`--club-${name}-y`)) })) };
      });
      q.assert.equal(state.root, 'running'); q.assert.equal(state.time, 600);
      for (const lamp of state.lamps) q.assert.equal(lamp.hidden,
        lamp.x < 0 || lamp.x > state.width || lamp.y < 0 || lamp.y > state.height);
    }
  });
  await test('glow excludes Bro source band X 1550–2010', async page => {
    await page.clock.install(); await page.clock.pauseAt(Date.now());
    await navigate(page); await q.freeze(page); await q.frame(page, 1050);
    await page.screenshot({ path: q.path.join(q.temp, 'mask-with-glows.png') });
    const area = await page.evaluate(() => {
      const photo = document.getElementById('club-photo'), r = photo.getBoundingClientRect();
      const scale = Math.max(r.width / photo.naturalWidth, r.height / photo.naturalHeight);
      const position = parseFloat(getComputedStyle(photo).objectPosition.split(' ')[0]) / 100;
      const offset = r.left + (r.width - photo.naturalWidth * scale) * position;
      document.querySelectorAll('.club-light-glow').forEach(light => { light.hidden = true; });
      return { left: Math.ceil(offset + 1550 * scale), right: Math.floor(offset + 2010 * scale), top: 0, bottom: innerHeight };
    });
    await page.screenshot({ path: q.path.join(q.temp, 'mask-without-glows.png') });
    q.fs.writeFileSync(q.path.join(q.temp, 'mask-area.json'), JSON.stringify(area));
    return { sourceBand: [1550, 2010], pixelCheck: 'compare-club-awakens.py' };
  });
  await test('touch menu and Coming soon stay usable during entrance', async page => {
    await navigate(page);
    await page.locator('#menu-toggle').tap();
    q.assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'true');
    await page.locator('.invitation').tap();
    q.assert.equal(await page.locator('#notice-message').innerText(), 'Coming soon');
    q.assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'false');
    await page.locator('#notice-close').tap();
    q.assert(await page.locator('#coming-soon').isHidden());
    await q.waitState(page, null);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await q.assertDarknessGone(page);
  }, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  report.status = 'passed';
})().catch(error => { report.status = 'failed'; console.error(error); process.exitCode = 1; })
  .finally(async () => {
    q.fs.writeFileSync(q.path.join(q.out, 'behavior-verification.json'), JSON.stringify(report, null, 2) + '\n');
    await browser?.close();
  });
