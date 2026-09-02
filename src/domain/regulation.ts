import { addDays, diffDays, isLeapYear, type DateKey } from './date';
import type { FishingMethod, SeaRegion } from './marine';
import type { Confidence } from './types';

/* ────────────────────────────────────────────────────────────
 * 수산자원 규정 엔진
 *
 * 시즌(FishingOccurrence)과 절대 합치지 않는다.
 * 시즌은 "지금 있는가", 규정은 "지금 잡아도 되는가" 를 답한다.
 *
 * 규정은 행동 직전의 safety layer 다.
 * 사용자는 먼저 무엇을 만날 수 있는지 보고, 그 다음 규정을 확인한다.
 * ──────────────────────────────────────────────────────────── */

export type LegalStatusCode =
  /** 규정상 제한 없음 */
  | 'open'
  /** 금어기 진행 중 */
  | 'closed-season'
  /** 기간 제한은 없으나 체장·성별·외포란 등 조건이 붙음 */
  | 'conditional'
  /** 연중 포획 금지 */
  | 'prohibited'
  /** 규정 데이터가 없음 — 없다고 단정하지 않는다 */
  | 'unknown';

export const LEGAL_STATUS_LABEL: Record<LegalStatusCode, string> = {
  open: '조업 가능',
  'closed-season': '금어기',
  conditional: '조건부 가능',
  prohibited: '연중 금지',
  unknown: '규정 미확인',
};

export const LEGAL_STATUS_SYMBOL: Record<LegalStatusCode, string> = {
  open: '○',
  'closed-season': '⛔',
  conditional: '📏',
  prohibited: '⛔',
  unknown: '?',
};

/* ── 출처 ─────────────────────────────────────────────────── */

export type LegalDocumentType =
  | 'statute'
  | 'enforcement-decree'
  | 'ministerial-rule'
  | 'local-notice'
  | 'agency-guide';

export interface LegalSource {
  id: string;
  name: string;
  url?: string;
  documentType: LegalDocumentType;
  /** 공포일 */
  publishedAt?: string;
  /** 시행 기간 */
  effectiveFrom?: string;
  effectiveTo?: string;
  note?: string;
}

/* ── 적용 범위 ────────────────────────────────────────────── */

/**
 * 규정이 어디에 적용되는가.
 * 비어 있는 필드는 '제한 없음' 을 뜻한다 (전국·전 어법).
 */
export interface RuleScope {
  seaRegions?: SeaRegion[];
  zoneIds?: string[];
  /** 시·도 */
  adminRegions?: string[];
  methods?: FishingMethod[];
  /** include: 이 범위에서만 적용 / exclude: 이 범위를 제외하고 적용 */
  mode: 'include' | 'exclude';
  description?: string;
}

/** 금어기 구간. MM-DD, 연말을 넘길 수 있다. */
export interface RuleWindow {
  start: string;
  end: string;
  note?: string;
}

export type MeasurementKind =
  | 'total-length'
  | 'fork-length'
  | 'anal-length'
  | 'carapace-length'
  | 'carapace-width'
  | 'mantle-length'
  | 'weight';

export const MEASUREMENT_LABEL: Record<MeasurementKind, string> = {
  'total-length': '전장',
  'fork-length': '가랑이체장',
  'anal-length': '항문장',
  'carapace-length': '두흉갑장',
  'carapace-width': '갑폭',
  'mantle-length': '외투장',
  weight: '체중',
};

/** 이 값 '이하' 는 포획 금지 */
export interface MeasurementRule {
  kind: MeasurementKind;
  minimumValue: number;
  unit: 'cm' | 'g';
  note?: string;
}

/** 특정 어법·해역만 규정에서 빠지는 경우 */
export interface RuleException {
  id: string;
  description: string;
  appliesTo?: RuleScope;
  sourceId?: string;
}

/** 시·도지사 고시 등으로 기간·수치가 달라지는 경우 */
export interface RuleOverride {
  id: string;
  scope: RuleScope;
  windows?: RuleWindow[];
  measurements?: MeasurementRule[];
  reason: string;
  sourceId?: string;
}

/** 한시적 유예·완화. 특정 연도 구간에만 적용된다. */
export interface TemporaryWaiver {
  id: string;
  scope: RuleScope;
  /** YYYY-MM-DD */
  from: string;
  to: string;
  reason: string;
  sourceId?: string;
}

export type LegalRuleKind =
  | 'closed-season'
  | 'size-limit'
  | 'sex-restriction'
  | 'egg-bearing'
  | 'year-round-ban';

export interface LegalRule {
  id: string;
  speciesId: string;
  kind: LegalRuleKind;
  scope: RuleScope;
  windows: RuleWindow[];
  measurements: MeasurementRule[];
  overrides: RuleOverride[];
  exceptions: RuleException[];
  waivers: TemporaryWaiver[];
  sourceId: string;
  confidence: Confidence;
  /** 마지막으로 원문을 대조한 날짜. 없으면 미검증. */
  lastVerifiedAt?: string;
  note?: string;
}

/* ── 평가 ─────────────────────────────────────────────────── */

export interface RegulationContext {
  speciesId: string;
  date: DateKey;
  zoneId?: string;
  seaRegion?: SeaRegion;
  adminRegion?: string;
  method?: FishingMethod;
}

export interface MatchedWindow {
  start: DateKey;
  end: DateKey;
  note?: string;
}

export interface MatchedRule {
  rule: LegalRule;
  /** override / waiver 적용 후 실제 유효 구간 */
  effectiveWindows: MatchedWindow[];
  activeWindow?: MatchedWindow;
  measurements: MeasurementRule[];
  /** 이 규정이 왜 이렇게 적용됐는지 */
  appliedNotes: string[];
}

export interface NextTransition {
  date: DateKey;
  days: number;
  to: LegalStatusCode;
  label: string;
}

export interface LegalEvaluation {
  overallStatus: LegalStatusCode;
  matchedRules: MatchedRule[];
  activeClosedSeason?: MatchedWindow;
  measurements: MeasurementRule[];
  /** 암컷·외포란 등 행동 직전에 알아야 할 것 */
  cautions: string[];
  /** 어법·해역별 예외 */
  exceptions: string[];
  nextTransition?: NextTransition;
  confidence: Confidence;
  sources: LegalSource[];
  /** 규정 데이터 자체가 없을 때 true — '규정이 없다' 와 구분한다 */
  noData: boolean;
}

/* ── 내부 헬퍼 ────────────────────────────────────────────── */

function normalizeMonthDay(year: number, monthDay: string): DateKey {
  const md = monthDay === '02-29' && !isLeapYear(year) ? '02-28' : monthDay;
  return `${year}-${md}`;
}

function windowsAround(window: RuleWindow, ref: DateKey): MatchedWindow[] {
  const wraps = window.start > window.end;
  const base = Number(ref.slice(0, 4));
  return [base - 1, base, base + 1].map((year) => ({
    start: normalizeMonthDay(year, window.start),
    end: normalizeMonthDay(wraps ? year + 1 : year, window.end),
    note: window.note,
  }));
}

/** scope 가 이 상황에 적용되는가 */
export function scopeMatches(scope: RuleScope, ctx: RegulationContext): boolean {
  const checks: (boolean | null)[] = [
    scope.seaRegions?.length ? Boolean(ctx.seaRegion && scope.seaRegions.includes(ctx.seaRegion)) : null,
    scope.zoneIds?.length ? Boolean(ctx.zoneId && scope.zoneIds.includes(ctx.zoneId)) : null,
    scope.adminRegions?.length
      ? Boolean(ctx.adminRegion && scope.adminRegions.includes(ctx.adminRegion))
      : null,
    scope.methods?.length ? Boolean(ctx.method && scope.methods.includes(ctx.method)) : null,
  ];

  const stated = checks.filter((c): c is boolean => c !== null);
  // 아무 조건도 명시되지 않으면 전국·전 어법에 적용된다
  const hit = stated.length === 0 ? true : stated.every(Boolean);
  return scope.mode === 'exclude' ? !hit : hit;
}

function waiverActive(waiver: TemporaryWaiver, ctx: RegulationContext): boolean {
  return (
    waiver.from <= ctx.date && ctx.date <= waiver.to && scopeMatches(waiver.scope, ctx)
  );
}

/** scope 가 더 구체적일수록 우선한다 */
function scopeSpecificity(scope: RuleScope): number {
  return (
    (scope.zoneIds?.length ? 8 : 0) +
    (scope.adminRegions?.length ? 4 : 0) +
    (scope.methods?.length ? 2 : 0) +
    (scope.seaRegions?.length ? 1 : 0)
  );
}

function evaluateRule(rule: LegalRule, ctx: RegulationContext): MatchedRule | null {
  if (rule.speciesId !== ctx.speciesId) return null;
  if (!scopeMatches(rule.scope, ctx)) return null;

  const appliedNotes: string[] = [];

  // 한시적 유예가 걸려 있으면 이 규정은 이번 조회에서 적용되지 않는다
  const waiver = rule.waivers.find((w) => waiverActive(w, ctx));
  if (waiver) {
    return {
      rule,
      effectiveWindows: [],
      measurements: [],
      appliedNotes: [`한시적 유예 적용: ${waiver.reason}`],
    };
  }

  // 더 구체적인 override 가 기본 규정을 대체한다
  const override = rule.overrides
    .filter((o) => scopeMatches(o.scope, ctx))
    .sort((a, b) => scopeSpecificity(b.scope) - scopeSpecificity(a.scope))[0];

  if (override) appliedNotes.push(`지역 고시 적용: ${override.reason}`);

  const windows = override?.windows ?? rule.windows;
  const measurements = override?.measurements ?? rule.measurements;

  const effectiveWindows = windows.flatMap((w) => windowsAround(w, ctx.date));
  const activeWindow = effectiveWindows.find((w) => w.start <= ctx.date && ctx.date <= w.end);

  return { rule, effectiveWindows, activeWindow, measurements, appliedNotes };
}

function nextTransitionFor(
  matched: MatchedRule[],
  ctx: RegulationContext,
  status: LegalStatusCode,
): NextTransition | undefined {
  if (status === 'closed-season') {
    const active = matched.find((m) => m.activeWindow)?.activeWindow;
    if (!active) return undefined;
    const date = addDays(active.end, 1);
    return { date, days: diffDays(ctx.date, date), to: 'open', label: '금어기 해제까지' };
  }

  const upcoming = matched
    .flatMap((m) => m.effectiveWindows)
    .filter((w) => w.start > ctx.date)
    .sort((a, b) => (a.start < b.start ? -1 : 1))[0];

  if (!upcoming) return undefined;
  return {
    date: upcoming.start,
    days: diffDays(ctx.date, upcoming.start),
    to: 'closed-season',
    label: '금어기 시작까지',
  };
}

const CONFIDENCE_ORDER: Confidence[] = ['official', 'predicted', 'estimated', 'demo'];

function weakestConfidence(values: Confidence[]): Confidence {
  if (!values.length) return 'demo';
  return values.reduce((worst, v) =>
    CONFIDENCE_ORDER.indexOf(v) > CONFIDENCE_ORDER.indexOf(worst) ? v : worst,
  );
}

/**
 * 특정 어종을 특정 시점·장소에서 잡아도 되는지 판정한다.
 *
 * 규정이 하나도 없으면 'unknown' 을 돌려준다.
 * "규정이 없다" 가 아니라 "확인된 규정이 없다" 는 뜻이며 UI 도 그렇게 표기한다.
 */
export function evaluateFishingStatus(
  ctx: RegulationContext,
  rules: readonly LegalRule[],
  sources: ReadonlyMap<string, LegalSource>,
): LegalEvaluation {
  const matched = rules
    .map((rule) => evaluateRule(rule, ctx))
    .filter((m): m is MatchedRule => m !== null);

  if (matched.length === 0) {
    return {
      overallStatus: 'unknown',
      matchedRules: [],
      measurements: [],
      cautions: [],
      exceptions: [],
      confidence: 'demo',
      sources: [],
      noData: true,
    };
  }

  const cautions: string[] = [];
  const exceptions: string[] = [];
  const measurements: MeasurementRule[] = [];

  let status: LegalStatusCode = 'open';
  let activeClosedSeason: MatchedWindow | undefined;

  for (const m of matched) {
    for (const note of m.appliedNotes) cautions.push(note);
    for (const ex of m.rule.exceptions) {
      if (!ex.appliesTo || scopeMatches(ex.appliesTo, ctx)) exceptions.push(ex.description);
    }

    switch (m.rule.kind) {
      case 'year-round-ban':
        status = 'prohibited';
        cautions.push(m.rule.note ?? '연중 포획이 금지된 대상입니다');
        break;
      case 'closed-season':
        if (m.activeWindow) {
          if (status !== 'prohibited') status = 'closed-season';
          activeClosedSeason ??= m.activeWindow;
        }
        break;
      case 'size-limit':
        measurements.push(...m.measurements);
        break;
      case 'sex-restriction':
      case 'egg-bearing':
        cautions.push(m.rule.note ?? '성별·포란 개체 제한이 있습니다');
        break;
    }
  }

  if (status === 'open' && (measurements.length > 0 || cautions.length > 0)) {
    status = 'conditional';
  }

  const sourceIds = new Set(matched.map((m) => m.rule.sourceId));
  const resolvedSources = [...sourceIds]
    .map((id) => sources.get(id))
    .filter((s): s is LegalSource => Boolean(s));

  return {
    overallStatus: status,
    matchedRules: matched,
    activeClosedSeason,
    measurements,
    cautions: [...new Set(cautions)],
    exceptions: [...new Set(exceptions)],
    nextTransition: nextTransitionFor(matched, ctx, status),
    confidence: weakestConfidence(matched.map((m) => m.rule.confidence)),
    sources: resolvedSources,
    noData: false,
  };
}

/** 이 상태에서 '잡으러 가도 되는' 대상인가 — 추천에서 제외 판정에 쓴다 */
export function isCatchable(status: LegalStatusCode): boolean {
  return status === 'open' || status === 'conditional' || status === 'unknown';
}

/** 규정 때문에 지금 잡을 수 없는가 */
export function isLegallyBlocked(status: LegalStatusCode): boolean {
  return status === 'closed-season' || status === 'prohibited';
}
