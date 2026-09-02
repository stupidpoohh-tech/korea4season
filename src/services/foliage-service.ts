import { getYear, type DateKey } from '@/domain/date';
import { FOLIAGE_REGIONS, REGION_BY_LOCATION } from '@/domain/foliage-regions';
import { locationPosition, resolveAll } from './nature-service';
import type { MapPosition } from '@/domain/projection';
import type { Location, NatureEntity, OccurrenceStatus, ResolvedOccurrence } from '@/domain/types';

/* ────────────────────────────────────────────────────────────
 * 단풍.
 *
 * 새 엔진을 만들지 않는다 — 시기 해석은 바다와 같은 occurrence 엔진이 한다.
 * 여기서 하는 일은 하나다: 같은 명소에 걸린 여러 수종(단풍나무 · 은행 · 억새)을
 * **명소 하나**로 묶어, 그 산이 지금 어떤 상태인지 한 값으로 말한다.
 *
 * 지도에 찍는 단위가 어종 × 해역인 바다와 달리, 단풍은 산 하나가 단위다.
 * "설악산이 지금 절정" 이 사용자가 묻는 것이지 "설악산의 단풍나무" 가 아니다.
 * ──────────────────────────────────────────────────────────── */

/** 단풍 상태. occurrence status 를 단풍의 말로 옮긴 것이다. */
export const FOLIAGE_STATES = ['pre', 'starting', 'good', 'peak', 'ending', 'ended'] as const;
export type FoliageState = (typeof FOLIAGE_STATES)[number];

export const FOLIAGE_STATE_LABEL: Record<FoliageState, string> = {
  pre: '아직',
  starting: '시작 중',
  good: '좋음',
  peak: '절정',
  ending: '끝물',
  ended: '끝남',
};

/**
 * 상태 하나가 지도에서 갖는 색.
 *
 * 단풍의 진행은 '얼마나 많은가'가 아니라 '무슨 색인가'로 읽혀야 한다.
 * 그래서 밝기 한 축(intensity)이 아니라 상태마다 색을 따로 정한다 —
 * 끝물(갈색 주황)과 시작(연둣빛 노랑)은 세기가 비슷해도 전혀 다른 때다.
 *
 * pre 는 base map 이 이미 그려 둔 초록 그대로다. 덧칠해도 티가 나지 않아야
 * '아직 안 물든 곳'이 자연스럽게 원래 지도로 남는다.
 * 형광색과 순색 빨강(#FF0000)은 쓰지 않는다 — 지도 전체의 톤이 깨진다.
 */
export interface FoliageColor {
  /** 산 앞면 */
  face: string;
  /** 산 그늘면 */
  faceDark: string;
  /** 숲 덩어리 (옅게 깔리는 바탕) */
  mass: string;
  /** 나무 몸통 */
  tree: string;
  /** 나무 윗면 (빛 받는 쪽) */
  treeTop: string;
}

export const FOLIAGE_STATE_COLOR: Record<FoliageState, FoliageColor> = {
  pre: { face: '#5cb968', faceDark: '#3b9349', mass: '#3f9e46', tree: '#3f9e46', treeTop: '#5cb84f' },
  starting: { face: '#a9c552', faceDark: '#7d9c35', mass: '#7e9b34', tree: '#7e9b34', treeTop: '#a9c552' },
  good: { face: '#e2bb43', faceDark: '#b78e28', mass: '#bf942c', tree: '#bf942c', treeTop: '#e2bb43' },
  peak: { face: '#d9722f', faceDark: '#a94a20', mass: '#b85526', tree: '#b85526', treeTop: '#d9722f' },
  ending: { face: '#b0713c', faceDark: '#834d26', mass: '#92592c', tree: '#92592c', treeTop: '#b0713c' },
  ended: { face: '#927d5e', faceDark: '#6c5943', mass: '#77644a', tree: '#77644a', treeTop: '#927d5e' },
};

const STATE_BY_STATUS: Record<OccurrenceStatus, FoliageState> = {
  upcoming: 'pre',
  starting: 'starting',
  active: 'good',
  peak: 'peak',
  ending: 'ending',
  ended: 'ended',
};

export function foliageStateOf(status: OccurrenceStatus): FoliageState {
  return STATE_BY_STATUS[status];
}

/**
 * 올해 단풍이 이미 지나간 뒤인가.
 *
 * occurrence 엔진은 끝난 지 2주가 지나면 '다음 주기의 upcoming' 으로 넘긴다
 * — "다음 시즌은 언제" 를 말해 주기 위한 것이라 목록에서는 맞다.
 * 그런데 지도에서는 그 값이 '아직 초록' 이 되어, 11월 말 설악산이 다시
 * 새잎이 난 것처럼 보인다. 넘어간 창이 내년 것이면 올해는 끝난 것으로 읽는다.
 */
function alreadyPassed(status: OccurrenceStatus, ref: DateKey, window: { start: Date }): boolean {
  return status === 'upcoming' && window.start.getUTCFullYear() > getYear(ref);
}

const STATE_ORDER: Record<FoliageState, number> = {
  ended: 0,
  pre: 1,
  ending: 2,
  starting: 3,
  good: 4,
  peak: 5,
};

/** 지도에 올릴 만한 상태인가. 아직이거나 끝난 산은 물들지 않는다. */
export function isColoring(state: FoliageState): boolean {
  return state !== 'pre' && state !== 'ended';
}

/**
 * 산의 색을 바꾸는 것.
 *
 * 억새는 가을 능선에서 은빛으로 흔들리지만 산을 붉게 만들지는 않는다.
 * 그런데 억새 절정(10월 초)은 단풍보다 이르고 남쪽 지리산·덕유산에 걸려 있어서,
 * 이것까지 산 색에 넣으면 **남쪽이 북쪽보다 먼저 물든 것처럼** 보인다.
 * 단풍 전선이 거꾸로 읽히므로 잎이 물드는 나무만 산 색을 정한다.
 *
 * 억새는 사라지지 않는다 — 그 명소의 entries 에 남아 상세에서 함께 말한다.
 */
const TERRAIN_PAINTERS = new Set(['maple', 'ginkgo']);

export interface FoliageSpot {
  /** 명소 = 지도 위 단위 */
  location: Location;
  position: MapPosition;
  /** 그 명소에서 지금 가장 앞서 있는 수종 */
  entity: NatureEntity;
  state: FoliageState;
  status: OccurrenceStatus;
  /** 첫 단풍 · 절정 구간 */
  window: { start: Date; end: Date };
  peakWindow?: { start: Date; end: Date };
  progress: number;
  daysToNextChange?: number;
  nextChangeLabel?: string;
  /** 같은 명소에 걸린 나머지 (은행 · 억새 등) */
  entries: ResolvedOccurrence[];
}

/**
 * 선택 날짜 기준 단풍 명소 목록.
 *
 * 아직 시작 전이거나 이미 끝난 곳도 함께 돌려준다 —
 * 지도에서 산 색을 정하려면 "아직 초록" 도 알아야 한다.
 * 억새만 걸린 명소는 빠진다 (TERRAIN_PAINTERS 주석 참고).
 */
export function buildFoliageSpots(date: DateKey): FoliageSpot[] {
  const byLocation = new Map<string, { location: Location; entries: ResolvedOccurrence[] }>();

  for (const resolved of resolveAll({ date, categories: ['foliage'] })) {
    for (const location of resolved.locations) {
      const bucket = byLocation.get(location.id) ?? { location, entries: [] };
      bucket.entries.push(resolved);
      byLocation.set(location.id, bucket);
    }
  }

  const spots: FoliageSpot[] = [];

  for (const { location, entries } of byLocation.values()) {
    // 그 명소를 대표하는 것은 지금 가장 앞서 있는 '잎이 물드는' 수종이다
    const painters = entries.filter((entry) => TERRAIN_PAINTERS.has(entry.entity.slug));
    if (painters.length === 0) continue;

    const lead = painters.reduce((a, b) =>
      STATE_ORDER[foliageStateOf(b.status)] > STATE_ORDER[foliageStateOf(a.status)] ? b : a,
    );

    const passed = alreadyPassed(lead.status, date, lead.window);

    spots.push({
      location,
      position: locationPosition(location),
      entity: lead.entity,
      state: passed ? 'ended' : foliageStateOf(lead.status),
      status: lead.status,
      window: lead.window,
      peakWindow: lead.peakWindow,
      progress: lead.progress,
      daysToNextChange: lead.daysToNextChange,
      nextChangeLabel: lead.nextChangeLabel,
      entries,
    });
  }

  // 북쪽이 먼저 물든다 — 위도 순으로 두면 목록이 곧 단풍 전선이 된다
  return spots.sort((a, b) => b.location.geo.lat - a.location.geo.lat);
}

export interface FoliageCounts {
  /** 지금 물드는 중인 곳 */
  coloring: number;
  /** 전체 명소 수 */
  total: number;
  byState: Record<FoliageState, number>;
}

export function countFoliage(date: DateKey): FoliageCounts {
  const spots = buildFoliageSpots(date);
  const byState = Object.fromEntries(FOLIAGE_STATES.map((s) => [s, 0])) as Record<
    FoliageState,
    number
  >;
  for (const spot of spots) byState[spot.state] += 1;

  return {
    coloring: spots.filter((s) => isColoring(s.state)).length,
    total: spots.length,
    byState,
  };
}

/**
 * 이번 주 단풍 추천.
 * 절정 우선, 그다음 좋음. 거리 · 날씨 · 교통은 이번 단계에서 보지 않는다.
 */
export function getFoliagePicks(date: DateKey, limit = 6): FoliageSpot[] {
  return buildFoliageSpots(date)
    .filter((spot) => spot.state === 'peak' || spot.state === 'good')
    .sort(
      (a, b) =>
        STATE_ORDER[b.state] - STATE_ORDER[a.state] ||
        b.location.geo.lat - a.location.geo.lat,
    )
    .slice(0, limit);
}

/* ────────────────────────────────────────────────────────────
 * 권역 — 지도의 색을 정하는 단위.
 *
 * 명소는 12곳이지만 지도에서 색이 바뀌는 덩어리는 7개다.
 * 산 하나하나에 데이터가 있는 것이 아니므로, 지도의 산과 숲은
 * '가장 가까운 권역'의 색을 입는다. 그래서 시간이 흐르면
 * 마커가 늘어나는 것이 아니라 **색의 띠가 남쪽으로 내려간다.**
 * ──────────────────────────────────────────────────────────── */

export interface FoliageRegion {
  id: string;
  label: string;
  /** 지도에서 이 권역의 중심. 산·숲을 어느 권역에 붙일지 이 점으로 정한다. */
  anchor: MapPosition;
  /** 그 권역에서 지금 가장 앞선 상태 — "여기 가면 절정인 산이 있다" */
  state: FoliageState;
  /** 상태를 대표하는 명소 (그 권역에서 가장 앞선 곳) */
  lead: FoliageSpot;
  spots: FoliageSpot[];
}

export function buildFoliageRegions(date: DateKey): FoliageRegion[] {
  const spots = buildFoliageSpots(date);
  const byRegion = new Map<string, FoliageSpot[]>();

  for (const spot of spots) {
    const regionId = REGION_BY_LOCATION[spot.location.slug];
    if (!regionId) continue;
    const bucket = byRegion.get(regionId) ?? [];
    bucket.push(spot);
    byRegion.set(regionId, bucket);
  }

  const regions: FoliageRegion[] = [];

  for (const config of FOLIAGE_REGIONS) {
    const group = byRegion.get(config.id);
    if (!group || group.length === 0) continue;

    const lead = group.reduce((a, b) => (STATE_ORDER[b.state] > STATE_ORDER[a.state] ? b : a));

    regions.push({
      id: config.id,
      label: config.label,
      anchor: {
        x: group.reduce((sum, s) => sum + s.position.x, 0) / group.length,
        y: group.reduce((sum, s) => sum + s.position.y, 0) / group.length,
      },
      state: lead.state,
      lead,
      spots: group,
    });
  }

  return regions;
}

/**
 * 헤더에 쓰는 한 줄.
 *
 * "지도에 9곳 표시 중" 은 마커를 세는 말이라 단풍의 진행을 말해 주지 못한다.
 * 대신 지금 어떤 상태가 몇 곳인지를 말한다 — 이 문장이 곧 전선의 위치다.
 */
/**
 * 헤더 첫 줄. 지금 단풍이 어디까지 왔는지를 한마디로 말한다.
 * '몇 곳이 표시 중' 이 아니라 '지금 무엇이 일어나고 있는가' 다.
 */
export function foliageHeadline(counts: FoliageCounts): string {
  for (const state of ['peak', 'good', 'starting', 'ending'] as const) {
    if (counts.byState[state] > 0) {
      return `${FOLIAGE_STATE_LABEL[state]} ${counts.byState[state]}곳`;
    }
  }
  return counts.byState.ended > 0 ? '올해 단풍은 끝났어요' : '아직 초록입니다';
}

export function summarizeFoliage(counts: FoliageCounts): string {
  const parts = (['peak', 'good', 'starting', 'ending'] as const)
    .filter((state) => counts.byState[state] > 0)
    .map((state) => `${FOLIAGE_STATE_LABEL[state]} ${counts.byState[state]}곳`);

  if (parts.length === 0) return '아직 물든 곳이 없습니다';
  return parts.join(' · ');
}
