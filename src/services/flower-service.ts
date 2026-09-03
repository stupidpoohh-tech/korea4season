import { type DateKey } from '@/domain/date';
import {
  FLOWER_REGIONS,
  FLOWER_REGION_BY_LOCATION,
  FLOWER_WAVE_SPECIES,
} from '@/domain/flower-regions';
import type { MapPosition } from '@/domain/projection';
import type { Location, NatureEntity, OccurrenceStatus, ResolvedOccurrence } from '@/domain/types';
import { locationPosition, resolveAll } from './nature-service';
import { WAVE_AT_PEAK_END, WAVE_AT_PEAK_START, alreadyPassed, waveOf } from './season-wave';

/* ────────────────────────────────────────────────────────────
 * 꽃.
 *
 * 단풍과 같은 뼈대를 쓰되 문법이 다르다.
 *
 *   단풍 — 산 자체의 색이 바뀐다. 북 → 남.
 *   꽃   — 산과 들에 작은 군집이 피어난다. 남 → 북.
 *
 * 그래서 꽃은 지형을 다시 칠하지 않는다. 대신 그 권역의 숲과 산자락에
 * 꽃송이 무리를 얹고, 개화가 강할수록 무리가 많아진다.
 * 지도에서 읽혀야 하는 것은 '몇 곳이 피었나' 가 아니라
 * **지금 개화의 중심이 어디까지 올라왔나** 다.
 * ──────────────────────────────────────────────────────────── */

export const FLOWER_STATES = ['pre', 'starting', 'good', 'peak', 'ending', 'ended'] as const;
export type FlowerState = (typeof FLOWER_STATES)[number];

export const FLOWER_STATE_LABEL: Record<FlowerState, string> = {
  pre: '봉오리',
  starting: '개화 시작',
  good: '개화 중',
  peak: '절정',
  ending: '끝물',
  ended: '졌어요',
};

/** 파동을 이끄는 세 종의 색. 꽃송이 무리를 이 색으로 찍는다. */
export const FLOWER_COLOR: Record<string, { petal: string; center: string }> = {
  forsythia: { petal: '#f2c018', center: '#ffe680' },
  azalea: { petal: '#dd5f9e', center: '#f6b3d2' },
  'king-cherry': { petal: '#f4b9cf', center: '#fff1f6' },
};

const DEFAULT_COLOR = { petal: '#e58bb4', center: '#ffe3ee' };

export function flowerColor(slug: string) {
  return FLOWER_COLOR[slug] ?? DEFAULT_COLOR;
}

const WAVE_SPECIES = new Set<string>(FLOWER_WAVE_SPECIES);

/** 파동 위치 → 상태 이름. 지도에 칠하는 값과 같은 값에서 뽑는다. */
export function flowerStateFromWave(wave: number): FlowerState {
  if (wave <= 0) return 'pre';
  if (wave >= 0.95) return 'ended';
  if (wave < 0.28) return 'starting';
  if (wave < WAVE_AT_PEAK_START) return 'good';
  if (wave <= WAVE_AT_PEAK_END) return 'peak';
  return 'ending';
}

/**
 * 꽃송이를 얼마나 풍성하게 찍을 것인가 (0~1).
 *
 * 파동 위치를 그대로 쓰지 않는다 — 파동은 끝으로 갈수록 1에 가까워지는데
 * 꽃은 절정에서 가장 많고 지고 나면 사라져야 하기 때문이다.
 */
export function bloomDensity(wave: number): number {
  if (wave <= 0 || wave >= 0.97) return 0;
  if (wave < WAVE_AT_PEAK_START) return 0.25 + (0.75 * wave) / WAVE_AT_PEAK_START;
  if (wave <= WAVE_AT_PEAK_END) return 1;
  return Math.max(0, 1 - (wave - WAVE_AT_PEAK_END) / (0.97 - WAVE_AT_PEAK_END));
}

const STATE_ORDER: Record<FlowerState, number> = {
  ended: 0,
  pre: 1,
  ending: 2,
  starting: 3,
  good: 4,
  peak: 5,
};

export function isBlooming(state: FlowerState): boolean {
  return state !== 'pre' && state !== 'ended';
}

export interface FlowerSpot {
  location: Location;
  position: MapPosition;
  /** 그 명소에서 지금 가장 앞서 있는 꽃 */
  entity: NatureEntity;
  state: FlowerState;
  status: OccurrenceStatus;
  window: { start: Date; end: Date };
  peakWindow?: { start: Date; end: Date };
  wave: number;
  wavePerDay: number;
  /** 이 명소가 권역의 개화 파동에 든가 (파동 3종이 걸려 있는가) */
  drivesWave: boolean;
  /** 이 명소에 걸린 파동 3종 각각의 지금 위치 — 권역이 종별로 합칠 때 쓴다 */
  waves: { slug: string; name: string; wave: number }[];
  daysToNextChange?: number;
  nextChangeLabel?: string;
  /** 같은 명소에 걸린 나머지 꽃 */
  entries: ResolvedOccurrence[];
}

/**
 * 선택 날짜 기준 꽃 명소 목록.
 * 아직 피기 전이거나 이미 진 곳도 함께 돌려준다 — 파동을 그리려면
 * "아직 안 폈다" 도 알아야 한다.
 */
export function buildFlowerSpots(date: DateKey): FlowerSpot[] {
  const byLocation = new Map<string, { location: Location; entries: ResolvedOccurrence[] }>();

  for (const resolved of resolveAll({ date, categories: ['flower'] })) {
    for (const location of resolved.locations) {
      const bucket = byLocation.get(location.id) ?? { location, entries: [] };
      bucket.entries.push(resolved);
      byLocation.set(location.id, bucket);
    }
  }

  const spots: FlowerSpot[] = [];

  for (const { location, entries } of byLocation.values()) {
    const measured = entries.map((entry) => ({
      entry,
      ...(alreadyPassed(entry.status, date, entry.window)
        ? { wave: 1, wavePerDay: 0 }
        : waveOf(date, entry.window, entry.peakWindow)),
    }));

    /*
     * 그 명소를 대표하는 것은 지금 가장 활짝 핀 꽃이다.
     * 파동 위치가 아니라 '지금 얼마나 피었나'(density)로 고른다 —
     * 이미 진 꽃의 파동 값이 1에 가까워서, 파동으로 고르면
     * 4월에 핀 벚꽃 대신 3월에 진 매화가 대표가 되어 버린다.
     */
    const best = measured.reduce((a, b) =>
      bloomDensity(b.wave) > bloomDensity(a.wave) ? b : a,
    );
    const lead = best.entry;

    spots.push({
      location,
      position: locationPosition(location),
      entity: lead.entity,
      waves: measured
        .filter((m) => WAVE_SPECIES.has(m.entry.entity.slug))
        .map((m) => ({ slug: m.entry.entity.slug, name: m.entry.entity.name, wave: m.wave })),
      state: flowerStateFromWave(best.wave),
      status: lead.status,
      window: lead.window,
      peakWindow: lead.peakWindow,
      wave: best.wave,
      wavePerDay: best.wavePerDay,
      drivesWave: measured.some((m) => WAVE_SPECIES.has(m.entry.entity.slug)),
      daysToNextChange: lead.daysToNextChange,
      nextChangeLabel: lead.nextChangeLabel,
      entries,
    });
  }

  // 남쪽이 먼저 핀다 — 위도 순으로 두면 목록이 곧 개화 전선이 된다
  return spots.sort((a, b) => a.location.geo.lat - b.location.geo.lat);
}

/** 한 권역에서 지금 피어 있는 꽃 한 종 */
export interface RegionBloom {
  /** 꽃 slug (forsythia · azalea · king-cherry) */
  slug: string;
  name: string;
  /** 얼마나 풍성한가 (0~1) — 꽃송이 무리의 밀도를 정한다 */
  density: number;
  state: FlowerState;
  petal: string;
  center: string;
}

export interface FlowerRegion {
  id: string;
  label: string;
  shortLabel: string;
  anchor: MapPosition;
  state: FlowerState;
  /** 지금 이 권역에서 가장 활짝 핀 명소 */
  lead: FlowerSpot;
  /** 지금 피어 있는 꽃들 — 밀도 큰 순 */
  blooms: RegionBloom[];
  spots: FlowerSpot[];
}

export function groupFlowerRegions(spots: FlowerSpot[]): FlowerRegion[] {
  const byRegion = new Map<string, FlowerSpot[]>();

  for (const spot of spots) {
    if (!spot.drivesWave) continue;
    const regionId = FLOWER_REGION_BY_LOCATION[spot.location.slug];
    if (!regionId) continue;
    const bucket = byRegion.get(regionId) ?? [];
    bucket.push(spot);
    byRegion.set(regionId, bucket);
  }

  const regions: FlowerRegion[] = [];

  for (const config of FLOWER_REGIONS) {
    const group = byRegion.get(config.id);
    if (!group || group.length === 0) continue;

    /*
     * 한 권역에 여러 종이 겹친다 (3월 개나리·진달래, 4월 벚꽃).
     * 종마다 따로 세어 두면 3월 말에 노랑과 분홍이 함께 보이고
     * 4월이면 연분홍만 남는다 — 계절이 종을 바꿔 준다.
     */
    const bySpecies = new Map<string, { name: string; wave: number }>();
    for (const spot of group) {
      for (const w of spot.waves) {
        const prev = bySpecies.get(w.slug);
        if (!prev || bloomDensity(w.wave) > bloomDensity(prev.wave)) {
          bySpecies.set(w.slug, { name: w.name, wave: w.wave });
        }
      }
    }

    const blooms: RegionBloom[] = [...bySpecies.entries()]
      .map(([slug, v]) => ({
        slug,
        name: v.name,
        density: bloomDensity(v.wave),
        state: flowerStateFromWave(v.wave),
        ...flowerColor(slug),
      }))
      .filter((b) => b.density > 0.02)
      .sort((a, b) => b.density - a.density);

    /*
     * 권역의 상태는 파동 3종만으로 정한다.
     *
     * 같은 명소에 동백·유채처럼 다른 꽃도 걸려 있어서, 그것까지 섞으면
     * 4월 중순 제주가 유채 때문에 '절정' 으로 남아 벚꽃 전선이 북으로 간 것이
     * 보이지 않는다.
     *
     * 여러 종이 겹칠 때는 가장 앞선 것을 쓴다 — 개나리가 지는 중이라는 이유로
     * 진달래가 한창인 권역이 '끝물' 로 적히면 안 된다.
     */
    const state = [...bySpecies.values()]
      .map((v) => flowerStateFromWave(v.wave))
      .reduce<FlowerState>((best, st) => (STATE_ORDER[st] > STATE_ORDER[best] ? st : best), 'ended');

    /** 상세로 이어 줄 명소 — 지금 그 권역에서 파동 3종이 가장 활짝 핀 곳 */
    const density = (spot: FlowerSpot) =>
      spot.waves.reduce((max, w) => Math.max(max, bloomDensity(w.wave)), 0);
    const lead = group.reduce((a, b) => (density(b) > density(a) ? b : a));

    regions.push({
      id: config.id,
      label: config.label,
      shortLabel: config.shortLabel,
      anchor: {
        x: group.reduce((sum, s) => sum + s.position.x, 0) / group.length,
        y: group.reduce((sum, s) => sum + s.position.y, 0) / group.length,
      },
      state,
      lead,
      blooms,
      spots: group,
    });
  }

  return regions;
}

export interface FlowerCounts {
  blooming: number;
  total: number;
  byState: Record<FlowerState, number>;
}

export function countFlowers(spots: FlowerSpot[]): FlowerCounts {
  const byState = Object.fromEntries(FLOWER_STATES.map((s) => [s, 0])) as Record<
    FlowerState,
    number
  >;
  for (const spot of spots) byState[spot.state] += 1;

  return {
    blooming: spots.filter((s) => isBlooming(s.state)).length,
    total: spots.length,
    byState,
  };
}

/**
 * 헤더 한 줄 — 지금 개화의 중심이 어디까지 올라왔는가.
 * "남해안 절정 · 충청 시작" 처럼, 두 이름의 거리가 곧 전선이다.
 */
export function bloomSummary(regions: FlowerRegion[]): string {
  if (regions.length === 0) return '아직 꽃 소식이 없습니다';

  /*
   * 꽃은 남에서 북으로 올라온다. 전선의 앞머리는 배열의 끝(북쪽)이므로
   * 요약도 거기서부터 읽는다 — 단풍과 정확히 반대다.
   */
  const named = (list: FlowerRegion[]) =>
    list
      .slice(-2)
      .map((r) => r.shortLabel)
      .join('·');

  const peak = regions.filter((r) => r.state === 'peak');
  const opening = regions.filter((r) => r.state === 'starting' || r.state === 'good');
  const closing = regions.filter((r) => r.state === 'ending');

  const parts: string[] = [];
  if (peak.length > 0) parts.push(`${named(peak)} 절정`);
  if (opening.length > 0) parts.push(`${named(opening)} ${peak.length > 0 ? '시작' : '개화 중'}`);
  if (parts.length === 0 && closing.length > 0) parts.push(`${named(closing)} 끝물`);

  if (parts.length === 0) {
    return regions.every((r) => r.state === 'pre')
      ? '아직 꽃 소식이 없습니다'
      : '봄꽃은 지나갔습니다';
  }
  return parts.join(' · ');
}

/** 상태 내역 한 줄 — "절정 3곳 · 개화 중 2곳" */
export function summarizeFlowers(counts: FlowerCounts): string {
  const parts = (['peak', 'good', 'starting', 'ending'] as const)
    .filter((state) => counts.byState[state] > 0)
    .map((state) => `${FLOWER_STATE_LABEL[state]} ${counts.byState[state]}곳`);

  if (parts.length === 0) {
    return counts.byState.ended > 0 ? '봄꽃은 지나갔습니다' : '아직 꽃 소식이 없습니다';
  }
  return parts.join(' · ');
}

/** 이번 주 꽃 추천 — 절정 먼저, 그다음 개화 중. 남쪽부터. */
export function getFlowerPicks(spots: FlowerSpot[], limit = 6): FlowerSpot[] {
  return spots
    .filter((spot) => spot.state === 'peak' || spot.state === 'good')
    .sort(
      (a, b) =>
        STATE_ORDER[b.state] - STATE_ORDER[a.state] || a.location.geo.lat - b.location.geo.lat,
    )
    .slice(0, limit);
}
