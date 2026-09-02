import type { GeoPoint, MapPosition } from './projection';
import type { Confidence, NatureEntity } from './types';

/* ────────────────────────────────────────────────────────────
 * 바다의 NOW — Phase 1 해양 도메인
 *
 * 이 파일은 "무엇이 언제 어디에 있는가" 만 다룬다.
 * 법적 규정(금어기·금지체장)은 regulation.ts 에 완전히 분리돼 있고
 * 두 모델은 절대 하나로 합치지 않는다.
 *
 *   "이 생물이 지금 존재하지 않는다"  ← Occurrence
 *   "있지만 잡으면 안 된다"           ← Regulation
 *
 * 사용자가 이 둘을 혼동하지 않게 하는 것이 Phase 1 의 핵심이다.
 * ──────────────────────────────────────────────────────────── */

export const SEA_REGIONS = ['서해', '남해', '동해', '제주'] as const;
export type SeaRegion = (typeof SEA_REGIONS)[number];

/** 시즌 강도. 자연 시즌이지 법적 상태가 아니다. */
export const SEASON_STRENGTHS = ['low', 'fair', 'good', 'peak'] as const;
export type SeasonStrength = (typeof SEASON_STRENGTHS)[number];

/** 시즌 밖이면 'off' */
export type SeasonState = SeasonStrength | 'off';

export const SEASON_STRENGTH_ORDER: Record<SeasonState, number> = {
  off: 0,
  low: 1,
  fair: 2,
  good: 3,
  peak: 4,
};

export const SEASON_STRENGTH_LABEL: Record<SeasonState, string> = {
  off: '시즌 아님',
  low: '드묾',
  fair: '보통',
  good: '좋음',
  peak: '절정',
};

/** 별 개수 (0~4) — 시즌 강도를 한눈에 */
export const SEASON_STRENGTH_STARS: Record<SeasonState, number> = {
  off: 0,
  low: 1,
  fair: 2,
  good: 3,
  peak: 4,
};

/* ── 낚시 방식 ────────────────────────────────────────────── */

export const FISHING_METHODS = [
  'shore-cast',
  'rock',
  'breakwater',
  'boat',
  'jigging',
  'lure',
  'float',
  'bottom',
  'net-free',
] as const;

export type FishingMethod = (typeof FISHING_METHODS)[number];

export const FISHING_METHOD_LABEL: Record<FishingMethod, string> = {
  'shore-cast': '원투',
  rock: '갯바위',
  breakwater: '방파제',
  boat: '선상',
  jigging: '지깅·에깅',
  lure: '루어',
  float: '찌낚시',
  bottom: '바닥·홀치기',
  'net-free': '맨손·통발',
};

/* ── 권역 (Where) ─────────────────────────────────────────── */

export type WaterType = 'coastal' | 'offshore' | 'estuary' | 'bay';

export type FishingSpotType =
  | 'BEACH'
  | 'BREAKWATER'
  | 'ROCK'
  | 'PIER'
  | 'FISHING_PARK'
  | 'PORT'
  | 'OTHER';

export const SPOT_TYPE_LABEL: Record<FishingSpotType, string> = {
  BEACH: '해변',
  BREAKWATER: '방파제',
  ROCK: '갯바위',
  PIER: '선착장',
  FISHING_PARK: '낚시공원',
  PORT: '항·포구',
  OTHER: '기타',
};

/**
 * 위치 공개 범위.
 * 낚시에서 특정 포인트 공개는 민감하고, 한 곳에 사람이 몰리는 문제도 있다.
 * 초기 서비스의 기본은 권역(REGION/AREA) 기반 discovery 다.
 */
export type LocationVisibility = 'EXACT' | 'AREA' | 'REGION';

export const LOCATION_VISIBILITY_LABEL: Record<LocationVisibility, string> = {
  EXACT: '정확한 위치',
  AREA: '약 3km 권역',
  REGION: '지역만',
};

/** 낚시가 가능한 넓은 권역. 지도 discovery 의 기본 단위. */
export interface FishingZone {
  id: string;
  slug: string;
  name: string;
  /** 광역 지자체 */
  region: string;
  subregion?: string;
  seaRegion: SeaRegion;
  geo: GeoPoint;
  /** base map 상 위치 override */
  mapPosition?: MapPosition;
  waterType: WaterType;
  /** 이 권역에서 흔한 낚시 환경 */
  shoreTypes: FishingSpotType[];
  description?: string;
  /** 권역 자체는 공개. 개별 포인트 공개 여부는 FishingSpot 에서 결정한다. */
  publicVisibility: LocationVisibility;
}

/**
 * 널리 알려진 공개 낚시 장소만 담는다.
 * 모든 권역을 정확한 GPS 포인트로 만들지 않는다.
 */
export interface FishingSpot {
  id: string;
  slug: string;
  zoneId: string;
  name: string;
  geo: GeoPoint;
  type: FishingSpotType;
  /** 공개적으로 널리 알려진 곳인가 */
  publicKnownSpot: boolean;
  accessInfo?: string;
  metadata?: Record<string, unknown>;
}

/* ── 시즌 (What × Where × When) ───────────────────────────── */

/**
 * 어종 × 권역 × 시기.
 * 법적 정보는 들어오지 않는다.
 */
export interface FishingOccurrence {
  id: string;
  speciesId: string;
  zoneId: string;
  /** MM-DD. 연말을 넘기는 구간 허용 */
  startDate: string;
  endDate: string;
  peakStartDate?: string;
  peakEndDate?: string;
  /** 이 권역에서 이 시즌의 기본 강도 (peak 구간에서는 'peak' 로 올라간다) */
  seasonStrength: SeasonStrength;
  confidence: Confidence;
  recommendedMethods: FishingMethod[];
  sourceIds: string[];
  /** 특정 연도에만 해당하면 지정 */
  yearSpecific?: number;
  /** 마지막으로 근거를 확인한 날짜. 없으면 미검증. */
  lastVerifiedAt?: string;
  note?: string;
}

/* ── 현장 관측 (Actual Now) ───────────────────────────────── */

export type ObservationSourceType = 'USER' | 'OFFICIAL' | 'PARTNER' | 'IMPORTED';
export type QuantityLevel = 'few' | 'some' | 'many';

export const QUANTITY_LABEL: Record<QuantityLevel, string> = {
  few: '조금',
  some: '보통',
  many: '많음',
};

export interface FishingObservation {
  id: string;
  speciesId: string;
  zoneId: string;
  spotId?: string;
  /** ISO datetime */
  observedAt: string;
  quantityLevel?: QuantityLevel;
  catchSizeCm?: number;
  fishingMethod?: FishingMethod;
  userId?: string;
  /** '나도 확인했어요' 수. 좋아요가 아니다. */
  verificationCount: number;
  sourceType: ObservationSourceType;
  locationVisibility: LocationVisibility;
  photoUrl?: string;
  note?: string;
}

export type ObservationTrend = 'up' | 'flat' | 'down' | 'none';

export const TREND_SYMBOL: Record<ObservationTrend, string> = {
  up: '↑',
  flat: '→',
  down: '↓',
  none: '—',
};

export interface ObservationSummary {
  /** 최근 N일 건수 */
  recentCount: number;
  /** 직전 같은 기간 대비 */
  trend: ObservationTrend;
  windowDays: number;
  lastObservedAt?: string;
  /** 표본이 적으면 낮다 */
  confidence: Confidence;
}

/* ── 어종 카탈로그 ────────────────────────────────────────── */

/**
 * 발견 대상 어종과 규제 대상 어종을 분리한다.
 * "금어기 목록에 없다" 는 이유로 지도에서 빼지 않는다.
 */
export interface MarineSpecies extends NatureEntity {
  seaRegions: SeaRegion[];
  /** 지도 discovery 대상인가 */
  discovery: boolean;
  /** 법적 규정이 존재하는가 (regulation.ts 가 실제 판정) */
  regulated: boolean;
}

export function isMarineSpecies(entity: NatureEntity): entity is MarineSpecies {
  return entity.category === 'fishing' || entity.category === 'marine';
}
