'use client';

import { useMapStore } from '@/store/map-store';

/* ────────────────────────────────────────────────────────────
 * LEVEL 3 — 필요할 때만 여는 필터.
 *
 * 보조 컨트롤이므로 primary segmented control 처럼 보이면 안 된다.
 * 기본 상태에서는 낮은 weight 의 outline 버튼이고,
 * 걸려 있는 필터가 있을 때만 개수를 달아 상태를 알린다.
 * ──────────────────────────────────────────────────────────── */

/** 지금 걸려 있는 필터 수. 칩·트리거·요약이 같은 값을 쓰도록 한 곳에 둔다. */
export function useActiveFilterCount(): number {
  const mode = useMapStore((s) => s.mode);
  const seasonFilter = useMapStore((s) => s.seasonFilter);
  const startingOnly = useMapStore((s) => s.startingOnly);
  const legalOnly = useMapStore((s) => s.legalOnly);

  // 권역 모드에는 시즌 축 필터가 없다 (map-service 의 zoneSprites 주석 참고)
  if (mode === 'zone') return legalOnly ? 1 : 0;
  return (seasonFilter !== 'all' ? 1 : 0) + (startingOnly ? 1 : 0) + (legalOnly ? 1 : 0);
}

export function FilterTrigger({ onOpen, full = false }: { onOpen: () => void; full?: boolean }) {
  const active = useActiveFilterCount();

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1 text-[13px] leading-[21px] font-medium transition-colors duration-200 ${
        full ? 'w-full' : 'shrink-0'
      } ${
        active > 0
          ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]'
          : 'border-[color:var(--color-line)] bg-transparent text-[color:var(--color-muted)] hover:border-[color:var(--color-ink)]/25 hover:text-[color:var(--color-ink-soft)]'
      }`}
    >
      <span aria-hidden className="text-[11px] leading-none">
        ☰
      </span>
      필터
      {active > 0 && <span className="tabular text-[12px] font-semibold">{active}</span>}
    </button>
  );
}
