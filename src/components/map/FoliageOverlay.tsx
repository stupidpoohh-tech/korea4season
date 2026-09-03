'use client';

import { useMemo } from 'react';
import terrainData from '@/domain/terrain.json';
import {
  forestColorAt,
  landWashAt,
  mountainColorAt,
  type FoliageRegion,
} from '@/services/foliage-service';

/* ────────────────────────────────────────────────────────────
 * 산과 숲이 물든다.
 *
 * 단풍은 지도 위에 찍히는 마커가 아니라 지형 자체에서 일어나는 일이다.
 * 그래서 계절마다 지도를 다시 굽지 않고, base map 이 그린 **바로 그 산과
 * 그 나무** 위에 같은 좌표·같은 크기로 가을색을 덧그린다.
 * (좌표는 scripts/generate-base-map.mjs 가 terrain.json 으로 함께 내보낸다)
 *
 * 색을 정하는 단위는 명소가 아니라 권역이다. 지도의 산과 숲은 저마다
 * 가장 가까운 권역에 붙고, 그 권역의 색을 입는다. 그래서 날짜를 넘기면
 * 마커가 늘어나는 것이 아니라 **색의 띠가 북에서 남으로 내려간다.**
 *
 * 한 권역 안에서도 산마다 하루이틀씩 어긋나게 둔다. 전부 같은 날 같은 색이면
 * 지역이 통째로 칠해진 것처럼 보인다. 다만 이 편차(±2일 이내)는 권역 사이
 * 간격(5~32일)보다 훨씬 작아야 한다 — 크면 북→남 흐름이 잡음에 묻힌다.
 *
 * 그리는 순서는 base map 과 같다 — 숲 덩어리 → 나무 → 산.
 * 어긋나면 원래 초록이 가장자리로 삐져나온다.
 * ──────────────────────────────────────────────────────────── */

interface Mountain {
  x: number;
  y: number;
  w: number;
  h: number;
  snow: boolean;
}
interface Tree {
  x: number;
  y: number;
  s: number;
}
interface Grove {
  x: number;
  y: number;
  mass: string;
  trees: Tree[];
}

const VIEW = terrainData.view;
const MOUNTAINS = terrainData.mountains as Mountain[];
const GROVES = terrainData.groves as Grove[];
const ISLAND_TREES = terrainData.islandTrees as Tree[];

/**
 * 색이 바뀌는 데 걸리는 시간.
 *
 * 슬라이더를 끄는 동안에는 걸지 않는다. 매 프레임 색이 바뀌는데 전환까지
 * 걸면 요소 하나하나가 자기 애니메이션을 붙들고 있게 되고, 모바일에서는
 * 그것만으로 화면이 죽는다(iOS 에서 '페이지를 불러올 수 없음').
 */
const COLOR_TRANSITION = 'fill 320ms ease-out';

const n = (v: number) => v.toFixed(1);

/* 원과 타원을 path 로 그린다 — 색이 같은 것들을 한 요소로 합치기 위해서다.
   나무 399그루를 각각 <circle> 로 두면 DOM 이 1000개를 넘는다. */
function circlePath(cx: number, cy: number, r: number): string {
  return `M ${n(cx - r)} ${n(cy)} a ${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0 a ${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0`;
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${n(cx - rx)} ${n(cy)} a ${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0 a ${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0`;
}

/** base map 의 mountain() 이 그리는 눈 덮개와 같은 도형 */
function snowPath(m: Mountain): string {
  const s = m.h * 0.3;
  const sw = (m.w * s) / m.h / 2;
  const top = m.y - m.h;
  return (
    `M ${n(m.x)} ${n(top)} L ${n(m.x + sw)} ${n(top + s)} ` +
    `L ${n(m.x + sw * 0.35)} ${n(top + s * 0.72)} L ${n(m.x)} ${n(top + s * 1.05)} ` +
    `L ${n(m.x - sw * 0.4)} ${n(top + s * 0.7)} L ${n(m.x - sw)} ${n(top + s)} Z`
  );
}

/** 한 권역 안에서 산·숲을 흩는 폭 (일). 권역 간격보다 훨씬 작게 둔다. */
const MICRO_DAYS = [-1.5, 0, 1.5];

interface RegionShapes {
  id: string;
  /** 색을 가져올 권역 */
  regionIndex: number;
  /** 이 묶음이 며칠 앞서거나 뒤처지는가 */
  shiftDays: number;
  /** 숲 덩어리 */
  mass: string;
  /** 나무 몸통 */
  tree: string;
  /** 나무 윗면 */
  treeTop: string;
  /** 산 앞면 */
  face: string;
  /** 산 그늘면 */
  faceDark: string;
}

/**
 * 지형을 권역에 나눠 붙이고, 권역마다 하나의 path 로 합친다.
 *
 * 권역 경계를 부드럽게 섞지 않는다. 산과 나무는 이어진 면이 아니라
 * 떨어진 형태들이라 경계에 이음매가 생기지 않고,
 * 대신 산 하나가 정확히 한 색을 가져서 색의 위치가 또렷하게 읽힌다.
 */
function buildShapes(regions: FoliageRegion[]): RegionShapes[] {
  const anchors = regions.map((r) => ({ x: r.anchor.x * VIEW.width, y: r.anchor.y * VIEW.height }));

  const nearest = (x: number, y: number): number => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < anchors.length; i += 1) {
      const d = (anchors[i]!.x - x) ** 2 + (anchors[i]!.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  /* 자리에서 뽑으므로 같은 산은 언제나 같은 편차를 갖는다 (재생 중에도 흔들리지 않는다) */
  const micro = (x: number, y: number) => Math.abs(Math.round(x * 7 + y * 13)) % MICRO_DAYS.length;

  const parts = regions.flatMap((region, regionIndex) =>
    MICRO_DAYS.map((shiftDays, bucket) => ({
      key: `${region.id}:${bucket}`,
      regionIndex,
      shiftDays,
      mass: [] as string[],
      tree: [] as string[],
      treeTop: [] as string[],
      face: [] as string[],
      faceDark: [] as string[],
    })),
  );
  const at = (regionIndex: number, bucket: number) =>
    parts[regionIndex * MICRO_DAYS.length + bucket];

  for (const m of MOUNTAINS) {
    const bucket = at(nearest(m.x, m.y), micro(m.x, m.y));
    if (!bucket) continue;
    const half = m.w / 2;
    bucket.face.push(
      `M ${n(m.x - half)} ${n(m.y)} L ${n(m.x)} ${n(m.y - m.h)} L ${n(m.x + half)} ${n(m.y)} Z`,
    );
    bucket.faceDark.push(
      `M ${n(m.x)} ${n(m.y - m.h)} L ${n(m.x + half)} ${n(m.y)} L ${n(m.x)} ${n(m.y)} Z`,
    );
  }

  /* 섬 나무도 같은 규칙으로 물든다 — 겨울에 섬만 초록으로 남지 않게 */
  for (const t of ISLAND_TREES) {
    const bucket = at(nearest(t.x, t.y), micro(t.x, t.y));
    if (!bucket) continue;
    bucket.tree.push(circlePath(t.x, t.y, t.s));
    bucket.treeTop.push(circlePath(t.x - t.s * 0.3, t.y - t.s * 0.32, t.s * 0.6));
  }

  for (const g of GROVES) {
    const bucket = at(nearest(g.x, g.y), micro(g.x, g.y));
    if (!bucket) continue;
    bucket.mass.push(g.mass);
    for (const t of g.trees) {
      bucket.tree.push(circlePath(t.x, t.y, t.s));
      bucket.treeTop.push(circlePath(t.x - t.s * 0.3, t.y - t.s * 0.32, t.s * 0.6));
    }
  }

  return parts.map((p) => ({
    id: p.key,
    regionIndex: p.regionIndex,
    shiftDays: p.shiftDays,
    mass: p.mass.join(' '),
    tree: p.tree.join(' '),
    treeTop: p.treeTop.join(' '),
    face: p.face.join(' '),
    faceDark: p.faceDark.join(' '),
  }));
}

/*
 * 그림자는 계절과 무관한 접지면이다. 권역마다 색을 달리하면 얻는 것 없이
 * 매 프레임 다시 칠할 요소만 24개 늘어난다 — 한 덩어리로 굳혀 둔다.
 */
const SHADOW_D = [
  ...MOUNTAINS.map((m) => ellipsePath(m.x, m.y + 2, (m.w / 2) * 0.95, m.h * 0.09 + 2)),
  ...GROVES.flatMap((g) =>
    g.trees.map((t) => ellipsePath(t.x, t.y + t.s * 0.15, t.s * 0.85, t.s * 0.32)),
  ),
  ...ISLAND_TREES.map((t) => ellipsePath(t.x, t.y + t.s * 0.15, t.s * 0.85, t.s * 0.32)),
].join(' ');

/** 눈 덮인 봉우리는 계절과 무관하다 — 한 번 그려 두고 색을 바꾸지 않는다 */
const SNOW_D = MOUNTAINS.filter((m) => m.snow)
  .map(snowPath)
  .join(' ');

export function FoliageOverlay({
  regions,
  winter,
  fast = false,
}: {
  regions: FoliageRegion[];
  /** 겨울이 얼마나 깊은가 (0~1). 산과 땅이 눈으로 덮인다. */
  winter: number;
  /** 슬라이더를 끄는 중 · 1년 재생 중 — 전환을 끈다 */
  fast?: boolean;
}) {
  // 권역 구성은 날짜가 바뀌어도 그대로다. 다시 나눠 붙일 이유가 없다.
  const key = regions.map((r) => r.id).join('|');
  const shapes = useMemo(() => buildShapes(regions), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const transition = fast ? 'none' : COLOR_TRANSITION;

  /*
   * 색은 50 단계로 끊어 쓴다.
   *
   * 하루가 지날 때마다 요소 100여 개의 fill 을 새 값으로 바꾸면 1년 재생이나
   * 슬라이더 드래그에서 지도 전체를 매 프레임 다시 칠하게 된다. 눈으로는
   * 구분되지 않는 차이이므로 단계로 끊어 다시 칠하는 횟수를 줄인다.
   */
  const step = (v: number) => Math.round(v * 50) / 50;
  const waves = regions.map((r) => r.wave);
  const snow = step(winter);
  const paintKey = `${waves.map(step).join(',')}|${snow}`;

  const paint = useMemo(
    () =>
      shapes.map((s) => {
        const region = regions[s.regionIndex]!;
        const wave = step(
          Math.min(1, Math.max(0, region.wave + region.wavePerDay * s.shiftDays)),
        );
        return { mountain: mountainColorAt(wave, snow), forest: forestColorAt(wave, snow) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shapes, paintKey],
  );

  /*
   * 땅은 권역마다 잘라 칠하지 않는다 — 경계가 선으로 드러나면 지도가 조각난다.
   * 대신 권역의 자리(위도)에 색을 꽂은 세로 그라디언트 하나로 덮는다.
   * 그래서 땅 위에서도 색이 북에서 남으로 이어져 내려간다.
   */
  const landStops = useMemo(() => {
    const stops = regions
      .map((region) => ({
        offset: Math.min(1, Math.max(0, region.anchor.y)),
        ...landWashAt(step(region.wave), snow),
      }))
      .sort((a, b) => a.offset - b.offset);

    if (stops.length === 0) return [];
    // 위아래 끝까지 이어 준다 — 남는 자리가 비면 그 띠만 색이 끊긴다
    return [
      { ...stops[0]!, offset: 0 },
      ...stops,
      { ...stops[stops.length - 1]!, offset: 1 },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, paintKey]);

  if (shapes.length === 0) return null;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <clipPath id="foliage-land">
          <path d={terrainData.clip.mainland} />
          <path d={terrainData.clip.jeju} />
          <path d={terrainData.clip.islands} />
        </clipPath>
        <linearGradient
          id="foliage-land-wash"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2={VIEW.height}
        >
          {landStops.map((stop, i) => (
            <stop
              key={i}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity}
              style={{ transition: fast ? 'none' : 'stop-color 320ms ease-out, stop-opacity 320ms ease-out' }}
            />
          ))}
        </linearGradient>
      </defs>

      {/* 땅 — 산·숲보다 훨씬 옅게. 강과 해안 모래가 그대로 읽혀야 한다. */}
      <g>
        <path d={terrainData.clip.mainland} fill="url(#foliage-land-wash)" />
        <path d={terrainData.clip.jeju} fill="url(#foliage-land-wash)" />
        <path d={terrainData.clip.islands} fill="url(#foliage-land-wash)" />
      </g>

      <g clipPath="url(#foliage-land)" opacity={0.22}>
        {shapes.map((s, i) => (
          <path key={s.id} d={s.mass} fill={paint[i]!.forest.tree} style={{ transition }} />
        ))}
      </g>

      <path d={SHADOW_D} fill="#4a5a3c" opacity={0.16} />

      {shapes.map((s, i) => (
        <g key={s.id}>
          <path d={s.tree} fill={paint[i]!.forest.tree} style={{ transition }} />
          <path d={s.treeTop} fill={paint[i]!.forest.treeTop} style={{ transition }} />
        </g>
      ))}

      {shapes.map((s, i) => (
        <g key={s.id}>
          <path d={s.face} fill={paint[i]!.mountain.face} style={{ transition }} />
          <path d={s.faceDark} fill={paint[i]!.mountain.faceDark} style={{ transition }} />
        </g>
      ))}

      <path d={SNOW_D} fill="#f4fbff" />
    </svg>
  );
}
