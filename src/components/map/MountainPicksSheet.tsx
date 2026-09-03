'use client';

import { formatKoreanDate, toDateKey, type DateKey } from '@/domain/date';
import { Sheet } from '@/components/common/Sheet';
import type { Location, NatureEntity } from '@/domain/types';

/* ────────────────────────────────────────────────────────────
 * 이번 주 어디가 좋지 — 꽃과 단풍이 같은 시트를 쓴다.
 *
 * 추천은 단순하게 둔다 — 절정 먼저, 그다음 좋음.
 * 순서는 전선이 지나가는 방향 그대로다 (봄은 남쪽부터, 가을은 북쪽부터).
 * 거리 · 날씨 · 교통은 이번 단계에서 보지 않는다.
 * ──────────────────────────────────────────────────────────── */

export interface PickView {
  key: string;
  location: Location;
  entity: NatureEntity;
  stateLabel: string;
  peak: boolean;
  peakWindow?: { start: Date; end: Date };
}

export function MountainPicksSheet({
  open,
  onClose,
  date,
  title,
  emptyMessage,
  disclaimer,
  picks,
  onShowOnMap,
}: {
  open: boolean;
  onClose: () => void;
  date: DateKey;
  title: string;
  emptyMessage: string;
  disclaimer: string;
  picks: PickView[];
  onShowOnMap: (pick: PickView) => void;
}) {

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="이번 주 추천"
      header={
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">
            {formatKoreanDate(date)} 기준 · 절정인 곳부터
          </p>
        </div>
      }
    >
      {picks.length === 0 ? (
        <p className="rounded-xl bg-[color:var(--color-line-soft)] px-3 py-3 text-[13px] leading-relaxed text-[color:var(--color-muted)]">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {picks.map((spot) => (
            <li
              key={spot.key}
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
                      spot.peak
                        ? 'text-[color:var(--color-peak)]'
                        : 'text-[color:var(--color-accent-strong)]'
                    }`}
                  >
                    {spot.stateLabel}
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

      <p className="text-[11.5px] leading-relaxed text-[color:var(--color-faint)]">{disclaimer}</p>
    </Sheet>
  );
}
