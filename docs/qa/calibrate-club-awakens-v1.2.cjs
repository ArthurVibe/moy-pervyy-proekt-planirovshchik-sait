'use strict';
const path = require('node:path');
process.env.CLUB_LIGHTS_QA_OUTPUT_DIR ||= path.resolve(__dirname, '../previews/club-awakens-v1.2');
process.env.CLUB_LIGHTS_QA_TEMP ||= '/tmp/club-awakens-v1.2';
process.env.PRIVATE_CLUB_PREVIEW_URL ||= 'http://127.0.0.1:8796/';
const q = require('./club-awakens-common.cjs');
const v11 = 'b4fe632a0efe798409aa9b2048ca64349f509512';
const original = q.cp.execFileSync('git', ['show', `${v11}:index.html`], { cwd: q.root, encoding: 'utf8' });
const times = [0, 250, 450, 550, 600, 750, 1000, 1100, 1400, 1800];
const reviewTimes = [0, 450, 750, 1100, 1400, 1800];
const report = { referenceCommit: v11, times, versions: {}, sourceChange: 'CSS only', status: 'pending' };
const stripLightingCss = html => html.replace(/    \/\* The Club Awakens:[\s\S]*?(?=  <\/style>)/, '');
q.assert.equal(stripLightingCss(q.source), stripLightingCss(original), 'Only the existing lighting CSS may change runtime');
q.assert.deepEqual([...q.source.matchAll(/(?:-webkit-)?mask-image:[^;]+;/g)].map(m => m[0]),
  [...original.matchAll(/(?:-webkit-)?mask-image:[^;]+;/g)].map(m => m[0]));
q.assertOriginalPreserved();
(async () => {
  const browser = await q.launch();
  report.browser = await browser.version();
  try {
    for (const [version, html] of [['v1.1', original], ['v1.2', null]]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      await page.clock.install(); await page.clock.pauseAt(Date.now());
      const address = html ? `${q.url}__club_v1_1.html` : q.url;
      if (html) await page.route(address, route => route.fulfill({ contentType: 'text/html', body: html }));
      await page.goto(address); await q.waitState(page, 'running'); await q.freeze(page);
      const map = await page.evaluate(() => {
        const photo = document.getElementById('club-photo'), r = photo.getBoundingClientRect();
        const [px, py] = getComputedStyle(photo).objectPosition.split(' ').map(p => parseFloat(p) / 100);
        const scale = Math.max(r.width / photo.naturalWidth, r.height / photo.naturalHeight);
        return { scale, offsetX: r.left + (r.width - photo.naturalWidth * scale) * px,
          offsetY: r.top + (r.height - photo.naturalHeight * scale) * py };
      });
      const samples = [];
      for (const time of times) {
        await q.frame(page, time);
        if (time === 1800) await q.waitState(page, null);
        const values = (await q.layers(page)).map(layer => layer.opacity);
        await page.screenshot({ path: q.path.join(q.temp, `${version}-${time}-with.png`) });
        if (version === 'v1.2' && reviewTimes.includes(time)) {
          await page.screenshot({ path: q.path.join(q.out, `desktop-1440x900-${time}ms.png`) });
        } else if (version === 'v1.1' && [450, 750, 1100].includes(time)) {
          await page.screenshot({ path: q.path.join(q.out, `v1.1-reference-${time}ms.png`) });
        }
        // Important opacity overrides sample the same shade without cancelling animations.
        await page.evaluate(() => document.querySelectorAll('.club-light-glow').forEach(e => e.style.setProperty('opacity', '0', 'important')));
        await page.screenshot({ path: q.path.join(q.temp, `${version}-${time}-without.png`) });
        await page.evaluate(() => document.querySelectorAll('.club-light-glow').forEach(e => e.style.removeProperty('opacity')));
        samples.push({ timeMs: time, shade: values[0], left: values[1], right: values[2] });
      }
      if (version === 'v1.2') {
        const at = time => samples.find(row => row.timeMs === time);
        q.assert.equal(at(0).shade, .18); q.assert.equal(at(250).left, 0); q.assert.equal(at(550).right, 0);
        q.assert(at(450).left > .1 && at(450).right === 0);
        q.assert(Math.abs(at(750).left - .24) < .00001);
        q.assert(Math.abs(at(1100).right - .20) < .00001);
        q.assert(at(600).shade >= .12 && at(600).shade <= .14);
        q.assert(at(1000).shade >= .07 && at(1000).shade <= .09);
        q.assert(at(1400).shade >= .02 && at(1400).shade <= .03);
        q.assert.deepEqual([at(1800).shade, at(1800).left, at(1800).right], [0, 0, 0]);
      }
      report.versions[version] = { photoMap: map, samples };
      await page.close();
      console.log('PASS matched keyframe samples:', version);
    }
    // Close-ups are direct browser captures at DPR 2, without editing the image.
    for (const [lamp, time] of [['left', 750], ['right', 1100]]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
      await page.clock.install(); await page.clock.pauseAt(Date.now());
      await page.goto(q.url); await q.waitState(page, 'running'); await q.freeze(page); await q.frame(page, time);
      const r = await page.locator(`.club-light-${lamp}`).boundingBox();
      const clip = { x: Math.max(0, r.x), y: Math.max(0, r.y),
        width: Math.min(1440, r.x + r.width) - Math.max(0, r.x),
        height: Math.min(900, r.y + r.height) - Math.max(0, r.y) };
      await page.screenshot({ path: q.path.join(q.out, `${lamp}-lamp-peak-2x.png`), clip });
      await page.close();
    }
    report.status = 'passed';
    q.fs.writeFileSync(q.path.join(q.out, 'intensity-and-timing.json'), JSON.stringify(report, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
