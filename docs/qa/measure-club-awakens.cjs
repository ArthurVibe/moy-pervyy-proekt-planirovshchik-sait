'use strict';
const q = require('./club-awakens-common.cjs');
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
(async () => {
  const browser = await q.launch();
  const report = { baseline: q.base, browser: await browser.version(), conditions: 'Local HTTP, cold contexts, no CPU throttling, 5 alternating samples per mode and viewport. Lab observations, not field Core Web Vitals.',
    sourceBytes: { baseline: Buffer.byteLength(q.baseline), experiment: Buffer.byteLength(q.source) }, samples: [], summaries: [] };
  try {
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      for (let repeat = 0; repeat < 5; repeat++) for (const mode of repeat % 2 ? ['on', 'baseline'] : ['baseline', 'on']) {
        const context = await browser.newContext({ viewport: { width, height } });
        const page = await context.newPage();
        await q.instrument(page);
        const address = mode === 'baseline' ? q.url + '__club_performance_baseline.html' : q.url;
        if (mode === 'baseline') await page.route(address, route => route.fulfill({ contentType: 'text/html', body: q.baseline }));
        await page.goto(address); await page.waitForTimeout(2050);
        const sample = await page.evaluate(() => {
          const data = window.clubReview, navigation = performance.getEntriesByType('navigation')[0];
          return { cls: data.shifts.filter(e => !e.recentInput).reduce((sum, e) => sum + e.value, 0),
            lcpMs: data.lcp.at(-1)?.time || null, lcpElement: data.lcp.at(-1)?.element || null,
            longTasks: data.longTasks, jsErrors: data.errors, states: data.states,
            domContentLoadedMs: navigation.domContentLoadedEventEnd,
            resources: performance.getEntriesByType('resource').map(e => ({ url: new URL(e.name).pathname, duration: e.duration, transferSize: e.transferSize })) };
        });
        q.assert.equal(sample.cls, 0); q.assert.deepEqual(sample.jsErrors, []);
        if (mode === 'on') await q.assertDarknessGone(page);
        report.samples.push({ width, height, repeat, mode, ...sample });
        await context.close();
      }
      const summaries = ['baseline', 'on'].map(mode => {
        const samples = report.samples.filter(s => s.width === width && s.mode === mode);
        return { viewport: `${width}x${height}`, mode, lcpMedianMs: median(samples.map(s => s.lcpMs)),
          clsMax: Math.max(...samples.map(s => s.cls)), longTaskCount: samples.reduce((n, s) => n + s.longTasks.length, 0),
          maxLongTaskMs: Math.max(0, ...samples.flatMap(s => s.longTasks.map(t => t.duration))),
          resourcePaths: [...new Set(samples.flatMap(s => s.resources.map(r => r.url)))] };
      });
      q.assert.deepEqual(summaries[0].resourcePaths.sort(), summaries[1].resourcePaths.sort(), 'Lighting must add no network requests');
      report.summaries.push(...summaries);
      console.log('Measured', `${width}x${height}`, JSON.stringify(summaries));
    }
    // A real bandwidth/latency limit, separate from delayed-response lifecycle tests.
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage(); await q.instrument(page);
    const cdp = await context.newCDPSession(page); await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 200, downloadThroughput: 64000, uploadThroughput: 32000 });
    await page.goto(q.url, { waitUntil: 'domcontentloaded' });
    await q.waitState(page, null, 5000);
    await page.waitForLoadState('load', { timeout: 45000 });
    await q.ready(page); await q.assertDarknessGone(page);
    const throttled = await page.evaluate(() => ({ states: window.clubReview.states,
      loaded: document.getElementById('club-photo').naturalWidth === 2560,
      loadMs: performance.getEntriesByType('navigation')[0].loadEventEnd }));
    q.assert(!throttled.states.some(s => s.state === 'running'));
    report.throttledMobile = { latencyMs: 200, downloadBytesPerSecond: 64000, ...throttled };
    await context.close();
    report.status = 'passed';
    q.fs.writeFileSync(q.path.join(q.out, 'performance.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('PASS: bandwidth-limited mobile skips entrance after 1500 ms.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
