'use client';

import { MAX_SCALE, MIN_SCALE, useMapStore } from '@/store/map-store';

const STEP = 0.35;

/**
 * 확대/축소 보조 컨트롤.
 * 지도가 주인공이므로 이 상자는 눈에 먼저 들어오면 안 된다 —
 * 크기를 줄이고, 되돌릴 것이 없으면 초기화 버튼 자체를 그리지 않는다.
 */
export function MapControls() {
  const viewport = useMapStore((s) => s.viewport);
  const setViewport = useMapStore((s) => s.setViewport);
  const resetViewport = useMapStore((s) => s.resetViewport);

  const zoom = (delta: number) => setViewport({ ...viewport, scale: viewport.scale + delta });
  const moved = viewport.scale !== 1 || viewport.x !== 0 || viewport.y !== 0;

  const btn =
    'flex h-7 w-7 items-center justify-center rounded-md text-[14px] leading-none text-[color:var(--color-ink-soft)] transition-colors hover:bg-[color:var(--color-line-soft)] disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className="absolute bottom-2.5 right-2.5 z-20 flex flex-col gap-0.5 rounded-lg bg-white/72 p-0.5 backdrop-blur-sm">
      <button
        type="button"
        className={btn}
        onClick={() => zoom(STEP)}
        disabled={viewport.scale >= MAX_SCALE}
        aria-label="지도 확대"
      >
        ＋
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => zoom(-STEP)}
        disabled={viewport.scale <= MIN_SCALE}
        aria-label="지도 축소"
      >
        －
      </button>
      {moved && (
        <button
          type="button"
          className={`${btn} text-[10px]`}
          onClick={resetViewport}
          aria-label="지도 위치 초기화"
        >
          전체
        </button>
      )}
    </div>
  );
}
