'use client';

import { create } from 'zustand';
import {
  addDays,
  fromDayOfYear,
  dayOfYear,
  daysInYear,
  getYear,
  isValidDateKey,
  todayKey,
  type DateKey,
} from '@/domain/date';

/**
 * 시간은 이 앱의 1급 상태다. 지도 · 카드 · 추천이 전부 여기를 본다.
 * (요구사항 #6, #26)
 */

/** 1년 재생 속도 (일/초). 365일을 약 7초에 통과한다. */
export const PLAYBACK_DAYS_PER_SECOND = 52;

interface TimeState {
  selectedDate: DateKey;
  isPlaying: boolean;
  /** 사용자가 슬라이더를 직접 잡고 있는 동안 true */
  isScrubbing: boolean;
  setDate: (date: DateKey, options?: { stopPlayback?: boolean }) => void;
  setDayOfYear: (day: number) => void;
  shiftDays: (days: number) => void;
  goToToday: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setScrubbing: (value: boolean) => void;
  /** 재생 루프에서 호출. 연말에 도달하면 1월로 되돌아간다. */
  advance: (days: number) => void;
}

export const useTimeStore = create<TimeState>((set, get) => ({
  selectedDate: todayKey(),
  isPlaying: false,
  isScrubbing: false,

  setDate: (date, options) => {
    if (!isValidDateKey(date)) return;
    set((state) => ({
      selectedDate: date,
      isPlaying: options?.stopPlayback ? false : state.isPlaying,
    }));
  },

  setDayOfYear: (day) => {
    const year = getYear(get().selectedDate);
    set({ selectedDate: fromDayOfYear(year, day) });
  },

  shiftDays: (days) => {
    set((state) => ({ selectedDate: addDays(state.selectedDate, days), isPlaying: false }));
  },

  goToToday: () => set({ selectedDate: todayKey(), isPlaying: false }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setScrubbing: (value) => set({ isScrubbing: value }),

  advance: (days) => {
    set((state) => {
      const year = getYear(state.selectedDate);
      const next = dayOfYear(state.selectedDate) + days;
      const total = daysInYear(year);
      // 1년을 다 돌면 같은 해 1월 1일로 되돌아가 계속 순환한다
      const wrapped = next > total ? next - total : next;
      return { selectedDate: fromDayOfYear(year, wrapped) };
    });
  },
}));
