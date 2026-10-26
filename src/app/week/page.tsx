import { Suspense } from 'react';
import type { Metadata } from 'next';
import { WeekClient } from '@/components/discovery/WeekClient';

export const metadata: Metadata = {
  title: '이번 주 뭐 잡으러 갈까',
  description:
    '이번 주 대한민국 바다에서 만날 수 있는 어종을 권역별로 모았습니다. 시즌 강도, 추천 방식, 규정까지 함께 확인하세요.',
};

/* 날짜와 ?date= 는 브라우저가 읽는다 — 이 페이지는 정적 파일이다 */
export default function WeekPage() {
  return (
    <Suspense fallback={<div className="min-h-[60dvh]" />}>
      <WeekClient />
    </Suspense>
  );
}
