'use client';

import type { ResolvedOccurrence } from '@/domain/types';
import { CATEGORY_META } from '@/lib/category-meta';
import { NatureStatusBadge } from '@/components/nature/NatureStatusBadge';

interface Props {
  items: ResolvedOccurrence[];
  selectedId: string | null;
  onSelect: (item: ResolvedOccurrence) => void;
}

/**
 * 데스크톱 좌측 레일 — 지금 지도 위에 있는 것들.
 * 지도를 대신하지 않고, 지도를 읽는 다른 통로가 된다.
 * (sprite 를 못 누르는 상황에서도 같은 정보에 닿을 수 있어야 한다)
 */
export function MapSideList({ items, selectedId, onSelect }: Props) {
  return (
    <aside
      aria-label="지도 위 자연현상"
      className="hidden min-h-0 flex-col lg:flex"
    >
      <h2 className="mb-2 px-0.5 text-[12px] font-medium tracking-wide text-[color:var(--color-faint)]">
        지금 지도 위에
      </h2>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[color:var(--color-line)] px-3 py-4 text-[12.5px] leading-relaxed text-[color:var(--color-muted)]">
          이 날짜에는 표시할 자연현상이 없습니다. 아래 슬라이더를 움직여 보세요.
        </p>
      ) : (
        <ul className="scrollbar-none min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
          {items.map((item) => {
            const category = CATEGORY_META[item.entity.category];
            const active = item.occurrence.id === selectedId;
            const place =
              item.locations.map((l) => l.name).join(' · ') ||
              item.occurrence.regions.join(' · ');
            return (
              <li key={item.occurrence.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                    active
                      ? 'border-[color:var(--color-ink)]/30 bg-white'
                      : 'border-transparent hover:bg-white'
                  }`}
                >
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[14px]"
                    style={{ background: `${category.color}14` }}
                  >
                    {item.entity.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium">{item.entity.name}</span>
                      <NatureStatusBadge
                        status={item.status}
                        polarity={item.occurrence.polarity}
                      />
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-[color:var(--color-muted)]">
                      {place}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
