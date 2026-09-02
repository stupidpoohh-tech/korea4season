import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatKoreanDate, toDateKey, todayKey } from '@/domain/date';
import { FISHING_METHOD_LABEL, SEASON_STRENGTH_LABEL } from '@/domain/marine';
import {
  evaluateSpecies,
  getRecentObservations,
  getSpeciesAllZones,
  getSpeciesBySlug,
  getSpeciesZones,
  listSpeciesSlugs,
  observationApplies,
} from '@/services/marine-service';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';
import { SeasonStrengthMeter } from '@/components/marine/SeasonStrengthMeter';
import { LegalNotice } from '@/components/marine/LegalNotice';
import { ObservationList } from '@/components/marine/ObservationList';
import { DemoBadge } from '@/components/common/DemoBadge';
import { SpeciesDexRecorder } from '@/components/marine/SpeciesDexRecorder';

export const revalidate = 900;

export function generateStaticParams() {
  return listSpeciesSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const species = getSpeciesBySlug(slug);
  if (!species) return { title: '찾을 수 없는 어종' };

  const zones = getSpeciesAllZones(species.id);
  const where = zones.slice(0, 3).map((z) => z.zone.name).join(', ');

  return {
    title: `${species.name} 시즌`,
    description: `${species.name}${species.aliases?.length ? `(${species.aliases[0]})` : ''} 시즌과 만나기 좋은 권역${where ? `: ${where}` : ''}. 금어기와 금지체장도 함께 확인하세요.`,
    alternates: { canonical: `/species/${slug}` },
    openGraph: { title: `${species.name} 시즌 · 지금日지도`, type: 'article' },
  };
}

export default async function SpeciesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // 어종 페이지는 '지금' 을 다룬다. 날짜 탐색은 지도의 몫이다.
  const date = todayKey();

  const species = getSpeciesBySlug(slug);
  if (!species) notFound();

  const state = evaluateSpecies(species.id, date);
  const activeZones = getSpeciesZones(species.id, date);
  const allZones = getSpeciesAllZones(species.id);
  const observations = observationApplies(date)
    ? getRecentObservations({ speciesId: species.id }, 6)
    : [];

  const season = state.occurrence.best;

  return (
    <main className="mx-auto max-w-[760px] px-4 pb-12 pt-5 lg:px-6 lg:pt-8">
      <SpeciesDexRecorder entityId={species.id} date={date} />

      <nav className="mb-4 text-[12.5px] text-[color:var(--color-muted)]">
        <Link href="/map" className="underline underline-offset-2">
          지도
        </Link>
        <span aria-hidden className="mx-1.5">
          ›
        </span>
        <span>바다</span>
      </nav>

      <header className="mb-5 flex items-start gap-3.5">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--color-sky-soft)]"
        >
          <SpeciesSprite entity={species} size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-[24px] font-semibold tracking-tight">{species.name}</h1>
            {species.aliases?.length ? (
              <span className="text-[13px] text-[color:var(--color-muted)]">
                {species.aliases.join(' · ')}
              </span>
            ) : null}
            <DemoBadge />
          </div>
          {species.speciesName && (
            <p className="mt-0.5 text-[12px] italic text-[color:var(--color-faint)]">
              {species.speciesName}
            </p>
          )}
        </div>
      </header>

      {/* 1. 지금 시즌 */}
      <div className="mb-5 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] px-4 py-3.5">
        <p className="text-[12.5px] text-[color:var(--color-faint)]">
          {formatKoreanDate(date, { year: true })} 기준
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <SeasonStrengthMeter state={state.occurrence.state} />
          {season?.daysToNextChange !== undefined && season.nextChangeLabel && (
            <span className="text-[13px] text-[color:var(--color-muted)]">
              {season.nextChangeLabel}{' '}
              <span className="font-semibold tabular text-[color:var(--color-ink)]">
                {season.daysToNextChange}일
              </span>
            </span>
          )}
        </div>
      </div>

      <p className="mb-6 text-[14.5px] leading-relaxed text-[color:var(--color-ink-soft)]">
        {species.description ?? species.summary}
      </p>

      {/* 2. 시기 */}
      {season && (
        <dl className="mb-6 divide-y divide-[color:var(--color-line-soft)] rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4">
          <div className="flex gap-3 py-3">
            <dt className="w-[72px] shrink-0 text-[13px] text-[color:var(--color-faint)]">
              주요 시기
            </dt>
            <dd className="flex-1 text-[14px] tabular">
              {formatKoreanDate(toDateKey(new Date(`${season.window.start}T00:00:00Z`)))} ~{' '}
              {formatKoreanDate(toDateKey(new Date(`${season.window.end}T00:00:00Z`)))}
            </dd>
          </div>
          {season.peakWindow && (
            <div className="flex gap-3 py-3">
              <dt className="w-[72px] shrink-0 text-[13px] text-[color:var(--color-faint)]">피크</dt>
              <dd className="flex-1 text-[14px] tabular">
                {formatKoreanDate(toDateKey(new Date(`${season.peakWindow.start}T00:00:00Z`)))} ~{' '}
                {formatKoreanDate(toDateKey(new Date(`${season.peakWindow.end}T00:00:00Z`)))}
              </dd>
            </div>
          )}
          <div className="flex gap-3 py-3">
            <dt className="w-[72px] shrink-0 text-[13px] text-[color:var(--color-faint)]">해역</dt>
            <dd className="flex-1 text-[14px]">{species.seaRegions.join(' · ')}</dd>
          </div>
          {season.methods.length > 0 && (
            <div className="flex gap-3 py-3">
              <dt className="w-[72px] shrink-0 text-[13px] text-[color:var(--color-faint)]">
                추천 방식
              </dt>
              <dd className="flex-1 text-[14px]">
                {season.methods.map((m) => FISHING_METHOD_LABEL[m]).join(' · ')}
              </dd>
            </div>
          )}
        </dl>
      )}

      {/* 3. 어디서 */}
      <section className="mb-6" aria-labelledby="species-zones">
        <h2 id="species-zones" className="mb-2.5 text-[15px] font-semibold tracking-tight">
          {activeZones.length > 0 ? '지금 만나기 좋은 권역' : '만날 수 있는 권역'}
        </h2>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {(activeZones.length > 0
            ? activeZones.map((z) => ({
                zone: z.zone,
                label: SEASON_STRENGTH_LABEL[z.season.state],
                state: z.season.state,
              }))
            : allZones.map((z) => ({ zone: z.zone, label: z.months, state: 'off' as const }))
          ).map(({ zone, label, state: zoneState }) => (
            <li key={zone.id}>
              <Link
                href={`/zone/${zone.slug}`}
                className="flex items-center gap-2 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5 transition-colors hover:border-[color:var(--color-ink)]/25"
              >
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                  {zone.name}
                </span>
                {zoneState !== 'off' && (
                  <SeasonStrengthMeter state={zoneState} size="sm" showLabel={false} />
                )}
                <span className="shrink-0 text-[12px] text-[color:var(--color-muted)]">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. 실제 지금 */}
      <section className="mb-6" aria-labelledby="species-observations">
        <h2 id="species-observations" className="mb-2.5 text-[15px] font-semibold tracking-tight">
          최근 관측
        </h2>
        <ObservationList
          observations={observations}
          emptyNote={
            observationApplies(date)
              ? '아직 이 어종의 최근 제보가 없습니다.'
              : '선택한 날짜에는 현장 관측이 적용되지 않습니다. 관측은 실제 오늘 기준입니다.'
          }
        />
      </section>

      {/* 5. 규정 — 행동 직전의 safety layer */}
      <section className="mb-8" aria-labelledby="species-legal">
        <h2 id="species-legal" className="mb-2.5 text-[15px] font-semibold tracking-tight">
          잡아도 되나요
        </h2>
        <LegalNotice legal={state.regulation} />
      </section>

      <Link
        href={`/map?date=${date}`}
        className="block rounded-xl border border-[color:var(--color-line)] px-4 py-3 text-center text-[13.5px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-ink)]"
      >
        지도에서 보기
      </Link>

      <p className="mt-4 text-[11.5px] leading-relaxed text-[color:var(--color-faint)]">
        시즌 데이터는 개발용 DEMO 이며 근거를 대조하지 않았습니다. 규정 또한 원문 대조 전이므로
        출조 전 반드시 관할 지자체 고시를 확인하세요.
      </p>
    </main>
  );
}
