'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import type { DateKey } from '@/domain/date';
import { todayKey } from '@/domain/date';
import { getNatureIndex } from '@/repositories/nature-repository';
import { resolveOccurrence } from '@/domain/occurrence';
import { useDexStore } from '@/store/dex-store';
import { SubscribeButton } from './SubscribeButton';

/**
 * 상세 페이지의 상호작용 부분만 클라이언트로 분리한다.
 * 본문은 서버에서 렌더돼 검색엔진에 그대로 노출된다. (요구사항 #32)
 */
export function EventDetailActions({
  slug,
  startDate,
  entityId,
}: {
  slug: string;
  startDate: DateKey;
  entityId: string;
}) {
  const discover = useDexStore((s) => s.discover);
  const index = getNatureIndex();
  const occurrence = index.occurrenceBySlug.get(slug);

  // 상세를 열면 도감에 기록된다
  useEffect(() => {
    discover(entityId, todayKey());
  }, [entityId, discover]);

  const resolved = occurrence
    ? resolveOccurrence(occurrence, todayKey(), {
        entities: index.entityById,
        locations: index.locationById,
      })
    : null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {resolved && <SubscribeButton item={resolved} />}
      <Link
        href={`/map?date=${startDate}${occurrence ? `&focus=${encodeURIComponent(occurrence.id)}` : ''}`}
        className="flex h-10 items-center justify-center rounded-xl border border-[color:var(--color-line)] bg-white text-[14px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-ink)]"
      >
        지도에서 이 시기 보기
      </Link>
    </div>
  );
}
