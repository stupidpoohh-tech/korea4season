import terrainData from '@/domain/terrain.json';
import type { MapPosition } from '@/domain/projection';

/* ────────────────────────────────────────────────────────────
 * 꽃이 필 자리.
 *
 * 꽃을 지형 요소마다 하나씩 얹으면 103곳이 되어 카펫이 된다.
 * 그러면 사용자가 보는 것은 개화의 위치가 아니라 무늬다.
 *
 * 그래서 숲과 산자락에서 **서로 충분히 떨어진 자리만** 골라 군집으로 둔다.
 * 이 목록은 terrain.json 하나에서 나오므로 날짜 · 재생 여부 · 데이터 변화와
 * 무관하게 언제나 같다. 날짜가 바꾸는 것은 '어느 군집에 무엇이 얼마나
 * 피었는가' 이지 '군집이 어디 있는가' 가 아니다.
 * ──────────────────────────────────────────────────────────── */

const VIEW = terrainData.view;

/** 군집끼리 최소 이 거리는 떨어진다 (viewBox px). 값이 곧 전국 군집 수를 정한다. */
const MIN_GAP = 68;

export interface FlowerCluster {
  /** 자리에서 나오는 고정 id. 날짜가 바뀌어도 같은 자리는 같은 id 다. */
  id: string;
  /** viewBox 좌표 */
  x: number;
  y: number;
  /** 이 군집이 꽃을 흩을 반경 */
  r: number;
  /** 0~1 로 정규화한 자리 — 권역을 고를 때 쓴다 */
  at: MapPosition;
}

/** 자리에서 값을 뽑는다. 같은 자리는 언제나 같은 값이다. */
export function hashAt(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

interface Candidate extends FlowerCluster {
  /** 숲이 산자락보다 먼저다 — 꽃은 나무가 있는 곳에 핀다 */
  rank: number;
}

function candidates(): Candidate[] {
  const out: Candidate[] = [];

  for (const g of terrainData.groves) {
    out.push({
      id: `g${Math.round(g.x)}-${Math.round(g.y)}`,
      x: g.x,
      y: g.y,
      r: 15,
      at: { x: g.x / VIEW.width, y: g.y / VIEW.height },
      rank: 0,
    });
  }

  for (const m of terrainData.mountains) {
    // 꽃은 봉우리가 아니라 산자락에 핀다
    const y = m.y - m.h * 0.16;
    out.push({
      id: `m${Math.round(m.x)}-${Math.round(m.y)}`,
      x: m.x,
      y,
      r: Math.max(12, (m.w / 2) * 0.5),
      at: { x: m.x / VIEW.width, y: y / VIEW.height },
      rank: 1,
    });
  }

  return out;
}

/**
 * 겹치지 않는 군집만 남긴다.
 *
 * 고르는 순서를 배열 순서에 맡기지 않는다 — 자리에서 뽑은 값으로 정렬하므로
 * terrain.json 이 같은 한 결과가 같고, 지역 한쪽에 몰리지도 않는다.
 */
function pick(): FlowerCluster[] {
  const sorted = candidates().sort(
    (a, b) => a.rank - b.rank || hashAt(a.id) - hashAt(b.id),
  );

  const taken: FlowerCluster[] = [];
  for (const c of sorted) {
    const clash = taken.some((t) => (t.x - c.x) ** 2 + (t.y - c.y) ** 2 < MIN_GAP * MIN_GAP);
    if (clash) continue;
    taken.push({ id: c.id, x: c.x, y: c.y, r: c.r, at: c.at });
  }
  // 위에서 아래로 — 그리는 순서가 겹침 순서가 된다
  return taken.sort((a, b) => a.y - b.y);
}

let cache: FlowerCluster[] | null = null;

/** 전국 꽃 군집. 한 번 만들고 계속 쓴다. */
export function flowerClusters(): FlowerCluster[] {
  cache ??= pick();
  return cache;
}

/* ────────────────────────────────────────────────────────────
 * 군집 안에서 어디에 놓을 것인가.
 *
 * 그리기(JSX)에서 떼어 둔다. 자리 계산이 컴포넌트 안에 있으면 '날짜를 바꿔도
 * 자리가 그대로인가' 를 화면을 열지 않고는 확인할 수 없다.
 * ──────────────────────────────────────────────────────────── */

export interface Placement {
  x: number;
  y: number;
  /** 반지름 */
  r: number;
  /** 기울기 (rad) */
  rot: number;
}

/**
 * 종이 이 군집에서 앉는 자리.
 *
 * (군집 id + 종 slug)에서만 나온다 — 날짜도, 밀도도, 다른 종이 폈는지도
 * 이 값을 바꾸지 않는다. 배열 순번이나 날짜 난수를 쓰면 하루를 넘길 때마다
 * 같은 꽃이 다른 곳으로 튄다.
 */
export function speciesSlot(clusterId: string, slug: string): { angle: number; seed: number } {
  const seed = hashAt(`${clusterId}:${slug}`);
  return { angle: ((seed % 360) * Math.PI) / 180, seed };
}

/**
 * 꽃송이 자리.
 *
 * k 번째 송이의 자리는 k 에서만 나온다 — 송이 수가 2에서 1로 줄어도
 * 첫 송이는 제자리에 있다. 수를 밀도로 곱해 자리를 정하면 밀도가 바뀔 때마다
 * 남은 꽃까지 함께 움직인다.
 */
export function blossomSpots(
  cluster: FlowerCluster,
  slug: string,
  density: number,
  baseR: number,
  maxCount: number,
  minScale: number,
): Placement[] {
  const { angle, seed } = speciesSlot(cluster.id, slug);
  const count = Math.max(1, Math.round(density * maxCount));
  const scale = minScale + (1 - minScale) * density;
  const out: Placement[] = [];

  for (let k = 0; k < count; k += 1) {
    const a = angle + k * 2.39996; // 황금각 — 한 자리 안에서 고르게 흩어진다
    const spread = cluster.r * (0.1 + ((seed >>> (k + 3)) % 4) / 12) + k * baseR * 1.15;
    out.push({
      x: cluster.x + Math.cos(a) * spread,
      y: cluster.y + Math.sin(a) * spread * 0.72,
      r: baseR * scale * (0.82 + ((seed >>> (k + 1)) % 4) / 11),
      rot: a * 0.5 + ((seed >>> 9) % 100) / 100,
    });
  }
  return out;
}

/** 잎 자리. 꽃이 줄어든 만큼 난다 — 같은 군집에서 자리를 이어받는다. */
export function leafSpots(
  cluster: FlowerCluster,
  slug: string,
  density: number,
  baseR: number,
): Placement[] {
  const { angle } = speciesSlot(cluster.id, slug);
  const count = Math.round((1 - density) * 3);
  const out: Placement[] = [];

  for (let k = 0; k < count; k += 1) {
    const a = angle + Math.PI * 0.6 + k * 1.25;
    const spread = baseR * 0.95;
    out.push({
      x: cluster.x + Math.cos(a) * spread,
      y: cluster.y + Math.sin(a) * spread * 0.72,
      r: baseR * 0.72,
      rot: a,
    });
  }
  return out;
}

/** 군집을 권역에 나눠 붙인다. 권역 자리가 고정이므로 이 배정도 고정이다. */
export function clustersByRegion(
  anchors: { id: string; anchor: { x: number; y: number } }[],
): Map<string, FlowerCluster[]> {
  const byRegion = new Map<string, FlowerCluster[]>();

  for (const cluster of flowerClusters()) {
    let best = anchors[0];
    let bestD = Infinity;
    for (const a of anchors) {
      const d = (a.anchor.x - cluster.at.x) ** 2 + (a.anchor.y - cluster.at.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    if (!best) continue;
    const bucket = byRegion.get(best.id) ?? [];
    bucket.push(cluster);
    byRegion.set(best.id, bucket);
  }

  // 군집 안에서의 차례도 자리에서 뽑는다 — 퍼짐이 늘 같은 순서로 번진다
  for (const list of byRegion.values()) list.sort((a, b) => hashAt(a.id) - hashAt(b.id));
  return byRegion;
}
