import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatKoreanDate, todayKey } from '@/domain/date';
import { SPOT_TYPE_LABEL } from '@/domain/marine';
import { isLegallyBlocked } from '@/domain/regulation';
import { getZoneBySlug, getZoneDetail, listZoneSlugs } from '@/services/marine-service';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';
import { SeasonStrengthMeter } from '@/components/marine/SeasonStrengthMeter';
import { LegalStatusBadge } from '@/components/marine/LegalNotice';
import { ObservationList, ObservationFormShell } from '@/components/marine/ObservationList';
import { EmptyState } from '@/components/common/EmptyState';

export const revalidate = 900;

export function generateStaticParams() {
  return listZoneSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const zone = getZoneBySlug(slug);
  if (!zone) return { title: '찾을 수 없는 권역' };

  const detail = getZoneDetail(slug, todayKey());
  const species = detail?.entries.slice(0, 4).map((e) => e.species.name).join(', ') ?? '';

  return {
    title: `${zone.name} 지금 뭐가 잡히나`,
    description: `${zone.name}(${zone.seaRegion})에서 지금 만날 수 있는 어종${species ? `: ${species}` : ''}. 시즌 강도와 금어기·금지체장을 함께 확인하세요.`,
    alternates: { canonical: `/zone/${slug}` },
  };
}

export default async function ZonePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // 권역 페이지도 '지금' 을 다룬다. 날짜 탐색은 지도의 몫이다.
  const date = todayKey();

  const detail = getZoneDetail(slug, date);
  if (!detail) notFound();

  return (
    <main className="mx-auto max-w-[760px] px-4 pb-12 pt-5 lg:px-6 lg:pt-8">
      <nav className="mb-4 text-[12.5px] text-[color:var(--color-muted)]">
        <Link href="/map" className="underline underline-offset-2">
          지도
        </Link>
        <span aria-hidden className="mx-1.5">
          ›
        </span>
        <span>{detail.zone.seaRegion}</span>
      </nav>

      <header className="mb-5">
        <p className="text-[13px] text-[color:var(--color-faint)]">지금 이 바다에서는</p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{detail.zone.name}</h1>
        <p className="mt-1 text-[13px] text-[color:var(--color-muted)]">
          {formatKoreanDate(date, { year: true, weekday: true })} 기준 · {detail.entries.length}종
        </p>
      </header>

      <section className="mb-8" aria-labelledby="zone-species">
        <h2 id="zone-species" className="mb-2.5 text-[15px] font-semibold tracking-tight">
          대표 시즌 어종
        </h2>
        {detail.entries.length === 0 ? (
          <EmptyState
            title="이 시기에는 잠잠합니다"
            description="지도에서 날짜를 옮기면 이 바다의 다른 계절을 볼 수 있습니다."
            action={
              <Link
                href={`/map?date=${date}`}
                className="rounded-lg bg-[color:var(--color-ink)] px-3.5 py-2 text-[13px] font-medium text-white"
              >
                지도 열기
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {detail.entries.map((entry) => (
              <li key={entry.species.id}>
                <Link
                  href={`/species/${entry.species.slug}`}
                  className="flex h-full items-start gap-3 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3 transition-colors hover:border-[color:var(--color-ink)]/25"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: isLegallyBlocked(entry.legal.overallStatus)
                        ? 'var(--color-restricted-soft)'
                        : 'var(--color-sky-soft)',
                    }}
                  >
                    <SpeciesSprite entity={entry.species} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[14.5px] font-semibold">{entry.species.name}</span>
                      {isLegallyBlocked(entry.legal.overallStatus) && (
                        <LegalStatusBadge legal={entry.legal} />
                      )}
                    </span>
                    <SeasonStrengthMeter state={entry.season.state} size="sm" />
                    {entry.observation && entry.observation.recentCount > 0 && (
                      <span className="mt-0.5 block text-[12px] text-[color:var(--color-muted)]">
                        최근 {entry.observation.windowDays}일 {entry.observation.recentCount}건
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail.restricted.length > 0 && (
        <p className="mb-8 rounded-xl border border-[color:var(--color-restricted)]/25 bg-[color:var(--color-restricted-soft)] px-4 py-3 text-[13px] leading-relaxed text-[color:var(--color-restricted)]">
          <strong className="font-semibold">규정 확인 필요</strong>
          <br />
          {detail.restricted.map((s) => s.name).join(', ')} — 이 시기에 규정이 적용됩니다. 각 어종
          페이지에서 내용을 확인하세요.
        </p>
      )}

      <section className="mb-8" aria-labelledby="zone-env">
        <h2 id="zone-env" className="mb-2 text-[15px] font-semibold tracking-tight">
          낚시 환경
        </h2>
        <p className="text-[13.5px] text-[color:var(--color-ink-soft)]">
          {detail.zone.shoreTypes.map((t) => SPOT_TYPE_LABEL[t]).join(' · ')}
        </p>
        {detail.zone.description && (
          <p className="mt-1 text-[13px] text-[color:var(--color-muted)]">
            {detail.zone.description}
          </p>
        )}
      </section>

      {detail.spots.length > 0 && (
        <section className="mb-8" aria-labelledby="zone-spots">
          <h2 id="zone-spots" className="mb-2 text-[15px] font-semibold tracking-tight">
            널리 알려진 공개 장소
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {detail.spots.map((spot) => (
              <li
                key={spot.id}
                className="rounded-lg border border-[color:var(--color-line)] px-2.5 py-1.5 text-[12.5px] text-[color:var(--color-ink-soft)]"
              >
                {spot.name}
                <span className="ml-1.5 text-[color:var(--color-faint)]">
                  {SPOT_TYPE_LABEL[spot.type]}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-[color:var(--color-faint)]">
            공개적으로 알려진 장소만 표시합니다. 개인 포인트는 다루지 않습니다.
          </p>
        </section>
      )}

      <section className="mb-8" aria-labelledby="zone-observations">
        <h2 id="zone-observations" className="mb-2.5 text-[15px] font-semibold tracking-tight">
          최근 관측
        </h2>
        <ObservationList observations={detail.recentObservations} />
        <div className="mt-3">
          <ObservationFormShell zoneName={detail.zone.name} />
        </div>
      </section>

      <Link
        href={`/map?date=${date}`}
        className="block rounded-xl border border-[color:var(--color-line)] px-4 py-3 text-center text-[13.5px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-ink)]"
      >
        지도에서 보기
      </Link>
    </main>
  );
}
