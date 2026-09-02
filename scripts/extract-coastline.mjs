#!/usr/bin/env node
/**
 * 실제 대한민국 해안선을 뽑아 base map 생성기가 쓸 형태로 굽는다.
 *
 * 원본: Natural Earth 1:10m Cultural Vectors (public domain),
 *       npm 패키지 world-atlas 의 countries-10m.json.
 *
 * 이 앱의 지도는 GIS 타일이 아니라 일러스트다. 그래서 원본을 그대로 쓰지 않고
 * 두 단계로 줄인다.
 *
 *   draw  — 그림용. 만과 반도가 살아 있을 만큼만 남긴다.
 *   mask  — 육지 판정용. 더 굵게 일반화한다.
 *           작은 만을 메우는 방향(= 육지를 넓게 보는 방향)이라
 *           바다 생물이 좁은 만 안쪽에 끼어 앉지 않는다.
 *
 *   실행:  npm run map:coastline
 *   출력:  scripts/korea-coastline.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

/** 대한민국 ISO 숫자 코드 */
const KR = '410';

/* ── 단순화 ───────────────────────────────────────────────── */

/** 점 p 에서 선분 ab 까지의 거리 (도 단위, 위도 방향 압축을 반영) */
function segDist([px, py], [ax, ay], [bx, by], kx) {
  const dx = (bx - ax) * kx;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? (((px - ax) * kx * dx + (py - ay) * dy) / len2) : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot((px - ax) * kx - dx * t, py - ay - dy * t);
}

/** Douglas-Peucker. tol 은 도(°) 단위. */
function simplify(ring, tol, kx) {
  if (ring.length < 4) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;

  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop();
    let worst = -1;
    let at = -1;
    for (let i = lo + 1; i < hi; i += 1) {
      const d = segDist(ring[i], ring[lo], ring[hi], kx);
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > tol) {
      keep[at] = 1;
      stack.push([lo, at], [at, hi]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

function ringArea(ring) {
  return Math.abs(
    ring.reduce((s, [x1, y1], i) => {
      const [x2, y2] = ring[(i + 1) % ring.length];
      return s + (x1 * y2 - x2 * y1);
    }, 0) / 2,
  );
}

const round = (ring) => ring.map(([x, y]) => [Number(x.toFixed(4)), Number(y.toFixed(4))]);

/* ── 추출 ─────────────────────────────────────────────────── */

const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-10m.json'), 'utf8'));
const kr = feature(topo, topo.objects.countries).features.find((f) => f.id === KR);
if (!kr) throw new Error('countries-10m.json 에서 대한민국(410)을 찾지 못했습니다');

// 위도 36° 기준으로 경도 1도를 위도 1도와 같은 자로 재는 계수
const KX = Math.cos((36 * Math.PI) / 180);

const rings = kr.geometry.coordinates
  .map((poly) => poly[0])
  .map((ring) => ({ ring, area: ringArea(ring) }))
  .sort((a, b) => b.area - a.area);

const [mainland, jeju, ...rest] = rings;

/** 이 넓이보다 작은 섬은 그리지 않는다 — 점 하나로 뭉개져 노이즈만 된다 */
const MIN_ISLAND_AREA = 0.0006;

const islands = rest.filter((r) => r.area >= MIN_ISLAND_AREA);

const out = {
  meta: {
    note: 'scripts/extract-coastline.mjs 가 생성합니다. 직접 수정하지 마십시오.',
    source: 'Natural Earth 1:10m Cultural Vectors (public domain) via npm world-atlas@2.0.2',
    generatedAt: new Date().toISOString().slice(0, 10),
    tolerance: { drawDeg: 0.012, maskDeg: 0.055, islandDeg: 0.01 },
  },
  /* 그림용 */
  mainland: round(simplify(mainland.ring, 0.012, KX)),
  jeju: round(simplify(jeju.ring, 0.008, KX)),
  islands: islands.map((r) => round(simplify(r.ring, 0.01, KX))),
  /* 육지 판정용 — 더 굵게 */
  mask: {
    mainland: round(simplify(mainland.ring, 0.055, KX)),
    jeju: round(simplify(jeju.ring, 0.03, KX)),
  },
};

writeFileSync(resolve(here, 'korea-coastline.json'), `${JSON.stringify(out)}\n`, 'utf8');

const total = out.islands.reduce((s, r) => s + r.length, 0);
console.log(
  `korea-coastline.json  본토 ${mainland.ring.length}→${out.mainland.length}점 ` +
  `(판정용 ${out.mask.mainland.length}점) · 제주 ${out.jeju.length}점 · ` +
  `섬 ${out.islands.length}개 ${total}점`,
);
