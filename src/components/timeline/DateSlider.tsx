'use client';

import { useMemo } from 'react';
import {
  dayOfYear,
  daysInYear,
  fromDayOfYear,
  getYear,
  makeDateKey,
  type DateKey,
} from '@/domain/date';
import { useTimeStore } from '@/store/time-store';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * 월 선택기가 아니라 '일 단위' 슬라이더다. (요구사항 #6)
 * range input 을 쓰므로 키보드 조작과 스크린리더 지원을 그대로 얻는다.
 */
export function DateSlider({ date }: { date: DateKey }) {
  const setDayOfYear = useTimeStore((s) => s.setDayOfYear);
  const setDate = useTimeStore((s) => s.setDate);
  const setScrubbing = useTimeStore((s) => s.setScrubbing);
  const pause = useTimeStore((s) => s.pause);

  const year = getYear(date);
  const total = daysInYear(year);
  const current = dayOfYear(date);

  const monthTicks = useMemo(
    () =>
      MONTHS.map((month) => ({
        month,
        percent: ((dayOfYear(makeDateKey(year, month, 1)) - 1) / (total - 1)) * 100,
      })),
    [year, total],
  );

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="range"
          min={1}
          max={total}
          step={1}
          value={current}
          aria-label="날짜 선택"
          aria-valuetext={`${year}년 ${date.slice(5, 7)}월 ${date.slice(8, 10)}일`}
          className="date-range w-full"
          onChange={(event) => setDayOfYear(Number(event.target.value))}
          // 재생 중 사용자가 슬라이더를 잡으면 자동재생을 멈춘다 (요구사항 #7)
          onPointerDown={() => {
            pause();
            setScrubbing(true);
          }}
          onPointerUp={() => setScrubbing(false)}
          onKeyDown={pause}
          onBlur={() => setScrubbing(false)}
        />
      </div>

      <div className="relative mt-1 h-4 select-none">
        {monthTicks.map(({ month, percent }) => (
          <button
            key={month}
            type="button"
            onClick={() => setDate(fromDayOfYear(year, dayOfYear(makeDateKey(year, month, 1))), { stopPlayback: true })}
            className="absolute -translate-x-1/2 text-[10px] tabular text-[color:var(--color-faint)] transition-colors hover:text-[color:var(--color-ink)]"
            style={{ left: `${percent}%` }}
            aria-label={`${month}월로 이동`}
          >
            {month}
          </button>
        ))}
      </div>
    </div>
  );
}
