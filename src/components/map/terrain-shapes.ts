import terrainData from '@/domain/terrain.json';
import type { MapPosition } from '@/domain/projection';

/* ────────────────────────────────────────────────────────────
 * base map 이 그린 산과 나무의 자리.
 *
 * 계절 레이어(단풍 · 꽃)는 지도를 다시 굽지 않고 **바로 그 형태 위에**
 * 같은 좌표로 덧그린다. 그 좌표를 여기서 한 번만 읽고,
 * 권역에 나눠 붙이는 일도 여기서 한다 — 단풍은 단풍 권역으로,
 * 꽃은 꽃 권역으로 나누되 나누는 방법은 같기 때문이다.
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
  /** 꽃 무리를 얹을 자리 (숲 중심 · 산자락) */
  anchors: { x: number; y: number; r: number }[];
}

/**
 * 지형을 권역에 나눠 붙이고, 묶음마다 하나의 path 로 합친다.
 *
 * 권역 경계를 부드럽게 섞지 않는다. 산과 나무는 이어진 면이 아니라
 * 떨어진 형태들이라 경계에 이음매가 생기지 않고,
 * 대신 산 하나가 정확히 한 색을 가져서 색의 위치가 또렷하게 읽힌다.
 *
 * microDays 는 한 권역 안에서 산마다 며칠씩 어긋나게 두는 값이다.
 * 전부 같은 날 같은 색이면 지역이 통째로 칠해진 것처럼 보인다.
 * 다만 권역 사이 간격보다 훨씬 작아야 흐름이 잡음에 묻히지 않는다.
 */
export function buildTerrainShapes(
  anchorPositions: MapPosition[],
  microDays: number[] = [0],
): TerrainShapes[] {
  const anchors = anchorPositions.map((a) => ({ x: a.x * VIEW.width, y: a.y * VIEW.height }));
  if (anchors.length === 0) return [];

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
  const micro = (x: number, y: number) => Math.abs(Math.round(x * 7 + y * 13)) % microDays.length;

  const parts = anchors.flatMap((_, regionIndex) =>
    microDays.map((shiftDays, bucket) => ({
      key: `${regionIndex}:${bucket}`,
      regionIndex,
      shiftDays,
      mass: [] as string[],
      tree: [] as string[],
      treeTop: [] as string[],
      face: [] as string[],
      faceDark: [] as string[],
      anchors: [] as { x: number; y: number; r: number }[],
    })),
  );
  const at = (regionIndex: number, bucket: number) => parts[regionIndex * microDays.length + bucket];

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
    // 꽃은 산꼭대기가 아니라 산자락에 핀다
    bucket.anchors.push({ x: m.x, y: m.y - m.h * 0.1, r: half * 0.9 });
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
    bucket.anchors.push({ x: g.x, y: g.y, r: 16 });
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
    anchors: p.anchors,
  }));
}
