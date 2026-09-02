import { type DateKey } from '@/domain/date';
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

/** 산이 물드는 정도. 지도에서 산 색을 정하는 값이다. */
export const FOLIAGE_STATE_INTENSITY: Record<FoliageState, number> = {
  pre: 0,
  starting: 0.35,
  good: 0.7,
  peak: 1,
  ending: 0.55,
  ended: 0.18,
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
 * 아직 시작 전이거나 이미 끝난 곳도 함께 돌려준다 —
 * 지도에서 산 색을 정하려면 "아직 초록" 도 알아야 한다.
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
    // 그 명소를 대표하는 것은 지금 가장 앞서 있는 수종이다
    const lead = entries.reduce((a, b) =>
      STATE_ORDER[foliageStateOf(b.status)] > STATE_ORDER[foliageStateOf(a.status)] ? b : a,
    );

    spots.push({
      location,
      position: locationPosition(location),
      entity: lead.entity,
      state: foliageStateOf(lead.status),
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
