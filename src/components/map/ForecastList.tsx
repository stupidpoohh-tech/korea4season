'use client';

import { PEAK_CRITERION } from '@/domain/official-foliage-forecast';
import { UPCOMING_DAYS, daysUntilLabel, shortDate, type ForecastRow, type OfficialForecastNow } from '@/services/official-foliage-service';

interface Props {
  forecast: OfficialForecastNow;
  onSelect: (row: ForecastRow) => void;
  selectedId?: string | null;
  embedded?: boolean;
}

/** 데스크톱 레일과 모바일 시트가 같은 전체 목록을 사용한다. */
export function ForecastList({ forecast, onSelect, selectedId, embedded = false }: Props) {
  const sections = [
    { title: '선택 날짜에 절정 예측', rows: forecast.today },
    { title: `${UPCOMING_DAYS}일 안 절정 예측`, rows: forecast.upcoming },
    { title: '이후 절정 예측', rows: forecast.ahead.filter((r) => r.daysUntil > UPCOMING_DAYS) },
    { title: '예측일이 지난 곳', rows: [...forecast.passed].reverse() },
  ];

  return (
    <aside aria-label="절정 예측 장소 목록" className={embedded ? 'min-w-0' : 'flex min-h-0 flex-col'}>
      <h2 className="text-[13px] font-semibold text-[color:var(--color-ink-soft)]">
        2026 단풍 절정 예측 · {forecast.groupLabel}
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--color-muted)]">
        {PEAK_CRITERION} 기준 · 실시간 현황이 아닙니다
      </p>
      <p className="mb-3 mt-1 text-[11px] leading-relaxed text-[color:var(--color-muted)]">
        제공된 예측지도 기반 · 발행처와 원문은 확인 중입니다.
      </p>
      {forecast.rows.length === 0 ? (
        <p className="py-3 text-[13px] text-[color:var(--color-muted)]">2026년 자료만 있습니다. 날짜를 2026년 10~11월로 옮겨 보세요.</p>
      ) : (
        <div className={embedded ? '' : 'min-h-0 flex-1 overflow-y-auto pr-1'}>
          <p className="mb-3 text-[11px] text-[color:var(--color-muted)]">
            전체 {forecast.rows.length}곳 · 지도 연결 {forecast.paint.length}곳
          </p>
          {sections.filter((s) => s.rows.length > 0).map((section) => (
            <section key={section.title} className="mb-4">
              <h3 className="mb-1 text-[11.5px] font-medium text-[color:var(--color-muted)]">
                {section.title} · {section.rows.length}
              </h3>
              <ul>
                {section.rows.map((row) => {
                  const selected = selectedId === row.forecast.locationId;
                  return (
                    <li key={row.forecast.locationId}>
                      <button type="button" onClick={() => onSelect(row)} aria-pressed={selected}
                        className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${selected ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : 'hover:bg-[color:var(--color-line-soft)]'}`}>
                        <span className="min-w-0 flex-1 text-[13px] text-[color:var(--color-ink-soft)]">
                          <span className="block">{row.forecast.locationName}</span>
                          {!row.position && <span className="block text-[10.5px] text-[color:var(--color-muted)]">지도 위치 미연결</span>}
                        </span>
                        <span className="tabular shrink-0 text-[13px] font-semibold">{shortDate(row.forecast.peakForecastDate)}</span>
                        <span className="tabular w-12 shrink-0 text-right text-[11px] text-[color:var(--color-muted)]">{daysUntilLabel(row.daysUntil)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}
