'use client';

import { create } from 'zustand';
import type { MapPosition } from '@/domain/projection';
import type { NatureCategory } from '@/domain/types';
import type { MapMode, StateFilter } from '@/services/map-service';

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
  /** 지금 상태로 거르는 보조 필터 */
  stateFilter: StateFilter;
  /** 어종 중심 / 권역 중심 */
  mode: MapMode;
  selectedOccurrenceId: string | null;
  /** 열려 있는 권역 상세 */
  openZoneSlug: string | null;
  viewport: Viewport;
  setStateFilter: (filter: StateFilter) => void;
  setMode: (mode: MapMode) => void;
  setOpenZone: (slug: string | null) => void;
  toggleCategory: (category: NatureCategory) => void;
  setCategories: (categories: NatureCategory[]) => void;
  clearCategories: () => void;
  selectOccurrence: (id: string | null) => void;
  setViewport: (viewport: Viewport) => void;
  resetViewport: () => void;
  /**
   * 카드에서 지도 위 특정 위치로 카메라를 옮긴다. (요구사항 #17)
   * anchorX/anchorY 는 그 지점을 화면 어디에 둘지 정한다 (0~1, 기본 중앙).
   * 데스크톱에서 상세 카드가 오른쪽을 덮으므로 왼쪽으로 치우쳐 잡는다.
   */
  focusOn: (position: MapPosition, options?: FocusOptions) => void;
}

export interface FocusOptions {
  scale?: number;
  anchorX?: number;
  anchorY?: number;
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
  stateFilter: 'all',
  mode: 'species',
  selectedOccurrenceId: null,
  openZoneSlug: null,
  viewport: DEFAULT_VIEWPORT,

  setStateFilter: (filter) => set({ stateFilter: filter, selectedOccurrenceId: null }),
  setMode: (mode) => set({ mode, selectedOccurrenceId: null, openZoneSlug: null }),
  setOpenZone: (slug) => set({ openZoneSlug: slug }),

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

  focusOn: (position, options) =>
    set(() => {
      const s = clampScale(options?.scale ?? 1.5);
      const anchorX = options?.anchorX ?? 0.5;
      const anchorY = options?.anchorY ?? 0.5;
      return {
        viewport: clampViewport({
          scale: s,
          x: (anchorX - position.x) * s,
          y: (anchorY - position.y) * s,
        }),
      };
    }),
}));
