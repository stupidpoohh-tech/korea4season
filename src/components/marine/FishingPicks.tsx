import Link from 'next/link';
import { formatKoreanDate, type DateKey } from '@/domain/date';
import { FISHING_METHOD_LABEL } from '@/domain/marine';
import { getWeekRange } from '@/services/nature-service';
import { getFishingPicks } from '@/services/marine-service';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';
import { EmptyState } from '@/components/common/EmptyState';
import { SeasonStrengthMeter } from './SeasonStrengthMeter';
import { ObservationSummaryLine } from './ObservationList';

/**
 * 이번 주 뭐 잡으러 갈까. (요구사항 #14)
 * 규정으로 막힌 어종은 추천 대상에서 제외한다 — 지도에서는 계속 보인다.
 */
export function FishingPicks({ date, limit = 8 }: { date: DateKey; limit?: number }) {
  const picks = getFishingPicks(date, limit);
  const { from, to } = getWeekRange(date);

  if (picks.length === 0) {
    return (
      <EmptyState
        title="이번 주에는 추천할 만한 시즌이 없습니다"
        description="지도에서 시간을 앞당겨 다가올 시즌을 미리 살펴보세요."
        action={
          <Link
            href="/map"
            className="rounded-lg bg-[color:var(--color-ink)] px-3.5 py-2 text-[13px] font-medium text-white"
          >
            지도 열기
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <p className="mb-2.5 text-[12.5px] text-[color:var(--color-muted)]">
        {formatKoreanDate(from)} ~ {formatKoreanDate(to)} 기준 · 규정으로 막힌 어종은 제외했습니다
      </p>

      <ul className="grid gap-1.5 sm:grid-cols-2">
        {picks.map((pick) => (
          <li key={`${pick.species.id}:${pick.zone.id}`}>
            <Link
              href={`/zone/${pick.zone.slug}`}
              className="flex h-full items-start gap-3 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3 transition-colors hover:border-[color:var(--color-ink)]/25"
            >
              <span
                aria-hidden
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-sky-soft)]"
              >
                <SpeciesSprite entity={pick.species} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[14.5px] font-semibold">{pick.species.name}</span>
                  <SeasonStrengthMeter state={pick.season.state} size="sm" />
                </span>
                <span className="mt-0.5 block truncate text-[12.5px] text-[color:var(--color-muted)]">
                  📍 {pick.zone.name}
                </span>
                {pick.season.methods.length > 0 && (
                  <span className="mt-0.5 block text-[12px] text-[color:var(--color-ink-soft)]">
                    {pick.season.methods.map((m) => FISHING_METHOD_LABEL[m]).join(' · ')}
                  </span>
                )}
                {pick.observation && pick.observation.recentCount > 0 && (
                  <span className="mt-1 block">
                    <ObservationSummaryLine summary={pick.observation} />
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11.5px] leading-relaxed text-[color:var(--color-faint)]">
        시즌 데이터는 개발용 DEMO 입니다. 출조 전 반드시 관할 지자체 고시와 현지 정보를 확인하세요.
      </p>
    </div>
  );
}
