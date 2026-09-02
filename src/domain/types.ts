import type { GeoPoint, MapPosition } from './projection';

/* ────────────────────────────────────────────────────────────
 * 이 앱의 모든 자연현상은 하나의 모델 위에서 다뤄진다.
 *
 *   NatureEntity      "무엇"          왕벚나무 / 꽃게 / 흑두루미
 *   Location          "어디"          여의도 / 서해 / 순천만
 *   NatureOccurrence  "무엇+어디+언제"  여의도 왕벚꽃 2026-04-03 ~ 04-14
 *
 * 꽃 · 단풍 · 물고기 · 철새는 별개 시스템이 아니라
 * 전부 NatureOccurrence 로 표현된다. (요구사항 #20~22)
 * ──────────────────────────────────────────────────────────── */

export const NATURE_CATEGORIES = [
  'fishing',
  'flower',
  'foliage',
  'bird',
  'marine',
  'nature',
] as const;

export type NatureCategory = (typeof NATURE_CATEGORIES)[number];

/** 자연현상의 진행 상태. 색만이 아니라 텍스트+기호로도 표현한다. (요구사항 #28) */
export const OCCURRENCE_STATUSES = [
  'upcoming',
  'starting',
  'active',
  'peak',
  'ending',
  'ended',
] as const;

export type OccurrenceStatus = (typeof OCCURRENCE_STATUSES)[number];

/** 데이터의 신뢰 수준. UI 에서 반드시 노출한다. */
export type Confidence =
  /** 법령·공공데이터 원문 확인 */
  | 'official'
  /** 기관 예보(개화예보 등) */
  | 'predicted'
  /** 과거 평년값 기반 추정 */
  | 'estimated'
  /** 개발용 데모. 실제 의사결정에 쓰면 안 된다. */
  | 'demo';

export interface SourceRef {
  /** 출처 이름 */
  name: string;
  url?: string;
  /** 기준일 (YYYY-MM-DD) */
  updatedAt?: string;
  note?: string;
}

/* ── What ─────────────────────────────────────────────────── */

export interface NatureEntity {
  id: string;
  slug: string;
  category: NatureCategory;
  subCategory?: string;
  /** 한국어 이름 */
  name: string;
  /** 종명/학명 */
  speciesName?: string;
  aliases?: string[];
  /** sprite 로 쓰는 이모지 fallback */
  icon: string;
  /** 일러스트 asset 경로. 없으면 icon 을 쓴다. */
  illustration?: string;
  summary: string;
  description?: string;
  /** 도감 희귀도 (1 흔함 ~ 5 희귀) */
  rarity?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  /** category 별 확장 필드. subtype 테이블로 승격 가능. */
  metadata?: Record<string, unknown>;
  /** category === 'fishing' 인 entity 의 수산자원 규정 */
  fishingRule?: FishingRule;
}

/** 금어기·금지체장 규정. NatureEntity 의 subtype. (요구사항 #20) */
export interface FishingRule {
  /** MM-DD. 연말을 넘기는 구간(예: 12-15 ~ 01-31)도 허용한다. */
  closedSeasonStart?: string;
  closedSeasonEnd?: string;
  /** 금지체장 (cm) */
  minimumSizeCm?: number;
  /** 금지체중 (g) */
  minimumWeightG?: number;
  /** 지역·어업방식별로 규정이 갈리는 경우 */
  regionRules?: RegionRule[];
  /** 예외 (특정 어법, 시도지사 고시 등) */
  exceptions?: string[];
  notes?: string[];
  lawSource?: SourceRef;
}

export interface RegionRule {
  /** 적용 지역/어업 방식 설명 */
  scope: string;
  closedSeasonStart?: string;
  closedSeasonEnd?: string;
  minimumSizeCm?: number;
  note?: string;
}

/* ── Where ────────────────────────────────────────────────── */

export type LocationType =
  | 'sea'
  | 'coast'
  | 'mountain'
  | 'park'
  | 'wetland'
  | 'river'
  | 'island'
  | 'city';

export interface Location {
  id: string;
  slug: string;
  name: string;
  /** 광역 지자체 또는 해역 ('서울', '전남', '서해') */
  region: string;
  subregion?: string;
  type: LocationType;
  geo: GeoPoint;
  /**
   * base map 상의 위치 override.
   * 없으면 geo 를 projectGeo() 로 투영해 쓴다.
   */
  mapPosition?: MapPosition;
  description?: string;
}

/* ── What + Where + When ──────────────────────────────────── */

export type Recurrence =
  /** 매년 같은 월/일에 반복. 날짜는 MM-DD 로 저장한다. (금어기 등) */
  | 'annual'
  /** 특정 연도 1회. 날짜는 YYYY-MM-DD 로 저장한다. (개화 예보 등) */
  | 'once';

export interface NatureOccurrence {
  id: string;
  slug: string;
  entityId: string;
  locationIds: string[];
  /** 표시용 광역 구분. '서해' '남해' '전국' '서울' 등 */
  regions: string[];
  recurrence: Recurrence;
  /** annual: MM-DD / once: YYYY-MM-DD */
  startDate: string;
  endDate: string;
  peakStartDate?: string;
  peakEndDate?: string;
  /**
   * 이 occurrence 가 의미하는 바.
   * fishing 은 '금지 구간', 나머지는 '관찰 가능 구간' 이다.
   */
  polarity: 'observable' | 'restricted';
  confidence: Confidence;
  source: SourceRef;
  /** 요약 규정 (금어기 조건 등) */
  rules?: string[];
  notes?: string[];
  /** 지역·어법별 예외 */
  exceptions?: string[];
  /** 추천 랭킹용 가중치 (0~1) */
  weight?: number;
  metadata?: Record<string, unknown>;
  /** true 면 UI 에서 DEMO 배지를 강제 노출한다. */
  isDemo: boolean;
}

/* ── 계산된 뷰 모델 ───────────────────────────────────────── */

/** selectedDate 기준으로 해석된 occurrence. UI 는 이 타입만 본다. */
export interface ResolvedOccurrence {
  occurrence: NatureOccurrence;
  entity: NatureEntity;
  locations: Location[];
  /** 선택 날짜가 속한 주기의 실제 구간 */
  window: { start: Date; end: Date };
  peakWindow?: { start: Date; end: Date };
  status: OccurrenceStatus;
  /** 다음 상태 변화까지 남은 일수. 없으면 undefined */
  daysToNextChange?: number;
  nextChangeLabel?: string;
  /** 0~1. 구간 내 진행률 */
  progress: number;
}

/* ── 개인화 (Phase 4 대비) ────────────────────────────────── */

export type DiscoveryKind =
  /** 지도/상세에서 발견 */
  | 'discovered'
  /** 실제 현장에서 관찰 — Phase 4 */
  | 'observed';

export interface DexRecord {
  entityId: string;
  kind: DiscoveryKind;
  /** ISO datetime */
  discoveredAt: string;
  observedAt?: string;
  /** 발견 당시 보고 있던 날짜 */
  contextDate?: string;
}

export type NotificationType =
  | 'before-start'
  | 'start'
  | 'peak'
  | 'end';

export interface NatureSubscription {
  id: string;
  /** Phase 4 에서 auth 연결. 그 전에는 'anonymous'. */
  userId: string;
  occurrenceId: string;
  entityId: string;
  notificationTypes: NotificationType[];
  createdAt: string;
}

/** 사용자 현장제보. Phase 4 — 지금은 모델과 UI shell 만 둔다. (요구사항 #14) */
export interface Observation {
  id: string;
  userId: string;
  occurrenceId?: string;
  entityId: string;
  locationId?: string;
  geo?: GeoPoint;
  observedAt: string;
  status: OccurrenceStatus;
  /** 진행 정도 (예: 개화 70%) */
  progressPercent?: number;
  note?: string;
  photoUrl?: string;
  verificationCount: number;
}
