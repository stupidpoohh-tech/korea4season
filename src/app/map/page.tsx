import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MapScreen } from '@/components/map/MapScreen';

export const metadata: Metadata = {
  title: '지도',
  description:
    '대한민국 자연 지도. 날짜를 움직이면 금어기 어종, 꽃, 단풍, 철새가 지도 위에서 나타나고 사라집니다.',
};

export default function MapPage() {
  return (
    <Suspense fallback={<div className="h-[70dvh]" />}>
      <MapScreen />
    </Suspense>
  );
}
