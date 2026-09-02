'use client';

import { useEffect } from 'react';
import { PLAYBACK_DAYS_PER_SECOND, useTimeStore } from '@/store/time-store';

/**
 * 1년 재생 루프. (요구사항 #7)
 * setInterval 이 아니라 rAF + 경과시간 기반으로 진행해
 * 프레임이 밀려도 재생 속도가 일정하다.
 */
export function usePlayback() {
  const isPlaying = useTimeStore((s) => s.isPlaying);
  const advance = useTimeStore((s) => s.advance);

  useEffect(() => {
    if (!isPlaying) return;

    let frame = 0;
    let last = performance.now();
    let carry = 0;

    const tick = (now: number) => {
      const delta = Math.min(now - last, 120) / 1000;
      last = now;
      carry += delta * PLAYBACK_DAYS_PER_SECOND;

      const steps = Math.floor(carry);
      if (steps >= 1) {
        carry -= steps;
        advance(steps);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, advance]);
}
