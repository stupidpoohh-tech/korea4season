'use client';

import type { MapMode } from '@/services/map-service';
import { useMapStore } from '@/store/map-store';

/* ────────────────────────────────────────────────────────────
 * LEVEL 2 — 무엇을 기준으로 지도를 볼 것인가.
 *
 * 이 화면에서 유일한 primary control 이다. 필터와 절대 같은 줄에 섞지 않고,
 * 채워진 선택 상태로 다른 어떤 컨트롤보다 또렷하게 그린다.
 * ──────────────────────────────────────────────────────────── */

const OPTIONS: { id: MapMode; label: string; hint: string }[] = [
  { id: 'species', label: '어종별', hint: '지금 시즌인 어종을 지도에서 봅니다' },
  { id: 'zone', label: '권역별', hint: '지금 볼 것이 많은 낚시 권역을 봅니다' },
];

export function ViewModeToggle({ full = false }: { full?: boolean }) {
  const mode = useMapStore((s) => s.mode);
  const setMode = useMapStore((s) => s.setMode);

  return (
    <div
      role="group"
      aria-label="지도 보기 방식"
      className={`flex rounded-xl bg-[color:var(--color-line-soft)] p-0.5 ${full ? 'w-full' : 'shrink-0'}`}
    >
      {OPTIONS.map((option) => {
        const on = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setMode(option.id)}
            aria-pressed={on}
            title={option.hint}
            className={`flex-1 rounded-lg px-4 py-1 text-[13.5px] leading-[19px] font-semibold transition-colors duration-200 ${
              on
                ? 'bg-[color:var(--color-ink)] text-white shadow-[0_1px_2px_rgb(0_10_20/0.14)]'
                : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-ink-soft)]'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
