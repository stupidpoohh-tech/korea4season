'use client';

import { seasonMeta } from '@/lib/season';
import type { DateKey } from '@/domain/date';

/**
 * 계절에 따라 지도 전체 톤이 아주 옅게 변한다. (요구사항 #4, #40)
 * asset 을 4벌 만들지 않고 한 장 위에 얇은 색을 덮는다 — 성능과 유지보수 모두 유리하다.
 */
export function SeasonWash({ date }: { date: DateKey }) {
  const season = seasonMeta(date);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 transition-[background] duration-700 ease-out"
      style={{ background: season.wash, mixBlendMode: 'soft-light' }}
    />
  );
}
