'use strict';
const q = require('./club-awakens-common.cjs');
(async () => {
  q.assertOriginalPreserved();
  const browser = await q.launch();
  const times = (process.env.CLUB_LIGHTS_QA_TIMES || '0,600,1800').split(',').map(Number);
  const report = { baseline: q.base, browser: await browser.version(), viewports: [], screenshotTimes: times };
  try {
    for (const [width, height] of q.viewports) {
      const label = q.name(width, height), viewport = { width, height };
      const page = await browser.newPage({ viewport });
      // Freeze timers before navigation; CSS is sampled using its real keyframes.
      await page.clock.install(); await page.clock.pauseAt(Date.now());
      await page.goto(q.url);
      await q.waitState(page, 'running');
      await q.freeze(page);
      const initial = await q.geometry(page);
      const positions = await page.evaluate(() => {
        const scene = document.querySelector('.hero-scene'), r = scene.getBoundingClientRect(), s = getComputedStyle(scene);
        return { scene: r.toJSON(), objectPosition: getComputedStyle(document.getElementById('club-photo')).objectPosition,
          sources: ['left', 'right'].map(name => ({ name,
            x: parseFloat(s.getPropertyValue(`--club-${name}-x`)),
            y: parseFloat(s.getPropertyValue(`--club-${name}-y`)),
            radius: parseFloat(s.getPropertyValue(`--club-${name}-radius`)),
            hidden: document.querySelector(`.club-light-${name}`).hidden })) };
      });
      for (const time of times) {
        await q.frame(page, time);
        if (time === 1800) await q.waitState(page, null);
        if (width === 1440 || width === 390) {
          await page.screenshot({ path: q.path.join(q.out, `${label}-${time}ms.png`) });
        }
      }
      await q.assertDarknessGone(page);
      const completed = await q.geometry(page);
      q.assert.deepEqual(completed, initial);
      await page.screenshot({ path: q.path.join(q.out, `${label}-final.png`) });
      q.assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      for (const [mode, routeUrl, html] of [
        ['baseline', `${q.url}__club_baseline.html`, q.baseline],
        ['off', `${q.url}?clubLights=off`, null]
      ]) {
        const reference = await browser.newPage({ viewport });
        if (html) await reference.route(routeUrl, route => route.fulfill({ contentType: 'text/html', body: html }));
        await reference.goto(routeUrl); await q.ready(reference);
        q.assert.deepEqual(await q.geometry(reference), initial, `${label}: ${mode} geometry differs`);
        await reference.screenshot({ path: q.path.join(q.temp, `${label}-${mode}.png`) });
        if (width === 1440 && mode === 'off') await reference.screenshot({ path: q.path.join(q.out, 'desktop-1440x900-off.png') });
        await reference.close();
      }
      report.viewports.push({ name: label, positions, geometryUnchanged: true, noHorizontalOverflow: true, finalOpacities: [0, 0, 0] });
      await page.close();
      console.log('PASS captures and geometry:', label);
    }
    report.status = 'passed';
    q.fs.writeFileSync(q.path.join(q.out, 'capture-verification.json'), JSON.stringify(report, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
