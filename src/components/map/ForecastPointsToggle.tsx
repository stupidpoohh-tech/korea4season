'use client';

import { useMapStore } from '@/store/map-store';

/* ────────────────────────────────────────────────────────────
 * 공식 예측 지점 보기.
 *
 * 수종 선택과 달리 이것은 보조 컨트롤이다 — 켜지 않아도 화면은 완성이고,
 * 켜면 지도 위에 공식 지점의 이름과 날짜가 드러난다.
 * 기본은 꺼짐이다.
 * ──────────────────────────────────────────────────────────── */

export function ForecastPointsToggle({ full = false }: { full?: boolean }) {
  const on = useMapStore((s) => s.showForecastPoints);
  const toggle = useMapStore((s) => s.toggleForecastPoints);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`flex shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1 text-[12.5px] leading-[19px] font-medium transition-colors ${
        full ? 'w-full' : ''
      } ${
        on
          ? 'border-[color:var(--color-ink)]/35 bg-white text-[color:var(--color-ink)]'
          : 'border-[color:var(--color-line)] bg-transparent text-[color:var(--color-muted)] hover:border-[color:var(--color-ink)]/25'
      }`}
    >
      <span
        aria-hidden
        className={`h-2 w-2 rounded-full ${on ? 'bg-[#b8532a]' : 'border border-[color:var(--color-faint)]'}`}
      />
      공식 예측 지점
    </button>
  );
}
