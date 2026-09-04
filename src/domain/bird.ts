import type { DateKey } from './date';
import { computeStatus, resolvePeakWindow, resolveWindow, type RecurringSpec } from './occurrence';
import type { OccurrenceStatus } from './types';

/* ────────────────────────────────────────────────────────────
 * 철새 — regional seasonal occurrence.
 *
 * 이 모델이 답하는 질문은 "새가 어디로 이동하는가" 가 아니라
 * **"이 시기에 이 지역에서 이 새를 만날 수 있는가"** 다.
 * 그래서 여기에는 경로도, 무리도, 좌표의 시간 변화도 없다.
 *
 * 시간에 따라 변하는 것은 location 이 아니라 state 하나뿐이다.
 *   displayAnchor  speciesId × regionId × anchorVersion 로 고정 (bird-anchor.ts)
 *   state          날짜가 정한다 (아래 resolveBirdState)
 *
 * 시기 해석 엔진을 새로 만들지 않는다 — 바다 · 꽃 · 단풍과 같은
 * occurrence.ts 의 resolveWindow / computeStatus 를 그대로 쓴다.
 * 그래야 슬라이더 · 1년 재생 · 직접 날짜 선택이 같은 날짜에 같은 답을 준다.
 * ──────────────────────────────────────────────────────────── */

/** 이 지역에서 지금 얼마나 만날 수 있는가. OFF 는 '검증된 시즌 밖' 이다. */
export const BIRD_PRESENCE_STATES = ['STARTING', 'GOOD', 'PEAK', 'ENDING', 'OFF'] as const;
export type BirdPresenceState = (typeof BIRD_PRESENCE_STATES)[number];

/**
 * state 를 판단할 수 없는 이유.
 *
 * 이것들은 전부 state = null 이다. OFF 와 절대 합치지 않는다 —
 * "자료가 없어서 모른다" 와 "확인된 결과 지금은 없다" 는 다른 말이고,
 * 전자를 후자로 바꾸면 우리가 모르는 것을 안다고 말하는 것이 된다.
 */
export const BIRD_UNKNOWN_REASONS = [
  /** 아직 검증되지 않은 기록 */
  'UNVERIFIED',
  /** 판단할 만큼 기록이 모이지 않음 */
  'INSUFFICIENT',
  /** 기준일이 너무 오래된 기록 */
  'STALE',
  /** 이 종 × 지역에 대한 기록 자체가 없음 */
  'MISSING',
  /** 조사되지 않은 지역 */
  'NOT_SURVEYED',
  /** 원천 조회 실패 */
  'SOURCE_ERROR',
] as const;
export type BirdUnknownReason = (typeof BIRD_UNKNOWN_REASONS)[number];

/**
 * 이 기록을 얼마나 믿을 수 있는가.
 *
 * 'MOCK' 은 prototype 전용이며 production 으로 넘어가면 차단된다 (bird-guard.ts).
 * 'VERIFIED' 는 검증된 seasonal model 이 있다는 뜻이고, 지금 이 저장소에는 0건이다.
 */
export type BirdEvidenceStatus = 'MOCK' | 'VERIFIED' | BirdUnknownReason;

/** 이 기록이 어디서 왔는가. 'MOCK' 은 prototype fixture 다. */
export type BirdSourceType = 'MOCK' | 'OFFICIAL' | 'RESEARCH' | 'COMMUNITY';

/**
 * 한 해 안의 활성 구간 하나. MM-DD 이며 연말을 넘길 수 있다.
 * 같은 종 × 지역이 한 해에 복수 구간을 가질 수 있으므로
 * startDate + endDate 하나로 고정하지 않는다 (봄 통과 · 가을 통과).
 */
export interface BirdSeasonWindow {
  /** MM-DD */
  start: string;
  /** MM-DD. start 보다 작으면 연말을 넘기는 구간이다. */
  end: string;
  peakStart?: string;
  peakEnd?: string;
}

/**
 * 종 × 지역의 계절 출현.
 *
 * 여기에는 sprite 파일명 · CSS class · scale · opacity · animation · 화면 픽셀이
 * 들어오지 않는다. 데이터는 뜻만 전하고 시각 표현은 renderer 가 정한다.
 */
export interface BirdSeasonalOccurrence {
  speciesId: string;
  regionId: string;
  /**
   * anchor 규칙의 판(version).
   * 같은 speciesId × regionId × anchorVersion 은 언제나 같은 자리다.
   * 자리를 옮겨야 할 일이 생기면 값을 올려서 옮긴다 — 날짜로 옮기지 않는다.
   */
  anchorVersion: string;
  /** 비어 있어도 OFF 가 아니다 — 판단할 자료가 없다는 뜻이다 (MISSING) */
  seasons: BirdSeasonWindow[];
  isMock: boolean;
  sourceType: BirdSourceType;
  evidenceStatus: BirdEvidenceStatus;
  /** 표시용 note. 자연 정보가 아니라 자료의 성격만 적는다. */
  note?: string;
}

export type BirdResolution =
  | {
      kind: 'known';
      state: BirdPresenceState;
      /** state 를 만든 구간. OFF 면 없다. */
      window: { start: DateKey; end: DateKey } | null;
      reason: null;
    }
  | {
      kind: 'unknown';
      /** null 은 OFF 가 아니다 */
      state: null;
      window: null;
      reason: BirdUnknownReason;
    };

/** 존재감이 강한 순. 표시 우선순위와 복수 구간 합성에 함께 쓴다. */
export const BIRD_STATE_RANK: Record<BirdPresenceState, number> = {
  PEAK: 0,
  GOOD: 1,
  STARTING: 2,
  ENDING: 3,
  OFF: 4,
};

export const BIRD_STATE_LABEL: Record<BirdPresenceState, string> = {
  STARTING: '도래 시작',
  GOOD: '머무는 중',
  PEAK: '가장 많은 시기',
  ENDING: '떠나는 중',
  OFF: '시즌 밖',
};

export const BIRD_UNKNOWN_LABEL: Record<BirdUnknownReason, string> = {
  UNVERIFIED: '검증되지 않음',
  INSUFFICIENT: '자료 부족',
  STALE: '기준일 경과',
  MISSING: '기록 없음',
  NOT_SURVEYED: '조사되지 않음',
  SOURCE_ERROR: '원천 조회 실패',
};

function isUnknownReason(value: BirdEvidenceStatus): value is BirdUnknownReason {
  return (BIRD_UNKNOWN_REASONS as readonly string[]).includes(value);
}

/** occurrence 엔진의 상태를 철새의 말로 옮긴다. 구간 밖은 전부 OFF 다. */
function toPresenceState(status: OccurrenceStatus): BirdPresenceState {
  switch (status) {
    case 'peak':
      return 'PEAK';
    case 'active':
      return 'GOOD';
    case 'starting':
      return 'STARTING';
    case 'ending':
      return 'ENDING';
    // 구간 앞(upcoming) 과 구간 뒤(ended) 는 검증된 시즌 밖이라는 뜻이다
    case 'upcoming':
    case 'ended':
      return 'OFF';
  }
}

function toSpec(season: BirdSeasonWindow): RecurringSpec {
  return {
    recurrence: 'annual',
    startDate: season.start,
    endDate: season.end,
    peakStartDate: season.peakStart,
    peakEndDate: season.peakEnd,
  };
}

/**
 * 한 구간을 기준일로 해석한다.
 * 기존 temporal resolver 를 그대로 쓰므로 윤년(02-29)과 연말 넘김이 함께 처리된다.
 */
function resolveSeason(
  season: BirdSeasonWindow,
  date: DateKey,
): { state: BirdPresenceState; window: { start: DateKey; end: DateKey } } {
  const spec = toSpec(season);
  const { window } = resolveWindow(spec, date);
  const peak = resolvePeakWindow(spec, window);
  return { state: toPresenceState(computeStatus(date, window, peak)), window };
}

/**
 * 종 × 지역의 지금 상태.
 *
 * 판단할 수 없으면 null 을 돌려준다. OFF 로 바꾸지 않는다.
 * 복수 구간을 가지면 가장 강한 구간이 그 날의 상태가 된다 —
 * 봄 통과와 가을 통과가 겹치는 날이 있어도 한 지역은 한 상태만 갖는다.
 */
export function resolveBirdState(
  occurrence: BirdSeasonalOccurrence,
  date: DateKey,
): BirdResolution {
  if (isUnknownReason(occurrence.evidenceStatus)) {
    return { kind: 'unknown', state: null, window: null, reason: occurrence.evidenceStatus };
  }

  // 자료가 비어 있는 것은 '시즌 밖' 이 아니라 '모른다' 다
  if (occurrence.seasons.length === 0) {
    return { kind: 'unknown', state: null, window: null, reason: 'MISSING' };
  }

  let best: { state: BirdPresenceState; window: { start: DateKey; end: DateKey } } | null = null;
  for (const season of occurrence.seasons) {
    const resolved = resolveSeason(season, date);
    if (!best || BIRD_STATE_RANK[resolved.state] < BIRD_STATE_RANK[best.state]) {
      best = resolved;
    }
  }

  const picked = best!;
  return {
    kind: 'known',
    state: picked.state,
    window: picked.state === 'OFF' ? null : picked.window,
    reason: null,
  };
}

/** 지도에 올릴 만한 상태인가. OFF 와 null 은 올리지 않는다 — 다만 서로 다른 이유로 그렇다. */
export function isBirdOnMap(resolution: BirdResolution): boolean {
  return resolution.kind === 'known' && resolution.state !== 'OFF';
}
