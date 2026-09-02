'use client';

import { useMemo } from 'react';
import { formatKoreanDate, toDateKey, type DateKey } from '@/domain/date';
import { Sheet } from '@/components/common/Sheet';
import {
  FOLIAGE_STATE_LABEL,
  getFoliagePicks,
  type FoliageSpot,
} from '@/services/foliage-service';

/* ────────────────────────────────────────────────────────────
 * 이번 주 단풍 어디가 좋지.
 *
 * 추천은 단순하게 둔다 — 절정 먼저, 그다음 좋음, 그리고 북쪽부터.
 * 거리 · 날씨 · 교통은 이번 단계에서 보지 않는다.
 * ──────────────────────────────────────────────────────────── */

export function FoliagePicksSheet({
  open,
  onClose,
  date,
  onShowOnMap,
}: {
  open: boolean;
  onClose: () => void;
  date: DateKey;
  onShowOnMap: (spot: FoliageSpot) => void;
}) {
  const picks = useMemo(() => (open ? getFoliagePicks(date, 6) : []), [open, date]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="이번 주 단풍"
      header={
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight">이번 주, 단풍 어디가 좋지?</h2>
          <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">
            {formatKoreanDate(date)} 기준 · 절정인 곳부터
          </p>
        </div>
      }
    >
      {picks.length === 0 ? (
        <p className="rounded-xl bg-[color:var(--color-line-soft)] px-3 py-3 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          이 날짜에는 절정이거나 볼 만한 곳이 없습니다. 아래 슬라이더를 10월로 옮겨 보세요.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {picks.map((spot) => (
            <li
              key={spot.location.id}
              className="flex items-start gap-3 rounded-xl border border-[color:var(--color-line)] p-3"
            >
              <span
                aria-hidden
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-peak-soft)] text-[17px]"
              >
                {spot.entity.icon}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[14.5px] font-semibold">{spot.location.name}</span>
                  <span
                    className={`text-[12px] font-medium ${
                      spot.state === 'peak'
                        ? 'text-[color:var(--color-peak)]'
                        : 'text-[color:var(--color-accent-strong)]'
                    }`}
                  >
                    {FOLIAGE_STATE_LABEL[spot.state]}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[12.5px] text-[color:var(--color-muted)]">
                  📍 {spot.location.region}
                  {spot.peakWindow &&
                    ` · 절정 ${formatKoreanDate(toDateKey(spot.peakWindow.start))} ~ ${formatKoreanDate(toDateKey(spot.peakWindow.end))}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onShowOnMap(spot);
                  onClose();
                }}
                className="shrink-0 self-center rounded-lg border border-[color:var(--color-line)] px-2.5 py-1.5 text-[12px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-strong)]"
              >
                지도에서 보기
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11.5px] leading-relaxed text-[color:var(--color-faint)]">
        단풍 시기는 개발용 DEMO 평년 참고값입니다. 그해 기온에 따라 1~2주씩 달라지니
        방문 전 국립공원·지자체 정보를 확인하세요.
      </p>
    </Sheet>
  );
}
