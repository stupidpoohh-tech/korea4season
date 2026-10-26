'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { isValidDateKey } from '@/domain/date';
import { useToday } from '@/lib/use-today';
import { ENABLED_CATEGORIES } from '@/data-sources';
import { FishingPicks } from '@/components/marine/FishingPicks';
import { WeekDiscovery } from '@/components/discovery/WeekDiscovery';

/** 바다 밖 레이어가 꺼져 있으면 그 자리는 비어 있는 제목만 남는다 */
const SHOW_LAND_SECTION = ENABLED_CATEGORIES.some((c) => c !== 'fishing');

/*
 * 날짜와 ?date= 를 브라우저가 읽는다.
 *
 * 예전에는 서버가 searchParams 를 await 하고 todayKey() 를 불렀다. 그 둘 때문에
 * 이 화면은 요청마다 Worker 를 깨웠고, revalidate = 900 으로도 '오늘' 이
 * 최대 15분 뒤처졌다. 브라우저가 읽으면 화면은 정적 파일이 되고 날짜는 정확해진다.
 */
export function WeekClient() {
  const params = useSearchParams();
  const today = useToday();

  const urlDate = params.get('date');
  const date = urlDate && isValidDateKey(urlDate) ? urlDate : today;

  return (
    <main className="mx-auto max-w-[900px] px-4 pb-10 pt-5 lg:px-6 lg:pt-8">
      <header className="mb-5">
        <Link
          href={date ? `/map?date=${date}` : '/map'}
          className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-[color:var(--color-muted)] transition-colors hover:text-[color:var(--color-ink)]"
        >
          <span aria-hidden>‹</span> 지도로 돌아가기
        </Link>
        <h1 className="text-[24px] font-semibold tracking-tight">이번 주, 뭐 잡으러 갈까요?</h1>
        <p className="mt-1 text-[13.5px] text-[color:var(--color-muted)]">
          어디로 갈지보다 무엇을 만날 수 있는지부터 봅니다.
        </p>
      </header>

      {date ? (
        <>
          <FishingPicks date={date} limit={10} />

          {SHOW_LAND_SECTION && (
            <section className="mt-10 border-t border-[color:var(--color-line-soft)] pt-8">
              <h2 className="mb-1 text-[18px] font-semibold tracking-tight">바다 밖에서는</h2>
              <p className="mb-4 text-[13px] text-[color:var(--color-muted)]">
                같은 주에 볼 수 있는 꽃 · 단풍 · 철새
              </p>
              <WeekDiscovery date={date} limit={4} />
            </section>
          )}
        </>
      ) : (
        <p className="py-10 text-center text-[13px] text-[color:var(--color-muted)]">
          불러오는 중입니다…
        </p>
      )}
    </main>
  );
}
