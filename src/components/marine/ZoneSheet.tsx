'use client';

import Link from 'next/link';
import { formatKoreanDate, type DateKey } from '@/domain/date';
import { SPOT_TYPE_LABEL } from '@/domain/marine';
import { isLegallyBlocked } from '@/domain/regulation';
import type { ZoneDetail } from '@/services/marine-service';
import { Sheet } from '@/components/common/Sheet';
import { SpeciesSprite } from '@/components/nature/SpeciesSprite';
import { SeasonStrengthMeter } from './SeasonStrengthMeter';
import { LegalStatusBadge } from './LegalNotice';
import { ObservationList, ObservationFormShell } from './ObservationList';

/**
 * 권역 상세 — "지금 이 바다에서는".
 * 어종 중심 탐색의 반대 방향, 즉 "어디로 가야 하는가" 에 답한다.
 */
export function ZoneSheet({
  detail,
  date,
  onClose,
  onSelectSpecies,
}: {
  detail: ZoneDetail | null;
  date: DateKey;
  onClose: () => void;
  onSelectSpecies?: (speciesSlug: string) => void;
}) {
  return (
    <Sheet
      open={Boolean(detail)}
      onClose={onClose}
      label={detail ? `${detail.zone.name} 상세` : ''}
      header={
        detail && (
          <div>
            <p className="text-[12px] text-[color:var(--color-faint)]">지금 이 바다에서는</p>
            <h2 className="mt-0.5 text-[17px] font-semibold tracking-tight">{detail.zone.name}</h2>
            <p className="mt-0.5 text-[11.5px] text-[color:var(--color-muted)]">
              {detail.zone.seaRegion} · {formatKoreanDate(date)} 기준
            </p>
          </div>
        )
      }
    >
      {detail && (
        <>
          <section>
            <h3 className="mb-2 text-[13px] font-semibold">
              대표 시즌 어종
              <span className="ml-1.5 font-normal text-[color:var(--color-muted)]">
                {detail.entries.length}종
              </span>
            </h3>
            {detail.entries.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[color:var(--color-line)] px-3.5 py-4 text-[12.5px] leading-relaxed text-[color:var(--color-muted)]">
                이 날짜에는 이 권역에서 시즌인 어종이 없습니다. 슬라이더를 움직여 다른 계절의
                바다를 살펴보세요.
              </p>
            ) : (
              <ul className="space-y-1">
                {detail.entries.slice(0, 8).map((entry) => (
                  <li key={entry.species.id}>
                    <button
                      type="button"
                      onClick={() => onSelectSpecies?.(entry.species.slug)}
                      className="flex w-full items-center gap-2.5 rounded-lg border border-[color:var(--color-line)] px-2.5 py-2 text-left transition-colors hover:border-[color:var(--color-ink)]/25"
                    >
                      <span
                        aria-hidden
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-sky-soft)]"
                      >
                        <SpeciesSprite entity={entry.species} size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-medium">
                            {entry.species.name}
                          </span>
                          {isLegallyBlocked(entry.legal.overallStatus) && (
                            <LegalStatusBadge legal={entry.legal} />
                          )}
                        </span>
                        <SeasonStrengthMeter state={entry.season.state} size="sm" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {detail.restricted.length > 0 && (
            <p className="rounded-xl border border-[color:var(--color-restricted)]/25 bg-[color:var(--color-restricted-soft)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[color:var(--color-restricted)]">
              <strong className="font-semibold">규정 확인 필요</strong>
              <br />
              {detail.restricted.map((s) => s.name).join(', ')}
              {'은(는) '}이 시기에 규정이 적용됩니다. 각 어종을 눌러 내용을 확인하세요.
            </p>
          )}

          <section>
            <h3 className="mb-1.5 text-[13px] font-semibold">낚시 환경</h3>
            <p className="text-[13px] text-[color:var(--color-ink-soft)]">
              {detail.zone.shoreTypes.map((t) => SPOT_TYPE_LABEL[t]).join(' · ')}
            </p>
            {detail.zone.description && (
              <p className="mt-1 text-[12.5px] text-[color:var(--color-muted)]">
                {detail.zone.description}
              </p>
            )}
          </section>

          {detail.spots.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-[13px] font-semibold">
                널리 알려진 공개 장소
                <span className="ml-1.5 font-normal text-[color:var(--color-muted)]">
                  {detail.spots.length}곳
                </span>
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {detail.spots.map((spot) => (
                  <li
                    key={spot.id}
                    className="rounded-lg border border-[color:var(--color-line)] px-2 py-1 text-[12px] text-[color:var(--color-ink-soft)]"
                  >
                    {spot.name}
                    <span className="ml-1 text-[color:var(--color-faint)]">
                      {SPOT_TYPE_LABEL[spot.type]}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11.5px] text-[color:var(--color-faint)]">
                공개적으로 알려진 장소만 표시합니다. 개인 포인트는 다루지 않습니다.
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-1.5 text-[13px] font-semibold">최근 관측</h3>
            <ObservationList
              observations={detail.recentObservations}
              emptyNote="선택한 날짜에는 현장 관측이 적용되지 않거나 아직 제보가 없습니다."
            />
          </section>

          <ObservationFormShell zoneName={detail.zone.name} />

          <Link
            href={`/zone/${detail.zone.slug}`}
            className="block rounded-xl border border-[color:var(--color-line)] px-3 py-2.5 text-center text-[13px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:border-[color:var(--color-ink)]"
          >
            권역 페이지 열기
          </Link>
        </>
      )}
    </Sheet>
  );
}
