'use strict';
const path = require('node:path');
process.env.CLUB_LIGHTS_QA_OUTPUT_DIR ||= path.resolve(__dirname, '../previews/club-awakens-v1.2');
process.env.CLUB_LIGHTS_QA_TEMP ||= '/tmp/club-awakens-v1.2';
const q = require('./club-awakens-common.cjs');
const reference = q.path.join(q.root, 'docs/previews/club-awakens-v1.1/club-awakens-on-1440x900.mp4');
const old = q.path.join(q.out, 'club-awakens-v1.1-1440x900.mp4');
const current = q.path.join(q.out, 'club-awakens-v1.2-1440x900.mp4');
const off = q.path.join(q.out, 'club-awakens-off-1440x900.mp4');
const side = q.path.join(q.out, 'club-awakens-v1.1-vs-v1.2.mp4');
const referenceBrowser = JSON.parse(q.fs.readFileSync(q.path.join(q.root,
  'docs/previews/club-awakens-v1.1/capture-verification.json'), 'utf8')).browser;
const currentBrowser = JSON.parse(q.fs.readFileSync(q.path.join(q.out, 'capture-verification.json'), 'utf8')).browser;
q.assert.equal(currentBrowser, referenceBrowser, 'Matched comparison requires the same browser version');
q.fs.copyFileSync(reference, old);
q.cp.execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', old, '-i', current,
  '-filter_complex', '[0:v][1:v]hstack=inputs=2[v]', '-map', '[v]', '-an', '-c:v', 'libx264',
  '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', side]);
const videos = [old, current, off, side].map(file => ({ file: q.path.basename(file),
  ...JSON.parse(q.cp.execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'stream=codec_name,width,height,r_frame_rate,nb_frames,duration', '-of', 'json', file], { encoding: 'utf8' })) }));
for (const [index, video] of videos.entries()) {
  const stream = video.streams[0];
  q.assert.equal(stream.width, index === 3 ? 2880 : 1440);
  q.assert.equal(stream.height, 900); q.assert.equal(stream.r_frame_rate, '30/1');
  q.assert.equal(Number(stream.nb_frames), 114);
}
q.assert(q.fs.readFileSync(old).equals(q.fs.readFileSync(reference)));
q.fs.writeFileSync(q.path.join(q.out, 'comparison-videos.json'), JSON.stringify({ status: 'passed',
  referenceCommit: 'b4fe632a0efe798409aa9b2048ca64349f509512',
  browser: currentBrowser,
  referenceReusedByteForByte: true, referenceConditions: 'Same Chromium 154, viewport, DPR 1, local font, completed text reveal, keyframe sampling and encoder settings as v1.2.',
  sideBySide: { left: 'v1.1', right: 'v1.2' }, videos }, null, 2) + '\n');
console.log('PASS: three matched comparison videos and synchronized side-by-side MP4.');
