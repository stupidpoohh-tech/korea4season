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
    /*
     * 지도 오른쪽 세로 가운데. 아래쪽 가운데는 추천 CTA 가, 왼쪽 위는
     * 접힌 수 안내가 쓰고 있어서 아래 모서리에 두면 자리가 애매해진다.
     * 바탕이 흰색이라 흰 상자만으로는 보이지 않으므로 테두리로 존재를 알린다.
     */
    <div className="absolute right-2.5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-0.5 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)]/88 p-0.5 shadow-[var(--shadow-soft)] backdrop-blur-sm">
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
