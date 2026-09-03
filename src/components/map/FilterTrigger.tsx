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
  const focusedSpecies = useMapStore((s) => s.focusedSpecies);
  const layer = useMapStore((s) => s.layer);
  const foliageState = useMapStore((s) => s.foliageState);
  const flowerSpecies = useMapStore((s) => s.flowerSpecies);

  // 산은 계절이 정하는 축(단풍 상태 · 꽃 종류)만 거른다
  if (layer === 'mountain') {
    return (foliageState === 'all' ? 0 : 1) + (flowerSpecies === 'all' ? 0 : 1);
  }
  // 권역 모드에는 시즌 축 필터가 없다 (map-service 의 zoneSprites 주석 참고)
  if (mode === 'zone') return legalOnly ? 1 : 0;
  return (
    (seasonFilter !== 'all' ? 1 : 0) +
    (startingOnly ? 1 : 0) +
    (legalOnly ? 1 : 0) +
    (focusedSpecies ? 1 : 0)
  );
}

/** 필터 픽토그램 — 위가 넓고 아래가 좁은 깔때기 */
function FilterGlyph() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M1.6 2.4h10.8L8.3 7.2v4.1L5.7 12.6V7.2L1.6 2.4Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FilterTrigger({ onOpen, full = false }: { onOpen: () => void; full?: boolean }) {
  const active = useActiveFilterCount();

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={active > 0 ? `필터 ${active}개 적용됨` : '필터'}
      title="필터"
      className={`relative flex items-center justify-center gap-1.5 rounded-xl border transition-colors duration-200 ${
        full ? 'h-9 w-full' : 'h-8 w-8 shrink-0'
      } ${
        active > 0
          ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]'
          : 'border-[color:var(--color-line)] bg-transparent text-[color:var(--color-muted)] hover:border-[color:var(--color-ink)]/25 hover:text-[color:var(--color-ink-soft)]'
      }`}
    >
      <FilterGlyph />
      {/* 데스크톱 레일은 자리가 있으므로 이름을 붙인다 */}
      {full && <span className="text-[13px] font-medium">필터</span>}
      {active > 0 && (
        <span
          className={`tabular text-[12px] font-semibold ${
            full
              ? ''
              : 'absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--color-accent-strong)] px-1 text-[10px] leading-none text-white'
          }`}
        >
          {active}
        </span>
      )}
    </button>
  );
}
