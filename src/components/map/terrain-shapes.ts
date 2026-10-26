import terrainData from '@/domain/terrain.json';
import type { MapPosition } from '@/domain/projection';

/* ────────────────────────────────────────────────────────────
 * base map 이 그린 산과 나무의 자리.
 *
 * 계절 레이어는 지도를 다시 굽지 않고 **바로 그 형태 위에** 같은 좌표로
 * 덧그린다. 그 좌표를 여기서 한 번만 읽고, 공식 절정 예측 지점에 나눠 붙이는
 * 일도 여기서 한다.
 *
 * 색이 같은 것들은 하나의 path 로 합친다.
 * 나무 399그루를 각각 <circle> 로 두면 DOM 이 1000개를 넘는다.
 * ──────────────────────────────────────────────────────────── */

export interface Tree {
  x: number;
  y: number;
  s: number;
}
export interface Mountain {
  x: number;
  y: number;
  w: number;
  h: number;
  snow: boolean;
}
export interface Grove {
  x: number;
  y: number;
  mass: string;
  trees: Tree[];
}

export const VIEW = terrainData.view;
export const CLIP = terrainData.clip;
export const MOUNTAINS = terrainData.mountains as Mountain[];
export const GROVES = terrainData.groves as Grove[];
export const ISLAND_TREES = terrainData.islandTrees as Tree[];

const n = (v: number) => v.toFixed(1);

export function circlePath(cx: number, cy: number, r: number): string {
  return `M ${n(cx - r)} ${n(cy)} a ${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0 a ${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0`;
}

export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
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

/*
 * 그림자는 계절과 무관한 접지면이다. 권역마다 색을 달리하면 얻는 것 없이
 * 매 프레임 다시 칠할 요소만 늘어난다 — 한 덩어리로 굳혀 둔다.
 */
export const SHADOW_D = [
  ...MOUNTAINS.map((m) => ellipsePath(m.x, m.y + 2, (m.w / 2) * 0.95, m.h * 0.09 + 2)),
  ...GROVES.flatMap((g) =>
    g.trees.map((t) => ellipsePath(t.x, t.y + t.s * 0.15, t.s * 0.85, t.s * 0.32)),
  ),
  ...ISLAND_TREES.map((t) => ellipsePath(t.x, t.y + t.s * 0.15, t.s * 0.85, t.s * 0.32)),
].join(' ');

/** 눈 덮인 봉우리는 계절과 무관하다 — 한 번 그려 두고 색을 바꾸지 않는다 */
export const SNOW_D = MOUNTAINS.filter((m) => m.snow)
  .map(snowPath)
  .join(' ');

export interface TerrainShapes {
  id: string;
  /**
   * 색을 가져올 자리.
   *
   * 공식 절정 예측 지점의 번호다. -1 은 "가까운 공식 지점이 없다" 는 뜻이고,
   * 그 지형은 계절색을 입지 않는다 — 자료가 없는 곳을 옆 지점의 날짜로
   * 칠하면 공식 예측이 없는 자리에 공식처럼 보이는 색이 생긴다.
   */
  anchorIndex: number;
  /** 이 묶음이 지도 세로의 어디쯤인가 (0 북 ~ 1 남). 배경 식생의 시차에 쓴다. */
  northSouth: number;
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
 * 지형을 공식 예측 지점에 나눠 붙이고, 묶음마다 하나의 path 로 합친다.
 *
 * 가장 가까운 지점에 붙되 maxDistance 보다 멀면 어디에도 붙이지 않는다.
 * 공식 지도에 점이 몇 개뿐인 수종(은행나무)에서 특히 중요하다 — 반경을 두지
 * 않으면 강원의 산이 충청 지점의 날짜로 물든다.
 */
export function buildTerrainShapes(
  anchorPositions: MapPosition[],
  maxDistance = 0.3,
): TerrainShapes[] {
  const anchors = anchorPositions.map((a) => ({ x: a.x, y: a.y }));

  /** 가장 가까운 지점. 반경 밖이면 -1. */
  const nearest = (px: number, py: number): number => {
    const x = px / VIEW.width;
    const y = py / VIEW.height;
    let best = -1;
    let bestD = maxDistance * maxDistance;
    for (let i = 0; i < anchors.length; i += 1) {
      const d = (anchors[i]!.x - x) ** 2 + (anchors[i]!.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  const buckets = new Map<
    number,
    {
      mass: string[];
      tree: string[];
      treeTop: string[];
      face: string[];
      faceDark: string[];
      ySum: number;
      n: number;
    }
  >();

  const bucket = (index: number) => {
    let b = buckets.get(index);
    if (!b) {
      b = { mass: [], tree: [], treeTop: [], face: [], faceDark: [], ySum: 0, n: 0 };
      buckets.set(index, b);
    }
    return b;
  };

  const add = (index: number, y: number) => {
    const b = bucket(index);
    b.ySum += y / VIEW.height;
    b.n += 1;
    return b;
  };

  for (const m of MOUNTAINS) {
    const b = add(nearest(m.x, m.y), m.y);
    const half = m.w / 2;
    b.face.push(
      `M ${n(m.x - half)} ${n(m.y)} L ${n(m.x)} ${n(m.y - m.h)} L ${n(m.x + half)} ${n(m.y)} Z`,
    );
    b.faceDark.push(
      `M ${n(m.x)} ${n(m.y - m.h)} L ${n(m.x + half)} ${n(m.y)} L ${n(m.x)} ${n(m.y)} Z`,
    );
  }

  /* 섬 나무도 같은 규칙으로 물든다 — 겨울에 섬만 초록으로 남지 않게 */
  for (const t of ISLAND_TREES) {
    const b = add(nearest(t.x, t.y), t.y);
    b.tree.push(circlePath(t.x, t.y, t.s));
    b.treeTop.push(circlePath(t.x - t.s * 0.3, t.y - t.s * 0.32, t.s * 0.6));
  }

  for (const g of GROVES) {
    const b = add(nearest(g.x, g.y), g.y);
    b.mass.push(g.mass);
    for (const t of g.trees) {
      b.tree.push(circlePath(t.x, t.y, t.s));
      b.treeTop.push(circlePath(t.x - t.s * 0.3, t.y - t.s * 0.32, t.s * 0.6));
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([anchorIndex, b]) => ({
      id: `a${anchorIndex}`,
      anchorIndex,
      northSouth: b.n > 0 ? b.ySum / b.n : 0.5,
      mass: b.mass.join(' '),
      tree: b.tree.join(' '),
      treeTop: b.treeTop.join(' '),
      face: b.face.join(' '),
      faceDark: b.faceDark.join(' '),
    }));
}
