import Link from 'next/link';
import type { DateKey } from '@/domain/date';
import { isLegallyBlocked } from '@/domain/regulation';
import { getMarineNowBySpecies } from '@/services/marine-service';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';
import { EmptyState } from '@/components/common/EmptyState';
import { SeasonStrengthMeter } from './SeasonStrengthMeter';
import { LegalStatusBadge } from './LegalNotice';

/**
 * 지금, 바다 — Nature Now 의 해양 버전. (요구사항 #13)
 * 이것만 보고도 "이번 주 뭐 잡으러 가지" 를 생각할 수 있어야 한다.
 */
export function MarineNow({ date, limit = 6 }: { date: DateKey; limit?: number }) {
  const items = getMarineNowBySpecies(date, limit);

  return (
    <section aria-labelledby="marine-now">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 id="marine-now" className="text-[15px] font-semibold tracking-tight">
          지금, 바다
          <span className="ml-2 align-middle text-[11px] font-medium tracking-wider text-[color:var(--color-sky)]">
            NOW
          </span>
        </h2>
        <Link
          href={`/map?date=${date}`}
          className="text-[12.5px] text-[color:var(--color-muted)] underline underline-offset-2"
        >
          지도에서 보기
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="지금 시즌인 어종이 없습니다"
          description="계절이 바뀌면 이 자리가 채워집니다. 지도에서 시간을 옮겨 보세요."
        />
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {items.map((item) => {
            const blocked = isLegallyBlocked(item.legal.overallStatus);
            return (
              <li key={item.species.id}>
                <Link
                  href={`/species/${item.species.slug}`}
                  className="flex h-full items-start gap-3 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3 transition-colors hover:border-[color:var(--color-ink)]/25"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: blocked
                        ? 'var(--color-restricted-soft)'
                        : 'var(--color-sky-soft)',
                    }}
                  >
                    <SpeciesSprite entity={item.species} size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[14px] font-semibold">{item.species.name}</span>
                      {blocked && <LegalStatusBadge legal={item.legal} />}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2">
                      <SeasonStrengthMeter state={item.state} size="sm" />
                      <span className="truncate text-[12px] text-[color:var(--color-muted)]">
                        {item.seaRegions.join('·')} · {item.zoneCount}개 권역
                      </span>
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
