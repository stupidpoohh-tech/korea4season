'use client';

import { create } from 'zustand';
import type { MapPosition } from '@/domain/projection';
import type { NatureCategory } from '@/domain/types';

export interface Viewport {
  scale: number;
  /** 컨테이너 대비 이동량 (0~1 비율) */
  x: number;
  y: number;
}

export const MIN_SCALE = 0.85;
export const MAX_SCALE = 2.6;
export const DEFAULT_VIEWPORT: Viewport = { scale: 1, x: 0, y: 0 };

interface MapState {
  /** 비어 있으면 '전체' */
  selectedCategories: NatureCategory[];
  selectedOccurrenceId: string | null;
  viewport: Viewport;
  toggleCategory: (category: NatureCategory) => void;
  setCategories: (categories: NatureCategory[]) => void;
  clearCategories: () => void;
  selectOccurrence: (id: string | null) => void;
  setViewport: (viewport: Viewport) => void;
  resetViewport: () => void;
  /** 카드에서 지도 위 특정 위치로 카메라를 옮긴다 (요구사항 #17) */
  focusOn: (position: MapPosition, scale?: number) => void;
}

export const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/**
 * 확대 상태에서 지도가 컨테이너 밖으로 밀려나지 않게 이동량을 제한한다.
 *
 * transform 은 `translate(x*100%, y*100%) scale(s)` 순서로 적용한다.
 * translate 의 % 는 스케일 이전 크기 기준이므로 여유는 (s-1)/2 이다.
 */
export function clampViewport({ scale, x, y }: Viewport): Viewport {
  const s = clampScale(scale);
  const limit = Math.max(0, (s - 1) / 2);
  return {
    scale: s,
    x: Math.min(limit, Math.max(-limit, x)),
    y: Math.min(limit, Math.max(-limit, y)),
  };
}

export const useMapStore = create<MapState>((set) => ({
  selectedCategories: [],
  selectedOccurrenceId: null,
  viewport: DEFAULT_VIEWPORT,

  toggleCategory: (category) =>
    set((state) => ({
      selectedCategories: state.selectedCategories.includes(category)
        ? state.selectedCategories.filter((c) => c !== category)
        : [...state.selectedCategories, category],
    })),

  setCategories: (categories) => set({ selectedCategories: categories }),
  clearCategories: () => set({ selectedCategories: [] }),
  selectOccurrence: (id) => set({ selectedOccurrenceId: id }),
  setViewport: (viewport) => set({ viewport: clampViewport(viewport) }),
  resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),

  focusOn: (position, scale = 1.5) =>
    set(() => {
      const s = clampScale(scale);
      // 해당 지점이 컨테이너 중앙에 오도록
      return {
        viewport: clampViewport({
          scale: s,
          x: (0.5 - position.x) * s,
          y: (0.5 - position.y) * s,
        }),
      };
    }),
}));
