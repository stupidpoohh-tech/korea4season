import type { Metadata } from 'next';
import { isValidDateKey, todayKey } from '@/domain/date';
import { WeekDiscovery } from '@/components/discovery/WeekDiscovery';

export const revalidate = 900;

export const metadata: Metadata = {
  title: '이번 주 어디 갈까',
  description:
    '이번 주 대한민국에서 볼 수 있는 자연현상을 지역별로 모았습니다. 꽃, 단풍, 철새, 제철 자연.',
};

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date && isValidDateKey(params.date) ? params.date : todayKey();

  return (
    <main className="mx-auto max-w-[900px] px-4 pb-10 pt-5 lg:px-6 lg:pt-8">
      <header className="mb-5">
        <h1 className="text-[24px] font-semibold tracking-tight">이번 주 어디 갈까?</h1>
        <p className="mt-1 text-[13.5px] text-[color:var(--color-muted)]">
          이번 주 무엇을 볼 수 있는지부터 봅니다.
        </p>
      </header>

      <WeekDiscovery date={date} limit={8} />
    </main>
  );
}
