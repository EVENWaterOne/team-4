"""Turn the Meowa images in art-src/meowa into dist/art-pack.js (small base64 PNGs).
Usage: python3 scripts/build-art-pack.py  (needs Pillow, numpy, scipy and node)"""
import glob, json, base64, io, sys
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage

import os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = os.path.join(ROOT, 'art-src', 'meowa')
ids = ['chen', 'rahman', 'lin', 'kumar', 'students', 'ali']
props = json.loads(subprocess.check_output(['node', '-e', "global.window=global;require('./dist/year-content.js');const h=global.CM_YEAR_CONTENT.homes,o={};for(const [id,home] of Object.entries(h))o[id]=home.props.map((p,i)=>({id:id+'-'+p.kind+'-'+i,kind:p.kind,w:p.width,h:p.height}));console.log(JSON.stringify(o))"], cwd=ROOT))

def src(kind, i):
    f = os.path.join(W, f'{kind}-{i}.png')
    return Image.open(f).convert('RGBA') if os.path.exists(f) else None

def png64(im, colors=None):
    if colors:
        im = im.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

def alpha_bbox(im, thr=24):
    a = np.array(im)[:, :, 3]; ys, xs = np.where(a > thr)
    return (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)

def components(im, n, thr=24, join=14):
    a = np.array(im)[:, :, 3] > thr
    # join pieces of one object (steam over a cup, a card beside a box)
    joined = ndimage.binary_dilation(a, iterations=join)
    lab, k = ndimage.label(joined)
    boxes = ndimage.find_objects(lab)
    sizes = ndimage.sum(a, lab, range(1, k + 1))
    order = np.argsort(sizes)[::-1][:n]
    out = []
    for o in order:
        sl = boxes[o]; mask = (lab[sl] == o + 1) & a[sl]
        out.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, mask, sizes[o]))
    return out

pack = {'portraits': {}, 'figures': {}, 'props': {}, 'player': None, 'help': {}}
report = []
for i in ids:
    im = src('portrait', i)
    if im:
        p = im.convert('RGB').resize((128, 128), Image.LANCZOS)
        pack['portraits'][i] = png64(p.convert('RGBA'), 96)
    fig = src('figure', i)
    if fig:
        box = alpha_bbox(fig); crop = fig.crop(box)
        h = 168; w = round(crop.width * h / crop.height)
        f = crop.resize((w, h), Image.LANCZOS)
        pack['figures'][i] = {'src': png64(f, 96), 'w': w, 'h': h}
    sheet = src('props', i)
    if sheet:
        comps = components(sheet, 10)
        if len(comps) < 10:
            report.append(f'{i}: only {len(comps)} components'); continue
        cy = sorted(((c[1] + c[3]) / 2) for c in comps); mid = (cy[4] + cy[5]) / 2
        rows = [sorted([c for c in comps if (c[1] + c[3]) / 2 < mid], key=lambda c: c[0]),
                sorted([c for c in comps if (c[1] + c[3]) / 2 >= mid], key=lambda c: c[0])]
        if len(rows[0]) != 5:
            report.append(f'{i}: rows {len(rows[0])}/{len(rows[1])}')
        ordered = rows[0] + rows[1]
        for spec, c in zip(props[i], ordered):
            x0, y0, x1, y1, mask, _ = c
            crop = sheet.crop((x0, y0, x1, y1))
            arr = np.array(crop); arr[:, :, 3] = np.where(mask, arr[:, :, 3], 0); crop = Image.fromarray(arr); crop = crop.crop(alpha_bbox(crop))
            bw, bh = spec['w'] * 80, spec['h'] * 80  # two image pixels per room unit
            pad = 2
            s = min((bw - pad * 2) / crop.width, (bh - pad * 2) / crop.height)
            t = crop.resize((max(1, round(crop.width * s)), max(1, round(crop.height * s))), Image.LANCZOS)
            canvas = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
            canvas.alpha_composite(t, ((bw - t.width) // 2, bh - pad - t.height))
            pack['props'][spec['id']] = png64(canvas, 64)
            report.append(f"{spec['id']}: {x1-x0}x{y1-y0} at {x0},{y0}")
# Urgent situations (year 3 on): one framed vignette each, read left to right, top to bottom.
URGENT = ['lift', 'dengue', 'flood', 'heat', 'fire', 'layoff', 'hawker', 'fall', 'bus', 'noise', 'scam', 'haze']
sheet = Image.open(os.path.join(W, 'urgent-icons.png')).convert('RGBA') if os.path.exists(os.path.join(W, 'urgent-icons.png')) else None
if sheet:
    comps = components(sheet, 12, join=3)
    rows = sorted(comps, key=lambda c: (c[1] + c[3]) / 2)
    rows = [sorted(rows[i:i + 4], key=lambda c: c[0]) for i in range(0, 12, 4)]
    for key, c in zip(URGENT, [c for r in rows for c in r]):
        x0, y0, x1, y1, mask, _ = c
        pack['portraits']['urgent-' + key] = png64(sheet.crop((x0, y0, x1, y1)).convert('RGB').resize((128, 128), Image.LANCZOS).convert('RGBA'), 96)
        report.append(f'urgent-{key}: {x1-x0}x{y1-y0}')
# How-to-play illustrations: eight framed vignettes, left to right, top to bottom.
HELP = ['goal', 'knock', 'talk', 'cards', 'build', 'urgent', 'money', 'report']
sheet = Image.open(os.path.join(W, 'help-art.png')).convert('RGBA') if os.path.exists(os.path.join(W, 'help-art.png')) else None
if sheet:
    pack['help'] = {}
    comps = components(sheet, 8, join=3)
    rows = sorted(comps, key=lambda c: (c[1] + c[3]) / 2)
    rows = [sorted(rows[i:i + 4], key=lambda c: c[0]) for i in range(0, 8, 4)]
    for key, c in zip(HELP, [c for r in rows for c in r]):
        x0, y0, x1, y1, mask, _ = c
        tile = sheet.crop((x0, y0, x1, y1)).convert('RGB')
        w = 340; tile = tile.resize((w, round(tile.height * w / tile.width)), Image.LANCZOS)
        pack['help'][key] = png64(tile.convert('RGBA'), 128)
        report.append(f'help-{key}: {x1-x0}x{y1-y0}')
pl = src('figure', 'player')
if pl:
    box = alpha_bbox(pl); crop = pl.crop(box); h = 168; w = round(crop.width * h / crop.height)
    pack['player'] = {'src': png64(crop.resize((w, h), Image.LANCZOS), 96), 'w': w, 'h': h}
js = ('/* Pixel art for the six homes, generated with Meowa and downscaled for the game.\n'
      ' * portraits: avatar per household; figures: who stands in the room; props: the ten room objects. */\n'
      '(function(root){root.CM_ART_PACK=' + json.dumps(pack, separators=(',', ':')) + ';})(typeof window!=="undefined"?window:globalThis);\n')
open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'art-pack.js'), 'w').write(js)
print('\n'.join(report)); print('portraits', len(pack['portraits']), 'figures', len(pack['figures']), 'props', len(pack['props']), 'player', bool(pack['player']), 'bytes', len(js))
