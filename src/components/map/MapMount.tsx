'use client';

import dynamic from 'next/dynamic';

/* ────────────────────────────────────────────────────────────
 * 지도는 브라우저에서만 그린다.
 *
 * 예전에는 /map 이 force-dynamic 이었다. 이유는 하나 —
 * 미리 구우면 HTML 에 빌드한 날짜가 박히고 브라우저의 '오늘' 과 어긋나서다.
 * 그 한 줄 때문에 지도를 여는 모든 요청이 Worker 를 깨웠다.
 *
 * 지도는 어차피 손으로 만지는 화면이라 서버가 그린 마크업이 할 일이 거의 없다.
 * 서버에서 아예 그리지 않으면 HTML 에 날짜가 들어갈 일도 없고, 페이지는
 * 정적 파일 한 장이 된다. '오늘' 은 브라우저가 정하므로 15분 전이 아니라
 * 지금이고, 서버가 쓰는 CPU 는 0 이다.
 *
 * 맞바꾼 것: 첫 화면에 지도 마크업이 바로 있지 않고 JS 가 붙은 뒤에 들어온다.
 * 아래 자리틀이 그동안의 높이를 잡아 레이아웃이 튀지 않게 한다.
 * ──────────────────────────────────────────────────────────── */

const MapScreen = dynamic(
  () => import('./MapScreen').then((m) => m.MapScreen),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  },
);

function MapSkeleton() {
  return (
    <div
      className="mx-auto flex h-[calc(100dvh-32px-env(safe-area-inset-bottom))] max-w-[1180px] items-center justify-center lg:h-[calc(100dvh-57px-32px)]"
      role="status"
      aria-live="polite"
    >
      <p className="text-[13px] text-[color:var(--color-muted)]">지도를 불러오는 중입니다…</p>
    </div>
  );
}

export function MapMount() {
  return <MapScreen />;
}
