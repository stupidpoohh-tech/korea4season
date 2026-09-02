#!/usr/bin/env node
/**
 * 대한민국 게임 월드맵 base asset 생성기.
 *
 * 실제 위경도로 해안선을 잡고, 그 위에 산맥 · 숲 · 강 · 도서를
 * 결정론적 난수로 배치해 하나의 SVG 로 굽는다.
 *
 * - GIS 지도가 아니다. 지형의 인상을 전달하는 일러스트다.
 * - 좌표계는 src/domain/map-bounds.json 을 공유하므로
 *   sprite 위치(lat/lng -> 0~1)와 base map 이 항상 정합한다.
 *
 *   실행:  npm run map:generate
 *   출력:  public/map/korea-base.svg
 *
 * public/map/korea-base.png 을 넣으면 앱이 그 파일을 우선 사용한다.
 */
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const B = JSON.parse(readFileSync(resolve(root, 'src/domain/map-bounds.json'), 'utf8'));
/* 실제 해안선. scripts/extract-coastline.mjs 가 굽는다 (npm run map:coastline) */
const COAST = JSON.parse(readFileSync(resolve(here, 'korea-coastline.json'), 'utf8'));
const W = B.viewWidth;
const H = B.viewHeight;

/* ── 투영 ─────────────────────────────────────────────────── */
const px = (lng) => ((lng - B.west) / (B.east - B.west)) * W;
const py = (lat) => ((B.north - lat) / (B.north - B.south)) * H;
const P = ([lng, lat]) => [px(lng), py(lat)];

/* ── 결정론적 난수 ────────────────────────────────────────── */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const n1 = (r) => r() * 2 - 1;

/* ── 해안선 ───────────────────────────────────────────────
 * 실제 위경도다. Natural Earth 1:10m 을 단순화해 쓴다 —
 * GIS 지도는 아니지만, 실루엣만은 진짜 대한민국이어야 한다.
 */
const MAINLAND = COAST.mainland;
const JEJU = COAST.jeju;

/*
 * 실제 위경도가 지도 밖에 있는 섬은 정규 좌표로 직접 앉힌다.
 * base map 의 서쪽 끝은 125.37°E, 동쪽 끝은 130.3°E 다.
 * src/data-sources/shared/locations.json 의 mapX/mapY 와 같은 값을 써야
 * 그림과 마커가 어긋나지 않는다.
 */
const ULLEUNG_CENTER = [0.9235, 0.205];   // 130.87°E — 우측 압축
const DOKDO_CENTER = [0.9671, 0.262];     // 131.87°E — 우측 압축
const BAENGNYEONG_CENTER = [0.045, 0.1285]; // 124.71°E — 좌측 압축

function ellipse(cx, cy, rx, ry, steps, wob = 0, seed = 1) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < steps; i += 1) {
    const a = (Math.PI * 2 * i) / steps;
    const k = 1 + n1(r) * wob;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return pts;
}

/* ── Catmull-Rom -> 부드러운 닫힌 path ────────────────────── */
function smoothClosedPath(points, tension = 1) {
  const p = points.map(P);
  const n = p.length;
  const at = (i) => p[((i % n) + n) % n];
  let d = `M ${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = at(i - 1); const p1 = at(i); const p2 = at(i + 1); const p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

function smoothOpenPath(points) {
  const p = points.map(P);
  if (p.length < 2) return '';
  let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  const at = (i) => p[Math.min(Math.max(i, 0), p.length - 1)];
  for (let i = 0; i < p.length - 1; i += 1) {
    const p0 = at(i - 1); const p1 = at(i); const p2 = at(i + 1); const p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/* ── 점이 육지 안인가 (투영 좌표 기준) ────────────────────── */
function inPolygon([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const MAINLAND_PX = MAINLAND.map(P);
const JEJU_PX = JEJU.map(P);

function distToPolygon([x, y], poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [x1, y1] = poly[i]; const [x2, y2] = poly[j];
    const dx = x2 - x1; const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
    const cx = x1 + t * dx; const cy = y1 + t * dy;
    best = Math.min(best, Math.hypot(x - cx, y - cy));
  }
  return best;
}

/* ── 색 ───────────────────────────────────────────────────── */
const C = {
  /*
   * 바다는 해안 둘레만 두른다.
   * 배경 전체를 칠하면 지도가 페이지에서 떠 보이므로, 바깥으로 갈수록
   * 옅어지는 띠 두 겹으로 "여기서부터 바다" 만 알린다.
   * 색은 지도 안의 강과 같다 — 한 지도 안의 물은 같은 물이어야 한다.
   */
  sea: '#57c2f0',
  seaLine: '#ffffff',
  sand: '#f4e5ad',
  sandEdge: '#e0c98a',
  grass: '#bbe264',
  grassDeep: '#9ed14f',
  forest: '#3f9e46',
  forestDark: '#2c7a37',
  treeTop: '#5cb84f',
  mtnLight: '#5cb968',
  mtnDark: '#3b9349',
  mtnEdge: '#256733',
  snow: '#f4fbff',
  river: '#57c2f0',
  lake: '#59c4f2',
};

/* ── 산 ───────────────────────────────────────────────────── */
function mountain(x, y, w, h, snow) {
  const half = w / 2;
  const apex = `${x.toFixed(1)} ${(y - h).toFixed(1)}`;
  const left = `${(x - half).toFixed(1)} ${y.toFixed(1)}`;
  const right = `${(x + half).toFixed(1)} ${y.toFixed(1)}`;
  const parts = [
    `<ellipse cx="${x.toFixed(1)}" cy="${(y + 2).toFixed(1)}" rx="${(half * 0.95).toFixed(1)}" ry="${(h * 0.09 + 2).toFixed(1)}" fill="#2c7a37" opacity=".18"/>`,
    `<path d="M ${left} L ${apex} L ${right} Z" fill="${C.mtnLight}"/>`,
    `<path d="M ${apex} L ${right} L ${x.toFixed(1)} ${y.toFixed(1)} Z" fill="${C.mtnDark}"/>`,
  ];
  if (snow) {
    const s = h * 0.3;
    const sw = (w * s) / h / 2;
    parts.push(
      `<path d="M ${x.toFixed(1)} ${(y - h).toFixed(1)} L ${(x + sw).toFixed(1)} ${(y - h + s).toFixed(1)} L ${(x + sw * 0.35).toFixed(1)} ${(y - h + s * 0.72).toFixed(1)} L ${x.toFixed(1)} ${(y - h + s * 1.05).toFixed(1)} L ${(x - sw * 0.4).toFixed(1)} ${(y - h + s * 0.7).toFixed(1)} L ${(x - sw).toFixed(1)} ${(y - h + s).toFixed(1)} Z" fill="${C.snow}"/>`,
    );
  }
  return `<g>${parts.join('')}</g>`;
}

/* ── 나무 ─────────────────────────────────────────────────── */
function tree(x, y, s) {
  return `<g><ellipse cx="${x.toFixed(1)}" cy="${(y + s * 0.15).toFixed(1)}" rx="${(s * 0.85).toFixed(1)}" ry="${(s * 0.32).toFixed(1)}" fill="${C.forestDark}" opacity=".2"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="${C.forest}"/><circle cx="${(x - s * 0.3).toFixed(1)}" cy="${(y - s * 0.32).toFixed(1)}" r="${(s * 0.6).toFixed(1)}" fill="${C.treeTop}"/></g>`;
}

function groveMass(cx, cy, r, seed) {
  return `<path d="${blobPath(cx, cy, r * 1.15, seed, 0.62)}" fill="${C.forest}" opacity=".22"/>`;
}

/**
 * 숲 하나에 심을 나무의 자리를 먼저 값으로 만든다.
 *
 * 그리면서 난수를 뽑지 않는 이유는 하나다 — 단풍 레이어가 이 나무들 위에
 * 정확히 같은 자리로 가을색 나무를 덧그려야 하기 때문이다.
 * 그림과 좌표가 같은 배열에서 나와야 어긋나지 않는다.
 */
function groveTrees(cx, cy, r, count, rand) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * r;
    out.push({
      x: cx + Math.cos(a) * d,
      y: cy + Math.sin(a) * d * 0.7,
      s: 7 + rand() * 4,
    });
  }
  return out;
}

/* ── 산맥 정의 ────────────────────────────────────────────── */
const RANGES = [
  { name: 'taebaek', pts: [[128.42, 38.40], [128.55, 37.95], [128.70, 37.45], [128.85, 36.95], [129.00, 36.45], [129.05, 35.95], [129.00, 35.55]], big: true, snow: true },
  { name: 'sobaek', pts: [[128.45, 37.05], [128.10, 36.80], [127.85, 36.45], [127.60, 36.05], [127.55, 35.70], [127.72, 35.36]], big: true, snow: false },
  { name: 'charyeong', pts: [[127.45, 36.95], [127.15, 36.72], [126.90, 36.55]], big: false, snow: false },
  { name: 'noryeong', pts: [[126.95, 35.75], [126.92, 35.48], [127.02, 35.20]], big: false, snow: false },
  { name: 'gyeongnam', pts: [[128.25, 35.40], [128.60, 35.45], [128.90, 35.35]], big: false, snow: false },
  { name: 'gwangju', pts: [[126.60, 35.15], [126.80, 34.95]], big: false, snow: false },
  { name: 'gyeonggi', pts: [[127.30, 37.75], [127.60, 37.90], [127.90, 38.10]], big: false, snow: false },
];

/* ── 강 ───────────────────────────────────────────────────── */
const RIVERS = [
  { w: 7, pts: [[128.55, 37.62], [128.10, 37.45], [127.60, 37.52], [127.15, 37.50], [126.80, 37.60], [126.52, 37.72]] },
  { w: 7, pts: [[128.90, 37.02], [128.55, 36.55], [128.32, 36.05], [128.42, 35.62], [128.72, 35.32], [128.98, 35.12]] },
  { w: 5, pts: [[127.72, 36.62], [127.35, 36.42], [127.02, 36.28], [126.78, 36.10]] },
  { w: 4, pts: [[127.48, 35.62], [127.66, 35.25], [127.76, 35.02]] },
  { w: 4, pts: [[126.98, 35.25], [126.72, 35.05], [126.48, 34.88]] },
];

const LAKES = [
  [127.82, 37.95, 16, 9],
  [128.02, 36.95, 13, 8],
  [127.52, 36.28, 11, 7],
];

/* ── 조립 ─────────────────────────────────────────────────── */
/*
 * 실제 해안선은 점이 촘촘해서 tension 1 이면 급한 모퉁이에서 곡선이 튀어나간다.
 * 모서리만 살짝 둥글릴 만큼만 준다 — 일러스트의 인상은 남기고 실루엣은 지킨다.
 */
const mainlandPath = smoothClosedPath(MAINLAND, 0.35);
const jejuPath = smoothClosedPath(JEJU, 0.35);

const rand = rng(20260902);

/* ── 섬 ───────────────────────────────────────────────────
 * 예전에는 서해·남해에 결정론적 난수로 흩뿌렸다. 지금은 실제 위치를 쓴다 —
 * 다도해가 실제로 있는 자리에 있어야 지도가 대한민국으로 읽힌다.
 */
const islandShapes = [];

for (const ring of COAST.islands) {
  const pts = ring.map(P);
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2;
  const y = (Math.min(...ys) + Math.max(...ys)) / 2;
  const r = Math.max(Math.max(...xs) - x, Math.max(...ys) - y);

  // 화면에서 점 하나로 뭉개질 섬은 그리지 않는다
  if (r < 2.5) continue;
  // 지도 밖으로 밀려난 섬(백령도·가거도 등)은 아래에서 따로 앉힌다
  if (x < 8 || x > W - 8 || y < 8 || y > H - 8) continue;

  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let k = 1; k < pts.length; k += 1) d += ` L ${pts[k][0].toFixed(1)} ${pts[k][1].toFixed(1)}`;
  islandShapes.push({ d: `${d} Z`, x, y, r });
}

/*
 * 데이터가 참조하는데 실제 좌표로는 그릴 수 없는 섬.
 * 백령도는 지도 서쪽 끝 밖이라 압축해 앉히고,
 * 가파도는 1:10m 원본에서 걸러질 만큼 작아 직접 그린다.
 */
const NAMED_ISLETS = [
  { at: BAENGNYEONG_CENTER, r: 15, seed: 51 },   // 백령도 (좌측 압축 배치)
  { lng: 126.271, lat: 33.168, r: 8, seed: 52 }, // 가파도
];
for (const isl of NAMED_ISLETS) {
  const x = isl.at ? isl.at[0] * W : px(isl.lng);
  const y = isl.at ? isl.at[1] * H : py(isl.lat);
  for (let k = islandShapes.length - 1; k >= 0; k -= 1) {
    if (Math.hypot(islandShapes[k].x - x, islandShapes[k].y - y) < isl.r + 20) {
      islandShapes.splice(k, 1);
    }
  }
  const rr = rng(isl.seed);
  const pts = [];
  const steps = 9;
  for (let k = 0; k < steps; k += 1) {
    const a = (Math.PI * 2 * k) / steps;
    const wob = 1 + n1(rr) * 0.28;
    pts.push([x + Math.cos(a) * isl.r * wob, y + Math.sin(a) * isl.r * 0.78 * wob]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let k = 1; k < pts.length; k += 1) d += ` L ${pts[k][0].toFixed(1)} ${pts[k][1].toFixed(1)}`;
  islandShapes.push({ d: `${d} Z`, x, y, r: isl.r });
}

/* 울릉도 · 독도 (base map 우측 압축 배치) */
const ulleung = { x: ULLEUNG_CENTER[0] * W, y: ULLEUNG_CENTER[1] * H, r: 26 };
const dokdo = { x: DOKDO_CENTER[0] * W, y: DOKDO_CENTER[1] * H, r: 9 };

function blobPath(cx, cy, r, seed, squash = 0.8) {
  const rr = rng(seed);
  const steps = 12;
  const pts = [];
  for (let i = 0; i < steps; i += 1) {
    const a = (Math.PI * 2 * i) / steps;
    const k = 1 + n1(rr) * 0.18;
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * squash * k]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i += 1) d += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  return `${d} Z`;
}

const ulleungPath = blobPath(ulleung.x, ulleung.y, ulleung.r, 42, 0.85);

const dokdoPath = blobPath(dokdo.x, dokdo.y, dokdo.r, 43, 0.85);

/* 산 배치 */
const mountains = [];
for (const range of RANGES) {
  const pts = range.pts.map(P);
  for (let seg = 0; seg < pts.length - 1; seg += 1) {
    const [x1, y1] = pts[seg];
    const [x2, y2] = pts[seg + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const count = Math.max(2, Math.round(len / (range.big ? 42 : 46)));
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      const jx = n1(rand) * (range.big ? 26 : 18);
      const jy = n1(rand) * 16;
      const x = x1 + (x2 - x1) * t + jx;
      const y = y1 + (y2 - y1) * t + jy;
      if (!inPolygon([x, y], MAINLAND_PX)) continue;
      if (distToPolygon([x, y], MAINLAND_PX) < 16) continue;
      const scale = range.big ? 1 : 0.74;
      const w = (44 + rand() * 24) * scale;
      const h = (36 + rand() * 22) * scale;
      const snow = range.snow && h > 48 && rand() > 0.4;
      mountains.push({ x, y, w, h, snow });
    }
  }
}
mountains.push({ x: px(126.53), y: py(33.36), w: 92, h: 62, snow: true });
mountains.push({ x: ulleung.x, y: ulleung.y + 4, w: 34, h: 26, snow: true });
mountains.sort((a, b) => a.y - b.y);

/* 숲 배치 — 산과 겹치지 않게 */
const groves = [];
{
  let placed = 0; let guard = 0;
  while (placed < 62 && guard < 14000) {
    guard += 1;
    const x = rand() * W;
    const y = rand() * H;
    const onJeju = inPolygon([x, y], JEJU_PX);
    if (!inPolygon([x, y], MAINLAND_PX) && !onJeju) continue;
    if (distToPolygon([x, y], onJeju ? JEJU_PX : MAINLAND_PX) < 18) continue;
    if (mountains.some((m) => Math.hypot(m.x - x, m.y - y) < 38)) continue;
    if (groves.some((g) => Math.hypot(g.x - x, g.y - y) < 56)) continue;
    groves.push({ x, y, r: 13 + rand() * 15, n: 5 + Math.floor(rand() * 5) });
    placed += 1;
  }
}
groves.sort((a, b) => a.y - b.y);
/* 나무 자리는 배치가 끝난 뒤 한 번에 뽑는다 (정렬 순서에 난수가 끌려다니지 않게) */
for (const g of groves) g.trees = groveTrees(g.x, g.y, g.r, g.n, rand);

const riverPaths = RIVERS.map((r) => ({ d: smoothOpenPath(r.pts), w: r.w }));

/* ── SVG 출력 ─────────────────────────────────────────────── */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="대한민국 자연 지도">
  <title>대한민국 계절 지도</title>
  <defs>
    <clipPath id="land-clip"><path d="${mainlandPath}"/></clipPath>
    <clipPath id="jeju-clip"><path d="${jejuPath}"/></clipPath>
    <linearGradient id="land-shade" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#d6ee86" stop-opacity=".9"/>
      <stop offset=".55" stop-color="${C.grass}" stop-opacity="0"/>
      <stop offset="1" stop-color="${C.grassDeep}" stop-opacity=".55"/>
    </linearGradient>
  </defs>

  <!--
    바다 테두리와 모래 띠.

    폭은 지도 축척에 매여 있다 — 20px 은 실제로 10km 쯤이다.
    해안선이 실제 지형이 된 뒤로는 이 폭이 리아스식 만을 통째로 메워서
    내륙까지 모래가 뻗어 들어간다. 그래서 예전 일러스트 해안선 때보다
    얇게 두른다.
  -->
  <!--
    바다는 그리지 않는다.

    SVG 바탕이 비어 있어 페이지의 흰색이 그대로 바다가 된다.
    지도 배경이 배경과 구분되지 않아야 하므로, 예전에 해안을 두르던
    파란 물결 세 겹을 두지 않는다. 색을 갖는 것은 육지와 그 위의 생물뿐이다.
  -->

  <!--
    바다. 해안 둘레만 두르고 배경은 비워 둔다 —
    지도 배경은 페이지 배경(흰색)과 구분되지 않아야 한다.
  -->
  <g id="ocean" stroke-linejoin="round" fill="none">
    <g stroke="${C.sea}" stroke-width="30" opacity=".28"><path d="${mainlandPath}"/><path d="${jejuPath}"/><path d="${ulleungPath}"/><path d="${dokdoPath}"/>${islandShapes.map((i) => `<path d="${i.d}"/>`).join('')}</g>
    <g stroke="${C.sea}" stroke-width="13" opacity=".5"><path d="${mainlandPath}"/><path d="${jejuPath}"/><path d="${ulleungPath}"/><path d="${dokdoPath}"/>${islandShapes.map((i) => `<path d="${i.d}"/>`).join('')}</g>
  </g>

  <g id="sand" stroke-linejoin="round" fill="${C.sand}">
    <g stroke="${C.sand}" stroke-width="9"><path d="${mainlandPath}"/><path d="${jejuPath}"/><path d="${ulleungPath}"/></g>
    <g stroke="${C.sand}" stroke-width="3"><path d="${dokdoPath}"/>${islandShapes.map((i) => `<path d="${i.d}"/>`).join('')}</g>
  </g>

  <g id="land" fill="${C.grass}">
    <path d="${mainlandPath}"/><path d="${jejuPath}"/><path d="${ulleungPath}"/><path d="${dokdoPath}"/>
    ${islandShapes.map((i) => `<path d="${i.d}" transform="translate(${i.x} ${i.y}) scale(.9) translate(${-i.x} ${-i.y})"/>`).join('')}
  </g>

  <g id="land-shading">
    <path d="${mainlandPath}" fill="url(#land-shade)"/>
    <path d="${jejuPath}" fill="url(#land-shade)"/>
  </g>

  <g id="water-inland" clip-path="url(#land-clip)" fill="none" stroke="${C.river}" stroke-linecap="round">
    ${riverPaths.map((r) => `<path d="${r.d}" stroke-width="${r.w + 3}" opacity=".35"/>`).join('\n    ')}
    ${riverPaths.map((r) => `<path d="${r.d}" stroke-width="${r.w}"/>`).join('\n    ')}
  </g>
  <g id="lakes" clip-path="url(#land-clip)">
    ${LAKES.map(([lng, lat, rx, ry]) => `<ellipse cx="${px(lng).toFixed(1)}" cy="${py(lat).toFixed(1)}" rx="${rx}" ry="${ry}" fill="${C.lake}"/>`).join('\n    ')}
  </g>

  <g id="forest-mass" clip-path="url(#land-clip)">
    ${groves.map((g, i) => groveMass(g.x, g.y, g.r, 900 + i)).join('')}
  </g>

  <g id="forest">
    ${groves.map((g) => g.trees.map((t) => tree(t.x, t.y, t.s)).join('')).join('\n    ')}
  </g>

  <g id="mountains">
    ${mountains.map((m) => mountain(m.x, m.y, m.w, m.h, m.snow)).join('\n    ')}
  </g>

  <g id="island-greens">
    ${islandShapes.filter((i) => i.r > 11).map((i) => tree(i.x, i.y - 1, i.r * 0.36)).join('')}
  </g>
</svg>
`;

/*
 * 육지 폴리곤을 0~1 정규 좌표로 함께 내보낸다.
 * 지도에서 sprite 를 흩을 때 바다 생물이 육지로 밀려나지 않게 하는 데 쓴다.
 * base map 을 다시 구우면 이 파일도 같이 갱신된다.
 */
/**
 * 폴리곤을 바깥으로 margin 만큼 부풀린다.
 * 그려지는 해안선에는 모래 테두리(20폭)가 덧대어 있고 sprite 는 점이 아니라
 * 그림이므로, 판정선을 그림보다 조금 넓게 잡아야 물고기가 해안에 걸치지 않는다.
 */
function inflate(poly, margin) {
  const n = poly.length;
  const area = poly.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = poly[(i + 1) % n];
    return sum + (x1 * y2 - x2 * y1);
  }, 0);
  // 바깥 방향은 감김 방향에 달려 있다
  const sign = area > 0 ? 1 : -1;

  return poly.map(([x, y], i) => {
    const [px, py] = poly[(i - 1 + n) % n];
    const [nx2, ny2] = poly[(i + 1) % n];
    let nx = 0;
    let ny = 0;
    for (const [ax, ay, bx, by] of [[px, py, x, y], [x, y, nx2, ny2]]) {
      const ex = bx - ax;
      const ey = by - ay;
      const len = Math.hypot(ex, ey) || 1;
      nx += (ey / len) * sign;
      ny += (-ex / len) * sign;
    }
    const len = Math.hypot(nx, ny) || 1;
    return [x + (nx / len) * margin, y + (ny / len) * margin];
  });
}

/** 판정선을 그림 밖으로 밀어내는 여유 (원본 좌표 px). 모래 띠 절반 + sprite 여유 */
const LAND_MARGIN = 11;

const ULLEUNG_PX = ellipse(0, 0, 1, 1, 16).map(([x, y]) => [
  ulleung.x + x * ulleung.r,
  ulleung.y + y * ulleung.r,
]);

const norm = (poly) =>
  poly.map(([x, y]) => [Number((x / W).toFixed(4)), Number((y / H).toFixed(4))]);

/*
 * 판정선은 그림선보다 굵게 일반화한 링을 쓴다 (korea-coastline.json 의 mask).
 * 실제 해안선을 그대로 부풀리면 좁은 만마다 법선이 겹쳐 스파이크가 생기고,
 * 그런 만은 어차피 sprite 하나 들어갈 넓이도 아니다.
 * 만을 메우는 방향은 육지를 넓게 보는 쪽이라 안전하다 —
 * 바다 생물이 뭍에 걸치는 것보다 만 안쪽을 비우는 편이 낫다.
 */
const landMask = {
  note: 'scripts/generate-base-map.mjs 가 생성합니다. 직접 수정하지 마십시오.',
  mainland: norm(inflate(COAST.mask.mainland.map(P), LAND_MARGIN)),
  jeju: norm(inflate(COAST.mask.jeju.map(P), LAND_MARGIN)),
  ulleung: norm(inflate(ULLEUNG_PX, LAND_MARGIN)),
};
writeFileSync(
  resolve(root, 'src/domain/land-mask.json'),
  `${JSON.stringify(landMask, null, 2)}\n`,
  'utf8',
);

/*
 * 산과 숲의 자리를 함께 내보낸다.
 *
 * 단풍 레이어가 이 좌표 위에 **같은 산 · 같은 나무**를 가을색으로 덧그려
 * '산이 물드는' 것을 만든다. 지도 이미지를 계절마다 따로 굽지 않고
 * 한 장 위에 얹기 위해서다. 그림과 같은 배치를 써야 색이 형태에서 벗어나지 않는다.
 *
 * 좌표는 전부 0~1 정규값이다 (지도 크기와 무관하게 쓰기 위해).
 */
const r1 = (v) => Number(v.toFixed(1));
const terrain = {
  note: 'scripts/generate-base-map.mjs 가 생성합니다. 직접 수정하지 마십시오.',
  /* base map 과 같은 좌표계(viewBox 0 0 W H). 정규화하지 않는다 —
     가로세로 비율이 다른 공간으로 옮기면 산과 숲의 모양이 찌그러진다. */
  view: { width: W, height: H },
  clip: { mainland: mainlandPath, jeju: jejuPath },
  mountains: mountains.map((m) => ({
    x: r1(m.x), y: r1(m.y), w: r1(m.w), h: r1(m.h), snow: Boolean(m.snow),
  })),
  groves: groves.map((g, i) => ({
    x: r1(g.x),
    y: r1(g.y),
    mass: blobPath(g.x, g.y, g.r * 1.15, 900 + i, 0.62),
    trees: g.trees.map((t) => ({ x: r1(t.x), y: r1(t.y), s: r1(t.s) })),
  })),
};
writeFileSync(resolve(root, 'src/domain/terrain.json'), `${JSON.stringify(terrain)}\n`, 'utf8');

mkdirSync(resolve(root, 'public/map'), { recursive: true });
writeFileSync(resolve(root, 'public/map/korea-base.svg'), svg, 'utf8');
console.log(
  `korea-base.svg  ${(svg.length / 1024).toFixed(0)}KB  land-mask.json  ` +
  `섬=${islandShapes.length} 산=${mountains.length} 숲=${groves.length}  terrain.json`,
);
