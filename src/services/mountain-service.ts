import type { DateKey } from '@/domain/date';
import type { FoliageTreeGroup } from '@/domain/official-foliage-forecast';
import {
  bloomSummary,
  buildFlowerSpots,
  countFlowers,
  groupFlowerRegions,
  isBlooming,
  summarizeFlowers,
  type FlowerCounts,
  type FlowerRegion,
  type FlowerSpot,
} from './flower-service';
import {
  buildOfficialForecastNow,
  type OfficialForecastNow,
} from './official-foliage-service';
import { freshAmount, winterAmount, winterAt } from './terrain-season';

/* ────────────────────────────────────────────────────────────
 * 지금 산.
 *
 * 한 화면 안에 성격이 다른 두 가지가 산다.
 *
 *   봄 꽃    서비스가 해석한 개화 파동 (아직 DEMO 자료다)
 *   가을 단풍 공식 절정 예측일의 시간 흐름 (해석하지 않는다)
 *
 * 단풍 쪽은 상태를 만들지 않는다. 공식 자료가 주는 것은 날짜뿐이고,
 * 화면이 하는 일은 "그 날짜가 선택한 날에 닿았는가" 를 묻는 것까지다.
 * ──────────────────────────────────────────────────────────── */

export type MountainPhase = 'flower' | 'green' | 'foliage' | 'winter';

export interface MountainNow {
  phase: MountainPhase;
  /** 중부 기준 겨울 깊이 (0~1) */
  winter: number;
  /** 겨울의 앞머리(북부) 깊이 (0~1) */
  winterLead: number;
  fresh: number;
  flowerSpots: FlowerSpot[];
  flowerRegions: FlowerRegion[];
  flowerCounts: FlowerCounts;
  /** 공식 단풍절정 예측 — 선택한 수종 기준 */
  forecast: OfficialForecastNow;
  /**
   * 이 화면이 공식 예측을 앞세우는가.
   *
   * 단풍 구간 안이거나, 아직 첫 예측일 전인 가을이다. 뒤쪽까지 포함하는
   * 것은 10월 초의 지도가 할 말이 '여름' 이 아니기 때문이다 —
   * 그때 사용자가 찾는 것은 '언제부터인가' 다.
   */
  forecastLeads: boolean;
  headline: string;
  caption: string;
}

const PHASE_HEADLINE: Record<'green' | 'winter', string> = {
  green: '여름 · 산이 짙어졌습니다',
  winter: '겨울 · 산이 쉬어 갑니다',
};

const PHASE_CAPTION: Record<'green' | 'winter', string> = {
  green: '짙은 녹음',
  winter: '잎을 떨군 산',
};

/**
 * 지형을 칠하는 데 필요한 것만.
 *
 * 산 화면에서만 부른다 — 바다와 하늘에서는 지도를 덧칠하지 않는다.
 */
export interface TerrainNow {
  winter: number;
  winterLead: number;
  fresh: number;
}

export function buildTerrainNow(date: DateKey): TerrainNow {
  return {
    winter: winterAmount(date),
    winterLead: winterAt(date, 0),
    fresh: freshAmount(date),
  };
}

export function buildMountainNow(
  date: DateKey,
  terrain: TerrainNow,
  treeGroup: FoliageTreeGroup,
): MountainNow {
  const { winter, winterLead, fresh } = terrain;

  const flowerSpots = buildFlowerSpots(date);
  const flowerRegions = groupFlowerRegions(flowerSpots);
  const flowerCounts = countFlowers(flowerSpots);
  const forecast = buildOfficialForecastNow(date, treeGroup);

  const blooming = flowerRegions.some((r) => isBlooming(r.state));

  /*
   * 단풍 국면은 공식 예측 구간 안이다.
   *
   * 시작일도 종료일도 지어내지 않는다 — 이 수종의 가장 이른 공식 절정
   * 예측일부터 가장 늦은 날까지가 곧 구간이다. 그 앞이면 아직 녹음이고,
   * 그 뒤는 겨울이 받아 간다.
   */
  const inForecastWindow =
    forecast.season !== null && date >= forecast.season.first && date <= forecast.season.last;

  const phase: MountainPhase = blooming
    ? 'flower'
    : inForecastWindow
      ? 'foliage'
      : winterLead >= 0.12
        ? 'winter'
        : 'green';

  /*
   * 공식 예측 구간 밖이어도 가을에는 공식 날짜를 먼저 말한다.
   * "여름 · 산이 짙어졌습니다" 는 10월 초의 지도가 할 말이 아니다.
   */
  const month = Number(date.slice(5, 7));
  const forecastLeads = phase === 'foliage' ||
    (month >= 9 && month <= 11 && phase !== 'winter' && phase !== 'flower');

  const headline =
    phase === 'flower'
      ? bloomSummary(flowerRegions)
      : forecastLeads
        ? forecast.headline
        : PHASE_HEADLINE[phase === 'winter' ? 'winter' : 'green'];

  const caption =
    phase === 'flower'
      ? summarizeFlowers(flowerCounts)
      : forecastLeads
        ? forecast.caption
        : PHASE_CAPTION[phase === 'winter' ? 'winter' : 'green'];

  return {
    phase,
    winter,
    winterLead,
    fresh,
    flowerSpots,
    flowerRegions,
    flowerCounts,
    forecast,
    forecastLeads,
    headline,
    caption,
  };
}

/** 지금 산에서 지도가 그릴 것이 있는가 */
export function mountainHasSubject(now: MountainNow): boolean {
  return now.phase === 'flower' || now.phase === 'foliage';
}
