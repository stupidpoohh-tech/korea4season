'use client';

import Link from 'next/link';
import { CATEGORY_META } from '@/lib/category-meta';
import type { DexEntry } from '@/services/nature-service';

interface Props {
  entry: DexEntry;
  discovered: boolean;
  discoveredAt?: string;
}

export function NatureDexCard({ entry, discovered, discoveredAt }: Props) {
  const { entity } = entry;
  const category = CATEGORY_META[entity.category];

  const inner = (
    <>
      <span
        aria-hidden
        className={`flex h-11 w-11 items-center justify-center rounded-xl text-[22px] ${
          discovered ? '' : 'text-[color:var(--color-faint)]'
        }`}
        style={{ background: discovered ? `${category.color}14` : 'var(--color-line-soft)' }}
      >
        {discovered ? entity.icon : '?'}
      </span>

      <span
        className={`mt-2 block truncate text-[13px] font-semibold ${
          discovered ? '' : 'text-[color:var(--color-faint)]'
        }`}
      >
        {discovered ? entity.name : '미발견'}
      </span>
      <span className="mt-0.5 block truncate text-[11.5px] text-[color:var(--color-muted)]">
        {/* 미발견이어도 언제 어디서 만날 수 있는지는 알려 준다 — 찾아갈 이유가 된다 */}
        {category.label} · {entry.seasonLabel}
      </span>
      {discovered && discoveredAt && (
        <span className="mt-1 block text-[10.5px] tabular text-[color:var(--color-faint)]">
          {discoveredAt.slice(0, 10)} 발견
        </span>
      )}
    </>
  );

  const className = `block rounded-xl border p-2.5 text-left transition-colors ${
    discovered
      ? 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-ink)]/25'
      : 'border-dashed border-[color:var(--color-line)] bg-white/50'
  }`;

  if (!discovered || !entry.slug) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <Link href={`/event/${entry.slug}`} className={className}>
      {inner}
    </Link>
  );
}
