'use client';

import Link from 'next/link';
import { todayKey } from '@/domain/date';
import { resolveOccurrence } from '@/domain/occurrence';
import { getNatureIndex } from '@/repositories/nature-repository';
import { NatureEventCard } from '@/components/nature/NatureEventCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ObservationPlaceholder } from '@/components/observation/ObservationCard';
import { useDexHydrated, useDexStore } from '@/store/dex-store';

export function MyScreen() {
  const hydrated = useDexHydrated();
  const records = useDexStore((s) => s.records);
  const subscriptions = useDexStore((s) => s.subscriptions);
  const reset = useDexStore((s) => s.reset);

  const index = getNatureIndex();
  const date = todayKey();

  const subscribed = hydrated
    ? Object.values(subscriptions)
        .map((sub) => {
          const occ = index.occurrenceById.get(sub.occurrenceId);
          if (!occ) return null;
          return resolveOccurrence(occ, date, {
            entities: index.entityById,
            locations: index.locationById,
          });
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  const discoveredCount = hydrated ? Object.keys(records).length : 0;

  return (
    <main className="mx-auto max-w-[720px] px-4 pb-10 pt-5 lg:px-6 lg:pt-8">
      <header className="mb-5">
        <h1 className="text-[24px] font-semibold tracking-tight">MY</h1>
        <p className="mt-1 text-[13.5px] text-[color:var(--color-muted)]">
          로그인 없이 이 브라우저에 저장됩니다. 계정 연동은 이후 단계에서 붙습니다.
        </p>
      </header>

      <div className="space-y-8">
        <section aria-labelledby="my-dex">
          <h2 id="my-dex" className="mb-2.5 text-[15px] font-semibold tracking-tight">
            자연도감
          </h2>
          <Link
            href="/dex"
            className="flex items-center justify-between rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3.5 transition-colors hover:border-[color:var(--color-ink)]/25"
          >
            <span className="text-[14px]">
              <span className="font-semibold tabular">{hydrated ? discoveredCount : '—'}</span>
              <span className="text-[color:var(--color-muted)]">
                {' '}
                / {index.entities.length} 발견
              </span>
            </span>
            <span aria-hidden className="text-[color:var(--color-faint)]">
              ›
            </span>
          </Link>
        </section>

        <section aria-labelledby="my-subs">
          <h2 id="my-subs" className="mb-2.5 text-[15px] font-semibold tracking-tight">
            알림받는 자연
          </h2>
          {subscribed.length === 0 ? (
            <EmptyState
              title="알림받는 자연이 없습니다"
              description="상세에서 ♡ 알림받기를 누르면 시작·절정·종료 시점을 챙겨 드립니다."
              action={
                <Link
                  href="/map"
                  className="rounded-lg bg-[color:var(--color-ink)] px-3.5 py-2 text-[13px] font-medium text-white"
                >
                  지도에서 찾아보기
                </Link>
              }
            />
          ) : (
            <ul className="space-y-1.5">
              {subscribed.map((item) => (
                <li key={item.occurrence.id}>
                  <Link href={`/event/${item.occurrence.slug}`} className="block">
                    <NatureEventCard item={item} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {subscribed.length > 0 && (
            <p className="mt-2 text-[11.5px] text-[color:var(--color-faint)]">
              구독 정보만 저장하고 있습니다. 실제 알림 발송은 준비 중입니다.
            </p>
          )}
        </section>

        <section aria-labelledby="my-observation">
          <h2 id="my-observation" className="mb-2.5 text-[15px] font-semibold tracking-tight">
            현장제보
          </h2>
          <ObservationPlaceholder label="내가 남긴 관측" />
        </section>

        {hydrated && (discoveredCount > 0 || subscribed.length > 0) && (
          <button
            type="button"
            onClick={reset}
            className="text-[12.5px] text-[color:var(--color-muted)] underline underline-offset-2"
          >
            이 브라우저에 저장된 기록 지우기
          </button>
        )}
      </div>
    </main>
  );
}
