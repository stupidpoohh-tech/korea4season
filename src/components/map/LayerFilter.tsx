'use client';

import type { NatureCategory } from '@/domain/types';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/category-meta';
import { STATE_FILTERS, type MapMode, type StateFilter } from '@/services/map-service';
import { useMapStore } from '@/store/map-store';

const chip =
  'flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors';
const off =
  'border-[color:var(--color-line)] bg-white/85 text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]/30';

/**
 * Phase 1 의 1차 필터는 '지금 어떤 상태인가' 다.
 * 금어기는 메인 내비게이션이 아니라 보조 legal filter 로 둔다. (요구사항 #7)
 */
export function StateFilterRow({ counts }: { counts: Record<StateFilter, number> }) {
  const selected = useMapStore((s) => s.stateFilter);
  const setState = useMapStore((s) => s.setStateFilter);

  return (
    <div role="group" aria-label="바다 상태" className="scrollbar-none flex gap-1.5 overflow-x-auto">
      {STATE_FILTERS.map((filter) => {
        const on = selected === filter.id;
        const restricted = filter.id === 'restricted';
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => setState(filter.id)}
            aria-pressed={on}
            className={`${chip} ${
              on
                ? restricted
                  ? 'border-transparent bg-[color:var(--color-restricted)] text-white'
                  : 'border-transparent bg-[color:var(--color-ink)] text-white'
                : off
            }`}
          >
            {restricted && <span aria-hidden>⚠</span>}
            {filter.label}
            <span className="tabular opacity-60">{counts[filter.id]}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 자연 레이어. 지금은 바다가 중심이지만 구조는 꽃·단풍·철새까지 그대로 확장된다.
 */
export function LayerFilter({ counts }: { counts: Record<NatureCategory, number> }) {
  const selected = useMapStore((s) => s.selectedCategories);
  const toggle = useMapStore((s) => s.toggleCategory);
  const clear = useMapStore((s) => s.clearCategories);

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

      {CATEGORY_ORDER.map((id) => {
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

/** 어종 중심 / 권역 중심 — 지도에서 묻는 질문 자체를 바꾼다 */
export function MapModeToggle() {
  const mode = useMapStore((s) => s.mode);
  const setMode = useMapStore((s) => s.setMode);

  const options: { id: MapMode; label: string }[] = [
    { id: 'species', label: '어종' },
    { id: 'zone', label: '권역' },
  ];

  return (
    <div
      role="group"
      aria-label="지도 보기 방식"
      className="flex shrink-0 rounded-lg border border-[color:var(--color-line)] bg-white/85 p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setMode(option.id)}
          aria-pressed={mode === option.id}
          className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
            mode === option.id
              ? 'bg-[color:var(--color-ink)] text-white'
              : 'text-[color:var(--color-ink-soft)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
