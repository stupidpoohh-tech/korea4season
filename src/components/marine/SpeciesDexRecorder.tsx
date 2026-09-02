'use client';

import { useEffect } from 'react';
import type { DateKey } from '@/domain/date';
import { useDexStore } from '@/store/dex-store';

/**
 * 상세를 열면 도감에 기록한다. (요구사항 #19)
 * 본문은 서버에서 렌더돼 검색엔진에 그대로 노출되고,
 * 개인 기록만 클라이언트에서 처리한다.
 */
export function SpeciesDexRecorder({ entityId, date }: { entityId: string; date: DateKey }) {
  const discover = useDexStore((s) => s.discover);
  useEffect(() => {
    discover(entityId, date);
  }, [entityId, date, discover]);
  return null;
}
