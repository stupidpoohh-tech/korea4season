import type { Metadata } from 'next';
import { HomeClient } from '@/components/today/HomeClient';

export const metadata: Metadata = {
  title: '오늘',
  description:
    '오늘 대한민국 바다와 산에서 무엇을 만날 수 있는지 한 화면에 모았습니다.',
};

/* '오늘' 은 브라우저가 정한다 — 이 페이지는 정적 파일이다 */
export default function HomePage() {
  return <HomeClient />;
}
