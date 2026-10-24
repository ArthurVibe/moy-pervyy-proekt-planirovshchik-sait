'use strict';
// Browser tooling is used only for review; it is not a website dependency.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const { chromium, webkit } = require(process.env.PRIVATE_CLUB_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../..');
const base = '0ed62f88d53e32d25a628ec8b94b69f05b5a7a91';
const baseline = cp.execFileSync('git', ['show', `${base}:index.html`], { cwd: root, encoding: 'utf8' });
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const url = process.env.PRIVATE_CLUB_PREVIEW_URL || 'http://127.0.0.1:8794/';
const out = path.join(root, 'docs/previews/club-awakens-v1.1');
const temp = process.env.CLUB_LIGHTS_QA_TEMP || '/tmp/club-awakens-v1.1';
const viewports = [[1440, 900], [1280, 800], [1024, 768], [390, 844], [360, 800]];
const selectors = ['.hero', '.header-inner', '.brand', '.wordmark-top', '.wordmark-bottom',
  '.brand-tagline', '.main-nav', '.invitation', '.hero-content', '.hero-title', '.hero-tagline',
  '.hero-description', '.hero-actions', '#meet-bro', '.button-outline', '.hero-scene',
  '#club-photo', '.mini-bro', '#meet-bro svg', '.button-outline svg'];
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(temp, { recursive: true });
const name = (width, height) => `${width < 768 ? 'mobile' : width === 1024 ? 'tablet' : 'desktop'}-${width}x${height}`;
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const launch = () => chromium.launch({ executablePath: process.env.PRIVATE_CLUB_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
  args: ['--no-sandbox'], ignoreDefaultArgs: ['--disable-back-forward-cache'] });
const waitState = async (page, state, timeout = 4000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate(() => document.documentElement.getAttribute('data-club-lights')) === state) return;
    await delay(20);
  }
  throw new Error(`Expected club-light state ${state}`);
};
const ready = page => page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(image => image.decode()));
  document.querySelector('.hero-content').setAttribute('data-intro-complete', '');
});
const geometry = page => page.evaluate(selectors => Object.fromEntries(selectors.map(selector => {
  const element = document.querySelector(selector), r = element.getBoundingClientRect(), s = getComputedStyle(element);
  return [selector, { x: r.x, y: r.y, width: r.width, height: r.height,
    font: s.fontFamily, size: s.fontSize, lineHeight: s.lineHeight }];
})), selectors);
const layers = page => page.evaluate(() => [...document.querySelectorAll('.club-lights > div')].map(e => ({
  class: e.className, opacity: Number(getComputedStyle(e).opacity), hidden: e.hidden,
  pointerEvents: getComputedStyle(e).pointerEvents, rect: e.getBoundingClientRect().toJSON()
})));
const assertDarknessGone = async page => {
  assert((await layers(page)).every(layer => layer.opacity === 0), 'All new opacities must be zero');
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-club-lights')), null);
};
const freeze = async page => {
  await ready(page);
  await page.evaluate(() => {
    window.clubReviewAnimations = document.querySelector('.club-lights').getAnimations({ subtree: true });
    window.clubReviewAnimations.forEach(animation => { animation.pause(); animation.currentTime = 0; });
  });
};
const frame = async (page, time) => {
  await page.evaluate(time => {
    for (const animation of window.clubReviewAnimations) {
      if (animation.playState !== 'idle') animation.currentTime = time;
    }
  }, time);
};
const assertOriginalPreserved = () => {
  const restored = source
    .replace(/  <script>\n    \/\/ Arm before first paint\.[\s\S]*?  <\/script>\n/, '')
    .replace(/    \/\* The Club Awakens:[\s\S]*?(?=  <\/style>)/, '')
    .replace(/<\/picture>\n        <div class="club-lights"[\s\S]*?\n      <\/figure>/, '</picture></figure>')
    .replace(/  <script>\n    \/\/ Independent from the approved Warm Welcome[\s\S]*?  <\/script>\n/, '');
  assert.equal(restored, baseline, 'Approved HTML, CSS and JavaScript must remain byte-for-byte intact');
};
const instrument = async page => page.addInitScript(() => {
  window.clubReview = { states: [], errors: [], shifts: [], lcp: [], longTasks: [] };
  new MutationObserver(() => window.clubReview.states.push({
    state: document.documentElement.getAttribute('data-club-lights'), time: performance.now()
  })).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-club-lights'] });
  addEventListener('error', event => { if (event.message) window.clubReview.errors.push(event.message); });
  for (const [type, key] of [['layout-shift', 'shifts'], ['largest-contentful-paint', 'lcp'], ['longtask', 'longTasks']]) {
    if (PerformanceObserver.supportedEntryTypes.includes(type)) {
      new PerformanceObserver(list => window.clubReview[key].push(...list.getEntries().map(entry => ({
        time: entry.startTime, duration: entry.duration, value: entry.value || 0,
        recentInput: entry.hadRecentInput || false, element: entry.element?.id || entry.element?.tagName || null
      })))).observe({ type, buffered: true });
    }
  }
});
module.exports = { fs, path, cp, assert, chromium, webkit, root, base, baseline, source, url, out, temp,
  viewports, name, delay, launch, waitState, ready, geometry, layers, assertDarknessGone, freeze, frame,
  assertOriginalPreserved, instrument };
