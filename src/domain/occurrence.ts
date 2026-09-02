import {
  addDays,
  diffDays,
  fromDateKey,
  getYear,
  isLeapYear,
  type DateKey,
} from './date';
import type {
  Location,
  NatureEntity,
  NatureOccurrence,
  OccurrenceStatus,
  ResolvedOccurrence,
} from './types';

/** 종료 후 이 기간까지는 'ended' 로 노출한다. 그 뒤로는 다음 주기의 'upcoming'. */
const RECENT_END_DAYS = 14;

export interface DateWindow {
  start: DateKey;
  end: DateKey;
}

function normalizeMonthDay(year: number, monthDay: string): DateKey {
  let md = monthDay;
  if (md === '02-29' && !isLeapYear(year)) md = '02-28';
  return `${year}-${md}`;
}

/** annual occurrence 가 연말을 넘기는가 (예: 12-15 ~ 01-31) */
function wrapsYear(occ: NatureOccurrence): boolean {
  return occ.recurrence === 'annual' && occ.startDate > occ.endDate;
}

/** 기준 연도 주변의 후보 구간들 */
function candidateWindows(occ: NatureOccurrence, ref: DateKey): DateWindow[] {
  if (occ.recurrence === 'once') {
    return [{ start: occ.startDate, end: occ.endDate }];
  }
  const wrap = wrapsYear(occ);
  const base = getYear(ref);
  return [base - 1, base, base + 1].map((year) => ({
    start: normalizeMonthDay(year, occ.startDate),
    end: normalizeMonthDay(wrap ? year + 1 : year, occ.endDate),
  }));
}

/**
 * 기준일에 해당하는 구간을 고른다.
 *  1. 기준일을 포함하는 구간
 *  2. 최근에 끝난 구간 (14일 이내)
 *  3. 다음에 시작할 구간
 */
export function resolveWindow(
  occ: NatureOccurrence,
  ref: DateKey,
): { window: DateWindow; isCurrent: boolean } {
  const candidates = candidateWindows(occ, ref);

  const current = candidates.find((w) => w.start <= ref && ref <= w.end);
  if (current) return { window: current, isCurrent: true };

  const recentlyEnded = candidates
    .filter((w) => w.end < ref && diffDays(w.end, ref) <= RECENT_END_DAYS)
    .sort((a, b) => (a.end < b.end ? 1 : -1))[0];
  if (recentlyEnded) return { window: recentlyEnded, isCurrent: false };

  const next = candidates
    .filter((w) => w.start > ref)
    .sort((a, b) => (a.start < b.start ? -1 : 1))[0];
  if (next) return { window: next, isCurrent: false };

  const last = candidates[candidates.length - 1]!;
  return { window: last, isCurrent: false };
}

/** peak 구간을 본 구간 안쪽으로 정렬해 계산한다 */
function resolvePeakWindow(
  occ: NatureOccurrence,
  window: DateWindow,
): DateWindow | undefined {
  if (!occ.peakStartDate || !occ.peakEndDate) return undefined;
  if (occ.recurrence === 'once') {
    return { start: occ.peakStartDate, end: occ.peakEndDate };
  }
  const startYear = getYear(window.start);
  for (const year of [startYear, startYear + 1]) {
    const start = normalizeMonthDay(year, occ.peakStartDate);
    const end = normalizeMonthDay(
      occ.peakStartDate > occ.peakEndDate ? year + 1 : year,
      occ.peakEndDate,
    );
    if (start >= window.start && end <= window.end) return { start, end };
  }
  return undefined;
}

export function computeStatus(
  ref: DateKey,
  window: DateWindow,
  peak?: DateWindow,
): OccurrenceStatus {
  if (ref < window.start) return 'upcoming';
  if (ref > window.end) return 'ended';
  if (peak && ref >= peak.start && ref <= peak.end) return 'peak';

  const total = diffDays(window.start, window.end) + 1;
  const index = diffDays(window.start, ref);
  const edge = Math.max(2, Math.round(total * 0.12));

  if (index < edge) return 'starting';
  if (index >= total - edge) return 'ending';
  return 'active';
}

interface NextChange {
  days: number;
  label: string;
}

function computeNextChange(
  occ: NatureOccurrence,
  ref: DateKey,
  status: OccurrenceStatus,
  window: DateWindow,
  peak: DateWindow | undefined,
): NextChange | undefined {
  const restricted = occ.polarity === 'restricted';

  switch (status) {
    case 'upcoming':
      return {
        days: diffDays(ref, window.start),
        label: restricted ? '금어기 시작까지' : '시작까지',
      };
    case 'starting':
    case 'active':
      if (peak && ref < peak.start) {
        return { days: diffDays(ref, peak.start), label: '절정까지' };
      }
      return {
        days: diffDays(ref, addDays(window.end, 1)),
        label: restricted ? '해제까지' : '종료까지',
      };
    case 'peak':
      return { days: diffDays(ref, addDays(peak?.end ?? window.end, 1)), label: '절정 종료까지' };
    case 'ending':
      return {
        days: diffDays(ref, addDays(window.end, 1)),
        label: restricted ? '해제까지' : '종료까지',
      };
    case 'ended': {
      const nextWindow = candidateWindows(occ, ref)
        .filter((w) => w.start > ref)
        .sort((a, b) => (a.start < b.start ? -1 : 1))[0];
      if (!nextWindow) return undefined;
      return {
        days: diffDays(ref, nextWindow.start),
        label: restricted ? '다음 금어기까지' : '내년 시작까지',
      };
    }
  }
}

export interface ResolveContext {
  entities: ReadonlyMap<string, NatureEntity>;
  locations: ReadonlyMap<string, Location>;
}

/**
 * occurrence 를 선택 날짜 기준으로 해석한다.
 * UI 는 이 결과만 소비하고 원본 날짜 문자열을 직접 파싱하지 않는다.
 */
export function resolveOccurrence(
  occ: NatureOccurrence,
  ref: DateKey,
  ctx: ResolveContext,
): ResolvedOccurrence | null {
  const entity = ctx.entities.get(occ.entityId);
  if (!entity) return null;

  const { window } = resolveWindow(occ, ref);
  const peak = resolvePeakWindow(occ, window);
  const status = computeStatus(ref, window, peak);
  const next = computeNextChange(occ, ref, status, window, peak);

  const total = diffDays(window.start, window.end) + 1;
  const index = diffDays(window.start, ref);
  const progress = Math.min(1, Math.max(0, (index + 1) / total));

  const locations = occ.locationIds
    .map((id) => ctx.locations.get(id))
    .filter((l): l is Location => Boolean(l));

  return {
    occurrence: occ,
    entity,
    locations,
    window: { start: fromDateKey(window.start), end: fromDateKey(window.end) },
    peakWindow: peak
      ? { start: fromDateKey(peak.start), end: fromDateKey(peak.end) }
      : undefined,
    status,
    daysToNextChange: next?.days,
    nextChangeLabel: next?.label,
    progress,
  };
}

/** 지도에 그릴 만큼 '지금 유효한' 상태인가 */
export function isOnMap(status: OccurrenceStatus): boolean {
  return status !== 'upcoming' && status !== 'ended';
}

/** Nature Now 에 올릴 만한 상태인가 */
export function isHappeningNow(status: OccurrenceStatus): boolean {
  return status === 'starting' || status === 'active' || status === 'peak' || status === 'ending';
}

const STATUS_RANK: Record<OccurrenceStatus, number> = {
  peak: 0,
  active: 1,
  starting: 2,
  ending: 3,
  upcoming: 4,
  ended: 5,
};

export function compareByRelevance(a: ResolvedOccurrence, b: ResolvedOccurrence): number {
  const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (rank !== 0) return rank;
  const weight = (b.occurrence.weight ?? 0.5) - (a.occurrence.weight ?? 0.5);
  if (weight !== 0) return weight;
  return a.entity.name.localeCompare(b.entity.name, 'ko');
}
