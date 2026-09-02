import mask from './land-mask.json';
import { MAP_BOUNDS, type MapPosition } from './projection';

/**
 * 육지 판정.
 *
 * base map 을 굽는 scripts/generate-base-map.mjs 가 같은 해안선에서
 * land-mask.json 을 함께 내보내므로, 지도 그림과 판정이 항상 같은 선을 쓴다.
 *
 * 지도에서 겹친 sprite 를 밀어낼 때 바다 생물이 육지로 올라가지 않게 하는 데 쓴다.
 */

/** 지도 원본 비율. y 거리를 x 단위로 환산할 때 쓴다. */
export const MAP_ASPECT = MAP_BOUNDS.viewHeight / MAP_BOUNDS.viewWidth;

type Ring = readonly (readonly [number, number])[];

const RINGS: Ring[] = [
  mask.mainland as unknown as Ring,
  mask.jeju as unknown as Ring,
  mask.ulleung as unknown as Ring,
];

function inRing({ x, y }: MapPosition, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function isOnLand(point: MapPosition): boolean {
  return RINGS.some((ring) => inRing(point, ring));
}

/**
 * from(바다)에서 to 로 가는 선분 위에서, 육지에 닿지 않는 가장 먼 지점.
 * to 가 바다면 to 를 그대로 돌려준다.
 */
export function lastPointAtSea(from: MapPosition, to: MapPosition): MapPosition {
  if (!isOnLand(to)) return to;

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2;
    const p = { x: from.x + (to.x - from.x) * mid, y: from.y + (to.y - from.y) * mid };
    if (isOnLand(p)) hi = mid;
    else lo = mid;
  }
  return { x: from.x + (to.x - from.x) * lo, y: from.y + (to.y - from.y) * lo };
}

const SEARCH_DIRECTIONS = 24;
const SEARCH_STEP = 0.005;
const SEARCH_LIMIT = 0.3;

/**
 * point 가 육지면, 육지를 벗어나는 가장 가까운 바다 지점.
 *
 * lastPointAtSea 와 달리 해안선을 따라 옆으로 미끄러질 수 있다.
 * 좁은 연안에서 sprite 를 벌릴 때 곧장 제자리로 되돌아오지 않게 하려면
 * 이쪽이 필요하다. 같은 거리의 후보가 여럿이면 toward 에 가까운 쪽을 쓴다.
 */
export function nearestSeaPoint(point: MapPosition, toward: MapPosition = point): MapPosition {
  if (!isOnLand(point)) return point;

  for (let r = SEARCH_STEP; r <= SEARCH_LIMIT; r += SEARCH_STEP) {
    let best: MapPosition | null = null;
    let bestCost = Infinity;

    for (let k = 0; k < SEARCH_DIRECTIONS; k += 1) {
      const angle = (k / SEARCH_DIRECTIONS) * Math.PI * 2;
      const candidate = {
        x: point.x + Math.cos(angle) * r,
        y: point.y + (Math.sin(angle) * r) / MAP_ASPECT,
      };
      if (candidate.x < 0.02 || candidate.x > 0.98) continue;
      if (candidate.y < 0.02 || candidate.y > 0.98) continue;
      if (isOnLand(candidate)) continue;

      const cost = Math.hypot(
        candidate.x - toward.x,
        (candidate.y - toward.y) * MAP_ASPECT,
      );
      if (cost < bestCost) {
        bestCost = cost;
        best = candidate;
      }
    }

    if (best) return best;
  }

  return lastPointAtSea(toward, point);
}
