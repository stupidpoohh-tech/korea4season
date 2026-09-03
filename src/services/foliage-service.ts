import { dayOfYear, type DateKey } from '@/domain/date';
import {
  WAVE_AT_PEAK_END,
  WAVE_AT_PEAK_START,
  alreadyPassed,
  waveOf,
} from './season-wave';
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

/* ────────────────────────────────────────────────────────────
 * 색은 단계가 아니라 **띠**다.
 *
 * 상태 여섯 개에 색 여섯 개를 두면 날짜가 경계를 넘는 순간 색이 툭 바뀐다.
 * 그러면 지도에서 읽히는 것이 '어디까지 물들었나' 가 아니라
 * '몇 곳이 빨간가' 가 된다. 그래서 진행도(0~1) 하나를 두고 그 위의
 * 색 띠를 이어서 읽는다 — 초록에서 붉은빛으로 곧장 건너뛰지 않는다.
 *
 * 0.0 초록          아직 (base map 이 그린 그대로. 덧칠해도 티가 나지 않아야 한다)
 * 0.18 연둣빛 노랑   물들기 시작
 * 0.38 황금빛        좋음
 * 0.56 주황
 * 0.78 붉은 주황     절정 (구간의 끝이 가장 붉다)
 * 0.90 바랜 갈색주황 끝물
 * 1.0 겨울 산        낮은 채도의 올리브 — '죽은 산' 이 아니라 겨울로 넘어가는 색
 *
 * 형광색과 순색 빨강(#FF0000)은 쓰지 않는다.
 * ──────────────────────────────────────────────────────────── */

export interface FoliageColor {
  /** 산 앞면 */
  face: string;
  /** 산 그늘면 */
  faceDark: string;
  /** 숲 덩어리 · 나무 몸통 */
  tree: string;
  /** 나무 윗면 (빛 받는 쪽) */
  treeTop: string;
}

interface RampStop extends FoliageColor {
  at: number;
  /** 숲을 이만큼만 물들인다 (0~1). 산이 주인공이고 숲은 거들 뿐이다. */
  forestMix: number;
  /** 땅에 얹는 색과 그 짙기. 산·숲보다 훨씬 옅다 — 강과 해안선이 살아 있어야 한다. */
  land: string;
  landMix: number;
}

const RAMP: RampStop[] = [
  { at: 0, face: '#5cb968', faceDark: '#3b9349', tree: '#3f9e46', treeTop: '#5cb84f', forestMix: 0, land: '#bbe264', landMix: 0 },
  { at: 0.18, face: '#a9c552', faceDark: '#7d9c35', tree: '#8aa73a', treeTop: '#a9c552', forestMix: 0.2, land: '#cbd558', landMix: 0.16 },
  { at: 0.38, face: '#e2bb43', faceDark: '#b58c27', tree: '#c39a30', treeTop: '#e2bb43', forestMix: 0.34, land: '#e0c25c', landMix: 0.26 },
  { at: 0.56, face: '#dd8b34', faceDark: '#b0621f', tree: '#bc7028', treeTop: '#dd8b34', forestMix: 0.42, land: '#dda75a', landMix: 0.3 },
  { at: 0.78, face: '#d06034', faceDark: '#a04120', tree: '#ad4c26', treeTop: '#d06034', forestMix: 0.46, land: '#d18f58', landMix: 0.32 },
  { at: 0.9, face: '#b07a45', faceDark: '#86552c', tree: '#946035', treeTop: '#b07a45', forestMix: 0.34, land: '#c9a473', landMix: 0.28 },
  { at: 1, face: '#7f9163', faceDark: '#5c6f48', tree: '#6a7d52', treeTop: '#7f9163', forestMix: 0.22, land: '#b6bf92', landMix: 0.22 },
];

/* ── 겨울 ─────────────────────────────────────────────────────
 * 단풍이 끝났다고 지도가 계속 가을색으로 남아 있으면 안 된다.
 * 12월에서 2월 사이에는 산과 땅이 눈으로 덮인다 — 이것은 단풍 진행도와
 * 무관하게 날짜가 정하는 값이다 (1월의 산은 '아직 안 물든 초록' 이 아니다).
 * ──────────────────────────────────────────────────────────── */

const SNOW = {
  face: '#f4f9fd',
  faceDark: '#d9e5f0',
  tree: '#9db9a6',
  treeTop: '#dceae4',
  land: '#eef5fb',
};

/* ── 봄 ───────────────────────────────────────────────────────
 * 눈이 걷힌 뒤 여름의 짙은 녹음까지, 산은 한 번 더 색이 바뀐다.
 * base map 이 그린 초록은 여름의 것이므로 봄은 그보다 밝고 노란 쪽이다.
 * 이것이 없으면 3월부터 8월까지 지도가 한 장으로 멈춰 있다.
 * ──────────────────────────────────────────────────────────── */

const FRESH = {
  face: '#8fd06a',
  faceDark: '#63a844',
  tree: '#63ab3f',
  treeTop: '#96d768',
  land: '#dcf094',
};

/**
 * 신록이 얼마나 올라왔는가 (0~1).
 *
 * 꽃과 마찬가지로 남쪽이 먼저다 — offsetDays 로 권역마다 늦춘다.
 * 4월에 올라와 5월에 가장 연하고, 6월 말이면 여름의 짙은 녹음(= base map)이 된다.
 */
export function freshAmount(date: DateKey, offsetDays = 0): number {
  const day = dayOfYear(date) - offsetDays;
  const ramp = (from: number, to: number) => (day - from) / (to - from);
  const RISE_FROM = 78; // 3월 19일
  const FULL_FROM = 108; // 4월 18일
  const FULL_TO = 145; // 5월 25일
  const FADE_TO = 176; // 6월 25일
  if (day < RISE_FROM || day > FADE_TO) return 0;
  if (day < FULL_FROM) return Math.min(1, Math.max(0, ramp(RISE_FROM, FULL_FROM)));
  if (day <= FULL_TO) return 1;
  return Math.min(1, Math.max(0, 1 - ramp(FULL_TO, FADE_TO)));
}

/** 겨울이 얼마나 깊은가 (0~1). 11월 말부터 오르고 3월 중순에 0 이 된다. */
export function winterAmount(date: DateKey): number {
  const md = date.slice(5); // 'MM-DD'
  const ramp = (from: string, to: string) => {
    const day = (v: string) => Number(v.slice(0, 2)) * 31 + Number(v.slice(3, 5));
    return (day(md) - day(from)) / (day(to) - day(from));
  };
  if (md >= '11-25' && md < '12-15') return Math.min(1, Math.max(0, ramp('11-25', '12-15')));
  if (md >= '12-15' || md <= '02-20') return 1;
  if (md > '02-20' && md < '03-20') return Math.min(1, Math.max(0, 1 - ramp('02-20', '03-20')));
  return 0;
}

/** base map 이 그린 숲 색. 여기서 조금씩만 끌어당긴다. */
const FOREST_BASE = { tree: '#3f9e46', treeTop: '#5cb84f' };

function mixHex(a: string, b: string, k: number): string {
  const t = Math.min(1, Math.max(0, k));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa
    .map((v, i) => Math.round(v + (pb[i]! - v) * t).toString(16).padStart(2, '0'))
    .join('')}`;
}

function rampAt(progress: number): RampStop {
  const p = Math.min(1, Math.max(0, progress));
  for (let i = 1; i < RAMP.length; i += 1) {
    const lo = RAMP[i - 1]!;
    const hi = RAMP[i]!;
    if (p <= hi.at) {
      const k = (p - lo.at) / (hi.at - lo.at || 1);
      return {
        at: p,
        face: mixHex(lo.face, hi.face, k),
        faceDark: mixHex(lo.faceDark, hi.faceDark, k),
        tree: mixHex(lo.tree, hi.tree, k),
        treeTop: mixHex(lo.treeTop, hi.treeTop, k),
        forestMix: lo.forestMix + (hi.forestMix - lo.forestMix) * k,
        land: mixHex(lo.land, hi.land, k),
        landMix: lo.landMix + (hi.landMix - lo.landMix) * k,
      };
    }
  }
  return RAMP[RAMP.length - 1]!;
}

/** 산 색 — 진행도 그대로. winter 를 주면 눈으로 덮인다. */
export function mountainColorAt(progress: number, winter = 0, fresh = 0): FoliageColor {
  const stop = rampAt(progress);
  const layer = (autumn: string, spring: string, snow: string) =>
    mixHex(mixHex(autumn, spring, fresh), snow, winter);
  return {
    face: layer(stop.face, FRESH.face, SNOW.face),
    faceDark: layer(stop.faceDark, FRESH.faceDark, SNOW.faceDark),
    tree: layer(stop.tree, FRESH.tree, SNOW.tree),
    treeTop: layer(stop.treeTop, FRESH.treeTop, SNOW.treeTop),
  };
}

/**
 * 땅에 얹는 색.
 *
 * 산만 물들고 땅은 그대로면 가을이 산에서만 일어나는 일처럼 보인다.
 * 다만 아주 옅게 얹는다 — 강 · 호수 · 해안 모래는 그대로 읽혀야 한다.
 */
export function landWashAt(
  progress: number,
  winter = 0,
  fresh = 0,
): { color: string; opacity: number } {
  const stop = rampAt(progress);
  return {
    color: mixHex(mixHex(stop.land, FRESH.land, fresh), SNOW.land, winter),
    // 겨울에는 눈이 땅을 덮으므로 훨씬 짙게 깔린다
    opacity: Math.max(stop.landMix, fresh * 0.3, winter * 0.82),
  };
}

/**
 * 숲 색 — 같은 색이되 훨씬 옅게.
 *
 * 산만 물들고 주변 숲이 진한 초록으로 남아 있으면 삼각형 하나하나가
 * 지도 위에 얹힌 아이콘처럼 떨어져 보인다. 같은 권역의 숲이 같은 방향으로
 * 따뜻해지면 '이 지역 전체가 물들고 있다' 로 읽힌다.
 *
 * 절정에서도 산 색의 절반이 채 되지 않게 둔다.
 * 숲까지 주황이 되면 지도에서 산이 사라지고 지역이 통째로 칠해진 것이 된다.
 */
export function forestColorAt(
  progress: number,
  winter = 0,
  fresh = 0,
): { tree: string; treeTop: string } {
  const stop = rampAt(progress);
  const layer = (base: string, autumn: string, mix: number, spring: string, snow: string) =>
    mixHex(mixHex(mixHex(base, autumn, mix), spring, fresh), snow, winter);
  return {
    tree: layer(FOREST_BASE.tree, stop.tree, stop.forestMix, FRESH.tree, SNOW.tree),
    treeTop: layer(FOREST_BASE.treeTop, stop.treeTop, stop.forestMix, FRESH.treeTop, SNOW.treeTop),
  };
}

/**
 * 색 띠 위의 위치 → 상태 이름.
 *
 * 이름을 occurrence 의 status 에서 그대로 가져오지 않는다.
 * 엔진의 'active' 는 절정 앞뒤를 모두 덮어서, 절정을 지나 이미 갈색으로
 * 물든 산이 목록에서는 '좋음' 으로 적히곤 했다 — 색과 글자가 어긋난다.
 * 지도에 칠하는 값과 같은 값에서 이름을 뽑으면 둘이 어긋날 수가 없다.
 */
export function stateFromWave(wave: number): FoliageState {
  if (wave <= 0) return 'pre';
  if (wave >= 0.95) return 'ended';
  if (wave < 0.28) return 'starting';
  if (wave < WAVE_AT_PEAK_START) return 'good';
  if (wave <= WAVE_AT_PEAK_END) return 'peak';
  return 'ending';
}

/** 범례에 쓰는 대표 진행도 — 상태 이름 옆의 색 조각이 띠의 어디쯤인지 */
export const STATE_PROGRESS: Record<FoliageState, number> = {
  pre: 0,
  starting: 0.16,
  good: 0.38,
  peak: 0.72,
  ending: 0.9,
  ended: 1,
};

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
 * 잎이 물드는 나무. 명소의 상태를 대표한다.
 *
 * 억새는 가을 능선에서 은빛으로 흔들리지만 잎이 물드는 것이 아니다.
 * 억새 절정(10월 초)은 단풍보다 이르고 남쪽 지리산·덕유산에 걸려 있어서,
 * 이것을 명소의 상태로 쓰면 남쪽이 북쪽보다 먼저 물든 것처럼 보인다.
 * 억새는 사라지지 않는다 — 그 명소의 entries 에 남아 상세에서 함께 말한다.
 */
const SPOT_LEADS = new Set(['maple', 'ginkgo']);

/**
 * 지도의 산과 숲 색을 정하는 것은 단풍나무뿐이다.
 *
 * 은행나무는 도심 가로수라 산을 노랗게 만들지 않는다. 게다가 서울 은행은
 * 11월 중순까지 이어져서, 이것이 권역 색을 잡으면 수도권만 남부와 함께
 * 늦게까지 물든 것처럼 보인다 — 전선이 끊긴다.
 */
const TERRAIN_PAINTERS = new Set(['maple']);

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
  /**
   * 지도 색을 정하는 값 (0~1).
   *
   * occurrence 의 progress 와 다르다 — 그쪽은 '창의 몇 %를 지났나' 라
   * 절정이 어디쯤인지가 담기지 않는다. 이 값은 첫 단풍 → 절정 → 끝물 →
   * 겨울 산까지를 색 띠 위의 한 점으로 옮긴 것이다.
   */
  wave: number;
  /** 하루가 wave 를 얼마나 움직이는가 — 산마다 며칠씩 흩을 때 쓴다 */
  wavePerDay: number;
  /** 이 명소가 지도의 산·숲 색을 정하는가 (단풍나무인가) */
  paintsTerrain: boolean;
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
    const leads = entries.filter((entry) => SPOT_LEADS.has(entry.entity.slug));
    if (leads.length === 0) continue;

    /*
     * 그 명소를 대표하는 것은 지금 가장 앞서 있는 수종이다.
     * 앞섬은 색 띠 위의 위치로 잰다 — 화면에 칠하는 값과 같은 값이라
     * 목록의 이름과 지도의 색이 어긋날 수 없다.
     */
    const measured = leads.map((entry) => ({
      entry,
      // 올해 것이 이미 지나갔으면 색 띠의 끝(겨울 산)에 둔다
      ...(alreadyPassed(entry.status, date, entry.window)
        ? { wave: 1, wavePerDay: 0 }
        : waveOf(date, entry.window, entry.peakWindow)),
    }));

    const best = measured.reduce((a, b) => (b.wave > a.wave ? b : a));
    const lead = best.entry;
    const wave = { wave: best.wave, wavePerDay: best.wavePerDay };

    spots.push({
      location,
      position: locationPosition(location),
      entity: lead.entity,
      state: stateFromWave(wave.wave),
      status: lead.status,
      window: lead.window,
      peakWindow: lead.peakWindow,
      progress: lead.progress,
      wave: wave.wave,
      wavePerDay: wave.wavePerDay,
      paintsTerrain: TERRAIN_PAINTERS.has(lead.entity.slug),
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

export function countFoliage(spots: FoliageSpot[]): FoliageCounts {
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
  shortLabel: string;
  /** 설악산보다 며칠 늦게 물드는가. 지형 레이어가 봄의 순서를 뒤집을 때도 쓴다. */
  offsetDays: number;
  /** 지도에서 이 권역의 중심. 산·숲을 어느 권역에 붙일지 이 점으로 정한다. */
  anchor: MapPosition;
  /** 그 권역에서 지금 가장 앞선 상태 — "여기 가면 절정인 산이 있다" */
  state: FoliageState;
  /** 상태를 대표하는 명소 (그 권역에서 가장 앞선 곳) */
  lead: FoliageSpot;
  /** 색 띠 위의 위치 (0~1). 지도의 산과 숲이 이 값으로 칠해진다. */
  wave: number;
  /** 하루가 wave 를 얼마나 움직이는가 */
  wavePerDay: number;
  spots: FoliageSpot[];
}

/**
 * 명소를 권역으로 묶는다.
 *
 * 날짜가 아니라 이미 만들어 둔 명소 목록을 받는다 — 한 화면에서 개수와
 * 권역을 각각 계산하면 슬라이더를 끄는 동안 같은 일을 두 번씩 한다.
 */
export function groupFoliageRegions(spots: FoliageSpot[]): FoliageRegion[] {
  const byRegion = new Map<string, FoliageSpot[]>();

  for (const spot of spots) {
    // 산 색을 정하는 것은 단풍나무뿐이다 (TERRAIN_PAINTERS 주석 참고)
    if (!spot.paintsTerrain) continue;
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

    /*
     * 색은 평균으로, 이름은 그 평균에서 뽑는다.
     * 상태를 따로 고르면 '끝남' 색으로 칠해 놓고 목록에는 '끝물' 이라고 적는
     * 어긋남이 생긴다 — 지도와 글자는 같은 값에서 나와야 한다.
     */
    const wave = group.reduce((sum, s) => sum + s.wave, 0) / group.length;
    const lead = group.reduce((a, b) => (b.wave > a.wave ? b : a));

    regions.push({
      id: config.id,
      label: config.label,
      shortLabel: config.shortLabel,
      offsetDays: config.offsetDays,
      anchor: {
        x: group.reduce((sum, s) => sum + s.position.x, 0) / group.length,
        y: group.reduce((sum, s) => sum + s.position.y, 0) / group.length,
      },
      state: stateFromWave(wave),
      lead,
      /*
       * 권역 안의 산이 며칠씩 어긋나 있으므로 평균으로 칠한다.
       * 가장 앞선 곳 하나로 칠하면 그 권역 전체가 실제보다 이르게 물든 것처럼 보인다.
       */
      wave,
      wavePerDay: group.reduce((sum, s) => sum + s.wavePerDay, 0) / group.length,
      spots: group,
    });
  }

  return regions;
}

/**
 * 헤더 한 줄 — 지금 단풍의 중심이 어디까지 내려왔는가.
 *
 * "N곳이 물드는 중" 은 개수를 세는 말이라 흐름을 말해 주지 못한다.
 * 대신 절정인 곳과 이제 시작하는 곳을 함께 적는다 — 그 둘의 거리가 곧 전선이다.
 *   "강원 북부 절정 · 수도권 시작"
 */
export function waveSummary(regions: FoliageRegion[], winter = 0): string {
  // 1월의 산은 '아직 안 물든 초록' 이 아니라 눈 덮인 산이다
  if (winter >= 0.5) return '겨울 · 산에 눈이 쌓입니다';
  if (regions.length === 0) return '아직 초록입니다';

  const named = (list: FoliageRegion[]) =>
    list
      .slice(0, 2)
      .map((r) => r.shortLabel)
      .join('·');

  const peak = regions.filter((r) => r.state === 'peak');
  const opening = regions.filter((r) => r.state === 'starting' || r.state === 'good');
  const closing = regions.filter((r) => r.state === 'ending');

  const parts: string[] = [];
  if (peak.length > 0) parts.push(`${named(peak)} 절정`);
  if (opening.length > 0) parts.push(`${named(opening)} ${peak.length > 0 ? '시작' : '진행 중'}`);
  if (parts.length === 0 && closing.length > 0) parts.push(`${named(closing)} 끝물`);

  if (parts.length === 0) {
    return regions.every((r) => r.state === 'pre') ? '아직 초록입니다' : '올해 단풍은 끝났어요';
  }
  return parts.join(' · ');
}

/**
 * 헤더에 쓰는 한 줄.
 *
 * "지도에 9곳 표시 중" 은 마커를 세는 말이라 단풍의 진행을 말해 주지 못한다.
 * 대신 지금 어떤 상태가 몇 곳인지를 말한다 — 이 문장이 곧 전선의 위치다.
 */
export function summarizeFoliage(counts: FoliageCounts, winter = 0): string {
  if (winter >= 0.5) return '눈 덮인 산';
  const parts = (['peak', 'good', 'starting', 'ending'] as const)
    .filter((state) => counts.byState[state] > 0)
    .map((state) => `${FOLIAGE_STATE_LABEL[state]} ${counts.byState[state]}곳`);

  if (parts.length === 0) {
    // 아직 오지 않은 것과 이미 지나간 것은 다르다
    return counts.byState.ended > 0 ? '올해 단풍은 지나갔습니다' : '아직 물든 곳이 없습니다';
  }
  return parts.join(' · ');
}
