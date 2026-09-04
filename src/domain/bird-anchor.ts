import type { MapPosition } from './projection';

/* ────────────────────────────────────────────────────────────
 * 철새의 자리는 고정이다.
 *
 * 같은 speciesId × regionId × anchorVersion 은 날짜가 아무리 바뀌어도
 * 같은 좌표를 돌려준다. 시간에 따라 변하는 것은 자리가 아니라 상태다.
 *
 * 겹침을 푼다고 자리를 흔들지 않는다. 지도 위에서 새가 움직이면
 * 사용자는 그것을 '이동' 으로 읽고, 그것은 이 모델이 말하지 않는 것이다.
 * 그래서 이 함수에는 date 인자가 아예 없다.
 * ──────────────────────────────────────────────────────────── */

export interface BirdRegionAnchor {
  regionId: string;
  label: string;
  /** 지역의 대표 자리. 0~1 정규 좌표. */
  position: MapPosition;
}

export interface BirdAnchorKey {
  speciesId: string;
  regionId: string;
  anchorVersion: string;
}

/**
 * 지역 안에서 종끼리 벌리는 폭 (지도 가로폭 대비).
 *
 * 이 값이 곧 같은 지역 두 마리 사이의 최소 거리다 — 여섯 칸 고리에서
 * 이웃 간격은 반지름과 같기 때문이다. 전국 화면에서 sprite 는 32~42px 이고
 * 지도 가로폭은 모바일에서 320px 안팎이라, 0.055 는 대략 18px 이다.
 * 그림 하나가 다른 하나를 통째로 덮지 않을 만큼이면 된다 — 더 벌리면
 * 지역을 벗어나 '이 지역에 머문다' 가 안 읽힌다.
 */
export const ANCHOR_SPREAD = 0.055;

/**
 * 한 지역의 자리는 가운데 하나 + 여섯 칸 고리다.
 *
 * 여섯 칸 고리에서는 이웃 간격도, 가운데까지의 거리도 모두 반지름과 같다 —
 * 최소 간격과 최대 이탈이 같은 값 하나로 묶이므로, 벌리려다 지역을 벗어나는
 * 일이 생기지 않는다. 지금 fixture 는 한 지역에 많아야 여섯 종이라 여기서 끝난다.
 */
const RING_SLOTS = 6;
const PRIMARY_SLOTS = 1 + RING_SLOTS;
/** 일곱 자리가 다 차면 그때만 바깥 고리를 쓴다 */
const SLOTS = PRIMARY_SLOTS + RING_SLOTS;
const OUTER_RATIO = 1.9;

/**
 * 정규 좌표는 가로 1 과 세로 1 의 실제 길이가 다르다 (지도는 850 : 1300).
 * 가로 단위 거리를 세로 정규값으로 옮길 때 이 비율을 곱한다 —
 * 그러지 않으면 원으로 흩은 것이 화면에서는 세로로 늘어난 타원이 된다.
 */
const Y_PER_X = 850 / 1300;

/** FNV-1a. 짧고 결정적이면 충분하다 — 암호용이 아니다. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function anchorSeed(key: BirdAnchorKey): number {
  return hash(`${key.anchorVersion}|${key.regionId}|${key.speciesId}`);
}

export interface AnchorOptions {
  /**
   * 이 자리를 써도 되는가 (예: 육지 판정).
   * 거부되면 반지름을 결정적으로 줄여 다시 시도하고, 끝내 안 되면 지역 중심을 쓴다.
   * 날짜가 아니라 지형이 정하는 값이라 결과는 여전히 날짜와 무관하다.
   */
  accept?: (position: MapPosition) => boolean;
  spread?: number;
}

/** 지역마다 고리를 조금씩 돌려 둔다 — 다섯 지역이 같은 별 모양으로 찍히지 않게 */
function regionPhase(regionId: string): number {
  return ((hash(regionId) % 1_000) / 1_000) * Math.PI * 2;
}

/** slot 번호 → 지역 중심에서의 좌표. 0 은 중심이다. */
function slotPosition(
  region: BirdRegionAnchor,
  slot: number,
  spread: number,
): MapPosition {
  if (slot === 0) return { ...region.position };

  const outer = slot >= PRIMARY_SLOTS;
  const index = (slot - 1) % RING_SLOTS;
  const radius = outer ? spread * OUTER_RATIO : spread;
  // 바깥 고리는 반 칸 돌려 안쪽 고리와 정면으로 겹치지 않게 한다
  const angle =
    regionPhase(region.regionId) +
    ((index + (outer ? 0.5 : 0)) / RING_SLOTS) * Math.PI * 2;

  return {
    x: region.position.x + Math.cos(angle) * radius,
    y: region.position.y + Math.sin(angle) * radius * Y_PER_X,
  };
}

/**
 * 종 × 지역의 고정 좌표 (한 건).
 *
 * 지역 안의 자리는 고리 위의 칸이다. 칸 번호는 seed 로 정하므로
 * 언제 불러도 같은 칸이고, 이웃 칸과의 거리가 곧 최소 간격이 된다.
 * 무작위 반지름을 쓰면 두 종이 거의 같은 점에 겹칠 수 있어서 그러지 않는다.
 *
 * 여기에 date 인자가 없다는 것이 이 모듈의 계약이다.
 */
export function birdDisplayAnchor(
  key: BirdAnchorKey,
  region: BirdRegionAnchor,
  options: AnchorOptions = {},
): MapPosition {
  return anchorAtSlot(anchorSeed(key) % PRIMARY_SLOTS, region, options);
}

function anchorAtSlot(
  slot: number,
  region: BirdRegionAnchor,
  options: AnchorOptions,
): MapPosition {
  const spread = options.spread ?? ANCHOR_SPREAD;
  const accept = options.accept;

  // 자리가 육지를 벗어나면 각도는 두고 반지름만 줄인다. 순서가 고정이라 결과도 고정이다.
  for (let step = 0; step < 4; step += 1) {
    const candidate = slotPosition(region, slot, spread / 2 ** step);
    if (!accept || accept(candidate)) return candidate;
  }

  return { ...region.position };
}

export interface AnchorAssignment {
  speciesId: string;
  regionId: string;
  anchorVersion: string;
}

export function anchorKeyOf(key: AnchorAssignment): string {
  return `${key.anchorVersion}|${key.regionId}|${key.speciesId}`;
}

/**
 * 한 지역에 여러 종이 들어올 때의 자리 배정.
 *
 * 칸이 겹치면 다음 빈 칸으로 결정적으로 밀어낸다. 순서를 seed 로 고정하므로
 * 날짜 · 필터 · 화면 크기 어느 것도 이 결과를 바꾸지 못한다.
 * 지금 지도에 무엇이 그려지는가와 무관하게 **fixture 전체**를 놓고 한 번 배정한다 —
 * 그래야 날짜가 바뀌어 이웃이 사라져도 남은 새가 제자리를 지킨다.
 */
export function assignBirdAnchors(
  keys: readonly AnchorAssignment[],
  regions: readonly BirdRegionAnchor[],
  options: AnchorOptions = {},
): Map<string, MapPosition> {
  const regionById = new Map(regions.map((r) => [r.regionId, r]));
  const byRegion = new Map<string, AnchorAssignment[]>();

  for (const key of keys) {
    const list = byRegion.get(key.regionId) ?? [];
    list.push(key);
    byRegion.set(key.regionId, list);
  }

  const out = new Map<string, MapPosition>();

  for (const [regionId, list] of byRegion) {
    const region = regionById.get(regionId);
    if (!region) continue;

    const ordered = [...list].sort((a, b) => {
      const seedDiff = anchorSeed(a) - anchorSeed(b);
      if (seedDiff !== 0) return seedDiff;
      return a.speciesId < b.speciesId ? -1 : a.speciesId > b.speciesId ? 1 : 0;
    });

    const taken = new Set<number>();
    for (const key of ordered) {
      let slot = anchorSeed(key) % PRIMARY_SLOTS;
      for (let probe = 0; probe < SLOTS && taken.has(slot); probe += 1) {
        slot = (slot + 1) % SLOTS;
      }
      taken.add(slot);
      out.set(anchorKeyOf(key), anchorAtSlot(slot, region, options));
    }
  }

  return out;
}
