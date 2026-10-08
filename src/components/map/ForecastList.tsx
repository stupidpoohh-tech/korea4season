'use client';

import { PEAK_CRITERION } from '@/domain/official-foliage-forecast';
import {
  UPCOMING_DAYS,
  daysUntilLabel,
  shortDate,
  type ForecastRow,
  type OfficialForecastNow,
} from '@/services/official-foliage-service';

/* ────────────────────────────────────────────────────────────
 * 공식 절정 예측 목록.
 *
 * 여기 적히는 것은 공식 날짜와, 그 날짜에서 바로 빼서 나오는 값뿐이다 —
 * 오늘인가, 며칠 뒤인가, 몇 곳인가.
 *
 * '시작 중' · '한창' · '끝물' 은 적지 않는다. 공식 자료에 없는 말이다.
 * ──────────────────────────────────────────────────────────── */

function Row({ row, onSelect }: { row: ForecastRow; onSelect?: () => void }) {
  const mapped = row.position !== null;
  return (
    <li>
      <button
        type="button"
        disabled={!mapped}
        onClick={onSelect}
        className={`flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
          mapped ? 'hover:bg-white' : 'cursor-default'
        }`}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] text-[color:var(--color-ink-soft)]">
          {row.forecast.locationName}
          {!mapped && (
            <span className="ml-1 text-[11px] text-[color:var(--color-faint)]">지도 밖</span>
          )}
        </span>
        <span className="tabular shrink-0 text-[12.5px] font-semibold text-[color:var(--color-ink)]">
          {shortDate(row.forecast.peakForecastDate)}
        </span>
        <span className="tabular w-[44px] shrink-0 text-right text-[11.5px] text-[color:var(--color-muted)]">
          {daysUntilLabel(row.daysUntil)}
        </span>
      </button>
    </li>
  );
}

function Section({
  title,
  rows,
  onSelect,
}: {
  title: string;
  rows: ForecastRow[];
  onSelect?: (row: ForecastRow) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="mb-2">
      <h3 className="mb-0.5 px-2 text-[11.5px] font-medium tracking-wide text-[color:var(--color-faint)]">
        {title} <span className="tabular">{rows.length}</span>
      </h3>
      <ul>
        {rows.map((row) => (
          <Row
            key={`${row.forecast.locationId}-${row.forecast.treeGroup}`}
            row={row}
            onSelect={onSelect ? () => onSelect(row) : undefined}
          />
        ))}
      </ul>
    </section>
  );
}

export function ForecastList({
  forecast,
  onSelect,
}: {
  forecast: OfficialForecastNow;
  onSelect?: (row: ForecastRow) => void;
}) {
  const hasAny = forecast.rows.length > 0;

  return (
    <aside aria-label="공식 절정 예측" className="hidden min-h-0 flex-col lg:flex">
      <h2 className="px-0.5 text-[12.5px] font-semibold tracking-tight text-[color:var(--color-ink-soft)]">
        2026 단풍절정 예측
      </h2>
      <p className="mb-2 px-0.5 text-[11px] text-[color:var(--color-faint)]">
        공식 예측 · {PEAK_CRITERION} 기준
      </p>

      {!hasAny ? (
        <p className="rounded-xl border border-dashed border-[color:var(--color-line)] px-3 py-4 text-[12.5px] leading-relaxed text-[color:var(--color-muted)]">
          2026년 공식 예측 자료만 있습니다. 슬라이더를 2026년 10~11월로 옮겨 보세요.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,black_calc(100%-24px),transparent)]">
          <Section title="오늘 절정 예측" rows={forecast.today} onSelect={onSelect} />
          <Section
            title={`${UPCOMING_DAYS}일 안 절정 예측`}
            rows={forecast.upcoming}
            onSelect={onSelect}
          />
          <Section
            title="예측일이 지난 곳"
            rows={[...forecast.passed].reverse()}
            onSelect={onSelect}
          />
          {forecast.today.length === 0 &&
            forecast.upcoming.length === 0 &&
            forecast.passed.length === 0 && (
              <Section title="다가오는 절정 예측" rows={forecast.ahead.slice(0, 8)} onSelect={onSelect} />
            )}
        </div>
      )}
    </aside>
  );
}
