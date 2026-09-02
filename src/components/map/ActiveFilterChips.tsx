'use client';

import { SEASON_FILTERS, type MapMode } from '@/services/map-service';
import { useMapStore } from '@/store/map-store';

/* ────────────────────────────────────────────────────────────
 * 걸려 있는 필터만 칩으로 보여 준다.
 *
 * 전체 · 절정 · 좋음 · 보통 네 개를 항상 펼쳐 두지 않는다 —
 * 그것이 예전 상단이 button wall 처럼 보이던 이유다.
 * 아무 필터도 없으면 이 줄 자체가 사라진다.
 * ──────────────────────────────────────────────────────────── */

export function ActiveFilterChips({
  mode,
  total,
  unit,
}: {
  mode: MapMode;
  /**
   * 필터가 없을 때의 전체 수 — 지금 수가 무엇의 일부인지 밝힌다.
   * 요약이 이미 같은 말을 하는 자리(데스크톱 레일)에서는 넘기지 않는다.
   */
  total?: number;
  unit?: string;
}) {
  const seasonFilter = useMapStore((s) => s.seasonFilter);
  const setSeason = useMapStore((s) => s.setSeasonFilter);
  const startingOnly = useMapStore((s) => s.startingOnly);
  const toggleStarting = useMapStore((s) => s.toggleStartingOnly);
  const legalOnly = useMapStore((s) => s.legalOnly);
  const toggleLegal = useMapStore((s) => s.toggleLegalOnly);
  const focusedSpecies = useMapStore((s) => s.focusedSpecies);
  const focusSpecies = useMapStore((s) => s.focusSpecies);

  const chips: { key: string; label: string; tone: 'season' | 'legal'; clear: () => void }[] = [];

  if (mode === 'species') {
    if (focusedSpecies) {
      chips.push({
        key: 'species',
        label: `${focusedSpecies.name}만`,
        tone: 'season',
        clear: () => focusSpecies(null),
      });
    }
    if (seasonFilter !== 'all') {
      chips.push({
        key: 'season',
        label: SEASON_FILTERS.find((f) => f.id === seasonFilter)?.label ?? seasonFilter,
        tone: 'season',
        clear: () => setSeason('all'),
      });
    }
    if (startingOnly) {
      chips.push({ key: 'starting', label: '시작 중', tone: 'season', clear: toggleStarting });
    }
  }

  if (legalOnly) {
    chips.push({ key: 'legal', label: '규정 있음', tone: 'legal', clear: toggleLegal });
  }

  if (chips.length === 0) return null;

  return (
    <ul aria-label="적용된 필터" className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={chip.clear}
            className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11.5px] font-medium transition-colors ${
              chip.tone === 'legal'
                ? 'bg-[color:var(--color-restricted-soft)] text-[color:var(--color-restricted)]'
                : 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]'
            }`}
          >
            {chip.label}
            <span aria-hidden className="text-[10px] opacity-70">
              ✕
            </span>
            <span className="sr-only">필터 해제</span>
          </button>
        </li>
      ))}
      {total !== undefined && (
        <li className="text-[11px] text-[color:var(--color-faint)]">
          전체 {total}
          {unit} 가운데
        </li>
      )}
    </ul>
  );
}
