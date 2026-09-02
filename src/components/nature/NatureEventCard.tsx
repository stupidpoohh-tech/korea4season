'use client';

import { formatDaysValue } from '@/domain/date';
import { CATEGORY_META } from '@/lib/category-meta';
import type { ResolvedOccurrence } from '@/domain/types';
import { DemoBadge } from '@/components/common/DemoBadge';
import { NatureStatusBadge } from './NatureStatusBadge';

interface Props {
  item: ResolvedOccurrence;
  onSelect?: (item: ResolvedOccurrence) => void;
  /** 지역 이름을 앞세울지 (이번 주 화면) */
  showPlace?: boolean;
}

export function NatureEventCard({ item, onSelect, showPlace = true }: Props) {
  const { entity, occurrence, status, daysToNextChange, nextChangeLabel } = item;
  const category = CATEGORY_META[entity.category];
  const place = item.locations.map((l) => l.name).join(' · ') || occurrence.regions.join(' · ');

  const Wrapper = onSelect ? 'button' : 'div';

  return (
    <Wrapper
      {...(onSelect ? { type: 'button' as const, onClick: () => onSelect(item) } : {})}
      className={`flex w-full items-start gap-3 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3 text-left transition-colors ${
        onSelect ? 'hover:border-[color:var(--color-ink)]/25' : ''
      }`}
    >
      <span
        aria-hidden
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[18px]"
        style={{ background: `${category.color}14` }}
      >
        {entity.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15px] font-semibold tracking-tight">{entity.name}</span>
          <NatureStatusBadge status={status} polarity={occurrence.polarity} />
          {occurrence.isDemo && <DemoBadge />}
        </span>

        {showPlace && (
          <span className="mt-0.5 block truncate text-[12.5px] text-[color:var(--color-muted)]">
            📍 {place}
          </span>
        )}

        {daysToNextChange !== undefined && nextChangeLabel && (
          <span className="mt-1 block text-[12px] text-[color:var(--color-ink-soft)]">
            {nextChangeLabel}{' '}
            <span className="font-semibold tabular">{formatDaysValue(daysToNextChange)}</span>
          </span>
        )}
      </span>
    </Wrapper>
  );
}
