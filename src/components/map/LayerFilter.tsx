'use client';

import type { NatureCategory } from '@/domain/types';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/category-meta';
import { useMapStore } from '@/store/map-store';

interface Props {
  /** 선택 날짜 기준 레이어별 표시 가능 개수 */
  counts: Record<NatureCategory, number>;
}

/**
 * Nature Layer 선택기. 다중 선택이 가능하다. (요구사항 #8)
 * 데이터가 없는 레이어도 감추지 않고 0 으로 보여줘 시간 이동을 유도한다.
 */
export function LayerFilter({ counts }: Props) {
  const selected = useMapStore((s) => s.selectedCategories);
  const toggle = useMapStore((s) => s.toggleCategory);
  const clear = useMapStore((s) => s.clearCategories);

  const total = CATEGORY_ORDER.reduce((sum, c) => sum + counts[c], 0);

  const base =
    'flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors';

  return (
    <div
      role="group"
      aria-label="자연 레이어"
      className="scrollbar-none flex gap-1.5 overflow-x-auto"
    >
      <button
        type="button"
        onClick={clear}
        aria-pressed={selected.length === 0}
        className={`${base} ${
          selected.length === 0
            ? 'border-transparent bg-[color:var(--color-ink)] text-white'
            : 'border-[color:var(--color-line)] bg-white/85 text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]/30'
        }`}
      >
        전체
        <span className="tabular opacity-60">{total}</span>
      </button>

      {CATEGORY_ORDER.map((id) => {
        const meta = CATEGORY_META[id];
        const on = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            aria-pressed={on}
            className={`${base} ${
              on
                ? 'border-transparent text-white'
                : 'border-[color:var(--color-line)] bg-white/85 text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]/30'
            }`}
            style={on ? { background: meta.color } : undefined}
          >
            <span aria-hidden>{meta.icon}</span>
            {meta.label}
            <span className="tabular opacity-60">{counts[id]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 데스크톱 좌측 레일용 세로 배치 */
export function LayerFilterColumn({ counts }: Props) {
  return (
    <div className="[&>div]:flex-wrap">
      <LayerFilter counts={counts} />
    </div>
  );
}
