"""Measure identical source-coordinate ROIs in lossless browser captures."""
import csv
import json
import math
import os
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[2]
out = Path(os.environ.get('CLUB_LIGHTS_QA_OUTPUT_DIR', root / 'docs/previews/club-awakens-v1.2'))
temporary = Path(os.environ.get('CLUB_LIGHTS_QA_TEMP', '/tmp/club-awakens-v1.2'))
timing = json.loads((out / 'intensity-and-timing.json').read_text())
regions = {
    'left_lamp': {'x': 196, 'y': 262, 'radius': 100},
    'right_lamp': {'x': 2200, 'y': 430, 'radius': 100},
    'neutral_wall': {'x': 1000, 'y': 560, 'radius': 90},
    'bro_face': {'x': 1720, 'y': 210, 'radius': 90},
}
weights = np.array([0.2126, 0.7152, 0.0722])
rows = []
bro_band_changed_pixels = 0
for version in ['v1.1', 'v1.2']:
    mapping = timing['versions'][version]['photoMap']
    scale = mapping['scale']
    for time in timing['times']:
        lit = np.array(Image.open(temporary / f'{version}-{time}-with.png').convert('RGB'))
        shaded = np.array(Image.open(temporary / f'{version}-{time}-without.png').convert('RGB'))
        height, width = lit.shape[:2]
        left = math.ceil(mapping['offsetX'] + 1550 * scale)
        right = math.floor(mapping['offsetX'] + 2010 * scale)
        changed = np.any(lit[:, left:right] != shaded[:, left:right], axis=2)
        bro_band_changed_pixels += int(changed.sum())
        for name, source in regions.items():
            x = mapping['offsetX'] + source['x'] * scale
            y = mapping['offsetY'] + source['y'] * scale
            radius = source['radius'] * scale
            x0, x1 = max(0, math.floor(x-radius)), min(width, math.ceil(x+radius))
            y0, y1 = max(0, math.floor(y-radius)), min(height, math.ceil(y+radius))
            yy, xx = np.mgrid[y0:y1, x0:x1]
            mask = (xx + .5 - x)**2 + (yy + .5 - y)**2 <= radius**2
            lit_pixels = lit[y0:y1, x0:x1][mask]
            shaded_pixels = shaded[y0:y1, x0:x1][mask]
            mean = float((lit_pixels @ weights).mean())
            background = float((shaded_pixels @ weights).mean())
            changed_pixels = int(np.any(lit_pixels != shaded_pixels, axis=1).sum())
            if name in ['neutral_wall', 'bro_face']:
                assert changed_pixels == 0, (version, time, name)
            rows.append({'version': version, 'timeMs': time, 'region': name,
                         'meanLuma': mean, 'sameShadeWithoutGlowLuma': background,
                         'localGlowLift': mean-background, 'pixels': int(mask.sum()),
                         'pixelsChangedByGlow': changed_pixels})

def sample(version, time, region):
    return next(row for row in rows if row['version'] == version and row['timeMs'] == time and row['region'] == region)

gains = []
for name, time in [('left_lamp', 750), ('right_lamp', 1100)]:
    old, new = sample('v1.1', time, name), sample('v1.2', time, name)
    ratio = new['localGlowLift'] / old['localGlowLift']
    gains.append({'region': name, 'timeMs': time, 'v11GlowLift': old['localGlowLift'],
                  'v12GlowLift': new['localGlowLift'], 'ratio': ratio, 'diagnosticTarget1_5Met': ratio >= 1.5})

assert bro_band_changed_pixels == 0
for time in [0, 1800]:
    old = np.array(Image.open(temporary / f'v1.1-{time}-with.png').convert('RGB'))
    new = np.array(Image.open(temporary / f'v1.2-{time}-with.png').convert('RGB'))
    assert np.array_equal(old, new), time
with (out / 'brightness.csv').open('w', newline='') as stream:
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)
report = {
    'status': 'passed', 'method': "Mean Y-prime = 0.2126 R + 0.7152 G + 0.0722 B on 8-bit sRGB PNGs (0–255); not physical luminance. ROI circles use pixel centres and are clipped at the viewport edge.",
    'interpretation': 'localGlowLift isolates each lamp by comparing the same frame with and without local glows. Raw frame means also include the intentionally different global dimming curves.',
    'sourceRegions': regions, 'diagnosticGains': gains,
    'broSourceBand': {'x': [1550, 2010], 'glowChangedPixelsAcrossAllSamples': bro_band_changed_pixels},
    'neutralAndFaceGlowChangedPixels': 0, 'initialAndFinalV11V12ChangedPixels': 0,
    'samples': rows,
}
(out / 'brightness.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'status': 'passed', 'diagnosticGains': gains,
                  'broAndNeutralGlowChangedPixels': 0}, indent=2))
