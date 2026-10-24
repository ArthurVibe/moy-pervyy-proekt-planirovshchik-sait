'use strict';
const q = require('./club-awakens-common.cjs');
(async () => {
  const browser = await q.launch();
  const frames = q.path.join(q.temp, 'movie-frames');
  q.fs.mkdirSync(frames, { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await page.clock.install(); await page.clock.pauseAt(Date.now());
    await page.goto(q.url); await q.waitState(page, 'running'); await q.freeze(page);
    for (let index = 0; index < 114; index++) {
      const time = index * 1000 / 30;
      await q.frame(page, time);
      if (index === 54) await q.waitState(page, null);
      await page.screenshot({ path: q.path.join(frames, `${String(index).padStart(4, '0')}.png`) });
      if (index % 30 === 0) console.log('Rendered frame', index, 'of 114');
    }
    await page.close();
    const common = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
    const on = q.path.join(q.out, process.env.CLUB_LIGHTS_QA_VIDEO_NAME || 'club-awakens-on-1440x900.mp4');
    const off = q.path.join(q.out, 'club-awakens-off-1440x900.mp4');
    q.cp.execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '30', '-i', q.path.join(frames, '%04d.png'), ...common, on]);
    q.cp.execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-framerate', '30', '-i',
      q.path.join(q.out, 'desktop-1440x900-off.png'), '-t', '3.8', ...common, off]);
    const videos = [on, off].map(file => ({ file: q.path.basename(file), ...JSON.parse(q.cp.execFileSync('ffprobe',
      ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_frames,duration', '-of', 'json', file], { encoding: 'utf8' })) }));
    for (const video of videos) {
      const stream = video.streams[0];
      q.assert.equal(stream.r_frame_rate, '30/1'); q.assert.equal(stream.width, 1440); q.assert.equal(stream.height, 900);
      q.assert.equal(Number(stream.nb_frames), 114);
    }
    q.fs.writeFileSync(q.path.join(q.out, 'video-verification.json'), JSON.stringify({ status: 'passed',
      captureMethod: 'Chromium renders the actual CSS keyframes at 30 equally spaced times per second. Browser timers are frozen only in QA; text reveal is completed equally for both comparison videos.',
      effectMs: 1800, stableTailMs: 2000, videos }, null, 2) + '\n');
    console.log('PASS: two H.264 MP4 files, 1440×900, 30 fps, 3.8 seconds each.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
