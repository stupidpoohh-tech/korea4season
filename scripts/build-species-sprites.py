#!/usr/bin/env python3
"""어종 스프라이트 시트에서 개별 스프라이트를 잘라 public/sprites/species 에 저장한다.

원본은 3장의 시트이고 각 시트는 격자로 배열돼 있다.
셀을 그대로 자르면 옆 칸의 조각이 묻어 들어오므로,
연결 성분 마스크를 만들어 그 성분에 속한 픽셀만 남긴다.

    python3 scripts/build-species-sprites.py <시트가_있는_디렉터리>

필요: Pillow
"""
from PIL import Image, ImageFilter
from collections import deque
import os
import sys

U = sys.argv[1] if len(sys.argv) > 1 else 'assets/species-sheets'
OUT = 'public/sprites/species'
SCALE = 4
ALPHA_MIN = 40
MAX_DIM = 128
PAD = 4


def labelled(sub):
    """축소 마스크에서 연결 성분들을 찾아 (면적, 픽셀집합, bbox) 로 돌려준다"""
    W, H = sub.size
    small = sub.resize((max(1, W // SCALE), max(1, H // SCALE)), Image.LANCZOS)
    w, h = small.size
    a = small.getchannel('A').tobytes()
    mask = bytearray(1 if v >= ALPHA_MIN else 0 for v in a)
    seen = bytearray(w * h)
    comps = []
    for start in range(w * h):
        if mask[start] and not seen[start]:
            q = deque([start]); seen[start] = 1; pix = []
            x0 = x1 = start % w; y0 = y1 = start // w
            while q:
                i = q.popleft(); pix.append(i)
                x, y = i % w, i // w
                x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y)
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            j = ny * w + nx
                            if mask[j] and not seen[j]:
                                seen[j] = 1; q.append(j)
            comps.append((len(pix), pix, (x0, y0, x1, y1)))
    return comps, (w, h)


def isolate(sub, keep):
    """선택한 성분들의 픽셀만 남기고 나머지는 투명하게 만든다"""
    comps, (w, h) = keep
    buf = bytearray(w * h)
    for _, pix, _ in comps:
        for i in pix:
            buf[i] = 255
    small_mask = Image.frombytes('L', (w, h), bytes(buf))
    # 축소 마스크를 되돌리면서 가장자리를 약간 넓혀 안티에일리어싱을 살린다
    full = small_mask.resize(sub.size, Image.NEAREST).filter(ImageFilter.MaxFilter(5))
    out = sub.copy()
    alpha = out.getchannel('A').point(lambda v: v)
    out.putalpha(Image.composite(alpha, Image.new('L', sub.size, 0), full))
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def fit(img):
    w, h = img.size
    s = MAX_DIM / max(w, h)
    if s < 1:
        img = img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    w, h = img.size
    canvas = Image.new('RGBA', (w + PAD * 2, h + PAD * 2), (0, 0, 0, 0))
    canvas.alpha_composite(img, (PAD, PAD))
    return canvas


def cells(size, cols, rows):
    W, H = size
    for r in range(rows):
        for c in range(cols):
            yield (W * c // cols, H * r // rows, W * (c + 1) // cols, H * (r + 1) // rows)


def near(a, b, gap):
    return (a[0] - gap <= b[2] and b[0] - gap <= a[2]
            and a[1] - gap <= b[3] and b[1] - gap <= a[3])


# 시트 1·2: 셀당 스프라이트 하나. 가장 큰 성분 + 그에 붙은 조각(떨어진 지느러미)만 취한다.
SIMPLE = [
    ('cdc2fbe3-image.png', 2, 3,
     ['korean-rockfish', 'olive-flounder', 'japanese-sillago',
      'japanese-seabass', 'red-seabream', 'japanese-horse-mackerel']),
    ('659714c9-image.png', 3, 2,
     ['blue-crab', 'webfoot-octopus', 'common-octopus',
      'long-arm-octopus', 'black-porgy', 'spanish-mackerel']),
]

# 시트 3: 셀마다 포즈가 여러 개다. 왼쪽을 보고 형태가 또렷한 것을 하나씩 고른다.
SHEET3 = [
    ('largehead-hairtail',   0, 3, True),   # 가장 길고 또렷한 포즈. 방향만 좌우 반전
    ('chub-mackerel',        1, 0, False),
    ('pacific-cod',          2, 3, False),
    ('snow-crab',            3, 0, False),
    ('common-squid',         4, 2, False),
    ('small-yellow-croaker', 5, 3, False),
]

os.makedirs(OUT, exist_ok=True)
saved = []

for f, cols, rows, slugs in SIMPLE:
    im = Image.open(f'{U}/{f}').convert('RGBA')
    for i, box in enumerate(cells(im.size, cols, rows)):
        sub = im.crop(box)
        comps, dims = labelled(sub)
        comps.sort(key=lambda c: -c[0])
        main = comps[0]
        keep = [main] + [c for c in comps[1:] if near(main[2], c[2], 6)]
        img = fit(isolate(sub, (keep, dims)))
        path = f'{OUT}/{slugs[i]}.webp'
        img.save(path, 'WEBP', quality=86, method=6)
        saved.append((slugs[i], img.size, os.path.getsize(path)))

im3 = Image.open(f'{U}/dc6da1d7-image.png').convert('RGBA')
boxes3 = list(cells(im3.size, 3, 2))
for slug, cell_idx, pose_idx, flip in SHEET3:
    sub = im3.crop(boxes3[cell_idx])
    comps, dims = labelled(sub)
    comps = [c for c in comps if c[0] >= 400]
    comps.sort(key=lambda c: (c[2][1], c[2][0]))
    img = isolate(sub, ([comps[pose_idx]], dims))
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    img = fit(img)
    path = f'{OUT}/{slug}.webp'
    img.save(path, 'WEBP', quality=86, method=6)
    saved.append((slug, img.size, os.path.getsize(path)))

total = sum(n for _, _, n in saved)
print(f'{len(saved)}개 저장, 합계 {total/1024:.0f}KB')
for slug, size, n in sorted(saved):
    print(f'  {slug:26s} {size[0]:3d}x{size[1]:3d}  {n/1024:5.1f}KB')
