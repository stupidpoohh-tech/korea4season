'use client';

import { MAX_SCALE, MIN_SCALE, useMapStore } from '@/store/map-store';

const STEP = 0.35;

export function MapControls() {
  const viewport = useMapStore((s) => s.viewport);
  const setViewport = useMapStore((s) => s.setViewport);
  const resetViewport = useMapStore((s) => s.resetViewport);

  const zoom = (delta: number) =>
    setViewport({ ...viewport, scale: viewport.scale + delta });

  const btn =
    'flex h-9 w-9 items-center justify-center rounded-lg bg-white/92 text-[15px] text-[color:var(--color-ink-soft)] backdrop-blur-sm transition-colors hover:bg-white disabled:opacity-35 disabled:hover:bg-white/92';

  return (
    <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5 rounded-xl border border-[color:var(--color-line)] bg-white/70 p-1 shadow-[var(--shadow-soft)] backdrop-blur-sm">
      <button type="button" className={btn} onClick={() => zoom(STEP)} disabled={viewport.scale >= MAX_SCALE} aria-label="지도 확대">
        ＋
      </button>
      <button type="button" className={btn} onClick={() => zoom(-STEP)} disabled={viewport.scale <= MIN_SCALE} aria-label="지도 축소">
        －
      </button>
      <button
        type="button"
        className={`${btn} text-[11px]`}
        onClick={resetViewport}
        disabled={viewport.scale === 1 && viewport.x === 0 && viewport.y === 0}
        aria-label="지도 위치 초기화"
      >
        전체
      </button>
    </div>
  );
}
