/* ────────────────────────────────────────────────────────────
 * 계절 파동.
 *
 * 단풍과 개화는 방향이 반대일 뿐 같은 산수를 쓴다 —
 * 시작 → 절정 → 끝물 → 잦아듦을 0~1 한 값으로 옮기는 일이다.
 * 지도에 칠하는 값과 목록에 적는 이름을 이 하나에서 뽑으면
 * 색과 글자가 어긋날 수가 없다.
 * ──────────────────────────────────────────────────────────── */

import { diffDays, getYear, toDateKey, type DateKey } from '@/domain/date';
import type { OccurrenceStatus } from '@/domain/types';

/** 시즌이 끝난 뒤 원래 색으로 잦아드는 데 걸리는 시간 */
const WINTER_FADE_DAYS = 14;

/*
 * 색 띠 위의 구간.
 * 절정을 좁게 잡아 두어야 절정의 색이 '북 → 남으로 지나가는 파도' 로 보인다.
 */
export const WAVE_AT_PEAK_START = 0.45;
export const WAVE_AT_PEAK_END = 0.78;
const WAVE_AT_END = 0.92;

export function waveOf(
  date: DateKey,
  window: { start: Date; end: Date },
  peak: { start: Date; end: Date } | undefined,
): { wave: number; wavePerDay: number } {
  const start = toDateKey(window.start);
  const end = toDateKey(window.end);
  const peakStart = peak ? toDateKey(peak.start) : null;
  const peakEnd = peak ? toDateKey(peak.end) : null;

  const span = diffDays(start, end) + 1 + WINTER_FADE_DAYS;
  const wavePerDay = span > 0 ? 1 / span : 0;

  const segment = (from: DateKey, to: DateKey, lo: number, hi: number) => {
    const total = Math.max(1, diffDays(from, to));
    return lo + ((hi - lo) * diffDays(from, date)) / total;
  };

  if (date < start) return { wave: 0, wavePerDay };
  if (date > end) {
    const after = diffDays(end, date);
    return { wave: Math.min(1, WAVE_AT_END + (1 - WAVE_AT_END) * (after / WINTER_FADE_DAYS)), wavePerDay };
  }
  if (!peakStart || !peakEnd) {
    return { wave: segment(start, end, 0, WAVE_AT_END), wavePerDay };
  }
  if (date < peakStart) return { wave: segment(start, peakStart, 0, WAVE_AT_PEAK_START), wavePerDay };
  if (date <= peakEnd) {
    return { wave: segment(peakStart, peakEnd, WAVE_AT_PEAK_START, WAVE_AT_PEAK_END), wavePerDay };
  }
  return { wave: segment(peakEnd, end, WAVE_AT_PEAK_END, WAVE_AT_END), wavePerDay };
}


/**
 * 올해 단풍이 이미 지나간 뒤인가.
 *
 * occurrence 엔진은 끝난 지 2주가 지나면 '다음 주기의 upcoming' 으로 넘긴다
 * — "다음 시즌은 언제" 를 말해 주기 위한 것이라 목록에서는 맞다.
 * 그런데 지도에서는 그 값이 '아직 초록' 이 되어, 11월 말 설악산이 다시
 * 새잎이 난 것처럼 보인다. 넘어간 창이 내년 것이면 올해는 끝난 것으로 읽는다.
 */
export function alreadyPassed(status: OccurrenceStatus, ref: DateKey, window: { start: Date }): boolean {
  return status === 'upcoming' && window.start.getUTCFullYear() > getYear(ref);
}

