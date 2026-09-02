'use client';

import { useState } from 'react';
import { formatKoreanDate, todayKey, type DateKey } from '@/domain/date';
import { seasonMeta } from '@/lib/season';
import { useTimeStore } from '@/store/time-store';
import { DateSlider } from './DateSlider';
import { PlaybackControl } from './PlaybackControl';
import { usePlayback } from './use-playback';

interface Props {
  date: DateKey;
  /**
   * 날짜 아래 한 줄.
   *
   * 카테고리마다 말할 것이 다르다 — 바다는 지금 그려진 수,
   * 단풍은 어떤 상태가 몇 곳인지다. 무엇을 셀지는 호출자가 정한다.
   */
  caption: string;
}

/**
 * 시간 인터페이스. 이 앱의 핵심 인터랙션이다.
 *
 * 다만 지도가 주인공이므로 모바일에서는 접힌 상태를 기본으로 둔다.
 * 접힌 상태에도 날짜 · 슬라이더 · 오늘 · 재생은 남는다 — 여기까지가
 * "시간을 움직이면 지도가 바뀐다" 를 이해하는 데 필요한 최소한이다.
 */
export function NatureTimeline({ date, caption }: Props) {
  usePlayback();

  const [expanded, setExpanded] = useState(false);
  const shiftDays = useTimeStore((s) => s.shiftDays);
  const goToToday = useTimeStore((s) => s.goToToday);
  const isToday = date === todayKey();
  const season = seasonMeta(date);

  const stepBtn =
    'h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-line)] bg-white text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-ink)]';

  return (
    <section
      aria-label="시간 이동"
      className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)]/92 px-3 py-2.5 shadow-[var(--shadow-soft)] backdrop-blur-md sm:px-4 sm:py-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h2 className="truncate text-[17px] font-semibold tracking-tight tabular sm:text-[19px]">
              {formatKoreanDate(date, { weekday: true })}
            </h2>
            <span
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
              style={{ background: `${season.chip}22`, color: season.chip }}
            >
              {season.label}
            </span>
          </div>

          {/*
            위쪽 요약은 '조건에 맞는 수' 이고 여기는 '지금 지도가 말하는 것' 이다.
            과밀로 접힌 것이 있으면 두 수가 다르므로 문구로 뜻을 구분한다.
          */}
          <p className="mt-0.5 truncate text-[11.5px] text-[color:var(--color-muted)]">
            {date.slice(0, 4)}년 · {caption}
          </p>
        </div>

        <button
          type="button"
          onClick={goToToday}
          disabled={isToday}
          className="h-8 shrink-0 rounded-lg border border-[color:var(--color-line)] bg-white px-2.5 text-[12.5px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-ink)] disabled:opacity-40 disabled:hover:border-[color:var(--color-line)]"
        >
          오늘
        </button>
        <PlaybackControl compact />
      </div>

      <div className="flex items-start gap-2">
        <button
          type="button"
          className={`${stepBtn} ${expanded ? 'flex' : 'hidden'} lg:flex`}
          onClick={() => shiftDays(-1)}
          aria-label="하루 전"
        >
          ‹
        </button>

        <div className="min-w-0 flex-1">
          <DateSlider date={date} />
        </div>

        <button
          type="button"
          className={`${stepBtn} ${expanded ? 'flex' : 'hidden'} lg:flex`}
          onClick={() => shiftDays(1)}
          aria-label="하루 후"
        >
          ›
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={`${stepBtn} flex text-[11px] lg:hidden`}
          aria-label={expanded ? '날짜 컨트롤 접기' : '날짜 컨트롤 펼치기'}
        >
          {expanded ? '▾' : '▴'}
        </button>
      </div>
    </section>
  );
}
