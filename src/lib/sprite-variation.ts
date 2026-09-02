/**
 * 지도 위 sprite 의 방향과 기울기를 어긋나게 한다.
 *
 * 모든 물고기가 같은 쪽을 보고 반듯하게 놓이면 도감처럼 보인다.
 * 살아 있는 바다처럼 보이려면 제각기 다른 방향이어야 한다.
 *
 * 키에서 값을 뽑으므로 같은 sprite 는 항상 같은 모습이다 —
 * 리렌더마다 흔들리지 않고, 재생 중에도 튀지 않는다.
 */

function hash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** -16 ~ +16도 사이의 다섯 단계 */
const TILTS = [-16, -9, 0, 9, 16];

export interface SpriteVariation {
  /** 좌우 반전 여부 */
  flip: boolean;
  /** 기울기 (deg) */
  tilt: number;
}

export function spriteVariation(key: string): SpriteVariation {
  const h = hash(key);
  return {
    flip: (h & 1) === 1,
    tilt: TILTS[(h >>> 3) % TILTS.length]!,
  };
}

/** CSS transform 문자열 */
export function variationTransform({ flip, tilt }: SpriteVariation): string {
  return `rotate(${tilt}deg)${flip ? ' scaleX(-1)' : ''}`;
}
