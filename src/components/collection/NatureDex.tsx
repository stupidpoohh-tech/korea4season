'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/category-meta';
import type { NatureCategory } from '@/domain/types';
import type { DexEntry } from '@/services/nature-service';
import { useDexHydrated, useDexStore } from '@/store/dex-store';
import { NatureDexCard } from './NatureDexCard';

/**
 * 자연도감. (요구사항 #11)
 *
 * 지금은 DISCOVERED(지도에서 발견) 만 다룬다.
 * 실제 현장 관찰(OBSERVED)은 DexRecord.kind 로 구분해 Phase 4 에서 붙인다.
 */
export function NatureDex({ entries }: { entries: DexEntry[] }) {
  const hydrated = useDexHydrated();
  const records = useDexStore((s) => s.records);
  const [filter, setFilter] = useState<NatureCategory | 'all'>('all');

  const visible = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.entity.category === filter)),
    [entries, filter],
  );

  const discoveredCount = hydrated
    ? entries.filter((e) => records[e.entity.id]).length
    : 0;

  const chip =
    'shrink-0 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors';

  return (
    <div>
      <div className="mb-4 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3">
        <p className="text-[13px] text-[color:var(--color-muted)]">나의 자연도감</p>
        <p className="mt-0.5 text-[20px] font-semibold tabular">
          {hydrated ? discoveredCount : '—'}
          <span className="text-[color:var(--color-faint)]"> / {entries.length} 발견</span>
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--color-line-soft)]">
          <div
            className="h-full rounded-full bg-[color:var(--color-accent)] transition-[width] duration-500"
            style={{ width: `${hydrated ? (discoveredCount / entries.length) * 100 : 0}%` }}
          />
        </div>
        {hydrated && discoveredCount === 0 && (
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-[color:var(--color-muted)]">
            아직 발견한 자연이 없습니다.{' '}
            <Link href="/map" className="font-medium text-[color:var(--color-accent-strong)] underline underline-offset-2">
              지도에서 하나를 눌러보세요
            </Link>
            . 처음 열어본 자연은 여기에 기록됩니다.
          </p>
        )}
      </div>

      <div
        role="group"
        aria-label="분류 필터"
        className="scrollbar-none mb-3 flex gap-1.5 overflow-x-auto"
      >
        <button
          type="button"
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
          className={`${chip} ${
            filter === 'all'
              ? 'border-transparent bg-[color:var(--color-ink)] text-white'
              : 'border-[color:var(--color-line)] bg-white text-[color:var(--color-ink-soft)]'
          }`}
        >
          전체
        </button>
        {CATEGORY_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            aria-pressed={filter === id}
            className={`${chip} ${
              filter === id
                ? 'border-transparent text-white'
                : 'border-[color:var(--color-line)] bg-white text-[color:var(--color-ink-soft)]'
            }`}
            style={filter === id ? { background: CATEGORY_META[id].color } : undefined}
          >
            <span aria-hidden className="mr-1">
              {CATEGORY_META[id].icon}
            </span>
            {CATEGORY_META[id].label}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((entry) => {
          const record = hydrated ? records[entry.entity.id] : undefined;
          return (
            <li key={entry.entity.id}>
              <NatureDexCard
                entry={entry}
                discovered={Boolean(record)}
                discoveredAt={record?.discoveredAt}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
