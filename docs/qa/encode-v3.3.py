"""Turn timestamped CDP frames into a synchronized MP4. Requires ffmpeg."""
import bisect, json, math, os, subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
p = Path(os.environ.get('PRIVATE_CLUB_CAPTURE_DIR', '/tmp/private-club-v33-recording'))
d = json.loads((p / 'frames.json').read_text())
uniform = p / 'uniform'
uniform.mkdir(exist_ok=True)
times = [f['t'] for f in d['frames']]
for i in range(math.ceil((d['end'] - d['start']) * 30)):
    frame = d['frames'][max(0, bisect.bisect_right(times, d['start'] + i / 30) - 1)]['file']
    link = uniform / (str(i).zfill(5) + '.jpg')
    if not link.exists():
        link.symlink_to(frame)
video = root / 'docs/previews/v3.3/hover-and-edge-tests.mp4'
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-framerate', '30', '-i', str(uniform / '%05d.jpg'), '-vf', 'ass=' + str(p / 'cursor.ass'), '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', '-y', str(video)], check=True)
subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,r_frame_rate', '-show_entries', 'format=duration,size', '-of', 'json', str(video)], check=True)
