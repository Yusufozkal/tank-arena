"""Shrink the site's images so each request costs less bandwidth.

PNG: quantize to <=256 colours (libimagequant, with dithering), then lossless oxipng.
JPEG screenshots: re-encode from the q90 originals in raw/ at a lower quality.
A file is only replaced when it gets smaller and stays visually close to the original.
tools/assets.py runs this at its end; run it alone after replacing an image in site/img.
"""
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paths as P  # noqa: E402
import imagequant
import oxipng
from PIL import Image, ImageChops, ImageStat

SITE = str(P.SITE)
RAW = str(P.RAW)
IMG = f'{SITE}/img'
JPEGS = {'play-phone': 720, 'workshop-phone': 720, 'play-wide': 1400}
JPEG_Q = 74


def mean_error(a, b):
    """Mean absolute RGB difference (0-255) as seen over black and over white.

    Compositing first means invisible colour under fully transparent pixels does not count.
    """
    a, b = a.convert('RGBA'), b.convert('RGBA')
    worst = 0.0
    for bg in ((0, 0, 0, 255), (255, 255, 255, 255)):
        base = Image.new('RGBA', a.size, bg)
        da = Image.alpha_composite(base, a).convert('RGB')
        db = Image.alpha_composite(base, b).convert('RGB')
        worst = max(worst, sum(ImageStat.Stat(ImageChops.difference(da, db)).mean) / 3)
    return worst


def optimize_png(path):
    orig = Image.open(path)
    orig.load()
    rgba = orig.convert('RGBA')
    q = imagequant.quantize_pil_image(rgba, dithering_level=1.0, max_colors=256, min_quality=70, max_quality=95)
    buf = io.BytesIO()
    q.save(buf, format='PNG', optimize=True)
    data = oxipng.optimize_from_memory(buf.getvalue(), level=4, strip=oxipng.StripChunks.safe())
    err = mean_error(rgba, Image.open(io.BytesIO(data)))
    return data, err


def optimize_jpeg(name, width):
    im = Image.open(f'{RAW}/{name}.jpg').convert('RGB')
    h = round(im.height * width / im.width)
    im = im.resize((width, h), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format='JPEG', quality=JPEG_Q, optimize=True, progressive=True, subsampling='4:2:0')
    return buf.getvalue(), mean_error(im, Image.open(io.BytesIO(buf.getvalue())))


def main():
    before = after = 0
    rows = []
    for fn in sorted(os.listdir(IMG)):
        path = f'{IMG}/{fn}'
        old = os.path.getsize(path)
        if fn.endswith('.png'):
            data, err = optimize_png(path)
            limit = 3.0
        elif fn[:-4] in JPEGS and fn.endswith('.jpg') and os.path.exists(f'{RAW}/{fn}'):
            data, err = optimize_jpeg(fn[:-4], JPEGS[fn[:-4]])
            limit = 4.0
        else:
            before += old; after += old
            rows.append((fn, old, old, 0.0, 'kept'))
            continue
        if len(data) < old and err <= limit:
            open(path, 'wb').write(data)
            new, note = len(data), 'replaced'
        else:
            new, note = old, f'kept (err {err:.2f})'
        before += old; after += new
        rows.append((fn, old, new, err, note))
    for fn, old, new, err, note in rows:
        print(f'{fn:28s} {old/1024:7.1f} KB -> {new/1024:7.1f} KB  err={err:4.2f}  {note}')
    print(f'TOTAL {before/1024:.0f} KB -> {after/1024:.0f} KB')


if __name__ == '__main__':
    sys.exit(main())
