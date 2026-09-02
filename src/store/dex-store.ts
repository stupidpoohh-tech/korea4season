'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DateKey } from '@/domain/date';
import type { DexRecord, NatureSubscription, NotificationType } from '@/domain/types';

/**
 * 자연도감 · 알림 구독.
 *
 * Phase 1 은 로그인 없이 브라우저에 저장한다. (요구사항 #25 — anonymous browsing first)
 * Phase 4 에서 auth 가 붙으면 이 store 를 서버 동기화 계층으로 바꾸고
 * DexRecord / NatureSubscription 모델은 그대로 쓴다.
 */

const ANONYMOUS_USER = 'anonymous';

interface DexState {
  /** entityId -> 기록 */
  records: Record<string, DexRecord>;
  subscriptions: Record<string, NatureSubscription>;
  /** 방금 처음 발견한 entity. 짧은 안내를 띄우고 비운다. (요구사항 #30) */
  lastDiscovered: string | null;

  discover: (entityId: string, contextDate?: DateKey) => boolean;
  clearLastDiscovered: () => void;
  isDiscovered: (entityId: string) => boolean;

  toggleSubscription: (
    occurrenceId: string,
    entityId: string,
    types?: NotificationType[],
  ) => void;
  isSubscribed: (occurrenceId: string) => boolean;

  reset: () => void;
}

export const useDexStore = create<DexState>()(
  persist(
    (set, get) => ({
      records: {},
      subscriptions: {},
      lastDiscovered: null,

      /** 처음 발견이면 true 를 돌려준다 */
      discover: (entityId, contextDate) => {
        if (get().records[entityId]) return false;
        const record: DexRecord = {
          entityId,
          kind: 'discovered',
          discoveredAt: new Date().toISOString(),
          contextDate,
        };
        set((state) => ({
          records: { ...state.records, [entityId]: record },
          lastDiscovered: entityId,
        }));
        return true;
      },

      clearLastDiscovered: () => set({ lastDiscovered: null }),
      isDiscovered: (entityId) => Boolean(get().records[entityId]),

      toggleSubscription: (occurrenceId, entityId, types) => {
        set((state) => {
          const next = { ...state.subscriptions };
          if (next[occurrenceId]) {
            delete next[occurrenceId];
          } else {
            next[occurrenceId] = {
              id: `sub:${occurrenceId}`,
              userId: ANONYMOUS_USER,
              occurrenceId,
              entityId,
              notificationTypes: types ?? ['before-start', 'start', 'peak', 'end'],
              createdAt: new Date().toISOString(),
            };
          }
          return { subscriptions: next };
        });
      },

      isSubscribed: (occurrenceId) => Boolean(get().subscriptions[occurrenceId]),

      reset: () => set({ records: {}, subscriptions: {}, lastDiscovered: null }),
    }),
    {
      name: 'k4s.dex.v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ records: state.records, subscriptions: state.subscriptions }),
    },
  ),
);

/**
 * localStorage 값은 서버 렌더 결과와 다르다.
 * mount 이후에만 읽어 hydration mismatch 를 피한다.
 */
const neverChanges = () => () => {};

export function useDexHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true, // 클라이언트: localStorage 를 읽어도 되는 시점
    () => false, // 서버 렌더: 항상 비어 있는 상태로 그린다
  );
}
