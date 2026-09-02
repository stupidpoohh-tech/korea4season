/**
 * 날짜는 앱 전역에서 'YYYY-MM-DD' 문자열(DateKey)로 다룬다.
 * URL 에 그대로 실을 수 있고, 서버/클라이언트 타임존 차이로
 * hydration 이 어긋나지 않는다. (요구사항 #6, #31)
 *
 * 계산이 필요할 때만 UTC 자정 Date 로 변환한다.
 */
export type DateKey = string;

const DAY_MS = 86_400_000;
/** 한국 표준시 오프셋 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_DAY_PATTERN = /^\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, '0');

/** UTC 기준으로 DateKey 생성 */
export function toDateKey(date: Date): DateKey {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** DateKey -> UTC 자정 Date */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

export function makeDateKey(year: number, month: number, day: number): DateKey {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function isValidDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) return false;
  const date = fromDateKey(value);
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value;
}

/** 사용자가 어느 타임존에 있든 '한국의 오늘' */
export function todayKey(now: number = Date.now()): DateKey {
  return toDateKey(new Date(now + KST_OFFSET_MS));
}

export function addDays(key: DateKey, days: number): DateKey {
  return toDateKey(new Date(fromDateKey(key).getTime() + days * DAY_MS));
}

/** b - a (일 단위) */
export function diffDays(a: DateKey | Date, b: DateKey | Date): number {
  const da = a instanceof Date ? a : fromDateKey(a);
  const db = b instanceof Date ? b : fromDateKey(b);
  return Math.round((db.getTime() - da.getTime()) / DAY_MS);
}

export function getYear(key: DateKey): number {
  return Number(key.slice(0, 4));
}

export function getMonth(key: DateKey): number {
  return Number(key.slice(5, 7));
}

export function getDay(key: DateKey): number {
  return Number(key.slice(8, 10));
}

/** 'YYYY-MM-DD' -> 'MM-DD' */
export function toMonthDay(key: DateKey): string {
  return key.slice(5);
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 1 ~ 365/366 */
export function dayOfYear(key: DateKey): number {
  const start = Date.UTC(getYear(key), 0, 1);
  return Math.round((fromDateKey(key).getTime() - start) / DAY_MS) + 1;
}

export function fromDayOfYear(year: number, day: number): DateKey {
  const total = daysInYear(year);
  const clamped = Math.min(Math.max(day, 1), total);
  return toDateKey(new Date(Date.UTC(year, 0, clamped)));
}

/** 월요일 시작 주의 시작일 */
export function startOfWeek(key: DateKey): DateKey {
  const dow = fromDateKey(key).getUTCDay(); // 0=일
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(key, -back);
}

export function endOfWeek(key: DateKey): DateKey {
  return addDays(startOfWeek(key), 6);
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function formatKoreanDate(
  key: DateKey,
  options: { year?: boolean; weekday?: boolean } = {},
): string {
  const { year = false, weekday = false } = options;
  const base = `${getMonth(key)}월 ${getDay(key)}일`;
  const withYear = year ? `${getYear(key)}년 ${base}` : base;
  if (!weekday) return withYear;
  const w = WEEKDAY_KO[fromDateKey(key).getUTCDay()] ?? '';
  return `${withYear} (${w})`;
}

export function formatMonthDay(monthDay: string): string {
  const [m, d] = monthDay.split('-').map(Number);
  return `${m ?? 0}월 ${d ?? 0}일`;
}

/** 단독으로 쓰는 라벨: '오늘' / '13일 후' / '3일 전' */
export function formatCountdown(days: number): string {
  if (days === 0) return '오늘';
  if (days > 0) return `${days}일 후`;
  return `${Math.abs(days)}일 전`;
}

/**
 * '해제까지' 같은 라벨 뒤에 붙이는 값.
 * 라벨이 이미 '까지' 를 품고 있으므로 '후' 를 덧붙이지 않는다.
 */
export function formatDaysValue(days: number): string {
  if (days === 0) return '오늘';
  if (days > 0) return `${days}일`;
  return `${Math.abs(days)}일 전`;
}
