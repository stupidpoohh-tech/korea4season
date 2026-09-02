'use client';

import type { MapLayerId } from '@/domain/nature-categories';
import type { MapMode } from '@/services/map-service';
import { useMapStore } from '@/store/map-store';

/* ────────────────────────────────────────────────────────────
 * LEVEL 2 — 무엇을 기준으로 지도를 볼 것인가.
 *
 * 이 화면에서 유일한 primary control 이다. 필터와 절대 같은 줄에 섞지 않고,
 * 채워진 선택 상태로 다른 어떤 컨트롤보다 또렷하게 그린다.
 * ──────────────────────────────────────────────────────────── */

interface Option {
  id: MapMode;
  label: string;
  hint: string;
  /** 아직 만들지 않은 보기 방식 — 자리는 두되 누를 수 없다 */
  disabled?: boolean;
}

const OPTIONS: Record<MapLayerId, Option[]> = {
  marine: [
    { id: 'species', label: '어종별', hint: '지금 시즌인 어종을 지도에서 봅니다' },
    { id: 'zone', label: '권역별', hint: '지금 볼 것이 많은 낚시 권역을 봅니다' },
  ],
  foliage: [
    { id: 'species', label: '명소별', hint: '지금 물드는 산을 지도에서 봅니다' },
    { id: 'zone', label: '지역별', hint: '준비 중입니다', disabled: true },
  ],
  // 아직 지도에 올리지 않는 카테고리. 여기 값이 쓰이는 일은 없다.
  flower: [{ id: 'species', label: '명소별', hint: '준비 중입니다', disabled: true }],
  bird: [{ id: 'species', label: '명소별', hint: '준비 중입니다', disabled: true }],
};

export function ViewModeToggle({ layer, full = false }: { layer: MapLayerId; full?: boolean }) {
  const mode = useMapStore((s) => s.mode);
  const setMode = useMapStore((s) => s.setMode);

  return (
    <div
      role="group"
      aria-label="지도 보기 방식"
      className={`flex rounded-xl bg-[color:var(--color-line-soft)] p-0.5 ${full ? 'w-full' : 'shrink-0'}`}
    >
      {OPTIONS[layer].map((option) => {
        const on = mode === option.id && !option.disabled;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => !option.disabled && setMode(option.id)}
            aria-pressed={on}
            aria-disabled={option.disabled}
            title={option.hint}
            className={`flex-1 rounded-lg px-4 py-1 text-[13.5px] leading-[19px] font-semibold transition-colors duration-200 ${
              option.disabled
                ? 'cursor-default text-[color:var(--color-faint)]'
                : on
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
