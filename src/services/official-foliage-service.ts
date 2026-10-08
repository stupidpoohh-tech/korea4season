import { diffDays, getYear, todayKey, type DateKey } from '@/domain/date';
import {
  FORECAST_LOCATION_ANCHOR,
  FORECAST_YEAR,
  OFFICIAL_FOLIAGE_FORECAST_2026,
  TREE_GROUP_LABEL,
  type FoliageTreeGroup,
  type OfficialFoliageForecast,
} from '@/domain/official-foliage-forecast';
import type { MapPosition } from '@/domain/projection';
import { locationBySlug, locationPosition } from './nature-service';

/* ────────────────────────────────────────────────────────────
 * 공식 절정 예측일을 화면의 시간으로 옮긴다.
 *
 * 여기서 만드는 값은 전부 공식 날짜에서 바로 셀 수 있는 것뿐이다 —
 * 선택한 날짜가 그 날에 닿았는가, 며칠 남았는가, 같은 날이 몇 곳인가.
 *
 * 만들지 않는 것: 시작일 · 종료일 · 진행률 · 상태 이름.
 * 공식 자료에 없는 사실이므로 화면이 그것을 말할 수 없다.
 *
 * 이름에도 그 구분을 담는다. peakDateReached 는 "이 산이 절정이다" 가 아니라
 * "공식 절정 예측일이 이 날짜까지 왔다" 는 뜻이다.
 * ──────────────────────────────────────────────────────────── */

/** 선택 날짜가 공식 절정 예측일에 닿았는가 */
export function peakDateReached(selected: DateKey, peakForecastDate: string): boolean {
  return selected >= peakForecastDate;
}

/** '곧' 의 폭. 공식 날짜에서 세는 값이라 자연 상태를 지어내는 것이 아니다. */
export const UPCOMING_DAYS = 7;

export function forecastsFor(group: FoliageTreeGroup): OfficialFoliageForecast[] {
  return OFFICIAL_FOLIAGE_FORECAST_2026.filter((f) => f.treeGroup === group).sort(
    (a, b) => a.peakForecastDate.localeCompare(b.peakForecastDate),
  );
}

export interface ForecastRow {
  forecast: OfficialFoliageForecast;
  /** 선택 날짜에서 공식 절정 예측일까지 며칠인가 (음수면 이미 지났다) */
  daysUntil: number;
  reached: boolean;
  /** 지도에 올릴 자리. 이을 anchor 가 없으면 null 이다. */
  position: MapPosition | null;
}

function anchorPosition(locationId: string): MapPosition | null {
  const slug = FORECAST_LOCATION_ANCHOR[locationId];
  if (!slug) return null;
  const location = locationBySlug(slug);
  return location ? locationPosition(location) : null;
}

/** 이 해에 공식 예측을 쓸 수 있는가. 2026 자료만 받았다. */
export function hasOfficialForecast(date: DateKey): boolean {
  return getYear(date) === FORECAST_YEAR;
}

export function buildForecastRows(date: DateKey, group: FoliageTreeGroup): ForecastRow[] {
  return forecastsFor(group).map((forecast) => ({
    forecast,
    daysUntil: diffDays(date, forecast.peakForecastDate as DateKey),
    reached: peakDateReached(date, forecast.peakForecastDate),
    position: anchorPosition(forecast.locationId),
  }));
}

/** 지도가 칠할 자리 — anchor 로 이어진 공식 지점만 */
export interface PaintAnchor {
  id: string;
  name: string;
  anchor: MapPosition;
  peakForecastDate: string;
  reached: boolean;
}

export function paintAnchors(rows: ForecastRow[]): PaintAnchor[] {
  const out: PaintAnchor[] = [];
  for (const row of rows) {
    if (!row.position) continue;
    out.push({
      id: row.forecast.locationId,
      name: row.forecast.locationName,
      anchor: row.position,
      peakForecastDate: row.forecast.peakForecastDate,
      reached: row.reached,
    });
  }
  return out;
}

/** 지도에 이을 anchor 가 없는 공식 지점. 지우지 않고 목록에만 남긴다. */
export function unmappedForecasts(rows: ForecastRow[]): ForecastRow[] {
  return rows.filter((row) => row.position === null);
}

/* ── 공식 날짜에서 바로 세는 값들 ─────────────────────────── */

export interface OfficialForecastNow {
  group: FoliageTreeGroup;
  groupLabel: string;
  /** 선택 날짜가 공식 절정 예측일인 곳 */
  today: ForecastRow[];
  /** 선택 날짜로부터 7일 안에 절정 예측일이 오는 곳 */
  upcoming: ForecastRow[];
  /** 이미 예측일이 지난 곳 */
  passed: ForecastRow[];
  /** 아직 오지 않은 곳 전체 (upcoming 포함) */
  ahead: ForecastRow[];
  rows: ForecastRow[];
  paint: PaintAnchor[];
  unmapped: ForecastRow[];
  /** 이 수종의 공식 예측이 걸쳐 있는 구간 */
  season: { first: string; last: string } | null;
  /** 날짜별 공식 예측 지점 수 — 타임라인의 점 */
  timeline: { date: string; count: number }[];
  headline: string;
  caption: string;
}

export function buildOfficialForecastNow(
  date: DateKey,
  group: FoliageTreeGroup,
): OfficialForecastNow {
  const rows = hasOfficialForecast(date) ? buildForecastRows(date, group) : [];
  const today = rows.filter((r) => r.daysUntil === 0);
  const ahead = rows.filter((r) => r.daysUntil > 0);
  const upcoming = ahead.filter((r) => r.daysUntil <= UPCOMING_DAYS);
  const passed = rows.filter((r) => r.daysUntil < 0);

  const all = forecastsFor(group);
  const season =
    all.length > 0
      ? { first: all[0]!.peakForecastDate, last: all[all.length - 1]!.peakForecastDate }
      : null;

  const byDate = new Map<string, number>();
  for (const f of all) byDate.set(f.peakForecastDate, (byDate.get(f.peakForecastDate) ?? 0) + 1);
  const timeline = [...byDate.entries()]
    .map(([d, count]) => ({ date: d, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    group,
    groupLabel: TREE_GROUP_LABEL[group],
    today,
    upcoming,
    passed,
    ahead,
    rows,
    paint: paintAnchors(rows),
    unmapped: unmappedForecasts(rows),
    season,
    timeline,
    headline: headlineFor(date, today, ahead, season, rows.length > 0),
    caption: captionFor(today, upcoming, passed, rows.length > 0),
  };
}

const md = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`;

function headlineFor(
  date: DateKey,
  today: ForecastRow[],
  ahead: ForecastRow[],
  season: { first: string; last: string } | null,
  hasData: boolean,
): string {
  if (!hasData) return '2026 단풍절정 예측';
  if (today.length > 0) return `${md(date)} · 공식 절정예측 ${today.length}곳`;
  if (season && date < season.first) {
    return `첫 공식 절정예측 ${md(season.first)}`;
  }
  const next = ahead[0];
  if (next) return `다음 공식 절정예측 ${md(next.forecast.peakForecastDate)}`;
  return '공식 절정예측일이 모두 지났습니다';
}

function captionFor(
  today: ForecastRow[],
  upcoming: ForecastRow[],
  passed: ForecastRow[],
  hasData: boolean,
): string {
  if (!hasData) return `공식 예측 · ${TREE_GROUP_LABEL.MAPLE} 기준 2026년 자료만 있습니다`;
  const parts: string[] = [];
  if (today.length > 0) parts.push(`오늘 ${today.length}곳`);
  if (upcoming.length > 0) parts.push(`${UPCOMING_DAYS}일 안 ${upcoming.length}곳`);
  if (passed.length > 0) parts.push(`예측일 지남 ${passed.length}곳`);
  return parts.length > 0 ? parts.join(' · ') : '아직 예측일이 오지 않았습니다';
}

/** 며칠 남았는지를 사람이 읽는 말로. 공식 날짜에서 뺀 값이라 지어낸 것이 없다. */
export function daysUntilLabel(days: number): string {
  if (days === 0) return '오늘';
  if (days === 1) return '내일';
  if (days === 2) return '모레';
  if (days > 0) return `${days}일 뒤`;
  if (days === -1) return '어제';
  return `${-days}일 전`;
}

/** 공식 지점의 날짜 표기 — "10.27" */
export function shortDate(iso: string): string {
  return `${Number(iso.slice(5, 7))}.${iso.slice(8, 10)}`;
}

/** 오늘 기준으로 공식 예측이 도는 해인지 (안내 문구용) */
export function forecastYearNote(): string {
  return getYear(todayKey()) === FORECAST_YEAR
    ? `${FORECAST_YEAR} 공식 단풍절정 예측`
    : `${FORECAST_YEAR} 공식 단풍절정 예측 (해당 연도 자료만 있습니다)`;
}
