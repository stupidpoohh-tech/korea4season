'use client';

import { SEASON_FILTERS, type MapMode } from '@/services/map-service';
import { useMapStore } from '@/store/map-store';

/* ────────────────────────────────────────────────────────────
 * 지도 상단 컨트롤.
 *
 * 두 종류의 상태를 한 줄에 섞지 않는다.
 *   시즌 상태 — 지금 잘 잡히는가   (피크 / 좋음 / 곧 시작)
 *   규정 상태 — 잡아도 되는가      (금어기 / 체장 / 조건부)
 * 예전에는 '규정 확인' 이 시즌 칩들과 나란히 있어서
 * 사용자가 이 둘을 같은 축의 값으로 읽었다.
 * ──────────────────────────────────────────────────────────── */

const chip =
  'flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors';
const off =
  'border-[color:var(--color-line)] bg-white/85 text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]/30';

/** Row 1 — 시즌 상태 한 축만 */
export function SeasonFilterRow({ counts }: { counts: Record<string, number> }) {
  const selected = useMapStore((s) => s.seasonFilter);
  const setSeason = useMapStore((s) => s.setSeasonFilter);

  return (
    <div role="group" aria-label="시즌 상태" className="flex flex-wrap gap-1.5">
      {SEASON_FILTERS.map((filter) => {
        const on = selected === filter.id;
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => setSeason(filter.id)}
            aria-pressed={on}
            className={`${chip} ${on ? 'border-transparent bg-[color:var(--color-ink)] text-white' : off}`}
          >
            {filter.label}
            <span className="tabular opacity-60">{counts[filter.id] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 규정 필터 — 보조 컨트롤.
 * 0건이면 자리를 차지하지 않게 아예 숨긴다. 빈 버튼은 정보가 아니다.
 */
export function LegalFilterToggle({ count, unit = '어종' }: { count: number; unit?: string }) {
  const on = useMapStore((s) => s.legalOnly);
  const toggle = useMapStore((s) => s.toggleLegalOnly);

  if (count === 0 && !on) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-[11.5px] font-medium transition-colors ${
        on
          ? 'border-transparent bg-[color:var(--color-restricted)] text-white'
          : 'border-[color:var(--color-line)] bg-white/70 text-[color:var(--color-muted)] hover:border-[color:var(--color-restricted)]/40 hover:text-[color:var(--color-restricted)]'
      }`}
    >
      <span aria-hidden>⚠</span>
      규정 있는 {unit}만
      <span className="tabular opacity-70">{count}</span>
    </button>
  );
}

/** Row 2 — 어종 중심 / 권역 중심. 지도에서 묻는 질문 자체를 바꾼다. */
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
