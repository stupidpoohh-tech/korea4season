import { addDays, diffDays, fromDateKey, type DateKey } from './date';
import {
  computeStatus,
  resolvePeakWindow,
  resolveWindow,
  type DateWindow,
} from './occurrence';
import {
  SEASON_STRENGTH_ORDER,
  type FishingMethod,
  type FishingObservation,
  type FishingOccurrence,
  type ObservationSummary,
  type ObservationTrend,
  type SeasonState,
} from './marine';
import {
  evaluateFishingStatus,
  type LegalEvaluation,
  type LegalRule,
  type LegalSource,
  type RegulationContext,
} from './regulation';
import type { Confidence, OccurrenceStatus } from './types';

/* ────────────────────────────────────────────────────────────
 * 세 레이어를 한 번에 평가한다. 결과는 끝까지 분리된 채로 돌려준다.
 *
 *   occurrence  — 지금 있는가, 얼마나 좋은 시즌인가
 *   regulation  — 지금 잡아도 되는가
 *   observation — 실제로 최근에 잡히고 있는가
 *
 * 이 셋을 하나의 status 로 뭉개지 않는 것이 이 엔진의 요점이다.
 * ──────────────────────────────────────────────────────────── */

/** 관측 요약을 계산할 기본 기간 */
export const OBSERVATION_WINDOW_DAYS = 7;

export interface SeasonEvaluation {
  /** 시즌 밖이면 'off' */
  state: SeasonState;
  /** 이 시즌에 권장되는 낚시 방식 */
  methods: FishingMethod[];
  status: OccurrenceStatus;
  window: DateWindow;
  peakWindow?: DateWindow;
  progress: number;
  daysToNextChange?: number;
  nextChangeLabel?: string;
  confidence: Confidence;
  /** 근거를 마지막으로 확인한 날짜. 없으면 미검증 시즌 데이터다. */
  lastVerifiedAt?: string;
}

/** FishingOccurrence 를 특정 날짜 기준으로 해석한다 */
export function evaluateSeason(
  occ: FishingOccurrence,
  date: DateKey,
): SeasonEvaluation {
  const spec = {
    recurrence: 'annual' as const,
    startDate: occ.startDate,
    endDate: occ.endDate,
    peakStartDate: occ.peakStartDate,
    peakEndDate: occ.peakEndDate,
  };

  const { window } = resolveWindow(spec, date);
  const peakWindow = resolvePeakWindow(spec, window);
  const status = computeStatus(date, window, peakWindow);

  const inSeason = date >= window.start && date <= window.end;
  const inPeak = Boolean(peakWindow && date >= peakWindow.start && date <= peakWindow.end);

  const state: SeasonState = !inSeason ? 'off' : inPeak ? 'peak' : occ.seasonStrength;

  const total = diffDays(window.start, window.end) + 1;
  const index = diffDays(window.start, date);
  const progress = Math.min(1, Math.max(0, (index + 1) / total));

  let daysToNextChange: number | undefined;
  let nextChangeLabel: string | undefined;

  if (!inSeason && date < window.start) {
    daysToNextChange = diffDays(date, window.start);
    nextChangeLabel = '시즌 시작까지';
  } else if (inSeason && peakWindow && date < peakWindow.start) {
    daysToNextChange = diffDays(date, peakWindow.start);
    nextChangeLabel = '피크까지';
  } else if (inSeason) {
    daysToNextChange = diffDays(date, addDays(window.end, 1));
    nextChangeLabel = '시즌 종료까지';
  }

  return {
    state,
    methods: occ.recommendedMethods,
    status,
    window,
    peakWindow,
    progress,
    daysToNextChange,
    nextChangeLabel,
    confidence: occ.confidence,
    lastVerifiedAt: occ.lastVerifiedAt,
  };
}

/** 여러 권역의 시즌 중 가장 강한 것을 고른다 */
export function strongestState(states: SeasonState[]): SeasonState {
  return states.reduce<SeasonState>(
    (best, s) => (SEASON_STRENGTH_ORDER[s] > SEASON_STRENGTH_ORDER[best] ? s : best),
    'off',
  );
}

/* ── 현장 관측 요약 ───────────────────────────────────────── */

function countBetween(
  observations: readonly FishingObservation[],
  from: DateKey,
  to: DateKey,
): number {
  return observations.filter((o) => {
    const day = o.observedAt.slice(0, 10);
    return day >= from && day <= to;
  }).length;
}

/**
 * 최근 관측 추세.
 * 표본이 적으면 confidence 를 낮춰 UI 가 과신하지 않게 한다.
 */
export function summarizeObservations(
  observations: readonly FishingObservation[],
  date: DateKey,
  windowDays: number = OBSERVATION_WINDOW_DAYS,
): ObservationSummary {
  const from = addDays(date, -(windowDays - 1));
  const prevFrom = addDays(from, -windowDays);
  const prevTo = addDays(from, -1);

  const recentCount = countBetween(observations, from, date);
  const previousCount = countBetween(observations, prevFrom, prevTo);

  let trend: ObservationTrend = 'none';
  if (recentCount > 0 || previousCount > 0) {
    if (recentCount > previousCount * 1.2) trend = 'up';
    else if (recentCount * 1.2 < previousCount) trend = 'down';
    else trend = 'flat';
  }

  const lastObservedAt = observations
    .map((o) => o.observedAt)
    .sort()
    .at(-1);

  const confidence: Confidence =
    recentCount >= 10 ? 'estimated' : recentCount >= 3 ? 'demo' : 'demo';

  return { recentCount, trend, windowDays, lastObservedAt, confidence };
}

/* ── 통합 평가 ────────────────────────────────────────────── */

export interface MarineStateInput {
  speciesId: string;
  zoneId?: string;
  date: DateKey;
  seaRegion?: RegulationContext['seaRegion'];
  adminRegion?: string;
  method?: RegulationContext['method'];
}

export interface MarineStateDeps {
  occurrences: readonly FishingOccurrence[];
  rules: readonly LegalRule[];
  sources: ReadonlyMap<string, LegalSource>;
  observations: readonly FishingObservation[];
}

export interface MarineState {
  occurrence: {
    active: boolean;
    state: SeasonState;
    peak: boolean;
    evaluations: SeasonEvaluation[];
    /** 여러 권역을 합쳐 본 대표 시즌 */
    best?: SeasonEvaluation;
  };
  regulation: LegalEvaluation;
  observation: ObservationSummary;
}

/**
 * evaluateMarineState — Phase 1 의 단일 진입점.
 * 시즌 · 규정 · 관측을 각각 평가해 합치지 않은 채로 돌려준다.
 */
export function evaluateMarineState(
  input: MarineStateInput,
  deps: MarineStateDeps,
): MarineState {
  const relevant = deps.occurrences.filter(
    (o) =>
      o.speciesId === input.speciesId &&
      (input.zoneId ? o.zoneId === input.zoneId : true) &&
      (o.yearSpecific ? o.yearSpecific === Number(input.date.slice(0, 4)) : true),
  );

  const evaluations = relevant.map((o) => evaluateSeason(o, input.date));
  const state = strongestState(evaluations.map((e) => e.state));

  const best =
    evaluations
      .slice()
      .sort((a, b) => SEASON_STRENGTH_ORDER[b.state] - SEASON_STRENGTH_ORDER[a.state])[0] ??
    undefined;

  const regulation = evaluateFishingStatus(
    {
      speciesId: input.speciesId,
      date: input.date,
      zoneId: input.zoneId,
      seaRegion: input.seaRegion,
      adminRegion: input.adminRegion,
      method: input.method,
    },
    deps.rules,
    deps.sources,
  );

  const scopedObservations = deps.observations.filter(
    (o) =>
      o.speciesId === input.speciesId && (input.zoneId ? o.zoneId === input.zoneId : true),
  );

  return {
    occurrence: {
      active: state !== 'off',
      state,
      peak: state === 'peak',
      evaluations,
      best,
    },
    regulation,
    observation: summarizeObservations(scopedObservations, input.date),
  };
}

/** UI 가 Date 로 받고 싶을 때 */
export function toDates(window: DateWindow) {
  return { start: fromDateKey(window.start), end: fromDateKey(window.end) };
}
