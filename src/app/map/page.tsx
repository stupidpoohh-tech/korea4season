import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MapScreen } from '@/components/map/MapScreen';

export const metadata: Metadata = {
  title: '지도',
  description:
    '대한민국 자연 지도. 날짜를 움직이면 금어기 어종, 꽃, 단풍, 철새가 지도 위에서 나타나고 사라집니다.',
};

/*
 * 지도는 '오늘'에서 출발한다.
 *
 * 이 페이지를 미리 구워 두면 HTML 에는 빌드한 날짜가 박히고,
 * 브라우저는 그 HTML 위에 오늘 날짜로 다시 그린다 — 서버 9월 2일 /
 * 클라이언트 9월 3일 같은 hydration 불일치가 그래서 났다.
 * 요청마다 그리게 해서 서버와 브라우저가 같은 '오늘'을 보게 한다.
 */
export const dynamic = 'force-dynamic';

export default function MapPage() {
  return (
    <Suspense fallback={<div className="h-[70dvh]" />}>
      <MapScreen />
    </Suspense>
  );
}
