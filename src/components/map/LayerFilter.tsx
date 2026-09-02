'use client';

import type { NatureCategory } from '@/domain/types';
import { ENABLED_CATEGORIES, SHOW_LAYER_FILTER } from '@/data-sources';
import { CATEGORY_META } from '@/lib/category-meta';
import { useMapStore } from '@/store/map-store';

const chip =
  'flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors';
const off =
  'border-[color:var(--color-line)] bg-white/85 text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]/30';

/**
 * 자연 레이어. 지금은 바다가 중심이지만 구조는 꽃·단풍·철새까지 그대로 확장된다.
 */
export function LayerFilter({ counts }: { counts: Record<NatureCategory, number> }) {
  const selected = useMapStore((s) => s.selectedCategories);
  const toggle = useMapStore((s) => s.toggleCategory);
  const clear = useMapStore((s) => s.clearCategories);

  // 바다 하나만 켜져 있는 동안에는 레이어 선택이 할 일이 없다
  if (!SHOW_LAYER_FILTER) return null;

  return (
    <div role="group" aria-label="자연 레이어" className="scrollbar-none flex gap-1.5 overflow-x-auto">
      <button
        type="button"
        onClick={clear}
        aria-pressed={selected.length === 0}
        className={`${chip} ${
          selected.length === 0 ? 'border-transparent bg-[color:var(--color-ink)] text-white' : off
        }`}
      >
        전체
      </button>

      {ENABLED_CATEGORIES.map((id) => {
        const meta = CATEGORY_META[id];
        const on = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            aria-pressed={on}
            className={`${chip} ${on ? 'border-transparent text-white' : off}`}
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
