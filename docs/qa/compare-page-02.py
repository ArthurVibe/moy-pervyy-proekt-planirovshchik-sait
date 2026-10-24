"""Verify the complete Hero viewport is unchanged after adding Page 02."""
import json
from pathlib import Path
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[2]
out = root / 'docs/previews/page-02-v2.0'
temporary = Path('/tmp/private-club-page-02')
verification = json.loads((out / 'verification.json').read_text())
assert verification['status'] == 'passed'
rows = []
for item in verification['viewports']:
    name = item['name']
    before = Image.open(temporary / f'{name}-hero-before.png').convert('RGB')
    after = Image.open(temporary / f'{name}-hero-after.png').convert('RGB')
    diff = ImageChops.difference(before, after)
    assert diff.getbbox() is None, (name, diff.getbbox())
    rows.append({'viewport': name, 'heroChangedPixels': 0, 'status': 'passed'})
(out / 'hero-pixel-comparison.json').write_text(json.dumps({'status': 'passed', 'comparisons': rows}, indent=2) + '\n')
print(json.dumps(rows, indent=2))
