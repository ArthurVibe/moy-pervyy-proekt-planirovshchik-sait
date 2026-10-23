"""Compare the experiment against screenshots from verify-mini-bro.cjs."""
import json
import os
from pathlib import Path
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[2]
out = Path(os.environ.get('MINI_BRO_OUTPUT_DIR', root / 'docs/previews/mini-bro-v1'))
references = Path(os.environ.get('MINI_BRO_REFERENCE_DIR', '/tmp/mini-bro-references'))
verification = json.loads((out / 'verification.json').read_text())
assert verification['status'] == 'passed'
rows = []
for item in verification['viewports']:
    name = item['name']
    before = Image.open(references / (name + '.png')).convert('RGB')
    after = Image.open(out / (name + '.png')).convert('RGB')
    difference = ImageChops.difference(before, after)
    icon = item['icon']
    inside = outside = 0
    for y in range(before.height):
        for x in range(before.width):
            if difference.getpixel((x, y)) != (0, 0, 0):
                if (icon['x'] <= x < icon['x'] + icon['width'] and
                        icon['y'] <= y < icon['y'] + icon['height']):
                    inside += 1
                else:
                    outside += 1
    assert outside == 0, (name, outside)
    rows.append({'viewport': name, 'insideIconChangedPixels': inside,
                 'outsideIconChangedPixels': outside,
                 'geometryUnchanged': True, 'status': 'passed'})
result = {'baseline': verification['baseline'], 'comparisons': rows}
(out / 'pixel-comparison.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
