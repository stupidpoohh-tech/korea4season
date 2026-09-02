import Link from 'next/link';
import type { DateKey } from '@/domain/date';
import { formatKoreanDate } from '@/domain/date';
import { getTodayHeadlines } from '@/services/nature-service';
import { CATEGORY_META } from '@/lib/category-meta';
import { EmptyState } from '@/components/common/EmptyState';

/**
 * 오늘의 자연. CMS 가 아니라 NatureOccurrence 에서 문장을 만든다. (요구사항 #9)
 * 카드를 누르면 지도에서 해당 자연현상으로 이동한다.
 */
export function TodayNature({ date }: { date: DateKey }) {
  const headlines = getTodayHeadlines(date, 4);

  return (
    <section aria-labelledby="today-nature">
      <h2 id="today-nature" className="mb-2.5 text-[15px] font-semibold tracking-tight">
        오늘 한국에서는
      </h2>

      {headlines.length === 0 ? (
        <EmptyState
          title="오늘은 조용한 날입니다"
          description="지도에서 날짜를 옮겨 다른 계절의 대한민국을 살펴보세요."
          action={
            <Link
              href="/map"
              className="rounded-lg bg-[color:var(--color-ink)] px-3.5 py-2 text-[13px] font-medium text-white"
            >
              지도 열기
            </Link>
          }
        />
      ) : (
        <ul className="space-y-1.5">
          {headlines.map((headline) => {
            const category = CATEGORY_META[headline.resolved.entity.category];
            return (
              <li key={headline.id}>
                <Link
                  href={`/map?date=${date}&focus=${encodeURIComponent(headline.resolved.occurrence.id)}`}
                  className="flex items-center gap-3 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-3 transition-colors hover:border-[color:var(--color-ink)]/25"
                >
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[17px]"
                    style={{ background: `${category.color}14` }}
                  >
                    {headline.icon}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] leading-snug">{headline.text}</span>
                  <span aria-hidden className="text-[color:var(--color-faint)]">
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-2 text-[11.5px] text-[color:var(--color-faint)]">
        {formatKoreanDate(date, { year: true, weekday: true })} 기준
      </p>
    </section>
  );
}
