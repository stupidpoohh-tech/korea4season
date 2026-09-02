import Link from 'next/link';
import type { DateKey } from '@/domain/date';
import { resolveHappeningNow } from '@/services/nature-service';
import { CATEGORY_META } from '@/lib/category-meta';
import { NatureStatusBadge } from '@/components/nature/NatureStatusBadge';
import { EmptyState } from '@/components/common/EmptyState';

/**
 * Nature Now — 지금 한국에서 진행 중인 자연현상만 모은다. (요구사항 #10)
 */
export function NatureNow({ date, limit = 6 }: { date: DateKey; limit?: number }) {
  const items = resolveHappeningNow({ date }).slice(0, limit);
  const total = resolveHappeningNow({ date }).length;

  return (
    <section aria-labelledby="nature-now">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 id="nature-now" className="text-[15px] font-semibold tracking-tight">
          지금, 자연
          <span className="ml-2 align-middle text-[11px] font-medium tracking-wider text-[color:var(--color-accent-strong)]">
            NOW
          </span>
        </h2>
        {total > limit && (
          <Link href="/map" className="text-[12.5px] text-[color:var(--color-muted)] underline underline-offset-2">
            지도에서 모두 보기
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="지금 진행 중인 자연현상이 없습니다"
          description="계절이 바뀌면 이 자리가 채워집니다. 지도에서 시간을 옮겨 보세요."
        />
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {items.map((item) => {
            const category = CATEGORY_META[item.entity.category];
            const place =
              item.locations.map((l) => l.name).join(' · ') || item.occurrence.regions.join(' · ');
            return (
              <li key={item.occurrence.id}>
                <Link
                  href={`/event/${item.occurrence.slug}`}
                  className="flex h-full items-start gap-3 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3 transition-colors hover:border-[color:var(--color-ink)]/25"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[16px]"
                    style={{ background: `${category.color}14` }}
                  >
                    {item.entity.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[14px] font-semibold">{item.entity.name}</span>
                      <NatureStatusBadge status={item.status} polarity={item.occurrence.polarity} />
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-[color:var(--color-muted)]">
                      📍 {place}
                    </span>
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
