import type { Metadata } from 'next';
import { MapMount } from '@/components/map/MapMount';

export const metadata: Metadata = {
  title: '지도',
  description:
    '대한민국 자연 지도. 날짜를 움직이면 금어기 어종, 꽃, 단풍, 철새가 지도 위에서 나타나고 사라집니다.',
};

/*
 * 이 페이지는 정적 파일 한 장이다.
 *
 * 지도가 '오늘' 에서 출발한다는 것은 그대로다. 다만 그 '오늘' 을 서버가 아니라
 * 브라우저가 정한다 (components/map/MapMount.tsx). 그래서 HTML 에 날짜가
 * 박히지 않고, 미리 구워 두어도 어긋나지 않는다.
 */
export default function MapPage() {
  return <MapMount />;
}
