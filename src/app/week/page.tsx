import type { Metadata } from 'next';
import { isValidDateKey, todayKey } from '@/domain/date';
import { FishingPicks } from '@/components/marine/FishingPicks';
import { WeekDiscovery } from '@/components/discovery/WeekDiscovery';

export const revalidate = 900;

export const metadata: Metadata = {
  title: '이번 주 뭐 잡으러 갈까',
  description:
    '이번 주 대한민국 바다에서 만날 수 있는 어종을 권역별로 모았습니다. 시즌 강도, 추천 방식, 규정까지 함께 확인하세요.',
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
        <h1 className="text-[24px] font-semibold tracking-tight">이번 주, 뭐 잡으러 갈까요?</h1>
        <p className="mt-1 text-[13.5px] text-[color:var(--color-muted)]">
          어디로 갈지보다 무엇을 만날 수 있는지부터 봅니다.
        </p>
      </header>

      <FishingPicks date={date} limit={10} />

      <section className="mt-10 border-t border-[color:var(--color-line-soft)] pt-8">
        <h2 className="mb-1 text-[18px] font-semibold tracking-tight">바다 밖에서는</h2>
        <p className="mb-4 text-[13px] text-[color:var(--color-muted)]">
          같은 주에 볼 수 있는 꽃 · 단풍 · 철새
        </p>
        <WeekDiscovery date={date} limit={4} />
      </section>
    </main>
  );
}
