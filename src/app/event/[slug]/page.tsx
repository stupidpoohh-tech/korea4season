import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  formatDaysValue,
  formatKoreanDate,
  toDateKey,
  todayKey,
} from '@/domain/date';
import { CATEGORY_META } from '@/lib/category-meta';
import {
  getOccurrenceBySlug,
  listOccurrenceSlugs,
  resolveByEntity,
  resolveBySlug,
} from '@/services/nature-service';
import { NatureStatusBadge } from '@/components/nature/NatureStatusBadge';
import { SourceBlock } from '@/components/nature/SourceBlock';
import { NatureEventCard } from '@/components/nature/NatureEventCard';
import { DemoBadge } from '@/components/common/DemoBadge';
import { ObservationPlaceholder } from '@/components/observation/ObservationCard';
import { EventDetailActions } from '@/components/nature/EventDetailActions';

export const revalidate = 900;

export function generateStaticParams() {
  return listOccurrenceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = resolveBySlug(slug, todayKey());
  if (!item) return { title: '찾을 수 없는 자연현상' };

  const period = `${formatKoreanDate(toDateKey(item.window.start))} ~ ${formatKoreanDate(toDateKey(item.window.end))}`;
  const kind = item.occurrence.polarity === 'restricted' ? '금어기' : '시기';
  const places = item.locations.map((l) => l.name).join(', ') || item.occurrence.regions.join(', ');
  const title = `${item.entity.name} ${kind}`;

  return {
    title,
    description: `${places} ${item.entity.name} ${kind} ${period}. ${item.entity.summary}`,
    alternates: { canonical: `/event/${slug}` },
    openGraph: {
      title: `${title} · 계절지도`,
      description: `${period} · ${places}`,
      type: 'article',
    },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const today = todayKey();
  const item = resolveBySlug(slug, today);
  const occurrence = getOccurrenceBySlug(slug);
  if (!item || !occurrence) notFound();

  const category = CATEGORY_META[item.entity.category];
  const restricted = occurrence.polarity === 'restricted';
  const startKey = toDateKey(item.window.start);
  const related = resolveByEntity(item.entity.id, today).filter(
    (r) => r.occurrence.id !== occurrence.id,
  );

  const jsonLd =
    occurrence.polarity === 'observable'
      ? {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: `${item.entity.name} · ${item.locations[0]?.name ?? occurrence.regions[0] ?? '대한민국'}`,
          description: item.entity.summary,
          startDate: startKey,
          endDate: toDateKey(item.window.end),
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: item.locations.map((l) => ({
            '@type': 'Place',
            name: l.name,
            address: { '@type': 'PostalAddress', addressRegion: l.region, addressCountry: 'KR' },
            geo: { '@type': 'GeoCoordinates', latitude: l.geo.lat, longitude: l.geo.lng },
          })),
        }
      : null;

  return (
    <main className="mx-auto max-w-[720px] px-4 pb-12 pt-5 lg:px-6 lg:pt-8">
      {jsonLd && (
        <script
          type="application/ld+json"
          // 자체 생성한 정적 데이터만 직렬화한다
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <nav className="mb-4 text-[12.5px] text-[color:var(--color-muted)]">
        <Link href="/map" className="underline underline-offset-2">
          지도
        </Link>
        <span aria-hidden className="mx-1.5">
          ›
        </span>
        <span>{category.label}</span>
      </nav>

      <header className="mb-5 flex items-start gap-3.5">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[28px]"
          style={{ background: `${category.color}14` }}
        >
          {item.entity.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-[24px] font-semibold tracking-tight">
              {item.entity.name}
              {restricted ? ' 금어기' : ''}
            </h1>
            {occurrence.isDemo && <DemoBadge />}
          </div>
          {item.entity.speciesName && (
            <p className="mt-0.5 text-[12px] italic text-[color:var(--color-faint)]">
              {item.entity.speciesName}
            </p>
          )}
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <NatureStatusBadge status={item.status} polarity={occurrence.polarity} size="md" />
        {item.daysToNextChange !== undefined && item.nextChangeLabel && (
          <span className="text-[13.5px] text-[color:var(--color-muted)]">
            {item.nextChangeLabel}{' '}
            <span className="font-semibold tabular text-[color:var(--color-ink)]">
              {formatDaysValue(item.daysToNextChange)}
            </span>
          </span>
        )}
        <span className="text-[12.5px] text-[color:var(--color-faint)]">
          {formatKoreanDate(today, { year: true })} 기준
        </span>
      </div>

      <p className="mb-5 text-[14.5px] leading-relaxed text-[color:var(--color-ink-soft)]">
        {item.entity.description ?? item.entity.summary}
      </p>

      <dl className="mb-5 divide-y divide-[color:var(--color-line-soft)] rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4">
        <div className="flex gap-3 py-3">
          <dt className="w-[78px] shrink-0 text-[13px] text-[color:var(--color-faint)]">
            {restricted ? '금어기' : '기간'}
          </dt>
          <dd className="flex-1 text-[14px] tabular">
            {formatKoreanDate(startKey)} ~ {formatKoreanDate(toDateKey(item.window.end))}
          </dd>
        </div>
        {item.peakWindow && (
          <div className="flex gap-3 py-3">
            <dt className="w-[78px] shrink-0 text-[13px] text-[color:var(--color-faint)]">절정</dt>
            <dd className="flex-1 text-[14px] tabular">
              {formatKoreanDate(toDateKey(item.peakWindow.start))} ~{' '}
              {formatKoreanDate(toDateKey(item.peakWindow.end))}
            </dd>
          </div>
        )}
        {item.entity.fishingRule?.minimumSizeCm !== undefined && (
          <div className="flex gap-3 py-3">
            <dt className="w-[78px] shrink-0 text-[13px] text-[color:var(--color-faint)]">
              금지체장
            </dt>
            <dd className="flex-1 text-[14px]">
              {item.entity.fishingRule.minimumSizeCm}cm 이하
            </dd>
          </div>
        )}
        {item.entity.fishingRule?.minimumWeightG !== undefined && (
          <div className="flex gap-3 py-3">
            <dt className="w-[78px] shrink-0 text-[13px] text-[color:var(--color-faint)]">
              금지체중
            </dt>
            <dd className="flex-1 text-[14px]">{item.entity.fishingRule.minimumWeightG}g 이하</dd>
          </div>
        )}
        <div className="flex gap-3 py-3">
          <dt className="w-[78px] shrink-0 text-[13px] text-[color:var(--color-faint)]">
            적용 지역
          </dt>
          <dd className="flex-1 text-[14px]">{occurrence.regions.join(' · ')}</dd>
        </div>
        {item.locations.length > 0 && (
          <div className="flex gap-3 py-3">
            <dt className="w-[78px] shrink-0 text-[13px] text-[color:var(--color-faint)]">장소</dt>
            <dd className="flex-1 text-[14px]">
              {item.locations
                .map((l) => (l.name === l.region ? l.name : `${l.name} (${l.region})`))
                .join(' · ')}
            </dd>
          </div>
        )}
        {occurrence.rules?.length ? (
          <div className="flex gap-3 py-3">
            <dt className="w-[78px] shrink-0 text-[13px] text-[color:var(--color-faint)]">
              관련 규정
            </dt>
            <dd className="flex-1 space-y-0.5 text-[14px]">
              {occurrence.rules.map((rule) => (
                <p key={rule}>{rule}</p>
              ))}
            </dd>
          </div>
        ) : null}
        {item.entity.fishingRule?.regionRules?.length ? (
          <div className="flex gap-3 py-3">
            <dt className="w-[78px] shrink-0 text-[13px] text-[color:var(--color-faint)]">
              지역 규정
            </dt>
            <dd className="flex-1 space-y-1.5 text-[13.5px]">
              {item.entity.fishingRule.regionRules.map((rule) => (
                <div key={rule.scope}>
                  <p className="font-medium">{rule.scope}</p>
                  {rule.closedSeasonStart && rule.closedSeasonEnd && (
                    <p className="tabular text-[color:var(--color-muted)]">
                      {rule.closedSeasonStart} ~ {rule.closedSeasonEnd}
                    </p>
                  )}
                  {rule.note && (
                    <p className="text-[color:var(--color-muted)]">{rule.note}</p>
                  )}
                </div>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>

      <EventDetailActions slug={slug} startDate={startKey} entityId={item.entity.id} />

      <div className="mt-5">
        <SourceBlock occurrence={occurrence} />
      </div>

      {related.length > 0 && (
        <section className="mt-8" aria-labelledby="related">
          <h2 id="related" className="mb-2.5 text-[15px] font-semibold tracking-tight">
            {item.entity.name}, 다른 지역
          </h2>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {related.map((other) => (
              <li key={other.occurrence.id}>
                <Link href={`/event/${other.occurrence.slug}`} className="block">
                  <NatureEventCard item={other} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8" aria-labelledby="observation">
        <h2 id="observation" className="mb-2.5 text-[15px] font-semibold tracking-tight">
          현장은 어떤가요
        </h2>
        <ObservationPlaceholder label={item.locations[0]?.name ?? occurrence.regions[0] ?? '현장'} />
      </section>
    </main>
  );
}
