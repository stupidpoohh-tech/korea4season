'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { DateKey } from '@/domain/date';
import { buildMapLayout } from '@/services/map-service';
import { NatureMap } from './NatureMap';

/**
 * 홈의 지도 미리보기. 상호작용은 잠그고 지도의 존재감만 전달한다.
 * 이 앱에서 지도는 배경이 아니라 목적지다.
 */
export function MapPreviewCard({ date }: { date: DateKey }) {
  const layout = useMemo(() => buildMapLayout({ date }), [date]);

  return (
    <section aria-labelledby="map-preview">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 id="map-preview" className="text-[15px] font-semibold tracking-tight">
          대한민국 지도
        </h2>
        <span className="text-[12.5px] text-[color:var(--color-muted)]">
          지도 위 {layout.sprites.length}개
        </span>
      </div>

      <Link
        href={`/map?date=${date}`}
        className="group relative block overflow-hidden rounded-2xl border border-[color:var(--color-line)] bg-gradient-to-b from-[#f2fbff] to-[color:var(--color-surface)] transition-colors hover:border-[color:var(--color-ink)]/25"
        aria-label="지도 화면 열기"
      >
        <div className="pointer-events-none mx-auto w-full max-w-[286px] px-4 pb-14 pt-4">
          <NatureMap
            layout={layout}
            onSelectSprite={() => {}}
            preview
            className="w-full"
          />
        </div>

        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-[color:var(--color-line-soft)] bg-[color:var(--color-surface)]/92 px-4 py-3 backdrop-blur-sm">
          <span className="text-[13.5px] font-medium">시간을 움직여 보세요</span>
          <span className="text-[12.5px] text-[color:var(--color-accent-strong)]">
            지도 열기 ›
          </span>
        </span>
      </Link>
    </section>
  );
}
