import Link from 'next/link';
import type { DateKey } from '@/domain/date';
import { isLegallyBlocked } from '@/domain/regulation';
import { getSeaHeadlines } from '@/services/marine-service';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';
import { EmptyState } from '@/components/common/EmptyState';

/**
 * 오늘의 바다.
 * NatureOccurrence 가 아니라 FishingOccurrence 에서 문장을 만든다.
 */
export function TodaySea({ date, limit = 3 }: { date: DateKey; limit?: number }) {
  const headlines = getSeaHeadlines(date, limit);

  return (
    <section aria-labelledby="today-sea">
      <h2 id="today-sea" className="mb-2.5 text-[15px] font-semibold tracking-tight">
        오늘 바다에서는
      </h2>

      {headlines.length === 0 ? (
        <EmptyState
          title="오늘은 바다가 잠잠합니다"
          description="지도에서 날짜를 옮겨 다른 계절의 바다를 살펴보세요."
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
          {headlines.map(({ id, item, text }) => {
            const blocked = isLegallyBlocked(item.legal.overallStatus);
            return (
              <li key={id}>
                <Link
                  href={`/map?date=${date}&focus=${encodeURIComponent(item.key)}`}
                  className="flex items-center gap-3 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3.5 py-3 transition-colors hover:border-[color:var(--color-ink)]/25"
                >
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: blocked
                        ? 'var(--color-restricted-soft)'
                        : 'var(--color-sky-soft)',
                    }}
                  >
                    <SpeciesSprite entity={item.species} size={17} />
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] leading-snug">{text}</span>
                  <span aria-hidden className="text-[color:var(--color-faint)]">
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
