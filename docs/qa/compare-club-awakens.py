"""Exact pixel comparison of approved, disabled and completed lighting states."""
import json
import os
from pathlib import Path
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[2]
out = Path(os.environ.get('CLUB_LIGHTS_QA_OUTPUT_DIR', root / 'docs/previews/club-awakens-v1.1'))
temporary = Path(os.environ.get('CLUB_LIGHTS_QA_TEMP', '/tmp/club-awakens-v1.1'))
captures = json.loads((out / 'capture-verification.json').read_text())
rows = []
for item in captures['viewports']:
    name = item['name']
    baseline = Image.open(temporary / f'{name}-baseline.png').convert('RGB')
    checks = {}
    for state, location in [('off', temporary / f'{name}-off.png'), ('completed', out / f'{name}-final.png')]:
        difference = ImageChops.difference(baseline, Image.open(location).convert('RGB'))
        assert difference.getbbox() is None, (name, state, difference.getbbox())
        checks[state] = {'changedPixels': 0, 'status': 'passed'}
    previous = os.environ.get('CLUB_LIGHTS_QA_PREVIOUS_DIR')
    if previous:
        previous_final = Image.open(Path(previous) / f'{name}-final.png').convert('RGB')
        assert ImageChops.difference(baseline, previous_final).getbbox() is None, (name, 'previous version')
        checks['previousVersionCompleted'] = {'changedPixels': 0, 'status': 'passed'}
    rows.append({'viewport': name, 'comparisons': checks})

mobile_scene_top = int(next(item['positions']['scene']['y'] for item in captures['viewports']
                            if item['name'] == 'mobile-390x844'))
mobile_baseline = Image.open(temporary / 'mobile-390x844-baseline.png').convert('RGB')
for phase_path in sorted(out.glob('mobile-390x844-*ms.png')):
    phase = Image.open(phase_path).convert('RGB')
    assert ImageChops.difference(mobile_baseline, phase).crop((0, 0, 390, mobile_scene_top)).getbbox() is None

# At peak light, compare with the same shaded frame with the two glows hidden.
# This checks the face/body mask independently of the intentional photo dimming.
peak = temporary / 'mask-with-glows.png'
without = temporary / 'mask-without-glows.png'
mask = None
if peak.exists() and without.exists():
    diff = ImageChops.difference(Image.open(peak).convert('RGB'), Image.open(without).convert('RGB'))
    area = json.loads((temporary / 'mask-area.json').read_text())
    box = tuple(area[key] for key in ['left', 'top', 'right', 'bottom'])
    assert diff.crop(box).getbbox() is None, 'Glow reaches protected Bro region'
    mask = {'protectedSourceX': [1550, 2010], 'changedPixelsInBroRegion': 0, 'status': 'passed'}

report = {'baseline': captures['baseline'], 'status': 'passed', 'comparisons': rows, 'broMask': mask,
          'mobileUiOutsidePhotoChangedPixels': 0}
(out / 'pixel-comparison.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
