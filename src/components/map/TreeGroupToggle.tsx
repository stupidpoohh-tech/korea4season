'use client';

import {
  FOLIAGE_TREE_GROUPS,
  TREE_GROUP_LABEL,
  type FoliageTreeGroup,
} from '@/domain/official-foliage-forecast';
import { useMapStore } from '@/store/map-store';

/* ────────────────────────────────────────────────────────────
 * 어느 수종의 공식 예측을 볼 것인가.
 *
 * 공식 예측지도가 수종마다 따로 나오고 날짜도 서로 다르다 —
 * 같은 산이라도 참나무류가 단풍나무류보다 나흘 이르기도 하다.
 * 그래서 단풍 화면에서 가장 먼저 고를 것은 보기 방식이 아니라 수종이다.
 * ──────────────────────────────────────────────────────────── */

export function TreeGroupToggle({ full = false }: { full?: boolean }) {
  const group = useMapStore((s) => s.treeGroup);
  const setGroup = useMapStore((s) => s.setTreeGroup);

  return (
    <div
      role="group"
      aria-label="수종"
      className={`flex rounded-xl bg-[color:var(--color-line-soft)] p-0.5 ${full ? 'w-full' : 'shrink-0'}`}
    >
      {FOLIAGE_TREE_GROUPS.map((id: FoliageTreeGroup) => {
        const on = group === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setGroup(id)}
            aria-pressed={on}
            className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-[13px] leading-[19px] font-semibold transition-colors duration-200 ${
              on
                ? 'bg-[color:var(--color-ink)] text-white shadow-[0_1px_2px_rgb(0_10_20/0.14)]'
                : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-ink-soft)]'
            }`}
          >
            {TREE_GROUP_LABEL[id]}
          </button>
        );
      })}
    </div>
  );
}
