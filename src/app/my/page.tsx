import type { Metadata } from 'next';
import { MyScreen } from '@/components/layout/MyScreen';

export const metadata: Metadata = {
  title: 'MY',
  description: '관심 자연현상과 알림, 나의 자연도감 기록.',
};

export default function MyPage() {
  return <MyScreen />;
}
