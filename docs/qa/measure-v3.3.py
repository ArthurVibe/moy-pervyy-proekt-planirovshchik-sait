"""Measure contrast samples captured by contrast-v3.3.cjs (Pillow is a QA dependency)."""
import json,sys
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
root=Path(__file__).resolve().parents[2]
dir=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/private-club-v33-contrast')
out=root/'docs/previews/v3.3'
def luminance(rgb):
 return sum((v/255/12.92 if v/255<=.04045 else ((v/255+.055)/1.055)**2.4)*w for v,w in zip(rgb,(.2126,.7152,.0722)))
def ratio(a,b):
 x,y=sorted([luminance(a),luminance(b)]);return(y+.05)/(x+.05)
r=json.loads((dir/'samples.json').read_text());rows=[]
for s in r['samples']:
 ink=Image.open(dir/s['inkImage']).convert('RGB').getpixel((4,4))
 pixels=set(Image.open(dir/s['backgroundImage']).convert('RGB').get_flattened_data())
 value=min(ratio(ink,c)for c in pixels)
 rows.append({k:v for k,v in s.items()if k not in ['inkImage','backgroundImage']}|{'renderedInk':ink,'minimum':round(value,5),'status':'passed'if value>=4.5 else'failed'})
 print(s['button'],s['state'],round(value,4))
result={'method':r['method'],'formula':'WCAG 2.x relative luminance of sRGB; no glyph-edge antialias pixels used as foreground colour.','threshold':4.5,'results':rows}
(out/'contrast.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
verification=json.loads((out/'verification.json').read_text());comparisons={}
for key in ['desktop','mobile']:
 width,height=(1440,900)if key=='desktop'else(390,844)
 before=Image.open(out/f'{key}-before-{width}x{height}.png').convert('RGB');after=Image.open(out/f'{key}-after-{width}x{height}.png').convert('RGB');diff=ImageChops.difference(before,after)
 mask=Image.new('L',before.size,0);draw=ImageDraw.Draw(mask)
 for m in verification['masks'][key]:draw.rectangle((m['x'],m['y'],m['right']-1,m['bottom']-1),fill=255)
 mask.save(out/f'{key}-comparison-mask.png')
 changed=diff.convert('RGB');inside=0;outside=0
 for px,mark in zip(changed.get_flattened_data(),mask.get_flattened_data()):
  if max(px):
   if mark:inside+=1
   else:outside+=1
 heat=Image.new('RGB',before.size,'white');heat.putdata([(220,40,40)if max(px)else(255,255,255)for px in changed.get_flattened_data()]);heat.save(out/f'{key}-difference.png')
 comparisons[key]={'insideMaskChangedPixels':inside,'outsideMaskChangedPixels':outside,'totalPixels':width*height,'status':'passed'if outside==0 else'failed'}
 print(key,comparisons[key])
(out/'pixel-comparison.json').write_text(json.dumps({'baseline':verification['baseline'],'masks':verification['masks'],'comparisons':comparisons},indent=2))
if any(x['status']=='failed'for x in rows)or any(x['status']=='failed'for x in comparisons.values()):sys.exit(1)
