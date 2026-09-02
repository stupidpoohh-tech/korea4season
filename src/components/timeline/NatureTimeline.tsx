'use client';

import { formatKoreanDate, todayKey, type DateKey } from '@/domain/date';
import { seasonMeta } from '@/lib/season';
import { useTimeStore } from '@/store/time-store';
import { DateSlider } from './DateSlider';
import { PlaybackControl } from './PlaybackControl';
import { usePlayback } from './use-playback';

interface Props {
  date: DateKey;
  /** 지도에 지금 올라와 있는 자연현상 수 */
  visibleCount: number;
}

/**
 * 시간 인터페이스. 이 앱의 핵심 인터랙션이다. (요구사항 #6, #7, #16)
 */
export function NatureTimeline({ date, visibleCount }: Props) {
  usePlayback();

  const shiftDays = useTimeStore((s) => s.shiftDays);
  const goToToday = useTimeStore((s) => s.goToToday);
  const isToday = date === todayKey();
  const season = seasonMeta(date);

  const stepBtn =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-line)] bg-white text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-ink)]';

  return (
    <section
      aria-label="시간 이동"
      className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)]/92 p-3.5 shadow-[var(--shadow-soft)] backdrop-blur-md sm:p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h2 className="truncate text-[19px] font-semibold tracking-tight tabular">
              {formatKoreanDate(date, { weekday: true })}
            </h2>
            <span
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
              style={{ background: `${season.chip}22`, color: season.chip }}
            >
              {season.label}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">
            {date.slice(0, 4)}년 · 지도에 {visibleCount}개
          </p>
        </div>

        <button
          type="button"
          onClick={goToToday}
          disabled={isToday}
          className="h-8 shrink-0 rounded-lg border border-[color:var(--color-line)] bg-white px-3 text-[13px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-ink)] disabled:opacity-40 disabled:hover:border-[color:var(--color-line)]"
        >
          오늘
        </button>
        <PlaybackControl compact />
      </div>

      <div className="flex items-start gap-2">
        <button type="button" className={stepBtn} onClick={() => shiftDays(-1)} aria-label="하루 전">
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <DateSlider date={date} />
        </div>
        <button type="button" className={stepBtn} onClick={() => shiftDays(1)} aria-label="하루 후">
          ›
        </button>
      </div>
    </section>
  );
}
