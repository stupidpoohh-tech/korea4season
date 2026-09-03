'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
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
 *
 * ## 손가락과 렌더링을 떼어 놓는다
 *
 * 이 입력을 React 가 제어(value=…)하면 한 프레임이 밀릴 때마다 손잡이가
 * 뒤로 튄다. 지도를 다시 그리는 데 30~60ms 가 걸리는 기기에서는 그 사이
 * 들어온 손가락 위치가 전부 옛 값으로 덮인다.
 *
 * 그래서 손잡이는 브라우저가 갖고, 바깥에서 날짜가 바뀔 때만(재생 · 월 이동 ·
 * 오늘) 값을 밀어 넣는다. 그리고 날짜 반영은 프레임당 한 번으로 모은다 —
 * 120Hz 화면에서는 손가락 한 번에 초당 120번의 갱신이 들어오는데,
 * 그때마다 지도 전체를 다시 만들면 렌더러가 버티지 못한다
 * (iOS 에서 '이 페이지를 불러올 수 없음').
 */
export function DateSlider({ date }: { date: DateKey }) {
  const setDayOfYear = useTimeStore((s) => s.setDayOfYear);
  const setDate = useTimeStore((s) => s.setDate);
  const setScrubbing = useTimeStore((s) => s.setScrubbing);
  const pause = useTimeStore((s) => s.pause);

  const year = getYear(date);
  const total = daysInYear(year);
  const current = dayOfYear(date);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrubbing = useRef(false);
  const frame = useRef(0);
  const pending = useRef<number | null>(null);

  /* 바깥에서 날짜가 바뀌면 손잡이를 옮긴다. 잡고 있는 동안에는 건드리지 않는다. */
  useEffect(() => {
    if (!scrubbing.current && inputRef.current) inputRef.current.value = String(current);
  }, [current]);

  const flush = useCallback(() => {
    frame.current = 0;
    const day = pending.current;
    pending.current = null;
    if (day !== null) setDayOfYear(day);
  }, [setDayOfYear]);

  const queue = useCallback(
    (day: number) => {
      pending.current = day;
      if (frame.current) return;
      frame.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  const endScrub = useCallback(() => {
    if (!scrubbing.current) return;
    scrubbing.current = false;
    setScrubbing(false);
    /* 손을 뗀 순간의 값은 프레임을 기다리지 않고 바로 반영한다 */
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    const day = pending.current;
    pending.current = null;
    if (day !== null) setDayOfYear(day);
  }, [setDayOfYear, setScrubbing]);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

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
          ref={inputRef}
          type="range"
          min={1}
          max={total}
          step={1}
          defaultValue={current}
          aria-label="날짜 선택"
          aria-valuetext={`${year}년 ${date.slice(5, 7)}월 ${date.slice(8, 10)}일`}
          className="date-range w-full"
          onChange={(event) => {
            const day = Number(event.target.value);
            /* 키보드·스크린리더는 잡는 동작이 없으므로 곧바로 반영한다 */
            if (scrubbing.current) queue(day);
            else setDayOfYear(day);
          }}
          // 재생 중 사용자가 슬라이더를 잡으면 자동재생을 멈춘다 (요구사항 #7)
          onPointerDown={() => {
            pause();
            scrubbing.current = true;
            setScrubbing(true);
          }}
          onPointerUp={endScrub}
          /* 통화·알림·시스템 제스처가 끼어들면 pointerup 이 오지 않는다 */
          onPointerCancel={endScrub}
          onLostPointerCapture={endScrub}
          onKeyDown={pause}
          onBlur={endScrub}
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
