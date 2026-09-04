import { BIRD_STATE_RANK, type BirdPresenceState } from './bird';
import type { MapPosition } from './projection';

/* ────────────────────────────────────────────────────────────
 * 전국 화면에 몇 마리를 올릴 것인가.
 *
 * 활성 occurrence 를 전부 그리려고 하지 않는다. 지도를 새로 채우면
 * 읽히는 것이 "이 시기에 이 지역에서 만날 수 있다" 가 아니라
 * "새가 많다" 가 된다. 빈 공간은 정상이고, 예쁘게 채우려고 새를
 * 전국에 균등 배치하지 않는다.
 *
 * 여기서 잘려 나간 것은 **표시되지 않은 것**이지 OFF 가 아니다.
 *   not rendered because of display budget != OFF
 * 그래서 잘린 것도 버리지 않고 hidden 으로 함께 돌려준다.
 * ──────────────────────────────────────────────────────────── */

/** 전국 기본 화면의 상한 */
export const BIRD_DENSITY_BUDGET = { mobile: 10, desktop: 14 } as const;
export type BirdViewport = keyof typeof BIRD_DENSITY_BUDGET;

/** 전국 기본 화면에서 같은 종이 차지할 수 있는 지역 수 */
export const BIRD_MAX_REGIONS_PER_SPECIES = 2;

export interface BirdDisplayCandidate {
  /** 표시 단위의 고유 키. 같은 값이면 같은 대상이다. */
  key: string;
  speciesId: string;
  regionId: string;
  state: BirdPresenceState;
  /** 지리적 분산을 판단하는 데만 쓴다 */
  position: MapPosition;
}

export interface BirdDisplaySelection<T extends BirdDisplayCandidate> {
  visible: T[];
  /** 예산·중복 제한으로 이번 화면에 올리지 않은 것. 상태는 그대로다. */
  hidden: T[];
}

const Y_PER_X = 850 / 1300;

function distance(a: MapPosition, b: MapPosition): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) / Y_PER_X);
}

/**
 * 표시 우선순위.
 *   PEAK → GOOD → STARTING → ENDING
 * 같은 상태끼리는 key 순으로 자른다 — 같은 입력이면 같은 화면이어야 한다.
 */
function byPriority(a: BirdDisplayCandidate, b: BirdDisplayCandidate): number {
  const rank = BIRD_STATE_RANK[a.state] - BIRD_STATE_RANK[b.state];
  if (rank !== 0) return rank;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/**
 * 같은 종을 최대 두 지역까지만 남긴다.
 *
 * 세 곳 이상에서 활성이면 (1) 상태가 강한 지역을 먼저 잡고
 * (2) 그다음은 이미 잡은 지역에서 가장 멀리 떨어진 지역을 잡는다.
 * 나란히 붙은 두 지역을 고르면 전국 화면에서 한 덩어리로 읽히기 때문이다.
 */
function capPerSpecies<T extends BirdDisplayCandidate>(ranked: T[], limit: number): T[] {
  const bySpecies = new Map<string, T[]>();
  for (const candidate of ranked) {
    const list = bySpecies.get(candidate.speciesId) ?? [];
    list.push(candidate);
    bySpecies.set(candidate.speciesId, list);
  }

  const keptKeys = new Set<string>();

  for (const list of bySpecies.values()) {
    const picked: T[] = [];
    const rest = [...list];

    while (picked.length < limit && rest.length > 0) {
      let index = 0;
      if (picked.length > 0) {
        // 이미 잡은 것들에서 가장 멀리 떨어진 후보. 같은 거리면 우선순위 순서가 이긴다.
        let bestGap = -1;
        rest.forEach((candidate, i) => {
          const gap = Math.min(...picked.map((p) => distance(p.position, candidate.position)));
          if (gap > bestGap + 1e-9) {
            bestGap = gap;
            index = i;
          }
        });
      }
      picked.push(rest.splice(index, 1)[0]!);
    }

    for (const candidate of picked) keptKeys.add(candidate.key);
  }

  return ranked.filter((c) => keptKeys.has(c.key));
}

/**
 * 전국 기본 화면에 올릴 것을 고른다.
 *
 * OFF 와 판단 불가(null)는 애초에 후보로 들어오지 않는다 — 부르는 쪽이 거른다.
 * 여기서 하는 일은 '무엇을 이번 화면에 올릴 것인가' 하나뿐이다.
 */
export function selectBirdDisplay<T extends BirdDisplayCandidate>(
  candidates: T[],
  options: { viewport: BirdViewport; maxRegionsPerSpecies?: number },
): BirdDisplaySelection<T> {
  const budget = BIRD_DENSITY_BUDGET[options.viewport];
  const perSpecies = options.maxRegionsPerSpecies ?? BIRD_MAX_REGIONS_PER_SPECIES;

  const ranked = [...candidates].sort(byPriority);
  const kept = capPerSpecies(ranked, perSpecies);

  /*
   * 한 지역이 화면을 독차지하지 않게 한 번 훑고, 남는 자리를 두 번째 훑기로 채운다.
   * 지역 상한을 처음부터 풀어 두면 절정이 몰린 지역 하나가 예산을 다 쓴다.
   */
  const regions = new Set(kept.map((c) => c.regionId)).size || 1;
  const regionCap = Math.max(2, Math.ceil(budget / regions));

  const visible: T[] = [];
  const overflow: T[] = [];
  const used = new Map<string, number>();

  for (const candidate of kept) {
    const count = used.get(candidate.regionId) ?? 0;
    if (count >= regionCap) {
      overflow.push(candidate);
      continue;
    }
    used.set(candidate.regionId, count + 1);
    visible.push(candidate);
  }

  for (const candidate of overflow) {
    if (visible.length >= budget) break;
    visible.push(candidate);
  }

  const chosen = visible.slice(0, budget);
  const chosenKeys = new Set(chosen.map((c) => c.key));

  return {
    visible: chosen,
    hidden: ranked.filter((c) => !chosenKeys.has(c.key)),
  };
}
